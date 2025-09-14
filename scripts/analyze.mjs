#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { globSync } from 'glob';
import chalk from 'chalk';
import ora from 'ora';

const info = (m) => console.log(chalk.blue('ℹ️ '), m);
const ok = (m) => console.log(chalk.green('✅'), m);
const warn = (m) => console.log(chalk.yellow('⚠️ '), m);
const err = (m) => console.log(chalk.red('❌'), m);

// File type patterns
const FILE_PATTERNS = {
  javascript: ['**/*.js', '**/*.mjs', '**/*.cjs'],
  typescript: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'],
  react: ['**/*.jsx', '**/*.tsx'],
  vue: ['**/*.vue'],
  svelte: ['**/*.svelte'],
  css: ['**/*.css', '**/*.scss', '**/*.sass', '**/*.less'],
  html: ['**/*.html', '**/*.htm'],
  json: ['**/*.json'],
  yaml: ['**/*.yaml', '**/*.yml'],
  markdown: ['**/*.md'],
  config: ['**/.*rc*', '**/*.config.*', '**/package.json', '**/tsconfig.json']
};

// Dependency categories
const DEPENDENCY_CATEGORIES = {
  framework: ['react', 'vue', 'angular', 'svelte', 'next', 'nuxt', 'sveltekit'],
  build: ['webpack', 'vite', 'rollup', 'parcel', 'esbuild', 'swc'],
  testing: ['jest', 'vitest', 'mocha', 'chai', 'cypress', 'playwright', 'testing-library'],
  linting: ['eslint', 'prettier', 'stylelint', 'husky', 'lint-staged'],
  typescript: ['typescript', '@types/*', 'ts-node', 'tsx'],
  bundler: ['webpack', 'vite', 'rollup', 'parcel', 'esbuild'],
  runtime: ['node', 'express', 'fastify', 'koa', 'hapi']
};

async function analyzeProjectStructure() {
  const analysis = {
    files: {},
    directories: {},
    dependencies: {},
    scripts: {},
    configs: {},
    size: {}
  };

  // Analyze files by type
  for (const [type, patterns] of Object.entries(FILE_PATTERNS)) {
    const files = [];
    let totalSize = 0;
    
    for (const pattern of patterns) {
      const matches = globSync(pattern, { 
        ignore: ['node_modules/**', '.git/**', 'dist/**', 'build/**'],
        cwd: process.cwd()
      });
      
      for (const file of matches) {
        try {
          const fullPath = path.join(process.cwd(), file);
          const stats = fs.statSync(fullPath);
          files.push({
            path: file,
            size: stats.size,
            modified: stats.mtime
          });
          totalSize += stats.size;
        } catch (e) {
          // File might have been deleted or is inaccessible
        }
      }
    }
    
    if (files.length > 0) {
      analysis.files[type] = {
        count: files.length,
        totalSize,
        averageSize: Math.round(totalSize / files.length),
        files: files.sort((a, b) => b.size - a.size).slice(0, 10) // Top 10 largest files
      };
    }
  }

  // Analyze directories
  const directories = globSync('**/', { 
    ignore: ['node_modules/**', '.git/**'],
    cwd: process.cwd()
  });
  
  analysis.directories = {
    count: directories.length,
    structure: directories.slice(0, 20) // Top 20 directories
  };

  return analysis;
}

async function analyzeDependencies() {
  const packagePath = path.join(process.cwd(), 'package.json');
  
  if (!fs.existsSync(packagePath)) {
    return { error: 'package.json not found' };
  }

  try {
    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    
    const analysis = {
      total: Object.keys(allDeps).length,
      production: Object.keys(pkg.dependencies || {}).length,
      development: Object.keys(pkg.devDependencies || {}).length,
      categories: {},
      outdated: [],
      duplicates: [],
      scripts: pkg.scripts || {}
    };

    // Categorize dependencies
    for (const [category, patterns] of Object.entries(DEPENDENCY_CATEGORIES)) {
      analysis.categories[category] = [];
      
      for (const dep of Object.keys(allDeps)) {
        if (patterns.some(pattern => 
          pattern.includes('*') ? 
            new RegExp(pattern.replace(/\*/g, '.*')).test(dep) :
            dep === pattern || dep.startsWith(pattern.replace('*', ''))
        )) {
          analysis.categories[category].push({
            name: dep,
            version: allDeps[dep],
            type: pkg.dependencies?.[dep] ? 'production' : 'development'
          });
        }
      }
    }

    // Check for potential duplicates (similar package names)
    const depNames = Object.keys(allDeps);
    for (let i = 0; i < depNames.length; i++) {
      for (let j = i + 1; j < depNames.length; j++) {
        const name1 = depNames[i];
        const name2 = depNames[j];
        
        // Simple similarity check
        if (name1.includes(name2) || name2.includes(name1)) {
          analysis.duplicates.push([name1, name2]);
        }
      }
    }

    return analysis;
  } catch (error) {
    return { error: error.message };
  }
}

async function analyzeBundleSize() {
  const buildDirs = ['dist', 'build', '.next', '.nuxt', 'out'];
  const analysis = {
    found: false,
    totalSize: 0,
    files: [],
    breakdown: {}
  };

  for (const dir of buildDirs) {
    const dirPath = path.join(process.cwd(), dir);
    if (fs.existsSync(dirPath)) {
      analysis.found = true;
      
      const files = globSync('**/*', { 
        cwd: dirPath,
        nodir: true
      });
      
      for (const file of files) {
        try {
          const fullPath = path.join(dirPath, file);
          const stats = fs.statSync(fullPath);
          const ext = path.extname(file).slice(1) || 'no-extension';
          
          analysis.files.push({
            path: file,
            size: stats.size,
            extension: ext
          });
          
          analysis.totalSize += stats.size;
          
          if (!analysis.breakdown[ext]) {
            analysis.breakdown[ext] = { count: 0, size: 0 };
          }
          analysis.breakdown[ext].count++;
          analysis.breakdown[ext].size += stats.size;
        } catch (e) {
          // File might be inaccessible
        }
      }
    }
  }

  // Sort files by size
  analysis.files.sort((a, b) => b.size - a.size);
  
  return analysis;
}

async function analyzeCodeQuality() {
  const analysis = {
    eslint: { configured: false, errors: 0, warnings: 0 },
    prettier: { configured: false },
    typescript: { configured: false, errors: 0 },
    tests: { configured: false, files: 0 }
  };

  // Check ESLint
  const eslintConfigs = ['.eslintrc.js', '.eslintrc.json', '.eslintrc.yaml', 'eslint.config.js'];
  const hasEslintConfig = eslintConfigs.some(config => 
    fs.existsSync(path.join(process.cwd(), config))
  );
  
  if (hasEslintConfig) {
    analysis.eslint.configured = true;
    // Could run eslint here to get actual error counts
  }

  // Check Prettier
  const prettierConfigs = ['.prettierrc', '.prettierrc.js', '.prettierrc.json', 'prettier.config.js'];
  const hasPrettierConfig = prettierConfigs.some(config => 
    fs.existsSync(path.join(process.cwd(), config))
  );
  
  if (hasPrettierConfig) {
    analysis.prettier.configured = true;
  }

  // Check TypeScript
  const hasTsConfig = fs.existsSync(path.join(process.cwd(), 'tsconfig.json'));
  if (hasTsConfig) {
    analysis.typescript.configured = true;
    // Could run tsc here to get actual error counts
  }

  // Check tests
  const testFiles = globSync('**/*.{test,spec}.{js,ts,jsx,tsx}', {
    ignore: ['node_modules/**'],
    cwd: process.cwd()
  });
  
  if (testFiles.length > 0) {
    analysis.tests.configured = true;
    analysis.tests.files = testFiles.length;
  }

  return analysis;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function printAnalysis(analysis, options = {}) {
  console.log(chalk.bold.blue('\n📊 Dr. Cursored - Project Analysis\n'));

  // File structure
  console.log(chalk.bold('📁 File Structure:'));
  console.log('─'.repeat(40));
  
  for (const [type, data] of Object.entries(analysis.structure.files)) {
    if (data.count > 0) {
      console.log(`${type.padEnd(15)} ${data.count.toString().padStart(4)} files (${formatBytes(data.totalSize)})`);
    }
  }
  
  console.log(`\nDirectories: ${analysis.structure.directories.count}`);

  // Dependencies
  console.log(chalk.bold('\n📦 Dependencies:'));
  console.log('─'.repeat(40));
  console.log(`Total: ${analysis.dependencies.total} (${analysis.dependencies.production} prod, ${analysis.dependencies.development} dev)`);
  
  console.log(chalk.bold('\nBy Category:'));
  for (const [category, deps] of Object.entries(analysis.dependencies.categories)) {
    if (deps.length > 0) {
      console.log(`  ${category.padEnd(12)} ${deps.length} packages`);
    }
  }

  // Bundle size
  if (analysis.bundle.found) {
    console.log(chalk.bold('\n📦 Bundle Size:'));
    console.log('─'.repeat(40));
    console.log(`Total: ${formatBytes(analysis.bundle.totalSize)}`);
    
    console.log(chalk.bold('\nBy Extension:'));
    for (const [ext, data] of Object.entries(analysis.bundle.breakdown)) {
      console.log(`  ${ext.padEnd(10)} ${data.count} files (${formatBytes(data.size)})`);
    }
    
    console.log(chalk.bold('\nLargest Files:'));
    analysis.bundle.files.slice(0, 10).forEach(file => {
      console.log(`  ${file.path.padEnd(30)} ${formatBytes(file.size)}`);
    });
  } else {
    console.log(chalk.yellow('\n📦 No build output found. Run build first.'));
  }

  // Code quality
  console.log(chalk.bold('\n🔍 Code Quality:'));
  console.log('─'.repeat(40));
  console.log(`ESLint: ${analysis.quality.eslint.configured ? '✅' : '❌'}`);
  console.log(`Prettier: ${analysis.quality.prettier.configured ? '✅' : '❌'}`);
  console.log(`TypeScript: ${analysis.quality.typescript.configured ? '✅' : '❌'}`);
  console.log(`Tests: ${analysis.quality.tests.configured ? `✅ (${analysis.quality.tests.files} files)` : '❌'}`);

  // Scripts
  if (Object.keys(analysis.dependencies.scripts).length > 0) {
    console.log(chalk.bold('\n📜 Available Scripts:'));
    console.log('─'.repeat(40));
    for (const [name, command] of Object.entries(analysis.dependencies.scripts)) {
      console.log(`  ${name.padEnd(15)} ${command}`);
    }
  }

  // Recommendations
  console.log(chalk.bold('\n💡 Recommendations:'));
  console.log('─'.repeat(40));
  
  if (!analysis.quality.eslint.configured) {
    console.log('• Add ESLint for code quality');
  }
  if (!analysis.quality.prettier.configured) {
    console.log('• Add Prettier for code formatting');
  }
  if (!analysis.quality.tests.configured) {
    console.log('• Add test files for better code coverage');
  }
  if (analysis.dependencies.duplicates.length > 0) {
    console.log('• Review potentially duplicate dependencies');
  }
  if (analysis.bundle.found && analysis.bundle.totalSize > 5 * 1024 * 1024) {
    console.log('• Consider bundle optimization (bundle size > 5MB)');
  }
}

export async function runAnalyze(options = {}) {
  const args = process.argv.slice(2);
  const outputFile = options.output || args.find(arg => arg.startsWith('-o'))?.split('=')[1];
  const jsonOutput = options.json || args.includes('-j') || args.includes('--json');
  
  const spinner = ora('Analyzing project...').start();
  
  try {
    const analysis = {
      timestamp: new Date().toISOString(),
      structure: await analyzeProjectStructure(),
      dependencies: await analyzeDependencies(),
      bundle: await analyzeBundleSize(),
      quality: await analyzeCodeQuality()
    };

    spinner.succeed('Analysis completed');

    if (jsonOutput) {
      const output = JSON.stringify(analysis, null, 2);
      
      if (outputFile) {
        fs.writeFileSync(outputFile, output);
        console.log(chalk.green(`Analysis saved to ${outputFile}`));
      } else {
        console.log(output);
      }
    } else {
      printAnalysis(analysis, options);
      
      if (outputFile) {
        // For non-JSON output, we'd need to format it differently
        console.log(chalk.yellow(`\nNote: Text output not supported with -o flag. Use -j for JSON output.`));
      }
    }

  } catch (error) {
    spinner.fail('Analysis failed');
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAnalyze().catch(console.error);
}
