import { z } from 'zod';

export const leadInterestSchema = z.enum(['itsm', 'wfm', 'delivery', 'portal', 'integration']);
export const leadLocaleSchema = z.enum(['id', 'en']);
export const employeeCountSchema = z.enum(['1-10', '11-50', '51-200', '201-500', '500+']);

export const demoLeadSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  companyName: z.string().trim().min(2).max(160),
  jobTitle: z.string().trim().max(120).optional().default(''),
  employeeCount: employeeCountSchema.optional(),
  phone: z.string().trim().max(32).optional().default(''),
  email: z.string().trim().email().max(254),
  interest: leadInterestSchema,
  message: z.string().trim().max(2000).optional().default(''),
  locale: leadLocaleSchema.default('id'),
  source: z.string().trim().max(80).default('flyer'),
  utmSource: z.string().trim().max(120).optional().default(''),
  utmMedium: z.string().trim().max(120).optional().default(''),
  utmCampaign: z.string().trim().max(120).optional().default(''),
  privacyConsent: z.literal(true),
  marketingConsent: z.boolean().default(false),
  website: z.string().trim().max(200).optional().default(''),
});

export type DemoLeadInput = z.infer<typeof demoLeadSchema>;
