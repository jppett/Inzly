// REST API service entry point
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { checkRedisHealth, checkAllRepositoriesHealth } from './utils/health.js';
import { errorHandler } from './middleware/error-handler.js';
import { requestLogger } from './middleware/logger.js';
import { addressRequestRouter } from './routes/address-requests.js';
import { bonesReportResultRouter } from './routes/bones-report-results.js';
import { mlsListingRequestRouter } from './routes/mls-listing-requests.js';
import { mlsListingResultRouter } from './routes/mls-listing-results.js';
import { propertyInsightsRouter } from './routes/property-insights.js';

const app = express();
const PORT = process.env.PORT || 8080;

// Security and CORS middleware
app.use(helmet());
app.use(cors());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use(requestLogger);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const redisHealth = await checkRedisHealth();
    const repoHealth = await checkAllRepositoriesHealth();
    
    const status = redisHealth && repoHealth ? 'healthy' : 'unhealthy';
    const httpStatus = status === 'healthy' ? 200 : 503;
    
    res.status(httpStatus).json({
      status,
      service: 'api',
      checks: {
        redis: redisHealth,
        repositories: repoHealth
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      service: 'api',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// API routes
app.use('/address-requests', addressRequestRouter);
app.use('/bones-report-results', bonesReportResultRouter);
app.use('/mls-listing-requests', mlsListingRequestRouter);
app.use('/mls-listing-results', mlsListingResultRouter);
app.use('/property-insights', propertyInsightsRouter);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} not found`,
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 API server running on port ${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/health`);
  console.log(`🏠 AddressRequest API: http://localhost:${PORT}/address-requests`);
  console.log(`📊 BonesReportResult API: http://localhost:${PORT}/bones-report-results`);
  console.log(`🏘️ MLSListingRequest API: http://localhost:${PORT}/mls-listing-requests`);
  console.log(`📍 MLSListingResult API: http://localhost:${PORT}/mls-listing-results`);
  console.log(`📸 PropertyInsights API: http://localhost:${PORT}/property-insights`);
});