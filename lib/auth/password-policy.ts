export const DEFAULT_PASSWORD_MAX_AGE_DAYS = 30;

export type PasswordPolicy = {
  enabled: boolean;
  maxAgeDays: number;
};

export type PasswordStatus = {
  expired: boolean;
  daysLeft: number;
  changedAt?: string;
};

export function isPasswordExpired(changedAt: string | null | undefined, policy: PasswordPolicy) {
  if (!policy.enabled) return false;
  if (!changedAt) return true;
  const ageMs = Date.now() - new Date(changedAt).getTime();
  return ageMs >= policy.maxAgeDays * 86_400_000;
}

export function daysUntilPasswordExpiry(changedAt: string | null | undefined, policy: PasswordPolicy) {
  if (!policy.enabled) return policy.maxAgeDays;
  if (!changedAt) return 0;
  const due = new Date(changedAt).getTime() + policy.maxAgeDays * 86_400_000;
  return Math.max(0, Math.ceil((due - Date.now()) / 86_400_000));
}

export function passwordStatus(changedAt: string | null | undefined, policy: PasswordPolicy): PasswordStatus {
  return {
    expired: isPasswordExpired(changedAt, policy),
    daysLeft: daysUntilPasswordExpiry(changedAt, policy),
    changedAt: changedAt ?? undefined,
  };
}
