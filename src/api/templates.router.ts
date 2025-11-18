import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { TemplateService, InMemoryTemplateRepository } from '../domain/template.service';
import { validateRequest, successResponse, ApiError } from './middleware';
import { timeStrategySchema } from './schemas';

// Template validation schemas
const retryConfigSchema = z.object({
  maxRetries: z.number().int().min(0).max(10),
  retryDelayMs: z.number().int().min(100).max(60000),
  exponentialBackoff: z.boolean(),
});

const createTemplateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().min(1),
  category: z.string().min(1).max(50),
  gmailQueryTemplate: z.string().min(1),
  titleTemplate: z.string().min(1),
  descriptionTemplate: z.string().default(''),
  timeStrategy: timeStrategySchema,
  retryConfig: retryConfigSchema.optional(),
  metadata: z.record(z.any()).optional(),
  tags: z.array(z.string()).optional(),
  isPublic: z.boolean().optional().default(false),
  createdBy: z.string().min(1),
});

const cloneTemplateSchema = z.object({
  name: z.string().optional(),
  gmailQuery: z.string().optional(),
  calendarId: z.string().optional(),
  isActive: z.boolean().optional(),
});

const templateIdSchema = z.object({
  id: z.string().transform(val => parseInt(val, 10)).pipe(z.number().int().positive()),
});

const browseFilt

ersSchema = z.object({
  category: z.string().optional(),
  tags: z.string().optional().transform(val => val ? val.split(',') : undefined),
  isPublic: z.string().optional().transform(val => val === 'true'),
});

export function createTemplatesRouter(): Router {
  const router = Router();
  const repository = new InMemoryTemplateRepository();
  const templateService = new TemplateService(repository);

  // GET /api/templates - Browse templates
  router.get(
    '/',
    validateRequest({ query: browseFiltersSchema }),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const filters = req.query as any;
        const templates = await templateService.browseTemplates(filters);
        res.json(successResponse(templates));
      } catch (error) {
        next(error);
      }
    }
  );

  // GET /api/templates/popular - Get popular templates
  router.get('/popular', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = parseInt(req.query.limit as string || '10', 10);
      const templates = await templateService.getPopularTemplates(limit);
      res.json(successResponse(templates));
    } catch (error) {
      next(error);
    }
  });

  // GET /api/templates/:id - Get template by ID
  router.get(
    '/:id',
    validateRequest({ params: templateIdSchema }),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params as any;
        const template = await templateService.getTemplate(id);

        if (!template) {
          throw new ApiError(404, 'Template not found', 'TEMPLATE_NOT_FOUND');
        }

        res.json(successResponse(template));
      } catch (error) {
        next(error);
      }
    }
  );

  // POST /api/templates - Create new template
  router.post(
    '/',
    validateRequest({ body: createTemplateSchema }),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const input = req.body;
        const template = await templateService.createTemplate(input);
        res.status(201).json(successResponse(template));
      } catch (error) {
        next(error);
      }
    }
  );

  // POST /api/templates/:id/clone - Clone template to rule
  router.post(
    '/:id/clone',
    validateRequest({ params: templateIdSchema, body: cloneTemplateSchema }),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params as any;
        const customizations = req.body;

        const rule = await templateService.cloneToRule(id, customizations);

        res.json(successResponse({
          message: 'Template cloned successfully',
          rule,
        }));
      } catch (error) {
        next(error);
      }
    }
  );

  // DELETE /api/templates/:id - Delete template
  router.delete(
    '/:id',
    validateRequest({ params: templateIdSchema }),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params as any;

        const template = await templateService.getTemplate(id);
        if (!template) {
          throw new ApiError(404, 'Template not found', 'TEMPLATE_NOT_FOUND');
        }

        await templateService.deleteTemplate(id);

        res.json(successResponse({ message: 'Template deleted successfully' }));
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
}
