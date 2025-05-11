import { z } from 'zod';

export const createPermissionSchema = z.object({
  permissions: z.array(
    z.object({
      name: z.string().min(1),
      code: z.string().min(1),
      description: z.string().optional(),
    })
  ),
});
