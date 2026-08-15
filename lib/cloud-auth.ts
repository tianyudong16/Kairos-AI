import type { Lifestyle } from '@/lib/auth';
import type { UserWorkspace } from '@/lib/user-workspace';

const AUTH_SESSION_KEY = 'kairos.cloudAuth.v1';

export type CloudAuthUser = {
  uid: string;
  email: string;
  name: string;
  lifestyle: Lifestyle | null;
};

export type CloudAuthSession = {
  token: string;
  user: CloudAuthUser;
};

function readEnv(name: string) {
  const env = (typeof process !== 'undefined' ? process.env : {}) as Record<
    string,
    string | undefined
  >;
  return (env[name] || '').trim();
}

/** Gen2 Cloud Run URLs for kairos-ai-13e53 (same hash as Google functions). */
function defaultAuthBase(name: string) {
  return `https://${name}-terdg5ahya-uc.a.run.app`;
}

export function getAuthRegisterUrl() {
  return readEnv('EXPO_PUBLIC_AUTH_REGISTER_URL') || defaultAuthBase('authregister');
}

export function getAuthLoginUrl() {
  return readEnv('EXPO_PUBLIC_AUTH_LOGIN_URL') || defaultAuthBase('authlogin');
}

export function getAuthLogoutUrl() {
  return readEnv('EXPO_PUBLIC_AUTH_LOGOUT_URL') || defaultAuthBase('authlogout');
}

export function getAuthMeUrl() {
  return readEnv('EXPO_PUBLIC_AUTH_ME_URL') || defaultAuthBase('authme');
}

export function getWorkspaceGetUrl() {
  return (
    readEnv('EXPO_PUBLIC_WORKSPACE_GET_URL') || defaultAuthBase('getuserworkspace')
  );
}

export function getWorkspaceSaveUrl() {
  return (
    readEnv('EXPO_PUBLIC_WORKSPACE_SAVE_URL') ||
    defaultAuthBase('saveuserworkspace')
  );
}

export function isCloudAuthConfigured() {
  return Boolean(getAuthRegisterUrl() && getAuthLoginUrl());
}

function canUseStorage() {
  return typeof globalThis !== 'undefined' && typeof globalThis.localStorage !== 'undefined';
}

export function loadCloudAuthSession(): CloudAuthSession | null {
  if (!canUseStorage()) return null;
  try {
    const raw = globalThis.localStorage.getItem(AUTH_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CloudAuthSession;
    if (!parsed?.token || !parsed?.user?.uid || !parsed?.user?.email) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveCloudAuthSession(session: CloudAuthSession | null) {
  if (!canUseStorage()) return;
  try {
    if (!session) {
      globalThis.localStorage.removeItem(AUTH_SESSION_KEY);
      return;
    }
    globalThis.localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
  } catch {
    // ignore
  }
}

async function readJson(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { error: text || `Request failed (${res.status})` };
  }
}

export async function cloudRegister(input: {
  email: string;
  password: string;
  name: string;
}): Promise<CloudAuthSession> {
  const res = await fetch(getAuthRegisterUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const json = (await readJson(res)) as {
    error?: string;
    token?: string;
    user?: CloudAuthUser;
  };
  if (!res.ok || !json.token || !json.user) {
    throw new Error(json.error || `Sign up failed (${res.status})`);
  }
  const session = { token: json.token, user: json.user };
  saveCloudAuthSession(session);
  return session;
}

export async function cloudLogin(input: {
  email: string;
  password: string;
}): Promise<CloudAuthSession> {
  const res = await fetch(getAuthLoginUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const json = (await readJson(res)) as {
    error?: string;
    token?: string;
    user?: CloudAuthUser;
  };
  if (!res.ok || !json.token || !json.user) {
    throw new Error(json.error || `Sign in failed (${res.status})`);
  }
  const session = { token: json.token, user: json.user };
  saveCloudAuthSession(session);
  return session;
}

export async function cloudLogout() {
  const session = loadCloudAuthSession();
  if (session?.token) {
    try {
      await fetch(getAuthLogoutUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: session.token }),
      });
    } catch {
      // still clear local session
    }
  }
  saveCloudAuthSession(null);
}

export async function cloudMe(): Promise<CloudAuthSession | null> {
  const session = loadCloudAuthSession();
  if (!session?.token) return null;
  const res = await fetch(
    `${getAuthMeUrl()}?token=${encodeURIComponent(session.token)}`
  );
  const json = (await readJson(res)) as {
    error?: string;
    user?: CloudAuthUser;
  };
  if (!res.ok || !json.user) {
    saveCloudAuthSession(null);
    return null;
  }
  const next = { token: session.token, user: json.user };
  saveCloudAuthSession(next);
  return next;
}

export async function cloudFetchWorkspace(
  token: string
): Promise<UserWorkspace | null> {
  const res = await fetch(
    `${getWorkspaceGetUrl()}?token=${encodeURIComponent(token)}`
  );
  if (res.status === 404) return null;
  const json = (await readJson(res)) as {
    error?: string;
    workspace?: UserWorkspace | null;
  };
  if (!res.ok) {
    throw new Error(json.error || `Could not load workspace (${res.status})`);
  }
  return json.workspace ?? null;
}

export async function cloudSaveWorkspace(
  token: string,
  workspace: UserWorkspace
): Promise<void> {
  const res = await fetch(getWorkspaceSaveUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, workspace }),
  });
  const json = (await readJson(res)) as { error?: string };
  if (!res.ok) {
    throw new Error(json.error || `Could not save workspace (${res.status})`);
  }
}

export async function cloudUpdateProfile(
  token: string,
  patch: Partial<Pick<CloudAuthUser, 'name' | 'lifestyle'>>
): Promise<CloudAuthUser> {
  // Reuse save via authMe after a lightweight profile endpoint — use login profile doc update
  const res = await fetch(getAuthMeUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, ...patch }),
  });
  const json = (await readJson(res)) as {
    error?: string;
    user?: CloudAuthUser;
  };
  if (!res.ok || !json.user) {
    throw new Error(json.error || `Could not update profile (${res.status})`);
  }
  const session = loadCloudAuthSession();
  if (session) {
    saveCloudAuthSession({ token: session.token, user: json.user });
  }
  return json.user;
}
