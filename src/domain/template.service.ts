/**
 * Rule Template Service
 *
 * Manages rule templates for the marketplace/library functionality.
 * Templates are pre-configured rules that users can clone and customize.
 */

import { RuleTemplate, RuleTemplateInput, RuleInput, RetryConfig } from '../db/types';
import { getLogger } from '../lib/logger';
import { getEventEmitter } from '../lib/events';

const logger = getLogger({ service: 'template-service' });

export interface TemplateRepository {
  create(input: RuleTemplateInput): Promise<RuleTemplate>;
  findById(id: number): Promise<RuleTemplate | null>;
  findAll(filters?: { category?: string; tags?: string[]; isPublic?: boolean }): Promise<RuleTemplate[]>;
  update(id: number, input: Partial<RuleTemplateInput>): Promise<RuleTemplate>;
  delete(id: number): Promise<void>;
  incrementUsage(id: number): Promise<void>;
}

export class TemplateService {
  constructor(private repository: TemplateRepository) {}

  /**
   * Create a new template
   */
  async createTemplate(input: RuleTemplateInput): Promise<RuleTemplate> {
    logger.info('Creating new template', { name: input.name });

    const template = await this.repository.create(input);

    getEventEmitter().emit({
      type: 'template.cloned',
      timestamp: new Date().toISOString(),
      payload: {
        templateId: template.id,
        name: template.name,
      },
    });

    return template;
  }

  /**
   * Get template by ID
   */
  async getTemplate(id: number): Promise<RuleTemplate | null> {
    return this.repository.findById(id);
  }

  /**
   * Browse templates
   */
  async browseTemplates(filters?: {
    category?: string;
    tags?: string[];
    isPublic?: boolean;
  }): Promise<RuleTemplate[]> {
    return this.repository.findAll(filters);
  }

  /**
   * Clone template to create a new rule
   */
  async cloneToRule(templateId: number, customizations?: Partial<RuleInput>): Promise<RuleInput> {
    const template = await this.repository.findById(templateId);

    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    // Increment usage counter
    await this.repository.incrementUsage(templateId);

    logger.info('Cloning template to rule', { templateId, templateName: template.name });

    // Build rule from template
    const rule: RuleInput = {
      name: customizations?.name || `${template.name} (from template)`,
      description: customizations?.description || template.description,
      gmailQuery: customizations?.gmailQuery || template.gmailQueryTemplate,
      calendarId: customizations?.calendarId || 'primary',
      titleTemplate: customizations?.titleTemplate || template.titleTemplate,
      descriptionTemplate: customizations?.descriptionTemplate || template.descriptionTemplate,
      timeStrategy: customizations?.timeStrategy || template.timeStrategy,
      isActive: customizations?.isActive !== undefined ? customizations.isActive : true,
      priority: customizations?.priority || 0,
      retryConfig: customizations?.retryConfig || template.retryConfig,
      metadata: { ...template.metadata, ...customizations?.metadata },
      tags: customizations?.tags || template.tags,
      templateId: templateId,
    };

    return rule;
  }

  /**
   * Update template
   */
  async updateTemplate(id: number, input: Partial<RuleTemplateInput>): Promise<RuleTemplate> {
    logger.info('Updating template', { templateId: id });
    return this.repository.update(id, input);
  }

  /**
   * Delete template
   */
  async deleteTemplate(id: number): Promise<void> {
    logger.info('Deleting template', { templateId: id });
    await this.repository.delete(id);
  }

  /**
   * Get templates by category
   */
  async getTemplatesByCategory(category: string): Promise<RuleTemplate[]> {
    return this.repository.findAll({ category, isPublic: true });
  }

  /**
   * Get popular templates
   */
  async getPopularTemplates(limit: number = 10): Promise<RuleTemplate[]> {
    const templates = await this.repository.findAll({ isPublic: true });
    return templates.sort((a, b) => b.usageCount - a.usageCount).slice(0, limit);
  }
}

/**
 * In-memory template repository (for development)
 */
export class InMemoryTemplateRepository implements TemplateRepository {
  private templates: Map<number, RuleTemplate> = new Map();
  private nextId: number = 1;

  async create(input: RuleTemplateInput): Promise<RuleTemplate> {
    const template: RuleTemplate = {
      id: this.nextId++,
      ...input,
      retryConfig: input.retryConfig || { maxRetries: 3, retryDelayMs: 1000, exponentialBackoff: true },
      metadata: input.metadata || {},
      tags: input.tags || [],
      isPublic: input.isPublic !== undefined ? input.isPublic : false,
      usageCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.templates.set(template.id, template);
    return template;
  }

  async findById(id: number): Promise<RuleTemplate | null> {
    return this.templates.get(id) || null;
  }

  async findAll(filters?: {
    category?: string;
    tags?: string[];
    isPublic?: boolean;
  }): Promise<RuleTemplate[]> {
    let results = Array.from(this.templates.values());

    if (filters?.category) {
      results = results.filter(t => t.category === filters.category);
    }

    if (filters?.tags && filters.tags.length > 0) {
      results = results.filter(t =>
        filters.tags!.some(tag => t.tags.includes(tag))
      );
    }

    if (filters?.isPublic !== undefined) {
      results = results.filter(t => t.isPublic === filters.isPublic);
    }

    return results;
  }

  async update(id: number, input: Partial<RuleTemplateInput>): Promise<RuleTemplate> {
    const template = this.templates.get(id);
    if (!template) {
      throw new Error(`Template ${id} not found`);
    }

    const updated: RuleTemplate = {
      ...template,
      ...input,
      updatedAt: new Date().toISOString(),
    };

    this.templates.set(id, updated);
    return updated;
  }

  async delete(id: number): Promise<void> {
    this.templates.delete(id);
  }

  async incrementUsage(id: number): Promise<void> {
    const template = this.templates.get(id);
    if (template) {
      template.usageCount++;
      template.updatedAt = new Date().toISOString();
    }
  }

  // Utility methods
  clear(): void {
    this.templates.clear();
    this.nextId = 1;
  }
}
