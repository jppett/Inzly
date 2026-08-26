import { Router, Request, Response, NextFunction } from 'express';
import { 
  CreateMLSListingResultInputSchema,
  CreateMLSListingResultInputType,
  getMLSListingResultRepository
} from '@bones-report/shared';

const router: Router = Router();

// Get repository instance
const mlsListingResultRepo = getMLSListingResultRepository();

/**
 * POST /mls-listing-results
 * Create a new MLS listing result
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate request body
    const validatedData: CreateMLSListingResultInputType = CreateMLSListingResultInputSchema.parse(req.body);
    
    // Create the MLS listing result (repository will add id, created_at, default status)
    const created = await mlsListingResultRepo.create(validatedData);

    res.status(201).json({
      id: created.id,
      mls_listing_request_id: created.mls_listing_request_id,
      listing_data: created.listing_data,
      status: created.status,
      created_at: created.created_at
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /mls-listing-results
 * List all MLS listing results with optional filtering
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, mls_listing_request_id } = req.query;

    let results;
    if (status && typeof status === 'string') {
      // Filter by status if provided
      results = await mlsListingResultRepo.findByStatus(status as any);
    } else if (mls_listing_request_id && typeof mls_listing_request_id === 'string') {
      // Filter by MLS listing request ID if provided
      results = await mlsListingResultRepo.findByMLSListingRequestId(mls_listing_request_id);
    } else {
      // Get all MLS listing results
      results = await mlsListingResultRepo.findAll();
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
 * GET /mls-listing-results/:id
 * Get a specific MLS listing result by ID
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    const mlsListingResult = await mlsListingResultRepo.findById(id);
    
    if (!mlsListingResult) {
      return res.status(404).json({
        error: 'Not Found',
        message: `MLSListingResult with id '${id}' not found`,
        timestamp: new Date().toISOString()
      });
    }

    res.json(mlsListingResult);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /mls-listing-results/:id
 * Delete an MLS listing result
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    const deleted = await mlsListingResultRepo.delete(id);
    
    if (!deleted) {
      return res.status(404).json({
        error: 'Not Found',
        message: `MLSListingResult with id '${id}' not found`,
        timestamp: new Date().toISOString()
      });
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export { router as mlsListingResultRouter };