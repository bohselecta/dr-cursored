#!/usr/bin/env node
import fs from 'node:fs';
import path from 'path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import chalk from 'chalk';
import ora from 'ora';

const ok = (m) => console.log(chalk.green('✅'), m);
const warn = (m) => console.log(chalk.yellow('⚠️ '), m);
const err = (m) => console.log(chalk.red('❌'), m);
const info = (m) => console.log(chalk.blue('ℹ️ '), m);

export async function generateReport(options = {}) {
  const outputFile = options.output || 'debug-report.json';
  
  console.log(chalk.bold.blue('📊 Dr. Cursored - Debug Report Generator\n'));
  
  const spinner = ora('Generating debug report...').start();
  
  try {
    const report = {
      timestamp: new Date().toISOString(),
      system: await getSystemInfo(),
      project: await getProjectInfo(),
      dependencies: await getDependencyInfo(),
      git: await getGitInfo(),
      health: await getHealthInfo(),
      performance: await getPerformanceInfo(),
      errors: await getErrorInfo()
    };
    
    // Write report to file
    fs.writeFileSync(outputFile, JSON.stringify(report, null, 2));
    
    spinner.succeed(`Debug report generated: ${outputFile}`);
    
    // Display summary
    console.log(chalk.bold('\n📋 Report Summary:'));
    console.log(`System: ${report.system.platform} ${report.system.arch}`);
    console.log(`Node.js: ${report.system.nodeVersion}`);
    console.log(`Project: ${report.project.name} (${report.project.type})`);
    console.log(`Dependencies: ${report.dependencies.total} total`);
    console.log(`Git: ${report.git.clean ? 'Clean' : 'Dirty'} working directory`);
    console.log(`Health: ${report.health.overall}`);
    
    ok(`Report saved to ${outputFile}`);
    
  } catch (error) {
    spinner.fail('Report generation failed');
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

async function getSystemInfo() {
  return {
    platform: os.platform(),
    arch: os.arch(),
    nodeVersion: process.version,
    npmVersion: getNpmVersion(),
    memory: {
      total: Math.round(os.totalmem() / 1024 / 1024 / 1024),
      free: Math.round(os.freemem() / 1024 / 1024 / 1024)
    },
    cpus: os.cpus().length,
    uptime: Math.round(os.uptime())
  };
}

function getNpmVersion() {
  try {
    const result = spawnSync('npm', ['--version'], { 
      stdio: 'pipe', 
      encoding: 'utf8' 
    });
    return result.stdout.trim();
  } catch (e) {
    return 'Unknown';
  }
}

async function getProjectInfo() {
  const packagePath = path.join(process.cwd(), 'package.json');
  
  if (!fs.existsSync(packagePath)) {
    return { name: 'Unknown', type: 'unknown' };
  }
  
  try {
    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    // Detect project type
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    let type = 'unknown';
    
    if (allDeps.react) type = 'react';
    else if (allDeps.vue) type = 'vue';
    else if (allDeps.next) type = 'next';
    else if (allDeps.express) type = 'express';
    else if (allDeps.fastify) type = 'fastify';
    else if (allDeps['@nestjs/core']) type = 'nest';
    else if (allDeps.svelte) type = 'svelte';
    else if (allDeps.nuxt) type = 'nuxt';
    else if (allDeps.vite) type = 'vite';
    
    return {
      name: pkg.name || path.basename(process.cwd()),
      version: pkg.version || '1.0.0',
      type,
      description: pkg.description || '',
      scripts: Object.keys(pkg.scripts || {}),
      hasTypeScript: !!allDeps.typescript,
      hasESLint: !!allDeps.eslint,
      hasPrettier: !!allDeps.prettier
    };
  } catch (error) {
    return { name: 'Unknown', type: 'unknown', error: error.message };
  }
}

async function getDependencyInfo() {
  const packagePath = path.join(process.cwd(), 'package.json');
  
  if (!fs.existsSync(packagePath)) {
    return { total: 0, production: 0, development: 0 };
  }
  
  try {
    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    const nodeModulesPath = path.join(process.cwd(), 'node_modules');
    
    return {
      total: Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).length,
      production: Object.keys(pkg.dependencies || {}).length,
      development: Object.keys(pkg.devDependencies || {}).length,
      installed: fs.existsSync(nodeModulesPath),
      lockFile: getLockFileType()
    };
  } catch (error) {
    return { total: 0, production: 0, development: 0, error: error.message };
  }
}

function getLockFileType() {
  const lockFiles = {
    'package-lock.json': 'npm',
    'yarn.lock': 'yarn',
    'pnpm-lock.yaml': 'pnpm'
  };
  
  for (const [file, type] of Object.entries(lockFiles)) {
    if (fs.existsSync(path.join(process.cwd(), file))) {
      return type;
    }
  }
  
  return 'none';
}

async function getGitInfo() {
  try {
    const status = spawnSync('git', ['status', '--porcelain'], { 
      stdio: 'pipe', 
      encoding: 'utf8' 
    });
    
    if (status.status !== 0) {
      return { available: false };
    }
    
    const changes = status.stdout.trim().split('\n').filter(Boolean);
    
    return {
      available: true,
      clean: changes.length === 0,
      changes: changes.length,
      files: changes
    };
  } catch (error) {
    return { available: false, error: error.message };
  }
}

async function getHealthInfo() {
  // This would run actual health checks
  // For now, return a basic status
  return {
    overall: 'unknown',
    checks: {
      dependencies: 'unknown',
      git: 'unknown',
      system: 'unknown'
    }
  };
}

async function getPerformanceInfo() {
  const used = process.memoryUsage();
  
  return {
    memory: {
      rss: Math.round(used.rss / 1024 / 1024),
      heapTotal: Math.round(used.heapTotal / 1024 / 1024),
      heapUsed: Math.round(used.heapUsed / 1024 / 1024),
      external: Math.round(used.external / 1024 / 1024)
    },
    uptime: Math.round(process.uptime())
  };
}

async function getErrorInfo() {
  // This would collect recent errors from logs
  // For now, return empty
  return {
    recent: [],
    count: 0
  };
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const outputFile = args.find(arg => arg.startsWith('-o'))?.split('=')[1] || 'debug-report.json';
  
  generateReport({ output: outputFile }).catch(console.error);
}
