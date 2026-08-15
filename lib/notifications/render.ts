import type { NotificationTemplateContext } from '@/lib/notifications/types';

export function renderTemplate(template: string, context: NotificationTemplateContext): string {
  return template.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_, key: string) => {
    const value = context[key];
    return value === undefined || value === null ? '' : String(value);
  });
}
