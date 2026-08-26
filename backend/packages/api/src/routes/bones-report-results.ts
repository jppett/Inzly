import { Router, Request, Response, NextFunction } from 'express';
import { 
  CreateBonesReportResultInputSchema,
  CreateBonesReportResultInputType,
  getBonesReportResultRepository
} from '@bones-report/shared';

const router: Router = Router();

// Get repository instance
const bonesReportResultRepo = getBonesReportResultRepository();

/**
 * POST /bones-report-results
 * Create a new bones report result
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate request body
    const validatedData: CreateBonesReportResultInputType = CreateBonesReportResultInputSchema.parse(req.body);
    
    // Create the bones report result (repository will add id, created_at, default status)
    const created = await bonesReportResultRepo.create(validatedData);

    res.status(201).json({
      id: created.id,
      address_request_id: created.address_request_id,
      report_data: created.report_data,
      status: created.status,
      created_at: created.created_at
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /bones-report-results
 * List all bones report results with optional filtering
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, address_request_id } = req.query;

    let results;
    if (status && typeof status === 'string') {
      // Filter by status if provided
      results = await bonesReportResultRepo.findByStatus(status as any);
    } else if (address_request_id && typeof address_request_id === 'string') {
      // Filter by address request ID if provided
      results = await bonesReportResultRepo.findByAddressRequestId(address_request_id);
    } else {
      // Get all bones report results
      results = await bonesReportResultRepo.findAll();
    }

    res.json({
      data: results,
      count: results.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /bones-report-results/:id
 * Get a specific bones report result by ID
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    const bonesReportResult = await bonesReportResultRepo.findById(id);
    
    if (!bonesReportResult) {
      return res.status(404).json({
        error: 'Not Found',
        message: `BonesReportResult with id '${id}' not found`,
        timestamp: new Date().toISOString()
      });
    }

    res.json(bonesReportResult);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /bones-report-results/:id
 * Delete a bones report result
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    const deleted = await bonesReportResultRepo.delete(id);
    
    if (!deleted) {
      return res.status(404).json({
        error: 'Not Found',
        message: `BonesReportResult with id '${id}' not found`,
        timestamp: new Date().toISOString()
      });
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export { router as bonesReportResultRouter };