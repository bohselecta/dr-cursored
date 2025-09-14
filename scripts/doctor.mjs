#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import https from 'node:https';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import chalk from 'chalk';
import ora from 'ora';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ok = (m) => console.log(chalk.green('✅'), m);
const warn = (m) => console.log(chalk.yellow('⚠️ '), m);
const err = (m) => console.log(chalk.red('❌'), m);
const info = (m) => console.log(chalk.blue('ℹ️ '), m);

let failed = false;
const startTime = Date.now();

// Auto-detect project type and configuration
const PROJECT_TYPES = {
  react: { 
    files: ['package.json'], 
    deps: ['react'], 
    ports: [3000],
    scripts: { dev: 'react-scripts start', build: 'react-scripts build' }
  },
  vue: { 
    files: ['package.json'], 
    deps: ['vue'], 
    ports: [5173, 3000],
    scripts: { dev: 'vite', build: 'vite build' }
  },
  next: { 
    files: ['next.config.js', 'next.config.mjs'], 
    deps: ['next'], 
    ports: [3000],
    scripts: { dev: 'next dev', build: 'next build' }
  },
  express: { 
    files: ['package.json'], 
    deps: ['express'], 
    ports: [3000, 8000, 7531],
    scripts: { dev: 'node server.js', start: 'node server.js' }
  },
  fastify: { 
    files: ['package.json'], 
    deps: ['fastify'], 
    ports: [3000, 8080],
    scripts: { dev: 'node server.js', start: 'node server.js' }
  },
  nest: { 
    files: ['nest-cli.json'], 
    deps: ['@nestjs/core'], 
    ports: [3000],
    scripts: { dev: 'nest start --watch', build: 'nest build' }
  },
  svelte: { 
    files: ['svelte.config.js'], 
    deps: ['svelte'], 
    ports: [5173],
    scripts: { dev: 'vite', build: 'vite build' }
  },
  nuxt: { 
    files: ['nuxt.config.js', 'nuxt.config.ts'], 
    deps: ['nuxt'], 
    ports: [3000],
    scripts: { dev: 'nuxt dev', build: 'nuxt build' }
  },
  vite: {
    files: ['vite.config.js', 'vite.config.ts'],
    deps: ['vite'],
    ports: [5173, 3000],
    scripts: { dev: 'vite', build: 'vite build' }
  }
};

async function detectProjectType() {
  const packagePath = path.join(process.cwd(), 'package.json');
  if (!fs.existsSync(packagePath)) return 'unknown';
  
  try {
    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    
    for (const [type, config] of Object.entries(PROJECT_TYPES)) {
      if (config.deps.some(dep => allDeps[dep])) return type;
      if (config.files.some(file => fs.existsSync(path.join(process.cwd(), file)))) return type;
    }
    return 'unknown';
  } catch (e) {
    return 'unknown';
  }
}

function checkFile(p, expectJson = false, required = true) {
  try {
    const raw = fs.readFileSync(p, 'utf8');
    if (expectJson) JSON.parse(raw);
    ok(`file: ${p}`);
    return { exists: true, content: raw };
  } catch (e) {
    if (required) {
      failed = true;
      err(`missing or invalid: ${p} (${e.message})`);
    } else {
      warn(`optional file missing: ${p}`);
    }
    return { exists: false, content: null };
  }
}

async function checkPort(port) {
  return new Promise((resolve) => {
    const server = http.createServer();
    server.listen(port, () => {
      server.close();
      resolve({ free: true, port });
    });
    server.on('error', () => {
      resolve({ free: false, port });
    });
  });
}

async function checkEndpoint(url, expectedStatus = 200, timeout = 5000) {
  return new Promise((resolve) => {
    try {
      const urlObj = new URL(url);
      const client = urlObj.protocol === 'https:' ? https : http;
      
      const req = client.get(url, { timeout }, (res) => {
        const success = res.statusCode === expectedStatus;
        resolve({ 
          success, 
          status: res.statusCode, 
          url,
          headers: res.headers 
        });
      });
      
      req.on('error', (e) => {
        resolve({ success: false, error: e.message, url });
      });
      
      req.on('timeout', () => {
        req.destroy();
        resolve({ success: false, error: 'timeout', url });
      });
    } catch (e) {
      resolve({ success: false, error: e.message, url });
    }
  });
}

function checkGitStatus() {
  try {
    const status = spawnSync('git', ['status', '--porcelain'], { 
      stdio: 'pipe', 
      encoding: 'utf8' 
    });
    
    if (status.status !== 0) {
      warn('Not a git repository or git not available');
      return null;
    }
    
    const changes = status.stdout.trim().split('\n').filter(Boolean);
    return {
      clean: changes.length === 0,
      changes: changes.length,
      files: changes
    };
  } catch (e) {
    warn('Git status check failed');
    return null;
  }
}

function checkNodeModules() {
  const nodeModulesPath = path.join(process.cwd(), 'node_modules');
  const packageLockPath = path.join(process.cwd(), 'package-lock.json');
  const yarnLockPath = path.join(process.cwd(), 'yarn.lock');
  const pnpmLockPath = path.join(process.cwd(), 'pnpm-lock.yaml');
  
  const hasNodeModules = fs.existsSync(nodeModulesPath);
  const hasPackageLock = fs.existsSync(packageLockPath);
  const hasYarnLock = fs.existsSync(yarnLockPath);
  const hasPnpmLock = fs.existsSync(pnpmLockPath);
  
  let packageManager = 'npm';
  if (hasPnpmLock) packageManager = 'pnpm';
  else if (hasYarnLock) packageManager = 'yarn';
  
  return {
    hasNodeModules,
    packageManager,
    hasLockFile: hasPackageLock || hasYarnLock || hasPnpmLock
  };
}

function checkMemoryUsage() {
  const used = process.memoryUsage();
  const total = os.totalmem();
  const free = os.freemem();
  
  return {
    process: {
      heapUsed: Math.round(used.heapUsed / 1024 / 1024),
      heapTotal: Math.round(used.heapTotal / 1024 / 1024),
      external: Math.round(used.external / 1024 / 1024)
    },
    system: {
      total: Math.round(total / 1024 / 1024 / 1024),
      free: Math.round(free / 1024 / 1024 / 1024),
      used: Math.round((total - free) / 1024 / 1024 / 1024)
    }
  };
}

async function checkTypeScript() {
  const tsConfigPath = path.join(process.cwd(), 'tsconfig.json');
  if (!fs.existsSync(tsConfigPath)) {
    return { hasConfig: false };
  }

  try {
    const tsc = spawnSync('npx', ['tsc', '--noEmit'], { 
      stdio: 'pipe', 
      encoding: 'utf8' 
    });
    
    return {
      hasConfig: true,
      valid: tsc.status === 0,
      errors: tsc.stdout || tsc.stderr
    };
  } catch (e) {
    return {
      hasConfig: true,
      valid: false,
      errors: e.message
    };
  }
}

async function checkESLint() {
  const eslintConfigs = [
    '.eslintrc.js',
    '.eslintrc.json',
    '.eslintrc.yaml',
    '.eslintrc.yml',
    'eslint.config.js'
  ];

  const configPath = eslintConfigs.find(config => 
    fs.existsSync(path.join(process.cwd(), config))
  );

  if (!configPath) {
    return { hasConfig: false };
  }

  try {
    const eslint = spawnSync('npx', ['eslint', '--version'], { 
      stdio: 'pipe', 
      encoding: 'utf8' 
    });
    
    return {
      hasConfig: true,
      installed: eslint.status === 0,
      version: eslint.stdout?.trim()
    };
  } catch (e) {
    return {
      hasConfig: true,
      installed: false,
      error: e.message
    };
  }
}

export async function runDoctor(options = {}) {
  const spinner = ora('Running health checks...').start();
  
  try {
    console.log(chalk.bold.blue('\n🩺 Dr. Cursored - Universal Project Health Check\n'));
    
    const projectType = await detectProjectType();
    info(`Project type detected: ${chalk.cyan(projectType)}`);
    
    // System checks
    console.log(chalk.bold('\n— System Health'));
    const memory = checkMemoryUsage();
    info(`Memory: ${memory.process.heapUsed}MB heap, ${memory.system.free}GB free`);
    ok(`Node.js ${process.version}`);
    ok(`Platform: ${os.platform()} ${os.arch()}`);
    
    // Git status
    console.log(chalk.bold('\n— Git Status'));
    const gitStatus = checkGitStatus();
    if (gitStatus) {
      if (gitStatus.clean) {
        ok('Working directory clean');
      } else {
        warn(`${gitStatus.changes} uncommitted changes`);
        if (options.verbose) {
          gitStatus.files.forEach(file => console.log(`  ${file}`));
        }
      }
    }
    
    // Dependencies
    console.log(chalk.bold('\n— Dependencies'));
    const deps = checkNodeModules();
    if (deps.hasNodeModules) {
      ok(`Dependencies installed (${deps.packageManager})`);
    } else {
      failed = true;
      err(`Dependencies not installed. Run: ${deps.packageManager} install`);
    }
    
    if (deps.hasLockFile) {
      ok(`Lock file present (${deps.packageManager})`);
    } else {
      warn('No lock file found');
    }
    
    // Project files
    console.log(chalk.bold('\n— Project Files'));
    checkFile('package.json', true);
    
    if (projectType !== 'unknown') {
      const config = PROJECT_TYPES[projectType];
      config.files?.forEach(file => checkFile(file, false, false));
    }
    
    // TypeScript checks
    console.log(chalk.bold('\n— TypeScript'));
    const tsCheck = await checkTypeScript();
    if (tsCheck.hasConfig) {
      if (tsCheck.valid) {
        ok('TypeScript compilation check passed');
      } else {
        warn('TypeScript compilation issues detected');
        if (options.verbose && tsCheck.errors) {
          console.log(tsCheck.errors);
        }
      }
    } else {
      info('No TypeScript configuration found');
    }
    
    // ESLint checks
    console.log(chalk.bold('\n— Code Quality'));
    const eslintCheck = await checkESLint();
    if (eslintCheck.hasConfig) {
      if (eslintCheck.installed) {
        ok(`ESLint installed (${eslintCheck.version})`);
      } else {
        warn('ESLint configuration found but not installed');
      }
    } else {
      info('No ESLint configuration found');
    }
    
    // Port availability
    console.log(chalk.bold('\n— Port Availability'));
    const commonPorts = projectType !== 'unknown' 
      ? PROJECT_TYPES[projectType].ports 
      : [3000, 8000, 8080, 5173, 4000];
      
    for (const port of commonPorts) {
      const result = await checkPort(port);
      if (result.free) {
        ok(`Port ${port} available`);
      } else {
        warn(`Port ${port} in use`);
      }
    }
    
    // Service health checks (if running)
    console.log(chalk.bold('\n— Service Health'));
    const healthUrls = [
      'http://localhost:3000',
      'http://localhost:8000',
      'http://127.0.0.1:7531/v1/health',
      'http://localhost:5173'
    ];
    
    for (const url of healthUrls) {
      const result = await checkEndpoint(url);
      if (result.success) {
        ok(`Service responding: ${url}`);
      } else {
        info(`Service not running: ${url} (${result.error || result.status})`);
      }
    }
    
    // Performance summary
    const duration = Date.now() - startTime;
    console.log(chalk.bold(`\n— Health Check Complete (${duration}ms)`));
    
    spinner.succeed('Health check completed');
    
    if (failed) {
      err('Doctor found critical issues. Fix the ❌ items above.');
      if (options.fix) {
        console.log(chalk.yellow('\n🔧 Running auto-fix...'));
        // Auto-fix logic would go here
      }
      process.exit(1);
    } else {
      ok('All critical checks passed! 🎉');
      info('Use "dr-cursored fix" to auto-resolve warnings');
    }
  } catch (error) {
    spinner.fail('Health check failed');
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const options = {
    verbose: args.includes('--verbose') || args.includes('-v'),
    fix: args.includes('--fix') || args.includes('-f')
  };
  
  runDoctor(options).catch(console.error);
}
