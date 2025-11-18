import { z } from 'zod';

// TimeStrategy schemas
const parseFromBodyStrategy = z.object({
  type: z.literal('parse_from_body'),
  durationMinutes: z.number().int().positive().optional().default(60),
});

const fixedDelayStrategy = z.object({
  type: z.literal('fixed_delay'),
  delayHours: z.number().positive().optional().default(1),
  durationMinutes: z.number().int().positive().optional().default(60),
});

const fixedDatetimeStrategy = z.object({
  type: z.literal('fixed_datetime'),
  fixedDate: z.string().datetime(),
  durationMinutes: z.number().int().positive().optional().default(60),
});

export const timeStrategySchema = z.discriminatedUnion('type', [
  parseFromBodyStrategy,
  fixedDelayStrategy,
  fixedDatetimeStrategy,
]);

// Rule schemas
export const createRuleSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  gmailQuery: z.string().min(1, 'Gmail query is required'),
  calendarId: z.string().min(1, 'Calendar ID is required'),
  titleTemplate: z.string().min(1, 'Title template is required'),
  descriptionTemplate: z.string().default(''),
  timeStrategy: timeStrategySchema,
  isActive: z.boolean().default(true),
});

export const updateRuleSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  gmailQuery: z.string().min(1).optional(),
  calendarId: z.string().min(1).optional(),
  titleTemplate: z.string().min(1).optional(),
  descriptionTemplate: z.string().optional(),
  timeStrategy: timeStrategySchema.optional(),
  isActive: z.boolean().optional(),
});

export const ruleIdSchema = z.object({
  id: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().int().positive()),
});

// Execution log schemas
export const executionLogQuerySchema = z.object({
  ruleId: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().int().positive()),
  limit: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().int().positive().max(1000)).optional().default('100'),
});

// Types derived from schemas
export type CreateRuleInput = z.infer<typeof createRuleSchema>;
export type UpdateRuleInput = z.infer<typeof updateRuleSchema>;
export type RuleIdParam = z.infer<typeof ruleIdSchema>;
export type ExecutionLogQuery = z.infer<typeof executionLogQuerySchema>;
