import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { EventManagementService } from '../domain/event-management.service';
import { InMemoryEventStorage } from '../lib/adapters/storage.adapter';
import { CalendarService } from '../services/calendarService';
import { getGoogleClientManager } from '../config/googleClient';
import { validateRequest, successResponse, ApiError } from './middleware';

// Event validation schemas
const eventIdSchema = z.object({
  id: z.string().transform(val => parseInt(val, 10)).pipe(z.number().int().positive()),
});

const updateEventSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  start: z.string().datetime().transform(val => new Date(val)).optional(),
  end: z.string().datetime().transform(val => new Date(val)).optional(),
});

const syncStatusSchema = z.object({
  status: z.enum(['synced', 'modified', 'deleted', 'out_of_sync']),
  limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 50),
});

export function createEventsRouter(): Router {
  const router = Router();
  const storage = new InMemoryEventStorage();
  const clientManager = getGoogleClientManager();
  const calendarService = new CalendarService(clientManager);
  const eventService = new EventManagementService(storage, calendarService);

  // GET /api/events/rule/:ruleId - Get events for a rule
  router.get(
    '/rule/:ruleId',
    validateRequest({ params: z.object({ ruleId: z.string().transform(val => parseInt(val, 10)) }) }),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { ruleId } = req.params as any;
        const limit = parseInt(req.query.limit as string || '100', 10);

        const events = await eventService.getSnapshotsByRule(ruleId, limit);

        res.json(successResponse({
          ruleId,
          count: events.length,
          events,
        }));
      } catch (error) {
        next(error);
      }
    }
  );

  // GET /api/events/:id - Get event by ID
  router.get(
    '/:id',
    validateRequest({ params: eventIdSchema }),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params as any;
        const event = await eventService.getSnapshot(id);

        if (!event) {
          throw new ApiError(404, 'Event snapshot not found', 'EVENT_NOT_FOUND');
        }

        res.json(successResponse(event));
      } catch (error) {
        next(error);
      }
    }
  );

  // POST /api/events/:id/sync - Sync event with calendar
  router.post(
    '/:id/sync',
    validateRequest({ params: eventIdSchema }),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params as any;
        const synced = await eventService.syncSnapshot(id);

        res.json(successResponse({
          message: 'Event synced successfully',
          event: synced,
        }));
      } catch (error) {
        next(error);
      }
    }
  );

  // PATCH /api/events/:id - Update event
  router.patch(
    '/:id',
    validateRequest({ params: eventIdSchema, body: updateEventSchema }),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params as any;
        const updates = req.body;

        const updated = await eventService.updateEvent(id, updates);

        res.json(successResponse({
          message: 'Event updated successfully',
          event: updated,
        }));
      } catch (error) {
        next(error);
      }
    }
  );

  // DELETE /api/events/:id - Delete event
  router.delete(
    '/:id',
    validateRequest({ params: eventIdSchema }),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params as any;

        await eventService.deleteEvent(id);

        res.json(successResponse({
          message: 'Event deleted successfully',
        }));
      } catch (error) {
        next(error);
      }
    }
  );

  // POST /api/events/bulk-sync - Bulk sync events
  router.post('/bulk-sync', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ruleId = req.body.ruleId ? parseInt(req.body.ruleId, 10) : undefined;

      const results = await eventService.bulkSync(ruleId);

      res.json(successResponse({
        message: 'Bulk sync completed',
        results,
      }));
    } catch (error) {
      next(error);
    }
  });

  return router;
}
