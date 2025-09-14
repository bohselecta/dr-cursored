#!/usr/bin/env node
import { Command } from 'commander';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const program = new Command();

program
  .name('dr-cursored')
  .description('🩺 The ultimate debugging and development health toolkit')
  .version('1.0.0');

program
  .command('init')
  .description('Initialize Dr. Cursored in your project')
  .action(async () => {
    const { initProject } = await import('../scripts/init.mjs');
    await initProject();
  });

program
  .command('doctor')
  .description('Run comprehensive health check')
  .option('-v, --verbose', 'Verbose output')
  .option('-f, --fix', 'Auto-fix common issues')
  .action(async (options) => {
    const { runDoctor } = await import('../scripts/doctor.mjs');
    await runDoctor(options);
  });

program
  .command('clean')
  .description('Clean build artifacts and caches')
  .option('--dry', 'Dry run - show what would be cleaned')
  .option('--all', 'Clean everything including node_modules')
  .action(async (options) => {
    const { runClean } = await import('../scripts/clean.mjs');
    await runClean(options);
  });

program
  .command('ports')
  .description('Check and manage port usage')
  .option('-p, --port <port>', 'Check specific port')
  .option('-k, --kill', 'Kill processes using ports')
  .action(async (options) => {
    const { runPorts } = await import('../scripts/ports.mjs');
    await runPorts(options);
  });

program
  .command('services')
  .description('Manage development services')
  .option('-s, --start <service>', 'Start a service')
  .option('-t, --stop <service>', 'Stop a service')
  .option('-r, --restart <service>', 'Restart a service')
  .action(async (options) => {
    const { runServices } = await import('../scripts/services.mjs');
    await runServices(options);
  });

program
  .command('analyze')
  .description('Analyze project structure and dependencies')
  .option('-o, --output <file>', 'Output to file')
  .option('-j, --json', 'Output as JSON')
  .action(async (options) => {
    const { runAnalyze } = await import('../scripts/analyze.mjs');
    await runAnalyze(options);
  });

program
  .command('debug')
  .description('Start debug interface')
  .option('-p, --port <port>', 'Port for debug interface', '3001')
  .action(async (options) => {
    const { startDebugInterface } = await import('../scripts/debug.mjs');
    await startDebugInterface(options);
  });

program
  .command('setup')
  .description('Setup project with Dr. Cursored configuration')
  .action(async () => {
    const { setupProject } = await import('../scripts/setup.mjs');
    await setupProject();
  });

program
  .command('fix')
  .description('Auto-fix common development issues')
  .action(async () => {
    const { runFix } = await import('../scripts/fix.mjs');
    await runFix();
  });

program
  .command('report')
  .description('Generate debug report for issue reporting')
  .option('-o, --output <file>', 'Output file', 'debug-report.json')
  .action(async (options) => {
    const { generateReport } = await import('../scripts/report.mjs');
    await generateReport(options);
  });

// Handle unknown commands
program.on('command:*', () => {
  console.error('❌ Unknown command: %s', program.args.join(' '));
  console.log('Run "dr-cursored --help" for available commands.');
  process.exit(1);
});

program.parse();
