import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

/**
 * Global error handler middleware
 */
export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error('Error:', error);

  // Zod validation errors
  if (error instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Invalid request data',
      details: error.errors.map(err => ({
        path: err.path.join('.'),
        message: err.message,
        code: err.code
      })),
      timestamp: new Date().toISOString()
    });
  }

  // Redis connection errors
  if (error.message.includes('Redis') || error.message.includes('redis')) {
    return res.status(503).json({
      error: 'Service Unavailable',
      message: 'Database connection error',
      timestamp: new Date().toISOString()
    });
  }

  // Not found errors
  if (error.message.includes('not found') || error.message.includes('Not found')) {
    return res.status(404).json({
      error: 'Not Found',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }

  // Default server error
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' 
      ? 'An unexpected error occurred' 
      : error.message,
    timestamp: new Date().toISOString()
  });
}