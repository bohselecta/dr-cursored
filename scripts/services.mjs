#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';

const ok = (m) => console.log(chalk.green('✅'), m);
const warn = (m) => console.log(chalk.yellow('⚠️ '), m);
const err = (m) => console.log(chalk.red('❌'), m);
const info = (m) => console.log(chalk.blue('ℹ️ '), m);

// Service definitions
const SERVICES = {
  dev: {
    name: 'Development Server',
    commands: {
      npm: 'npm run dev',
      yarn: 'yarn dev',
      pnpm: 'pnpm dev'
    },
    ports: [3000, 5173, 8000],
    description: 'Start the development server'
  },
  build: {
    name: 'Build Process',
    commands: {
      npm: 'npm run build',
      yarn: 'yarn build',
      pnpm: 'pnpm build'
    },
    description: 'Build the project for production'
  },
  test: {
    name: 'Test Runner',
    commands: {
      npm: 'npm test',
      yarn: 'yarn test',
      pnpm: 'pnpm test'
    },
    description: 'Run the test suite'
  },
  lint: {
    name: 'Linter',
    commands: {
      npm: 'npm run lint',
      yarn: 'yarn lint',
      pnpm: 'pnpm lint'
    },
    description: 'Run code linting'
  },
  typecheck: {
    name: 'Type Checker',
    commands: {
      npm: 'npx tsc --noEmit',
      yarn: 'yarn tsc --noEmit',
      pnpm: 'pnpm tsc --noEmit'
    },
    description: 'Run TypeScript type checking'
  }
};

// Running processes storage
const runningProcesses = new Map();

function detectPackageManager() {
  const packageLockPath = path.join(process.cwd(), 'package-lock.json');
  const yarnLockPath = path.join(process.cwd(), 'yarn.lock');
  const pnpmLockPath = path.join(process.cwd(), 'pnpm-lock.yaml');
  
  if (fs.existsSync(pnpmLockPath)) return 'pnpm';
  if (fs.existsSync(yarnLockPath)) return 'yarn';
  if (fs.existsSync(packageLockPath)) return 'npm';
  
  return 'npm'; // default
}

function getServiceCommand(serviceName, packageManager) {
  const service = SERVICES[serviceName];
  if (!service) return null;
  
  return service.commands[packageManager] || service.commands.npm;
}

function isProcessRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return false;
  }
}

function startService(serviceName, packageManager, options = {}) {
  const command = getServiceCommand(serviceName, packageManager);
  if (!command) {
    err(`Unknown service: ${serviceName}`);
    return null;
  }

  const [cmd, ...args] = command.split(' ');
  
  info(`Starting ${SERVICES[serviceName].name}...`);
  
  const child = spawn(cmd, args, {
    stdio: options.silent ? 'pipe' : 'inherit',
    shell: true,
    cwd: process.cwd()
  });

  const processInfo = {
    name: serviceName,
    pid: child.pid,
    command,
    startTime: Date.now(),
    child
  };

  runningProcesses.set(serviceName, processInfo);

  child.on('exit', (code) => {
    runningProcesses.delete(serviceName);
    if (code !== 0 && !options.silent) {
      warn(`${SERVICES[serviceName].name} exited with code ${code}`);
    }
  });

  child.on('error', (error) => {
    runningProcesses.delete(serviceName);
    err(`Failed to start ${SERVICES[serviceName].name}: ${error.message}`);
  });

  return processInfo;
}

function stopService(serviceName) {
  const processInfo = runningProcesses.get(serviceName);
  if (!processInfo) {
    warn(`Service ${serviceName} is not running`);
    return false;
  }

  try {
    process.kill(processInfo.pid, 'SIGTERM');
    
    // Wait a bit for graceful shutdown
    setTimeout(() => {
      if (isProcessRunning(processInfo.pid)) {
        process.kill(processInfo.pid, 'SIGKILL');
      }
    }, 5000);
    
    runningProcesses.delete(serviceName);
    ok(`Stopped ${SERVICES[serviceName].name}`);
    return true;
  } catch (error) {
    err(`Failed to stop ${SERVICES[serviceName].name}: ${error.message}`);
    return false;
  }
}

function restartService(serviceName, packageManager) {
  stopService(serviceName);
  setTimeout(() => {
    startService(serviceName, packageManager);
  }, 1000);
}

function listRunningServices() {
  if (runningProcesses.size === 0) {
    info('No services are currently running');
    return;
  }

  console.log(chalk.bold('\nRunning Services:'));
  console.log('─'.repeat(50));
  
  for (const [name, processInfo] of runningProcesses) {
    const uptime = Math.round((Date.now() - processInfo.startTime) / 1000);
    const status = isProcessRunning(processInfo.pid) ? 'running' : 'stopped';
    
    console.log(`${chalk.green('●')} ${SERVICES[name].name}`);
    console.log(`  PID: ${processInfo.pid}`);
    console.log(`  Status: ${status}`);
    console.log(`  Uptime: ${uptime}s`);
    console.log(`  Command: ${processInfo.command}`);
    console.log('');
  }
}

async function interactiveServiceManager() {
  const packageManager = detectPackageManager();
  info(`Detected package manager: ${packageManager}`);

  while (true) {
    const choices = [
      { name: 'List running services', value: 'list' },
      { name: 'Start a service', value: 'start' },
      { name: 'Stop a service', value: 'stop' },
      { name: 'Restart a service', value: 'restart' },
      { name: 'Start all services', value: 'start-all' },
      { name: 'Stop all services', value: 'stop-all' },
      { name: 'Exit', value: 'exit' }
    ];

    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices
      }
    ]);

    switch (action) {
      case 'list':
        listRunningServices();
        break;
        
      case 'start':
        const startChoices = Object.entries(SERVICES).map(([key, service]) => ({
          name: `${service.name} - ${service.description}`,
          value: key
        }));
        
        const { serviceToStart } = await inquirer.prompt([
          {
            type: 'list',
            name: 'serviceToStart',
            message: 'Which service would you like to start?',
            choices: startChoices
          }
        ]);
        
        startService(serviceToStart, packageManager);
        break;
        
      case 'stop':
        if (runningProcesses.size === 0) {
          info('No services are running');
          break;
        }
        
        const stopChoices = Array.from(runningProcesses.keys()).map(name => ({
          name: SERVICES[name].name,
          value: name
        }));
        
        const { serviceToStop } = await inquirer.prompt([
          {
            type: 'list',
            name: 'serviceToStop',
            message: 'Which service would you like to stop?',
            choices: stopChoices
          }
        ]);
        
        stopService(serviceToStop);
        break;
        
      case 'restart':
        if (runningProcesses.size === 0) {
          info('No services are running');
          break;
        }
        
        const restartChoices = Array.from(runningProcesses.keys()).map(name => ({
          name: SERVICES[name].name,
          value: name
        }));
        
        const { serviceToRestart } = await inquirer.prompt([
          {
            type: 'list',
            name: 'serviceToRestart',
            message: 'Which service would you like to restart?',
            choices: restartChoices
          }
        ]);
        
        restartService(serviceToRestart, packageManager);
        break;
        
      case 'start-all':
        const servicesToStart = ['dev', 'build', 'test', 'lint', 'typecheck'];
        for (const service of servicesToStart) {
          if (!runningProcesses.has(service)) {
            startService(service, packageManager, { silent: true });
          }
        }
        break;
        
      case 'stop-all':
        for (const serviceName of runningProcesses.keys()) {
          stopService(serviceName);
        }
        break;
        
      case 'exit':
        // Stop all services before exiting
        for (const serviceName of runningProcesses.keys()) {
          stopService(serviceName);
        }
        process.exit(0);
    }
  }
}

export async function runServices(options = {}) {
  const args = process.argv.slice(2);
  const start = options.start || args.find(arg => arg.startsWith('-s'))?.split('=')[1];
  const stop = options.stop || args.find(arg => arg.startsWith('-t'))?.split('=')[1];
  const restart = options.restart || args.find(arg => arg.startsWith('-r'))?.split('=')[1];
  
  console.log(chalk.bold.blue('🚀 Dr. Cursored - Service Manager\n'));
  
  const packageManager = detectPackageManager();
  info(`Package manager: ${packageManager}`);
  
  if (start) {
    startService(start, packageManager);
  } else if (stop) {
    stopService(stop);
  } else if (restart) {
    restartService(restart, packageManager);
  } else {
    // Interactive mode
    await interactiveServiceManager();
  }
}

// Handle process cleanup
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n\nShutting down services...'));
  for (const serviceName of runningProcesses.keys()) {
    stopService(serviceName);
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  for (const serviceName of runningProcesses.keys()) {
    stopService(serviceName);
  }
  process.exit(0);
});

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runServices().catch(console.error);
}
