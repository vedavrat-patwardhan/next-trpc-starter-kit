import { NextRequest } from 'next/server';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '@/app/server/routers';
import { createContext } from '@/app/server/trpc';

const t = (req: NextRequest) => {
  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext,
  });
};

export { t as GET, t as POST, t as PUT, t as DELETE, t as PATCH };
