/**
 * Simple template engine
 * Replaces {{variable}} with actual values
 */
export class TemplateEngine {
  static render(template: string, data: Record<string, any>): string {
    let result = template;

    Object.keys(data).forEach(key => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      const value = data[key] || '';
      result = result.replace(regex, String(value));
    });

    return result;
  }

  static extractVariables(template: string): string[] {
    const regex = /{{\\s*([a-zA-Z0-9_]+)\\s*}}/g;
    const variables: string[] = [];
    let match;

    while ((match = regex.exec(template)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }

    return variables;
  }
}
