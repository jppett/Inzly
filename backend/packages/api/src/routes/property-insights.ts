import { Router, Request, Response, NextFunction } from 'express';
import { getPropertyInsightsResultRepository } from '@bones-report/shared';

const router: Router = Router();
const repo = getPropertyInsightsResultRepository();

/**
 * GET /property-insights
 * List insight reports, optionally filtered by address request.
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { address_request_id } = req.query;

    const results =
      address_request_id && typeof address_request_id === 'string'
        ? await repo.findByAddressRequestId(address_request_id)
        : await repo.findAll();

    res.json({
      data: results,
      count: results.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /property-insights/:id
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await repo.findById(req.params.id);

    if (!result) {
      return res.status(404).json({
        error: 'Not Found',
        message: `PropertyInsightsResult with id '${req.params.id}' not found`,
        timestamp: new Date().toISOString(),
      });
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /property-insights/:id
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deleted = await repo.delete(req.params.id);

    if (!deleted) {
      return res.status(404).json({
        error: 'Not Found',
        message: `PropertyInsightsResult with id '${req.params.id}' not found`,
        timestamp: new Date().toISOString(),
      });
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export { router as propertyInsightsRouter };
