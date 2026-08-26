import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { 
  CreateAddressRequestInputSchema, 
  UpdateAddressRequestInputSchema,
  CreateAddressRequestInputType,
  UpdateAddressRequestInputType,
  getAddressRequestRepository,
  KafkaEventPublisher
} from '@bones-report/shared';

const router: Router = Router();

// Initialize event publisher (using default from shared package)
// Get repository instance
const addressRequestRepo = getAddressRequestRepository();

/**
 * POST /address-requests
 * Create a new address request
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate request body
    const validatedData: CreateAddressRequestInputType = CreateAddressRequestInputSchema.parse(req.body);
    
    // Create the address request (repository will add id, created_at, status)
    const created = await addressRequestRepo.create(validatedData);

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
 * GET /address-requests
 * List all address requests with optional filtering
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.query;

    let results;
    if (status && typeof status === 'string') {
      // Filter by status if provided
      results = await addressRequestRepo.findByStatus(status as any);
    } else {
      // Get all address requests
      results = await addressRequestRepo.findAll();
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
 * GET /address-requests/:id
 * Get a specific address request by ID
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    const addressRequest = await addressRequestRepo.findById(id);
    
    if (!addressRequest) {
      return res.status(404).json({
        error: 'Not Found',
        message: `AddressRequest with id '${id}' not found`,
        timestamp: new Date().toISOString()
      });
    }

    res.json(addressRequest);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /address-requests/:id
 * Update an address request (partial update)
 */
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    // Validate update data
    const updateData: UpdateAddressRequestInputType = UpdateAddressRequestInputSchema.parse(req.body);
    
    // Update the address request
    const updated = await addressRequestRepo.update(id, updateData);
    
    if (!updated) {
      return res.status(404).json({
        error: 'Not Found',
        message: `AddressRequest with id '${id}' not found`,
        timestamp: new Date().toISOString()
      });
    }

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /address-requests/:id
 * Delete an address request
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    const deleted = await addressRequestRepo.delete(id);
    
    if (!deleted) {
      return res.status(404).json({
        error: 'Not Found',
        message: `AddressRequest with id '${id}' not found`,
        timestamp: new Date().toISOString()
      });
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /address-requests/:id/status
 * Update the status of an address request (convenience endpoint)
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
      case 'processing':
        updated = await addressRequestRepo.markAsProcessing(id);
        break;
      case 'completed':
        updated = await addressRequestRepo.markAsProcessed(id);
        break;
      case 'failed':
        updated = await addressRequestRepo.markAsFailed(id);
        break;
      default:
        // Fall back to generic update (validate status first)
        const validatedStatus = UpdateAddressRequestInputSchema.parse({ status });
        updated = await addressRequestRepo.update(id, validatedStatus);
    }
    
    if (!updated) {
      return res.status(404).json({
        error: 'Not Found',
        message: `AddressRequest with id '${id}' not found`,
        timestamp: new Date().toISOString()
      });
    }

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

export { router as addressRequestRouter };