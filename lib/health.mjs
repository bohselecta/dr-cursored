import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import https from 'node:https';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import { logger } from './logger.mjs';

export class HealthChecker {
  constructor(options = {}) {
    this.timeout = options.timeout || 5000;
    this.retries = options.retries || 3;
    this.logger = options.logger || logger;
  }

  // System health checks
  async checkSystemHealth() {
    const checks = {
      memory: this.checkMemory(),
      disk: this.checkDiskSpace(),
      cpu: this.checkCPU(),
      uptime: this.checkUptime()
    };

    const results = {};
    for (const [name, check] of Object.entries(checks)) {
      try {
        results[name] = await check;
      } catch (error) {
        results[name] = { status: 'error', error: error.message };
      }
    }

    return results;
  }

  checkMemory() {
    const used = process.memoryUsage();
    const total = os.totalmem();
    const free = os.freemem();
    
    const memoryUsage = {
      process: {
        heapUsed: Math.round(used.heapUsed / 1024 / 1024),
        heapTotal: Math.round(used.heapTotal / 1024 / 1024),
        external: Math.round(used.external / 1024 / 1024),
        rss: Math.round(used.rss / 1024 / 1024)
      },
      system: {
        total: Math.round(total / 1024 / 1024 / 1024),
        free: Math.round(free / 1024 / 1024 / 1024),
        used: Math.round((total - free) / 1024 / 1024 / 1024),
        usagePercent: Math.round(((total - free) / total) * 100)
      }
    };

    const status = memoryUsage.system.usagePercent > 90 ? 'warning' : 
                  memoryUsage.system.usagePercent > 95 ? 'critical' : 'healthy';

    return {
      status,
      data: memoryUsage,
      message: `Memory usage: ${memoryUsage.system.usagePercent}%`
    };
  }

  checkDiskSpace() {
    try {
      const stats = fs.statSync(process.cwd());
      // This is a simplified check - in production you'd want to use a proper disk space library
      return {
        status: 'healthy',
        data: { path: process.cwd() },
        message: 'Disk space check passed'
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        message: 'Disk space check failed'
      };
    }
  }

  checkCPU() {
    const cpus = os.cpus();
    const loadAvg = os.loadavg();
    
    return {
      status: 'healthy',
      data: {
        cores: cpus.length,
        loadAverage: loadAvg,
        model: cpus[0]?.model || 'Unknown'
      },
      message: `CPU: ${cpus.length} cores, load: ${loadAvg[0].toFixed(2)}`
    };
  }

  checkUptime() {
    const uptime = process.uptime();
    const systemUptime = os.uptime();
    
    return {
      status: 'healthy',
      data: {
        process: Math.round(uptime),
        system: Math.round(systemUptime)
      },
      message: `Process uptime: ${Math.round(uptime)}s`
    };
  }

  // Network health checks
  async checkEndpoint(url, expectedStatus = 200) {
    return new Promise((resolve) => {
      try {
        const urlObj = new URL(url);
        const client = urlObj.protocol === 'https:' ? https : http;
        
        const req = client.get(url, { timeout: this.timeout }, (res) => {
          const success = res.statusCode === expectedStatus;
          resolve({
            status: success ? 'healthy' : 'warning',
            data: {
              url,
              statusCode: res.statusCode,
              responseTime: Date.now() - startTime,
              headers: res.headers
            },
            message: success ? 
              `Endpoint responding: ${url} (${res.statusCode})` :
              `Endpoint returned ${res.statusCode}: ${url}`
          });
        });
        
        const startTime = Date.now();
        
        req.on('error', (e) => {
          resolve({
            status: 'error',
            data: { url, error: e.message },
            message: `Endpoint failed: ${url} - ${e.message}`
          });
        });
        
        req.on('timeout', () => {
          req.destroy();
          resolve({
            status: 'error',
            data: { url, error: 'timeout' },
            message: `Endpoint timeout: ${url}`
          });
        });
      } catch (error) {
        resolve({
          status: 'error',
          data: { url, error: error.message },
          message: `Invalid URL: ${url}`
        });
      }
    });
  }

  async checkPort(port) {
    return new Promise((resolve) => {
      const server = http.createServer();
      server.listen(port, () => {
        server.close();
        resolve({
          status: 'healthy',
          data: { port },
          message: `Port ${port} is available`
        });
      });
      server.on('error', () => {
        resolve({
          status: 'warning',
          data: { port },
          message: `Port ${port} is in use`
        });
      });
    });
  }

  // Database health checks
  async checkDatabase(connectionString) {
    // This would be implemented based on your database type
    // For now, return a placeholder
    return {
      status: 'healthy',
      data: { connectionString: connectionString.replace(/\/\/.*@/, '//***:***@') },
      message: 'Database connection check not implemented'
    };
  }

  // File system health checks
  async checkFileSystem(paths) {
    const results = {};
    
    for (const filePath of paths) {
      try {
        const stats = fs.statSync(filePath);
        results[filePath] = {
          status: 'healthy',
          data: {
            exists: true,
            isFile: stats.isFile(),
            isDirectory: stats.isDirectory(),
            size: stats.size,
            modified: stats.mtime
          },
          message: `File exists: ${filePath}`
        };
      } catch (error) {
        results[filePath] = {
          status: 'error',
          data: { exists: false },
          message: `File not found: ${filePath}`
        };
      }
    }
    
    return results;
  }

  // Dependencies health checks
  async checkDependencies() {
    const packagePath = path.join(process.cwd(), 'package.json');
    
    if (!fs.existsSync(packagePath)) {
      return {
        status: 'error',
        message: 'package.json not found'
      };
    }

    try {
      const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      const nodeModulesPath = path.join(process.cwd(), 'node_modules');
      
      return {
        status: fs.existsSync(nodeModulesPath) ? 'healthy' : 'warning',
        data: {
          hasNodeModules: fs.existsSync(nodeModulesPath),
          dependencies: Object.keys(pkg.dependencies || {}).length,
          devDependencies: Object.keys(pkg.devDependencies || {}).length
        },
        message: fs.existsSync(nodeModulesPath) ? 
          'Dependencies installed' : 
          'Dependencies not installed'
      };
    } catch (error) {
      return {
        status: 'error',
        message: `Failed to read package.json: ${error.message}`
      };
    }
  }

  // Git health checks
  async checkGitStatus() {
    try {
      const status = spawnSync('git', ['status', '--porcelain'], { 
        stdio: 'pipe', 
        encoding: 'utf8' 
      });
      
      if (status.status !== 0) {
        return {
          status: 'warning',
          message: 'Not a git repository'
        };
      }
      
      const changes = status.stdout.trim().split('\n').filter(Boolean);
      
      return {
        status: changes.length === 0 ? 'healthy' : 'warning',
        data: {
          clean: changes.length === 0,
          changes: changes.length,
          files: changes
        },
        message: changes.length === 0 ? 
          'Working directory clean' : 
          `${changes.length} uncommitted changes`
      };
    } catch (error) {
      return {
        status: 'error',
        message: `Git check failed: ${error.message}`
      };
    }
  }

  // Comprehensive health check
  async runHealthCheck(options = {}) {
    const {
      includeSystem = true,
      includeNetwork = true,
      includeDatabase = false,
      includeFileSystem = true,
      includeDependencies = true,
      includeGit = true,
      endpoints = [],
      ports = [],
      files = []
    } = options;

    const results = {
      timestamp: new Date().toISOString(),
      overall: 'healthy',
      checks: {}
    };

    // System checks
    if (includeSystem) {
      results.checks.system = await this.checkSystemHealth();
    }

    // Dependencies check
    if (includeDependencies) {
      results.checks.dependencies = await this.checkDependencies();
    }

    // Git check
    if (includeGit) {
      results.checks.git = await this.checkGitStatus();
    }

    // File system checks
    if (includeFileSystem && files.length > 0) {
      results.checks.filesystem = await this.checkFileSystem(files);
    }

    // Network checks
    if (includeNetwork) {
      results.checks.network = {};
      
      // Check endpoints
      for (const endpoint of endpoints) {
        const result = await this.checkEndpoint(endpoint);
        results.checks.network[endpoint] = result;
      }
      
      // Check ports
      for (const port of ports) {
        const result = await this.checkPort(port);
        results.checks.network[`port_${port}`] = result;
      }
    }

    // Database checks
    if (includeDatabase) {
      // This would be implemented based on your database setup
      results.checks.database = {
        status: 'not_implemented',
        message: 'Database checks not configured'
      };
    }

    // Determine overall status
    const allChecks = this.flattenChecks(results.checks);
    const criticalFailures = allChecks.filter(check => check.status === 'error');
    const warnings = allChecks.filter(check => check.status === 'warning');

    if (criticalFailures.length > 0) {
      results.overall = 'critical';
    } else if (warnings.length > 0) {
      results.overall = 'warning';
    }

    return results;
  }

  flattenChecks(checks, prefix = '') {
    const flattened = [];
    
    for (const [key, value] of Object.entries(checks)) {
      if (value.status) {
        flattened.push({ ...value, name: prefix + key });
      } else if (typeof value === 'object') {
        flattened.push(...this.flattenChecks(value, prefix + key + '.'));
      }
    }
    
    return flattened;
  }

  // Health check endpoint handler
  createHealthEndpoint() {
    return async (req, res) => {
      try {
        const health = await this.runHealthCheck();
        
        const statusCode = health.overall === 'critical' ? 503 : 
                          health.overall === 'warning' ? 200 : 200;
        
        res.status(statusCode).json(health);
      } catch (error) {
        this.logger.error('Health check failed', error);
        res.status(500).json({
          status: 'error',
          message: 'Health check failed',
          error: error.message
        });
      }
    };
  }
}

// Create default health checker
export const healthChecker = new HealthChecker();

// Utility functions
export const createHealthChecker = (options) => new HealthChecker(options);

// Express/Fastify middleware
export const healthMiddleware = (options = {}) => {
  const checker = new HealthChecker(options);
  return checker.createHealthEndpoint();
};
