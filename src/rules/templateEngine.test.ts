import { describe, it, expect } from 'vitest';
import { TemplateEngine } from './templateEngine';

describe('TemplateEngine', () => {
  describe('render', () => {
    it('should replace single variable', () => {
      const template = 'Hello {{name}}!';
      const data = { name: 'World' };
      const result = TemplateEngine.render(template, data);
      expect(result).toBe('Hello World!');
    });

    it('should replace multiple variables', () => {
      const template = '{{subject}} from {{from}}';
      const data = { subject: 'Meeting', from: 'john@example.com' };
      const result = TemplateEngine.render(template, data);
      expect(result).toBe('Meeting from john@example.com');
    });

    it('should handle missing variables by replacing with empty string', () => {
      const template = 'Hello {{name}}, welcome to {{place}}!';
      const data = { name: 'Alice' };
      const result = TemplateEngine.render(template, data);
      expect(result).toBe('Hello Alice, welcome to !');
    });

    it('should handle variables with spaces', () => {
      const template = '{{ name }} - {{  title  }}';
      const data = { name: 'Bob', title: 'Engineer' };
      const result = TemplateEngine.render(template, data);
      expect(result).toBe('Bob - Engineer');
    });

    it('should handle duplicate variables', () => {
      const template = '{{name}} and {{name}} are friends';
      const data = { name: 'Alice' };
      const result = TemplateEngine.render(template, data);
      expect(result).toBe('Alice and Alice are friends');
    });

    it('should handle special characters in values', () => {
      const template = 'Subject: {{subject}}';
      const data = { subject: 'Re: Important! $100 offer (50% off)' };
      const result = TemplateEngine.render(template, data);
      expect(result).toBe('Subject: Re: Important! $100 offer (50% off)');
    });
  });

  describe('extractVariables', () => {
    it('should extract single variable', () => {
      const template = 'Hello {{name}}!';
      const variables = TemplateEngine.extractVariables(template);
      expect(variables).toEqual(['name']);
    });

    it('should extract multiple variables', () => {
      const template = '{{subject}} from {{from}} to {{to}}';
      const variables = TemplateEngine.extractVariables(template);
      expect(variables).toEqual(['subject', 'from', 'to']);
    });

    it('should extract unique variables only', () => {
      const template = '{{name}} and {{name}} are {{status}}';
      const variables = TemplateEngine.extractVariables(template);
      expect(variables).toEqual(['name', 'status']);
    });

    it('should return empty array when no variables', () => {
      const template = 'No variables here';
      const variables = TemplateEngine.extractVariables(template);
      expect(variables).toEqual([]);
    });

    it('should handle variables with spaces', () => {
      const template = '{{ name }} and {{  title  }}';
      const variables = TemplateEngine.extractVariables(template);
      expect(variables).toEqual(['name', 'title']);
    });
  });
});
