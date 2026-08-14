export type Lifestyle =
  | 'college-student'
  | 'student-athlete'
  | 'working-professional'
  | 'entrepreneur'
  | 'other';

export const LIFESTYLE_OPTIONS: { id: Lifestyle; label: string }[] = [
  { id: 'college-student', label: 'College student' },
  { id: 'student-athlete', label: 'Student-athlete' },
  { id: 'working-professional', label: 'Working professional' },
  { id: 'entrepreneur', label: 'Entrepreneur' },
  { id: 'other', label: 'Other' },
];

export function lifestyleLabel(id: Lifestyle | null | undefined) {
  if (!id) return 'Not set';
  return LIFESTYLE_OPTIONS.find((option) => option.id === id)?.label ?? 'Not set';
}

export type StoredAccount = {
  email: string;
  password: string;
  name: string;
  lifestyle: Lifestyle | null;
};

const STORAGE_KEY = 'kairos.accounts.v1';

function canUseStorage() {
  return typeof globalThis !== 'undefined' && typeof globalThis.localStorage !== 'undefined';
}

export function loadAccounts(): StoredAccount[] {
  if (!canUseStorage()) return [];
  try {
    const raw = globalThis.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveAccounts(accounts: StoredAccount[]) {
  if (!canUseStorage()) return;
  try {
    globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
  } catch {
    // Ignore quota / private-mode failures in the prototype.
  }
}

export function findAccount(email: string, accounts: StoredAccount[]) {
  const key = email.trim().toLowerCase();
  return accounts.find((account) => account.email === key) ?? null;
}

/** Used to bridge local Kairos login → Firebase Auth for calendar Connect. */
export function findAccountPassword(email: string): string | null {
  const account = findAccount(email, loadAccounts());
  return account?.password ?? null;
}
