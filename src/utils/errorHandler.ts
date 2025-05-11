import { TRPCError } from '@trpc/server';
import { Prisma } from '@prisma/client';

interface ErrorOptions {
  cause?: unknown;
  message?: string;
}

export const handleError = (error: unknown, options?: ErrorOptions) => {
  console.error('Error:', error);

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'A record with this value already exists',
          cause: error.meta?.target,
        });
      case 'P2003':
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Related record not found',
          cause: error.meta?.field_name,
        });
      case 'P2025':
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Record not found',
          cause: error.meta?.cause,
        });
      default:
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Database error: ${error.code}`,
          cause: error,
        });
    }
  }

  if (error instanceof TRPCError) throw error;

  throw new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: options?.message || 'An unexpected error occurred',
    cause: options?.cause || error,
  });
};
