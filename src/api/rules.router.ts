import { Router, Request, Response, NextFunction } from 'express';
import { AppDatabase } from '../db/database';
import { createRuleSchema, updateRuleSchema, ruleIdSchema } from './schemas';
import { validateRequest, successResponse, ApiError } from './middleware';
import { RuleInput } from '../db/types';

export function createRulesRouter(db: AppDatabase): Router {
  const router = Router();

  // GET /api/rules - List all rules
  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const activeOnly = req.query.active === 'true';
      const rules = activeOnly ? db.getAllActiveRules() : db.getAllRules();
      res.json(successResponse(rules));
    } catch (error) {
      next(error);
    }
  });

  // GET /api/rules/:id - Get single rule
  router.get(
    '/:id',
    validateRequest({ params: ruleIdSchema }),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params as any;
        const rule = db.getRule(id);

        if (!rule) {
          throw new ApiError(404, 'Rule not found', 'RULE_NOT_FOUND');
        }

        res.json(successResponse(rule));
      } catch (error) {
        next(error);
      }
    }
  );

  // POST /api/rules - Create new rule
  router.post(
    '/',
    validateRequest({ body: createRuleSchema }),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const input = req.body as RuleInput;
        const ruleId = db.createRule(input);
        const rule = db.getRule(ruleId);

        res.status(201).json(successResponse(rule));
      } catch (error) {
        next(error);
      }
    }
  );

  // PATCH /api/rules/:id - Update rule
  router.patch(
    '/:id',
    validateRequest({ params: ruleIdSchema, body: updateRuleSchema }),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params as any;
        const updates = req.body;

        const existingRule = db.getRule(id);
        if (!existingRule) {
          throw new ApiError(404, 'Rule not found', 'RULE_NOT_FOUND');
        }

        db.updateRule(id, updates);
        const updatedRule = db.getRule(id);

        res.json(successResponse(updatedRule));
      } catch (error) {
        next(error);
      }
    }
  );

  // DELETE /api/rules/:id - Delete rule
  router.delete(
    '/:id',
    validateRequest({ params: ruleIdSchema }),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params as any;

        const existingRule = db.getRule(id);
        if (!existingRule) {
          throw new ApiError(404, 'Rule not found', 'RULE_NOT_FOUND');
        }

        db.deleteRule(id);

        res.json(successResponse({ message: 'Rule deleted successfully' }));
      } catch (error) {
        next(error);
      }
    }
  );

  // POST /api/rules/:id/execute - Execute specific rule
  router.post(
    '/:id/execute',
    validateRequest({ params: ruleIdSchema }),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params as any;

        const rule = db.getRule(id);
        if (!rule) {
          throw new ApiError(404, 'Rule not found', 'RULE_NOT_FOUND');
        }

        // This will be implemented when we integrate with the rule engine
        throw new ApiError(501, 'Rule execution not yet implemented', 'NOT_IMPLEMENTED');
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
}
