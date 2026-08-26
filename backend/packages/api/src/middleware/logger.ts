import { Request, Response, NextFunction } from 'express';

/**
 * Request logging middleware
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.originalUrl;
  const userAgent = req.get('User-Agent') || 'unknown';
  
  console.log(`[${timestamp}] ${method} ${url} - ${userAgent}`);
  
  // Log response time
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    console.log(`[${timestamp}] ${method} ${url} - ${status} (${duration}ms)`);
  });
  
  next();
}