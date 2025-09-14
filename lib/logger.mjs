import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import chalk from 'chalk';

export class Logger {
  constructor(options = {}) {
    this.service = options.service || 'app';
    this.level = options.level || 'info';
    this.format = options.format || 'json';
    this.enableColors = options.colors !== false;
    this.context = options.context || {};
    this.requestId = options.requestId || this.generateRequestId();
  }

  static levels = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
  };

  static colors = {
    debug: chalk.cyan,
    info: chalk.green, 
    warn: chalk.yellow,
    error: chalk.red,
    reset: chalk.reset
  };

  shouldLog(level) {
    return Logger.levels[level] >= Logger.levels[this.level];
  }

  log(level, message, meta = {}) {
    if (!this.shouldLog(level)) return;

    const entry = {
      timestamp: new Date().toISOString(),
      level,
      service: this.service,
      message,
      requestId: this.requestId,
      ...this.context,
      ...meta
    };

    if (this.format === 'json') {
      console.log(JSON.stringify(entry));
    } else {
      const color = this.enableColors ? Logger.colors[level] : (x) => x;
      const prefix = color(`[${level.toUpperCase()}]`);
      const timestamp = this.enableColors ? chalk.gray(entry.timestamp) : entry.timestamp;
      const service = this.enableColors ? chalk.blue(`[${this.service}]`) : `[${this.service}]`;
      const requestId = this.enableColors ? chalk.magenta(`[${this.requestId}]`) : `[${this.requestId}]`;
      
      console.log(`${prefix} ${timestamp} ${service} ${requestId} ${message}`, 
        Object.keys(meta).length > 0 ? meta : '');
    }
  }

  debug(message, meta) { this.log('debug', message, meta); }
  info(message, meta) { this.log('info', message, meta); }
  warn(message, meta) { this.log('warn', message, meta); }
  error(message, meta) { this.log('error', message, meta); }

  child(context) {
    return new Logger({
      service: this.service,
      level: this.level,
      format: this.format,
      colors: this.enableColors,
      context: { ...this.context, ...context },
      requestId: this.requestId
    });
  }

  timer(label) {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      this.debug(`Timer ${label}`, { duration: Math.round(duration * 100) / 100 });
      return Math.round(duration * 100) / 100;
    };
  }

  generateRequestId() {
    return randomUUID().slice(0, 8);
  }

  requestId() {
    return this.requestId;
  }

  // Performance logging
  performance(operation, fn) {
    const timer = this.timer(operation);
    try {
      const result = fn();
      if (result && typeof result.then === 'function') {
        return result.then(res => {
          timer();
          return res;
        });
      } else {
        timer();
        return result;
      }
    } catch (error) {
      timer();
      throw error;
    }
  }

  // HTTP request logging
  httpRequest(req, res, startTime) {
    const duration = performance.now() - startTime;
    const status = res.statusCode;
    const level = status >= 400 ? 'error' : status >= 300 ? 'warn' : 'info';
    
    this.log(level, 'HTTP Request', {
      method: req.method,
      url: req.url,
      status,
      duration: Math.round(duration * 100) / 100,
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.connection.remoteAddress
    });
  }

  // Error logging with stack trace
  errorWithStack(message, error, meta = {}) {
    this.error(message, {
      ...meta,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    });
  }

  // Structured logging for common operations
  operation(operation, fn, meta = {}) {
    this.debug(`Starting operation: ${operation}`, meta);
    const timer = this.timer(operation);
    
    try {
      const result = fn();
      if (result && typeof result.then === 'function') {
        return result.then(res => {
          timer();
          this.info(`Operation completed: ${operation}`, { ...meta, success: true });
          return res;
        }).catch(err => {
          timer();
          this.error(`Operation failed: ${operation}`, { ...meta, success: false, error: err.message });
          throw err;
        });
      } else {
        timer();
        this.info(`Operation completed: ${operation}`, { ...meta, success: true });
        return result;
      }
    } catch (error) {
      timer();
      this.error(`Operation failed: ${operation}`, { ...meta, success: false, error: error.message });
      throw error;
    }
  }
}

// Create default logger instance
export const logger = new Logger();

// Create specialized loggers
export const createLogger = (options) => new Logger(options);

// Common logger configurations
export const loggers = {
  development: new Logger({ level: 'debug', format: 'text', colors: true }),
  production: new Logger({ level: 'info', format: 'json', colors: false }),
  test: new Logger({ level: 'error', format: 'text', colors: false })
};

// Middleware for Express/Fastify
export const requestLogger = (req, res, next) => {
  const startTime = performance.now();
  const requestId = randomUUID().slice(0, 8);
  
  req.logger = logger.child({ requestId, method: req.method, url: req.url });
  req.requestId = requestId;
  
  res.on('finish', () => {
    logger.httpRequest(req, res, startTime);
  });
  
  if (next) next();
};

// Error handler middleware
export const errorLogger = (error, req, res, next) => {
  const logger = req.logger || createLogger();
  logger.errorWithStack('Unhandled error', error, {
    method: req.method,
    url: req.url,
    requestId: req.requestId
  });
  
  if (next) next(error);
};
