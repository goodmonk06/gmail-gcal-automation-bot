import { Router, Request, Response, NextFunction } from 'express';
import { AppDatabase } from '../db/database';
import { ruleIdSchema } from './schemas';
import { validateRequest, successResponse, ApiError } from './middleware';

export function createLogsRouter(db: AppDatabase): Router {
  const router = Router();

  // GET /api/logs/rules/:ruleId - Get execution logs for a rule
  router.get(
    '/rules/:ruleId',
    validateRequest({ params: ruleIdSchema }),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { ruleId } = req.params as any;
        const limit = parseInt(req.query.limit as string || '100', 10);

        const rule = db.getRule(ruleId);
        if (!rule) {
          throw new ApiError(404, 'Rule not found', 'RULE_NOT_FOUND');
        }

        const logs = db.getExecutionLogsByRule(ruleId, limit);

        res.json(successResponse({
          rule: {
            id: rule.id,
            name: rule.name,
          },
          logs,
        }));
      } catch (error) {
        next(error);
      }
    }
  );

  // GET /api/logs/recent - Get recent execution logs across all rules
  router.get('/recent', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = parseInt(req.query.limit as string || '50', 10);
      const logs = db.getRecentExecutionLogs(limit);

      res.json(successResponse(logs));
    } catch (error) {
      next(error);
    }
  });

  return router;
}
