import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

/**
 * Error handling padronizado
 * Baseado em Next.js Boilerplate best practices
 */

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Não autorizado') {
    super(message, 401, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

export class WhatsAppError extends AppError {
  constructor(message: string, statusCode: number = 500) {
    super(message, statusCode, 'WHATSAPP_ERROR');
    this.name = 'WhatsAppError';
  }
}

export class BlobError extends AppError {
  constructor(message: string) {
    super(message, 500, 'BLOB_ERROR');
    this.name = 'BlobError';
  }
}

/**
 * Converte erro para NextResponse padronizado
 */
export function handleApiError(error: unknown): NextResponse {
  console.error('[API ERROR]', error);

  // Erro de validação Zod
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: 'Dados inválidos',
        code: 'VALIDATION_ERROR',
        details: error.issues.map(err => ({
          path: err.path.join('.'),
          message: err.message,
        })),
      },
      { status: 400 }
    );
  }

  // Erro customizado da aplicação
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
      },
      { status: error.statusCode }
    );
  }

  // Erro genérico
  const message = error instanceof Error ? error.message : 'Erro interno do servidor';
  return NextResponse.json(
    {
      error: message,
      code: 'INTERNAL_ERROR',
    },
    { status: 500 }
  );
}

/**
 * Wrapper para rotas API com error handling automático
 */
export function withErrorHandler<T extends unknown[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleApiError(error);
    }
  };
}
