import { z } from 'zod';

export const salaryComponentTypeSchema = z.enum(['EARNING', 'DEDUCTION']);
export const salaryCalculationTypeSchema = z.enum(['FIXED', 'PERCENTAGE', 'FORMULA']);

export const createSalaryComponentSchema = z.object({
  name: z.string().min(1, { message: "Component name is required" }),
  type: salaryComponentTypeSchema,
  calculationType: salaryCalculationTypeSchema,
  formula: z.string().optional().nullable(),
  isTaxable: z.boolean().default(true),
  description: z.string().optional().nullable(),
  // organizationId: z.string().min(1, { message: "Organization ID is required" }), // Will be taken from session
});

export type CreateSalaryComponentInput = z.infer<typeof createSalaryComponentSchema>;

export const updateSalaryComponentSchema = z.object({
  componentId: z.string().min(1),
  name: z.string().min(1).optional(),
  type: salaryComponentTypeSchema.optional(),
  calculationType: salaryCalculationTypeSchema.optional(),
  formula: z.string().optional().nullable(),
  isTaxable: z.boolean().optional(),
  description: z.string().optional().nullable(),
});

export type UpdateSalaryComponentInput = z.infer<typeof updateSalaryComponentSchema>;

export const listSalaryComponentsSchema = z.object({
  // organizationId: z.string().min(1), // Will be taken from session
  type: salaryComponentTypeSchema.optional(),
});

export type ListSalaryComponentsInput = z.infer<typeof listSalaryComponentsSchema>;
