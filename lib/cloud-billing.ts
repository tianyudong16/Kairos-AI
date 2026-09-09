import { loadCloudAuthSession } from '@/lib/cloud-auth';

export type CreditPack = {
  id: string;
  credits: number;
  label: string;
  priceLabel: string;
};

export type BillingAccount = {
  creditsBalance: number;
  lifetimeCreditsUsed: number;
  creditsPerMessage: number;
  freeSignupCredits: number;
  packs: CreditPack[];
};

function readEnv(name: string) {
  const env = (typeof process !== 'undefined' ? process.env : {}) as Record<
    string,
    string | undefined
  >;
  return (env[name] || '').trim();
}

function defaultBillingBase(name: string) {
  return `https://${name}-terdg5ahya-uc.a.run.app`;
}

export function getBillingAccountUrl() {
  return (
    readEnv('EXPO_PUBLIC_BILLING_ACCOUNT_URL') ||
    defaultBillingBase('getbillingaccount')
  );
}

export function getBillingCheckoutUrl() {
  return (
    readEnv('EXPO_PUBLIC_BILLING_CHECKOUT_URL') ||
    defaultBillingBase('createcheckoutsession')
  );
}

export function isCloudBillingConfigured() {
  return Boolean(getBillingAccountUrl() && getBillingCheckoutUrl());
}

async function readJson(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { error: text || `Request failed (${res.status})` };
  }
}

export class BillingError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
  }
}

export async function cloudGetBilling(token: string): Promise<BillingAccount> {
  const res = await fetch(
    `${getBillingAccountUrl()}?token=${encodeURIComponent(token)}`
  );
  const json = (await readJson(res)) as BillingAccount & {
    error?: string;
    code?: string;
  };
  if (!res.ok) {
    throw new BillingError(
      json.error || `Could not load billing (${res.status})`,
      json.code || 'BILLING_ERROR'
    );
  }
  return json;
}

export async function cloudCreateCheckout(input: {
  token: string;
  packId: string;
  returnPath?: string;
}): Promise<{ url: string; sessionId: string }> {
  const res = await fetch(getBillingCheckoutUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const json = (await readJson(res)) as {
    error?: string;
    code?: string;
    url?: string;
    sessionId?: string;
  };
  if (!res.ok || !json.url) {
    throw new BillingError(
      json.error || `Checkout failed (${res.status})`,
      json.code || 'CHECKOUT_ERROR'
    );
  }
  return { url: json.url, sessionId: json.sessionId || '' };
}

export async function openCheckoutUrl(url: string) {
  if (typeof window !== 'undefined' && window.location) {
    window.location.href = url;
    return;
  }
  const { Linking } = await import('react-native');
  await Linking.openURL(url);
}

export async function purchaseCreditPack(packId: string, returnPath = '/coach-billing') {
  const session = loadCloudAuthSession();
  if (!session?.token) {
    throw new BillingError('Sign in to purchase coach credits.', 'AUTH_REQUIRED');
  }
  const checkout = await cloudCreateCheckout({
    token: session.token,
    packId,
    returnPath,
  });
  await openCheckoutUrl(checkout.url);
}

export async function fetchBillingForCurrentUser(): Promise<BillingAccount | null> {
  const session = loadCloudAuthSession();
  if (!session?.token) return null;
  return cloudGetBilling(session.token);
}
