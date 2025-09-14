import { describe, it, expect } from 'vitest';
import { Logger } from '../lib/logger.mjs';

describe('Logger', () => {
  it('should create a logger instance', () => {
    const logger = new Logger();
    expect(logger).toBeDefined();
    expect(logger.service).toBe('app');
    expect(logger.level).toBe('info');
  });

  it('should create a child logger with context', () => {
    const parentLogger = new Logger({ service: 'parent' });
    const childLogger = parentLogger.child({ requestId: '123' });
    
    expect(childLogger.service).toBe('parent');
    expect(childLogger.context.requestId).toBe('123');
  });

  it('should respect log levels', () => {
    const logger = new Logger({ level: 'warn' });
    
    // Should not log debug messages
    expect(logger.shouldLog('debug')).toBe(false);
    expect(logger.shouldLog('info')).toBe(false);
    expect(logger.shouldLog('warn')).toBe(true);
    expect(logger.shouldLog('error')).toBe(true);
  });

  it('should generate request IDs', () => {
    const logger = new Logger();
    const requestId = logger.generateRequestId();
    
    expect(requestId).toBeDefined();
    expect(typeof requestId).toBe('string');
    expect(requestId.length).toBe(8);
  });

  it('should create timer functions', () => {
    const logger = new Logger();
    const timer = logger.timer('test-timer');
    
    expect(typeof timer).toBe('function');
    
    // Test timer functionality
    const duration = timer();
    expect(typeof duration).toBe('number');
    expect(duration).toBeGreaterThanOrEqual(0);
  });
});
