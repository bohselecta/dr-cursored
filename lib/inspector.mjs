import { performance } from 'node:perf_hooks';
import { randomUUID } from 'node:crypto';
import { logger } from './logger.mjs';

export class Inspector {
  constructor(options = {}) {
    this.logger = options.logger || logger;
    this.activeInspections = new Map();
    this.metrics = new Map();
    this.traces = [];
  }

  // Performance inspection
  startTimer(label) {
    const id = randomUUID();
    const startTime = performance.now();
    
    this.activeInspections.set(id, {
      label,
      startTime,
      type: 'timer'
    });
    
    return id;
  }

  endTimer(id) {
    const inspection = this.activeInspections.get(id);
    if (!inspection) {
      this.logger.warn('Timer not found', { id });
      return null;
    }
    
    const duration = performance.now() - inspection.startTime;
    this.activeInspections.delete(id);
    
    const result = {
      label: inspection.label,
      duration: Math.round(duration * 100) / 100,
      timestamp: new Date().toISOString()
    };
    
    this.logger.debug('Timer completed', result);
    return result;
  }

  // Memory inspection
  inspectMemory() {
    const usage = process.memoryUsage();
    const result = {
      timestamp: new Date().toISOString(),
      rss: Math.round(usage.rss / 1024 / 1024), // MB
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
      external: Math.round(usage.external / 1024 / 1024), // MB
      arrayBuffers: Math.round(usage.arrayBuffers / 1024 / 1024) // MB
    };
    
    this.logger.debug('Memory inspection', result);
    return result;
  }

  // CPU inspection
  inspectCPU() {
    const cpus = require('os').cpus();
    const loadAvg = require('os').loadavg();
    
    const result = {
      timestamp: new Date().toISOString(),
      cores: cpus.length,
      loadAverage: {
        '1min': Math.round(loadAvg[0] * 100) / 100,
        '5min': Math.round(loadAvg[1] * 100) / 100,
        '15min': Math.round(loadAvg[2] * 100) / 100
      },
      model: cpus[0]?.model || 'Unknown'
    };
    
    this.logger.debug('CPU inspection', result);
    return result;
  }

  // Function inspection
  inspectFunction(fn, context = {}) {
    const originalFn = fn;
    const functionId = randomUUID();
    
    return async (...args) => {
      const timerId = this.startTimer(`function:${fn.name || 'anonymous'}`);
      const startMemory = this.inspectMemory();
      
      try {
        const result = await originalFn.apply(context, args);
        const endMemory = this.inspectMemory();
        const timer = this.endTimer(timerId);
        
        this.logger.debug('Function executed', {
          functionId,
          name: fn.name || 'anonymous',
          duration: timer?.duration,
          memoryDelta: endMemory.heapUsed - startMemory.heapUsed,
          args: args.length,
          success: true
        });
        
        return result;
      } catch (error) {
        const endMemory = this.inspectMemory();
        const timer = this.endTimer(timerId);
        
        this.logger.error('Function failed', {
          functionId,
          name: fn.name || 'anonymous',
          duration: timer?.duration,
          memoryDelta: endMemory.heapUsed - startMemory.heapUsed,
          args: args.length,
          error: error.message,
          success: false
        });
        
        throw error;
      }
    };
  }

  // HTTP request inspection
  inspectHttpRequest(req, res, next) {
    const requestId = randomUUID().slice(0, 8);
    const startTime = performance.now();
    const startMemory = this.inspectMemory();
    
    req.inspectionId = requestId;
    req.startTime = startTime;
    req.startMemory = startMemory;
    
    // Log request start
    this.logger.info('HTTP request started', {
      requestId,
      method: req.method,
      url: req.url,
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.connection.remoteAddress
    });
    
    // Override res.end to capture response
    const originalEnd = res.end;
    res.end = function(...args) {
      const endTime = performance.now();
      const endMemory = this.inspectMemory();
      const duration = endTime - startTime;
      
      this.logger.info('HTTP request completed', {
        requestId,
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration: Math.round(duration * 100) / 100,
        memoryDelta: endMemory.heapUsed - startMemory.heapUsed,
        contentLength: res.get('content-length') || 0
      });
      
      return originalEnd.apply(res, args);
    }.bind(this);
    
    if (next) next();
  }

  // Database query inspection
  inspectDatabaseQuery(queryFn, context = {}) {
    return async (...args) => {
      const queryId = randomUUID().slice(0, 8);
      const timerId = this.startTimer(`db-query:${queryId}`);
      
      try {
        const result = await queryFn.apply(context, args);
        const timer = this.endTimer(timerId);
        
        this.logger.debug('Database query executed', {
          queryId,
          duration: timer?.duration,
          success: true,
          resultType: Array.isArray(result) ? 'array' : typeof result,
          resultCount: Array.isArray(result) ? result.length : 1
        });
        
        return result;
      } catch (error) {
        const timer = this.endTimer(timerId);
        
        this.logger.error('Database query failed', {
          queryId,
          duration: timer?.duration,
          error: error.message,
          success: false
        });
        
        throw error;
      }
    };
  }

  // Trace collection
  startTrace(label, metadata = {}) {
    const traceId = randomUUID();
    const startTime = performance.now();
    
    const trace = {
      id: traceId,
      label,
      startTime,
      metadata,
      children: [],
      parent: null
    };
    
    this.traces.push(trace);
    return traceId;
  }

  endTrace(traceId, result = {}) {
    const trace = this.traces.find(t => t.id === traceId);
    if (!trace) {
      this.logger.warn('Trace not found', { traceId });
      return null;
    }
    
    const endTime = performance.now();
    const duration = endTime - trace.startTime;
    
    trace.endTime = endTime;
    trace.duration = Math.round(duration * 100) / 100;
    trace.result = result;
    
    this.logger.debug('Trace completed', {
      traceId,
      label: trace.label,
      duration: trace.duration,
      metadata: trace.metadata,
      result
    });
    
    return trace;
  }

  // Metrics collection
  recordMetric(name, value, tags = {}) {
    const metric = {
      name,
      value,
      tags,
      timestamp: new Date().toISOString()
    };
    
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    
    this.metrics.get(name).push(metric);
    
    // Keep only last 1000 metrics per name
    const metrics = this.metrics.get(name);
    if (metrics.length > 1000) {
      metrics.splice(0, metrics.length - 1000);
    }
    
    this.logger.debug('Metric recorded', metric);
  }

  getMetrics(name) {
    return this.metrics.get(name) || [];
  }

  getMetricSummary(name) {
    const metrics = this.getMetrics(name);
    if (metrics.length === 0) return null;
    
    const values = metrics.map(m => m.value);
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    
    return {
      name,
      count: values.length,
      sum,
      average: Math.round(avg * 100) / 100,
      min,
      max,
      lastValue: values[values.length - 1]
    };
  }

  // System inspection
  inspectSystem() {
    const memory = this.inspectMemory();
    const cpu = this.inspectCPU();
    const uptime = process.uptime();
    
    return {
      timestamp: new Date().toISOString(),
      uptime: Math.round(uptime),
      memory,
      cpu,
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch
    };
  }

  // Error inspection
  inspectError(error, context = {}) {
    const errorId = randomUUID().slice(0, 8);
    const system = this.inspectSystem();
    
    const errorInfo = {
      id: errorId,
      name: error.name,
      message: error.message,
      stack: error.stack,
      context,
      system,
      timestamp: new Date().toISOString()
    };
    
    this.logger.error('Error inspected', errorInfo);
    return errorInfo;
  }

  // Get inspection report
  getReport() {
    const activeInspections = Array.from(this.activeInspections.values());
    const traces = this.traces.filter(t => t.endTime);
    const metrics = {};
    
    for (const [name, values] of this.metrics.entries()) {
      metrics[name] = this.getMetricSummary(name);
    }
    
    return {
      timestamp: new Date().toISOString(),
      activeInspections: activeInspections.length,
      completedTraces: traces.length,
      metrics: Object.keys(metrics).length,
      system: this.inspectSystem(),
      traces: traces.slice(-10), // Last 10 traces
      metrics
    };
  }

  // Clear all data
  clear() {
    this.activeInspections.clear();
    this.metrics.clear();
    this.traces.length = 0;
    this.logger.debug('Inspector data cleared');
  }
}

// Create default inspector
export const inspector = new Inspector();

// Utility functions
export const createInspector = (options) => new Inspector(options);

// Middleware helpers
export const createInspectionMiddleware = (inspector) => {
  return {
    http: (req, res, next) => inspector.inspectHttpRequest(req, res, next),
    error: (error, req, res, next) => {
      inspector.inspectError(error, {
        method: req.method,
        url: req.url,
        requestId: req.inspectionId
      });
      if (next) next(error);
    }
  };
};
