import { Router, Request, Response, NextFunction } from 'express';
import { getPropertySummaryResultRepository } from '@bones-report/shared';

const router: Router = Router();
const repo = getPropertySummaryResultRepository();

/**
 * GET /property-summary
 * List summaries, optionally filtered by address request.
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { address_request_id } = req.query;

    const results =
      address_request_id && typeof address_request_id === 'string'
        ? await repo.findByAddressRequestId(address_request_id)
        : await repo.findAll();

    res.json({ data: results, count: results.length, timestamp: new Date().toISOString() });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /property-summary/:id
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await repo.findById(req.params.id);
    if (!result) {
      return res.status(404).json({
        error: 'Not Found',
        message: `PropertySummaryResult with id '${req.params.id}' not found`,
        timestamp: new Date().toISOString(),
      });
    }
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export { router as propertySummaryRouter };
