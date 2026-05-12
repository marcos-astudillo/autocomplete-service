import { z } from 'zod';

export const SuggestQuerySchema = z.object({
  prefix: z.string().min(1).max(20).trim(),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  locale: z.string().optional(),
});

export type SuggestQuery = z.infer<typeof SuggestQuerySchema>;

export interface Suggestion {
  text: string;
  score: number;
}

export interface SuggestResponse {
  prefix: string;
  suggestions: Suggestion[];
}
