import { Router, Request, Response, NextFunction } from 'express';
import { 
  CreateMLSListingRequestInputSchema,
  UpdateMLSListingRequestInputSchema,
  CreateMLSListingRequestInputType,
  UpdateMLSListingRequestInputType,
  getMLSListingRequestRepository
} from '@bones-report/shared';

const router: Router = Router();

// Get repository instance
const mlsListingRequestRepo = getMLSListingRequestRepository();

/**
 * POST /mls-listing-requests
 * Create a new MLS listing request
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate request body
    const validatedData: CreateMLSListingRequestInputType = CreateMLSListingRequestInputSchema.parse(req.body);
    
    // Create the MLS listing request (repository will add id, created_at, status)
    const created = await mlsListingRequestRepo.create(validatedData);

    res.status(201).json({
      id: created.id,
      address: created.address,
      status: created.status,
      created_at: created.created_at
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /mls-listing-requests
 * List all MLS listing requests with optional filtering
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.query;

    let results;
    if (status && typeof status === 'string') {
      // Filter by status if provided
      results = await mlsListingRequestRepo.findByStatus(status as any);
    } else {
      // Get all MLS listing requests
      results = await mlsListingRequestRepo.findAll();
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
 * GET /mls-listing-requests/:id
 * Get a specific MLS listing request by ID
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    const mlsListingRequest = await mlsListingRequestRepo.findById(id);
    
    if (!mlsListingRequest) {
      return res.status(404).json({
        error: 'Not Found',
        message: `MLSListingRequest with id '${id}' not found`,
        timestamp: new Date().toISOString()
      });
    }

    res.json(mlsListingRequest);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /mls-listing-requests/:id
 * Update an MLS listing request (partial update)
 */
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    // Validate update data
    const updateData: UpdateMLSListingRequestInputType = UpdateMLSListingRequestInputSchema.parse(req.body);
    
    // Update the MLS listing request
    const updated = await mlsListingRequestRepo.update(id, updateData);
    
    if (!updated) {
      return res.status(404).json({
        error: 'Not Found',
        message: `MLSListingRequest with id '${id}' not found`,
        timestamp: new Date().toISOString()
      });
    }

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /mls-listing-requests/:id
 * Delete an MLS listing request
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    const deleted = await mlsListingRequestRepo.delete(id);
    
    if (!deleted) {
      return res.status(404).json({
        error: 'Not Found',
        message: `MLSListingRequest with id '${id}' not found`,
        timestamp: new Date().toISOString()
      });
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /mls-listing-requests/:id/status
 * Update the status of an MLS listing request (convenience endpoint)
 */
router.put('/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!status || typeof status !== 'string') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Status is required and must be a string',
        timestamp: new Date().toISOString()
      });
    }

    // Use repository helper methods for status updates
    let updated;
    switch (status) {
      case 'processed':
        updated = await mlsListingRequestRepo.markAsProcessed(id);
        break;
      case 'failed':
        updated = await mlsListingRequestRepo.markAsFailed(id);
        break;
      default:
        // Fall back to generic update (validate status first)
        const validatedStatus = UpdateMLSListingRequestInputSchema.parse({ status });
        updated = await mlsListingRequestRepo.update(id, validatedStatus);
    }
    
    if (!updated) {
      return res.status(404).json({
        error: 'Not Found',
        message: `MLSListingRequest with id '${id}' not found`,
        timestamp: new Date().toISOString()
      });
    }

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

export { router as mlsListingRequestRouter };