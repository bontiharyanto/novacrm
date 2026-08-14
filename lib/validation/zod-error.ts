import type { ZodError } from 'zod';

export function formatZodError(error: ZodError) {
  const issue = error.issues[0];
  if (!issue) return 'Invalid input';
  const field = issue.path.map(String).filter(Boolean).join('.') || '';
  const format = 'format' in issue ? String((issue as { format?: string }).format ?? '') : '';
  if (format === 'guid' || format === 'uuid') {
    return field ? `Invalid id (${field})` : 'Invalid id';
  }
  if (format === 'email') {
    return field ? `Invalid email (${field})` : 'Invalid email address';
  }
  return field ? `${issue.message} (${field})` : issue.message;
}
