import { z } from 'zod';

// Schema for a single component within a salary structure
export const salaryStructureComponentSchema = z.object({
  componentId: z.string().min(1, { message: "Component ID is required" }),
  definedValue: z.number().optional().nullable(), // For FIXED type overrides or PERCENTAGE base
  percentageOfComponentId: z.string().optional().nullable(), // If calculationType is PERCENTAGE and based on another component
});

export type SalaryStructureComponentInput = z.infer<typeof salaryStructureComponentSchema>;

export const createSalaryStructureSchema = z.object({
  name: z.string().min(1, { message: "Structure name is required" }),
  description: z.string().optional().nullable(),
  // organizationId: z.string().min(1, { message: "Organization ID is required" }), // Will be taken from session
  components: z.array(salaryStructureComponentSchema).min(1, { message: "At least one component is required" }),
});

export type CreateSalaryStructureInput = z.infer<typeof createSalaryStructureSchema>;

export const updateSalaryStructureSchema = z.object({
  structureId: z.string().min(1),
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  components: z.array(salaryStructureComponentSchema).optional(), // Allow updating components
});

export type UpdateSalaryStructureInput = z.infer<typeof updateSalaryStructureSchema>;

export const listSalaryStructuresSchema = z.object({
  // organizationId: z.string().min(1), // Will be taken from session
  isActive: z.boolean().optional(),
});

export type ListSalaryStructuresInput = z.infer<typeof listSalaryStructuresSchema>;
