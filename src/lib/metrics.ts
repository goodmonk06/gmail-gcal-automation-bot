/**
 * Metrics Collection Framework
 *
 * Provides a simple abstraction for collecting application metrics.
 * Can be extended to integrate with Prometheus, DataDog, CloudWatch, etc.
 */

export interface MetricLabels {
  [key: string]: string | number;
}

export type MetricType = 'counter' | 'gauge' | 'histogram';

export interface Metric {
  name: string;
  type: MetricType;
  value: number;
  labels?: MetricLabels;
  timestamp: string;
}

/**
 * Metrics Collector Interface
 * Implement this interface to integrate with different monitoring systems
 */
export interface IMetricsCollector {
  /**
   * Increment a counter metric
   */
  incrementCounter(name: string, value?: number, labels?: MetricLabels): void;

  /**
   * Set a gauge metric
   */
  setGauge(name: string, value: number, labels?: MetricLabels): void;

  /**
   * Record a histogram value (for timing, sizes, etc.)
   */
  recordHistogram(name: string, value: number, labels?: MetricLabels): void;

  /**
   * Get all recorded metrics
   */
  getMetrics(): Metric[];

  /**
   * Reset all metrics
   */
  reset(): void;
}

/**
 * In-memory metrics collector
 * Stores metrics in memory for development and testing
 */
export class InMemoryMetricsCollector implements IMetricsCollector {
  private metrics: Metric[] = [];
  private maxMetrics: number = 10000;

  incrementCounter(name: string, value: number = 1, labels?: MetricLabels): void {
    this.addMetric({
      name,
      type: 'counter',
      value,
      labels,
      timestamp: new Date().toISOString(),
    });
  }

  setGauge(name: string, value: number, labels?: MetricLabels): void {
    this.addMetric({
      name,
      type: 'gauge',
      value,
      labels,
      timestamp: new Date().toISOString(),
    });
  }

  recordHistogram(name: string, value: number, labels?: MetricLabels): void {
    this.addMetric({
      name,
      type: 'histogram',
      value,
      labels,
      timestamp: new Date().toISOString(),
    });
  }

  getMetrics(): Metric[] {
    return [...this.metrics];
  }

  reset(): void {
    this.metrics = [];
  }

  private addMetric(metric: Metric): void {
    this.metrics.push(metric);

    // Prevent memory leaks by limiting stored metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  /**
   * Get aggregated metrics by name
   */
  getAggregated(name: string): { count: number; sum: number; avg: number; min: number; max: number } {
    const filtered = this.metrics.filter(m => m.name === name);
    if (filtered.length === 0) {
      return { count: 0, sum: 0, avg: 0, min: 0, max: 0 };
    }

    const values = filtered.map(m => m.value);
    return {
      count: filtered.length,
      sum: values.reduce((a, b) => a + b, 0),
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
    };
  }
}

/**
 * No-op metrics collector for production when metrics are disabled
 */
export class NoOpMetricsCollector implements IMetricsCollector {
  incrementCounter(): void { }
  setGauge(): void { }
  recordHistogram(): void { }
  getMetrics(): Metric[] { return []; }
  reset(): void { }
}

// Common metric names
export const MetricNames = {
  RULE_EXECUTION_TOTAL: 'rule.execution.total',
  RULE_EXECUTION_DURATION: 'rule.execution.duration_ms',
  RULE_EXECUTION_SUCCESS: 'rule.execution.success',
  RULE_EXECUTION_FAILED: 'rule.execution.failed',
  RULE_EXECUTION_SKIPPED: 'rule.execution.skipped',
  GMAIL_API_CALLS: 'gmail.api.calls',
  GMAIL_API_ERRORS: 'gmail.api.errors',
  CALENDAR_API_CALLS: 'calendar.api.calls',
  CALENDAR_API_ERRORS: 'calendar.api.errors',
  CALENDAR_EVENTS_CREATED: 'calendar.events.created',
  DB_QUERY_DURATION: 'db.query.duration_ms',
  HTTP_REQUEST_DURATION: 'http.request.duration_ms',
  HTTP_REQUEST_TOTAL: 'http.request.total',
} as const;

// Global metrics collector
let globalCollector: IMetricsCollector | null = null;

export function getMetricsCollector(): IMetricsCollector {
  if (!globalCollector) {
    globalCollector = process.env.NODE_ENV === 'production'
      ? new NoOpMetricsCollector()
      : new InMemoryMetricsCollector();
  }
  return globalCollector;
}

export function setMetricsCollector(collector: IMetricsCollector): void {
  globalCollector = collector;
}

/**
 * Utility to measure function execution time
 */
export async function measureAsync<T>(
  name: string,
  fn: () => Promise<T>,
  labels?: MetricLabels
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    const duration = Date.now() - start;
    getMetricsCollector().recordHistogram(name, duration, labels);
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    getMetricsCollector().recordHistogram(name, duration, { ...labels, error: 'true' });
    throw error;
  }
}
