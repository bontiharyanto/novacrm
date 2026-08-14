import { z } from 'zod';

export const BUILTIN_INTEGRATION_KINDS = ['ai', 'whatsapp', 'telegram', 'email', 'webhook'] as const;
export type BuiltinIntegrationKind = (typeof BUILTIN_INTEGRATION_KINDS)[number];

export const pluginCategorySchema = z.enum(['builtin', 'chat', 'itsm', 'crm', 'identity', 'mail', 'other']);
export const pluginUiVariantSchema = z.enum(['ai', 'webhook', 'fields']);
export const pluginFieldTypeSchema = z.enum(['text', 'password', 'url', 'textarea']);

export const pluginFieldSchema = z.object({
  key: z.string().min(1).max(40),
  label: z.string().min(1).max(80),
  type: pluginFieldTypeSchema.default('text'),
  secret: z.boolean().optional(),
  required: z.boolean().optional(),
  placeholder: z.string().max(120).optional(),
});

export const pluginAuthSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('bearer'), tokenField: z.string() }),
  z.object({ type: z.literal('basic'), userField: z.string(), passField: z.string() }),
  z.object({ type: z.literal('ssws'), tokenField: z.string() }),
]);

export const pluginTestSpecSchema = z.object({
  kind: z.enum(['builtin', 'http', 'save']).default('save'),
  url: z.string().max(400).optional(),
  method: z.enum(['GET', 'POST']).optional(),
  auth: pluginAuthSchema.optional(),
});

export const createPluginSchema = z.object({
  label: z.string().min(2).max(80),
  hint: z.string().max(160).optional(),
  category: z.enum(['chat', 'itsm', 'crm', 'identity', 'mail', 'other']).default('other'),
  slug: z
    .string()
    .regex(/^[a-z][a-z0-9_]{1,40}$/)
    .optional(),
});

export type PluginField = z.infer<typeof pluginFieldSchema>;
export type PluginTestSpec = z.infer<typeof pluginTestSpecSchema>;
export type PluginCategory = z.infer<typeof pluginCategorySchema>;
export type PluginUiVariant = z.infer<typeof pluginUiVariantSchema>;

export type PluginCard = {
  id: string;
  slug: string;
  label: string;
  hint: string;
  category: PluginCategory;
  uiVariant: PluginUiVariant;
  fields: PluginField[];
  helpTest: string;
  helpAfter: string;
  testSpec: PluginTestSpec;
  tenantId: string | null;
  sortOrder: number;
  configured: boolean;
  lastOk: boolean | null;
  lastError: string | null;
  lastTestedAt: string | null;
  values: Record<string, string>;
};

export type IntegrationCatalog = {
  plugins: PluginCard[];
};

export function isBuiltinKind(kind: string): kind is BuiltinIntegrationKind {
  return (BUILTIN_INTEGRATION_KINDS as readonly string[]).includes(kind);
}

export function slugifyPlugin(label: string) {
  return (
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 40) || 'plugin'
  );
}
