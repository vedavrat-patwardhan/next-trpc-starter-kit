import { createTRPCRouter, publicProcedure } from '~/app/server/trpc';
import { prisma } from '~/app/server/db';

export const permissionRouter = createTRPCRouter({
  list: publicProcedure.query(async () => {
    return prisma.permission.findMany();
  }),
});
