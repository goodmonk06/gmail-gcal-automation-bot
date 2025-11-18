import { describe, it, expect, beforeEach } from 'vitest';
import { TemplateService, InMemoryTemplateRepository } from './template.service';
import { RuleTemplateInput } from '../db/types';

describe('TemplateService', () => {
  let service: TemplateService;
  let repository: InMemoryTemplateRepository;

  beforeEach(() => {
    repository = new InMemoryTemplateRepository();
    service = new TemplateService(repository);
  });

  describe('createTemplate', () => {
    it('should create a new template', async () => {
      const input: RuleTemplateInput = {
        name: 'Meeting Template',
        description: 'Template for meeting invitations',
        category: 'meeting',
        gmailQueryTemplate: 'subject:meeting',
        titleTemplate: '{{subject}}',
        descriptionTemplate: '{{body}}',
        timeStrategy: {
          type: 'parse_from_body',
          durationMinutes: 60,
        },
        createdBy: 'user1',
      };

      const template = await service.createTemplate(input);

      expect(template.id).toBeGreaterThan(0);
      expect(template.name).toBe(input.name);
      expect(template.category).toBe(input.category);
      expect(template.usageCount).toBe(0);
      expect(template.isPublic).toBe(false);
    });

    it('should set public flag correctly', async () => {
      const input: RuleTemplateInput = {
        name: 'Public Template',
        description: 'A public template',
        category: 'task',
        gmailQueryTemplate: 'label:todo',
        titleTemplate: 'TODO: {{subject}}',
        descriptionTemplate: '{{snippet}}',
        timeStrategy: { type: 'fixed_delay', delayHours: 2, durationMinutes: 30 },
        isPublic: true,
        createdBy: 'admin',
      };

      const template = await service.createTemplate(input);

      expect(template.isPublic).toBe(true);
    });
  });

  describe('browseTemplates', () => {
    beforeEach(async () => {
      await service.createTemplate({
        name: 'Meeting Template',
        description: 'Meeting template',
        category: 'meeting',
        gmailQueryTemplate: 'subject:meeting',
        titleTemplate: '{{subject}}',
        descriptionTemplate: '{{body}}',
        timeStrategy: { type: 'parse_from_body', durationMinutes: 60 },
        isPublic: true,
        createdBy: 'user1',
      });

      await service.createTemplate({
        name: 'Task Template',
        description: 'Task template',
        category: 'task',
        gmailQueryTemplate: 'label:todo',
        titleTemplate: 'TODO: {{subject}}',
        descriptionTemplate: '{{body}}',
        timeStrategy: { type: 'fixed_delay', delayHours: 1, durationMinutes: 30 },
        isPublic: true,
        tags: ['productivity'],
        createdBy: 'user1',
      });

      await service.createTemplate({
        name: 'Private Template',
        description: 'Private template',
        category: 'reminder',
        gmailQueryTemplate: 'from:me',
        titleTemplate: '{{subject}}',
        descriptionTemplate: '{{body}}',
        timeStrategy: { type: 'fixed_delay', delayHours: 1, durationMinutes: 15 },
        isPublic: false,
        createdBy: 'user2',
      });
    });

    it('should get all templates when no filter', async () => {
      const templates = await service.browseTemplates();
      expect(templates).toHaveLength(3);
    });

    it('should filter by public templates', async () => {
      const templates = await service.browseTemplates({ isPublic: true });
      expect(templates).toHaveLength(2);
      expect(templates.every(t => t.isPublic)).toBe(true);
    });

    it('should filter by category', async () => {
      const templates = await service.browseTemplates({ category: 'task' });
      expect(templates).toHaveLength(1);
      expect(templates[0].category).toBe('task');
    });

    it('should filter by tags', async () => {
      const templates = await service.browseTemplates({ tags: ['productivity'] });
      expect(templates).toHaveLength(1);
      expect(templates[0].tags).toContain('productivity');
    });
  });

  describe('cloneToRule', () => {
    it('should clone template to rule input', async () => {
      const template = await service.createTemplate({
        name: 'Meeting Template',
        description: 'Meeting template',
        category: 'meeting',
        gmailQueryTemplate: 'subject:meeting',
        titleTemplate: '{{subject}}',
        descriptionTemplate: 'Meeting: {{body}}',
        timeStrategy: { type: 'parse_from_body', durationMinutes: 60 },
        retryConfig: { maxRetries: 3, retryDelayMs: 1000, exponentialBackoff: true },
        tags: ['work', 'meeting'],
        createdBy: 'user1',
      });

      const rule = await service.cloneToRule(template.id);

      expect(rule.name).toContain('Meeting Template');
      expect(rule.gmailQuery).toBe('subject:meeting');
      expect(rule.titleTemplate).toBe('{{subject}}');
      expect(rule.descriptionTemplate).toBe('Meeting: {{body}}');
      expect(rule.timeStrategy.type).toBe('parse_from_body');
      expect(rule.retryConfig).toEqual(template.retryConfig);
      expect(rule.tags).toEqual(['work', 'meeting']);
      expect(rule.templateId).toBe(template.id);
    });

    it('should apply customizations when cloning', async () => {
      const template = await service.createTemplate({
        name: 'Base Template',
        description: 'Base',
        category: 'general',
        gmailQueryTemplate: 'from:default',
        titleTemplate: 'Default: {{subject}}',
        descriptionTemplate: '{{body}}',
        timeStrategy: { type: 'fixed_delay', delayHours: 1, durationMinutes: 30 },
        createdBy: 'user1',
      });

      const rule = await service.cloneToRule(template.id, {
        name: 'Customized Rule',
        gmailQuery: 'from:custom@example.com',
        isActive: false,
      });

      expect(rule.name).toBe('Customized Rule');
      expect(rule.gmailQuery).toBe('from:custom@example.com');
      expect(rule.isActive).toBe(false);
    });

    it('should increment usage count after cloning', async () => {
      const template = await service.createTemplate({
        name: 'Popular Template',
        description: 'Popular',
        category: 'task',
        gmailQueryTemplate: 'label:todo',
        titleTemplate: '{{subject}}',
        descriptionTemplate: '{{body}}',
        timeStrategy: { type: 'fixed_delay', delayHours: 1, durationMinutes: 30 },
        createdBy: 'user1',
      });

      expect(template.usageCount).toBe(0);

      await service.cloneToRule(template.id);
      await service.cloneToRule(template.id);
      await service.cloneToRule(template.id);

      const updated = await service.getTemplate(template.id);
      expect(updated!.usageCount).toBe(3);
    });
  });

  describe('getPopularTemplates', () => {
    beforeEach(async () => {
      const template1 = await service.createTemplate({
        name: 'Template 1',
        description: 'Template 1',
        category: 'meeting',
        gmailQueryTemplate: 'subject:meeting',
        titleTemplate: '{{subject}}',
        descriptionTemplate: '{{body}}',
        timeStrategy: { type: 'parse_from_body', durationMinutes: 60 },
        isPublic: true,
        createdBy: 'user1',
      });

      const template2 = await service.createTemplate({
        name: 'Template 2',
        description: 'Template 2',
        category: 'task',
        gmailQueryTemplate: 'label:todo',
        titleTemplate: '{{subject}}',
        descriptionTemplate: '{{body}}',
        timeStrategy: { type: 'fixed_delay', delayHours: 1, durationMinutes: 30 },
        isPublic: true,
        createdBy: 'user1',
      });

      // Simulate usage
      await service.cloneToRule(template2.id);
      await service.cloneToRule(template2.id);
      await service.cloneToRule(template2.id);
      await service.cloneToRule(template1.id);
    });

    it('should return templates sorted by usage', async () => {
      const popular = await service.getPopularTemplates();

      expect(popular).toHaveLength(2);
      expect(popular[0].name).toBe('Template 2'); // 3 uses
      expect(popular[1].name).toBe('Template 1'); // 1 use
    });

    it('should limit results', async () => {
      const popular = await service.getPopularTemplates(1);

      expect(popular).toHaveLength(1);
      expect(popular[0].name).toBe('Template 2');
    });
  });
});
