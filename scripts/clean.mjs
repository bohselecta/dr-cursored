#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { globSync } from 'glob';
import chalk from 'chalk';
import ora from 'ora';

const CLEAN_PATTERNS = {
  build: [
    'dist/**',
    'build/**',
    '.next/**',
    '.nuxt/**',
    '.output/**',
    'out/**',
    'public/build/**'
  ],
  cache: [
    '.cache/**',
    'node_modules/.cache/**',
    '.parcel-cache/**',
    '.vite/**',
    '.turbo/**',
    '.eslintcache',
    '.stylelintcache'
  ],
  logs: [
    '*.log',
    'logs/**',
    'npm-debug.log*',
    'yarn-debug.log*',
    'yarn-error.log*',
    'pnpm-debug.log*'
  ],
  temp: [
    '.tmp/**',
    'tmp/**',
    '*.tmp',
    '*.temp',
    '.DS_Store',
    'Thumbs.db'
  ],
  coverage: [
    'coverage/**',
    '.nyc_output/**',
    'lcov.info'
  ],
  typescript: [
    '*.tsbuildinfo',
    '.tsbuildinfo'
  ]
};

function cleanPattern(pattern, dry = false) {
  const files = globSync(pattern, { 
    ignore: ['node_modules/**', '.git/**'],
    cwd: process.cwd()
  });
  let cleaned = 0;
  
  for (const file of files) {
    try {
      const fullPath = path.join(process.cwd(), file);
      const stats = fs.statSync(fullPath);
      
      if (!dry) {
        if (stats.isDirectory()) {
          fs.rmSync(fullPath, { recursive: true, force: true });
        } else {
          fs.unlinkSync(fullPath);
        }
      }
      
      const size = stats.isDirectory() ? 'dir' : `${Math.round(stats.size / 1024)}KB`;
      console.log(`🧹 ${dry ? '[DRY]' : 'removed'} ${file} (${size})`);
      cleaned++;
    } catch (e) {
      console.warn(chalk.yellow(`⚠️  Failed to remove ${file}: ${e.message}`));
    }
  }
  
  return cleaned;
}

function getDirectorySize(dirPath) {
  let totalSize = 0;
  
  try {
    const files = fs.readdirSync(dirPath);
    
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stats = fs.statSync(filePath);
      
      if (stats.isDirectory()) {
        totalSize += getDirectorySize(filePath);
      } else {
        totalSize += stats.size;
      }
    }
  } catch (e) {
    // Directory doesn't exist or can't be read
  }
  
  return totalSize;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export async function runClean(options = {}) {
  const args = process.argv.slice(2);
  const dry = options.dry || args.includes('--dry');
  const all = options.all || args.includes('--all');
  
  const categories = args.filter(arg => 
    !arg.startsWith('--') && CLEAN_PATTERNS[arg]
  );
  
  const selectedCategories = categories.length > 0 ? categories : ['build', 'cache'];
  
  if (all) {
    selectedCategories.push(...Object.keys(CLEAN_PATTERNS));
  }
  
  console.log(chalk.bold.blue('🧹 Dr. Cursored - Smart Cleaner\n'));
  console.log(`Mode: ${dry ? chalk.yellow('DRY RUN') : chalk.green('CLEANING')}`);
  console.log(`Categories: ${selectedCategories.join(', ')}\n`);
  
  const spinner = ora('Cleaning files...').start();
  let totalCleaned = 0;
  let totalSize = 0;
  
  try {
    for (const category of selectedCategories) {
      if (CLEAN_PATTERNS[category]) {
        console.log(chalk.bold(`\n— Cleaning ${category}`));
        
        for (const pattern of CLEAN_PATTERNS[category]) {
          const beforeSize = getDirectorySize(process.cwd());
          const cleaned = cleanPattern(pattern, dry);
          const afterSize = getDirectorySize(process.cwd());
          const sizeDiff = beforeSize - afterSize;
          
          totalCleaned += cleaned;
          totalSize += sizeDiff;
        }
      } else {
        console.warn(chalk.yellow(`Unknown category: ${category}`));
      }
    }
    
    // Special handling for node_modules if --all is specified
    if (all && !dry) {
      const nodeModulesPath = path.join(process.cwd(), 'node_modules');
      if (fs.existsSync(nodeModulesPath)) {
        console.log(chalk.bold('\n— Cleaning node_modules'));
        const nodeModulesSize = getDirectorySize(nodeModulesPath);
        fs.rmSync(nodeModulesPath, { recursive: true, force: true });
        console.log(`🧹 removed node_modules (${formatBytes(nodeModulesSize)})`);
        totalCleaned++;
        totalSize += nodeModulesSize;
      }
    }
    
    spinner.succeed('Cleaning completed');
    
    console.log(chalk.bold(`\n✅ ${dry ? 'Would clean' : 'Cleaned'} ${totalCleaned} items`));
    console.log(chalk.blue(`💾 ${dry ? 'Would free' : 'Freed'} ${formatBytes(totalSize)} of space`));
    
    if (dry) {
      console.log(chalk.yellow('\nRun without --dry to actually clean files'));
    } else if (all) {
      console.log(chalk.yellow('\n⚠️  You may need to run "npm install" or "yarn install" to reinstall dependencies'));
    }
    
  } catch (error) {
    spinner.fail('Cleaning failed');
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runClean().catch(console.error);
}
