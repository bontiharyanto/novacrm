import { z } from 'zod';
import { nullableUuidSchema } from '@/lib/validation/id';

export const assistantMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(8000),
});

export const assistantThreadSaveSchema = z.object({
  id: nullableUuidSchema,
  messages: z.array(assistantMessageSchema).max(40),
});

export type AssistantMessage = z.infer<typeof assistantMessageSchema>;
export type AssistantThreadSummary = {
  id: string;
  title: string;
  updatedAt: string;
  messageCount: number;
};
export type AssistantThread = AssistantThreadSummary & {
  messages: AssistantMessage[];
};
