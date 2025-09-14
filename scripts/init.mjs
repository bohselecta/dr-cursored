#!/usr/bin/env node
import fs from 'node:fs';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';

const ok = (m) => console.log(chalk.green('✅'), m);
const warn = (m) => console.log(chalk.yellow('⚠️ '), m);
const err = (m) => console.log(chalk.red('❌'), m);
const info = (m) => console.log(chalk.blue('ℹ️ '), m);

export async function initProject() {
  console.log(chalk.bold.blue('🩺 Dr. Cursored - Project Initialization\n'));
  
  const spinner = ora('Initializing Dr. Cursored...').start();
  
  try {
    // Check if already initialized
    const configPath = path.join(process.cwd(), '.dr-cursored.json');
    if (fs.existsSync(configPath)) {
      spinner.warn('Dr. Cursored already initialized');
      const { overwrite } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'overwrite',
          message: 'Do you want to overwrite the existing configuration?',
          default: false
        }
      ]);
      
      if (!overwrite) {
        console.log(chalk.yellow('Initialization cancelled'));
        return;
      }
    }
    
    // Detect project type
    const projectType = await detectProjectType();
    info(`Detected project type: ${projectType}`);
    
    // Ask for configuration
    const config = await promptForConfiguration(projectType);
    
    // Create configuration file
    const configData = {
      version: '1.0.0',
      projectType,
      ...config,
      timestamp: new Date().toISOString()
    };
    
    fs.writeFileSync(configPath, JSON.stringify(configData, null, 2));
    ok('Configuration file created');
    
    // Create necessary directories
    const dirs = ['fixtures', 'logs', 'debug'];
    for (const dir of dirs) {
      const dirPath = path.join(process.cwd(), dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        ok(`Created directory: ${dir}`);
      }
    }
    
    // Copy templates
    await copyTemplates(projectType);
    
    // Update package.json scripts
    await updatePackageJson();
    
    // Create .gitignore entries
    await updateGitignore();
    
    spinner.succeed('Dr. Cursored initialized successfully!');
    
    console.log(chalk.bold('\n🎉 Setup Complete!'));
    console.log('\nNext steps:');
    console.log('1. Run "npx dr-cursored doctor" to check your project health');
    console.log('2. Run "npx dr-cursored debug" to start the debug interface');
    console.log('3. Add "npx dr-cursored" to your package.json scripts');
    
  } catch (error) {
    spinner.fail('Initialization failed');
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

async function detectProjectType() {
  const packagePath = path.join(process.cwd(), 'package.json');
  if (!fs.existsSync(packagePath)) {
    return 'unknown';
  }
  
  try {
    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    
    if (allDeps.react) return 'react';
    if (allDeps.vue) return 'vue';
    if (allDeps.next) return 'next';
    if (allDeps.express) return 'express';
    if (allDeps.fastify) return 'fastify';
    if (allDeps['@nestjs/core']) return 'nest';
    if (allDeps.svelte) return 'svelte';
    if (allDeps.nuxt) return 'nuxt';
    if (allDeps.vite) return 'vite';
    
    return 'unknown';
  } catch (e) {
    return 'unknown';
  }
}

async function promptForConfiguration(projectType) {
  const questions = [
    {
      type: 'input',
      name: 'name',
      message: 'Project name:',
      default: path.basename(process.cwd())
    },
    {
      type: 'input',
      name: 'description',
      message: 'Project description:',
      default: 'A web application'
    },
    {
      type: 'list',
      name: 'packageManager',
      message: 'Package manager:',
      choices: ['npm', 'yarn', 'pnpm'],
      default: 'npm'
    },
    {
      type: 'input',
      name: 'port',
      message: 'Development port:',
      default: projectType === 'next' ? '3000' : '5173',
      validate: (input) => {
        const port = parseInt(input);
        return port > 0 && port < 65536 ? true : 'Please enter a valid port number';
      }
    },
    {
      type: 'confirm',
      name: 'enableLogging',
      message: 'Enable structured logging?',
      default: true
    },
    {
      type: 'confirm',
      name: 'enableHealthChecks',
      message: 'Enable health check endpoints?',
      default: true
    },
    {
      type: 'confirm',
      name: 'enableDebugInterface',
      message: 'Enable debug interface?',
      default: true
    }
  ];
  
  return await inquirer.prompt(questions);
}

async function copyTemplates(projectType) {
  const templatesDir = path.join(process.cwd(), 'templates');
  if (!fs.existsSync(templatesDir)) {
    fs.mkdirSync(templatesDir, { recursive: true });
  }
  
  // Copy .cursorrules
  const cursorrulesSource = path.join(process.cwd(), 'node_modules', 'dr-cursored', 'templates', 'cursorrules', '.cursorrules');
  const cursorrulesDest = path.join(process.cwd(), '.cursorrules');
  
  if (fs.existsSync(cursorrulesSource)) {
    fs.copyFileSync(cursorrulesSource, cursorrulesDest);
    ok('Copied .cursorrules template');
  }
  
  // Copy debug page
  const debugSource = path.join(process.cwd(), 'node_modules', 'dr-cursored', 'templates', 'debug-pages', 'universal-debug.html');
  const debugDest = path.join(process.cwd(), 'debug', 'index.html');
  
  if (fs.existsSync(debugSource)) {
    fs.copyFileSync(debugSource, debugDest);
    ok('Copied debug interface template');
  }
}

async function updatePackageJson() {
  const packagePath = path.join(process.cwd(), 'package.json');
  if (!fs.existsSync(packagePath)) {
    warn('package.json not found, skipping script updates');
    return;
  }
  
  try {
    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    const newScripts = {
      'doctor': 'npx dr-cursored doctor',
      'clean': 'npx dr-cursored clean',
      'debug': 'npx dr-cursored debug',
      'analyze': 'npx dr-cursored analyze',
      'ports': 'npx dr-cursored ports',
      'services': 'npx dr-cursored services'
    };
    
    pkg.scripts = { ...pkg.scripts, ...newScripts };
    
    fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2));
    ok('Updated package.json scripts');
  } catch (error) {
    warn(`Failed to update package.json: ${error.message}`);
  }
}

async function updateGitignore() {
  const gitignorePath = path.join(process.cwd(), '.gitignore');
  const entries = [
    '',
    '# Dr. Cursored',
    'logs/',
    'debug/',
    '.dr-cursored.json',
    'fixtures/*.json'
  ];
  
  try {
    let content = '';
    if (fs.existsSync(gitignorePath)) {
      content = fs.readFileSync(gitignorePath, 'utf8');
    }
    
    const newEntries = entries.filter(entry => !content.includes(entry));
    if (newEntries.length > 0) {
      content += '\n' + newEntries.join('\n');
      fs.writeFileSync(gitignorePath, content);
      ok('Updated .gitignore');
    }
  } catch (error) {
    warn(`Failed to update .gitignore: ${error.message}`);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  initProject().catch(console.error);
}
