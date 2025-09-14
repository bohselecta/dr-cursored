#!/usr/bin/env node
import fs from 'node:fs';
import path from 'path';
import { spawnSync } from 'node:child_process';
import chalk from 'chalk';
import ora from 'ora';

const ok = (m) => console.log(chalk.green('✅'), m);
const warn = (m) => console.log(chalk.yellow('⚠️ '), m);
const err = (m) => console.log(chalk.red('❌'), m);
const info = (m) => console.log(chalk.blue('ℹ️ '), m);

export async function runFix() {
  console.log(chalk.bold.blue('🔧 Dr. Cursored - Auto Fix\n'));
  
  const spinner = ora('Running auto-fix...').start();
  let fixed = 0;
  let errors = 0;
  
  try {
    // Fix 1: Install missing dependencies
    if (await fixMissingDependencies()) {
      fixed++;
    }
    
    // Fix 2: Clear TypeScript cache
    if (await fixTypeScriptCache()) {
      fixed++;
    }
    
    // Fix 3: Fix ESLint configuration
    if (await fixESLintConfig()) {
      fixed++;
    }
    
    // Fix 4: Fix package.json scripts
    if (await fixPackageJsonScripts()) {
      fixed++;
    }
    
    // Fix 5: Fix .gitignore
    if (await fixGitignore()) {
      fixed++;
    }
    
    // Fix 6: Fix port conflicts
    if (await fixPortConflicts()) {
      fixed++;
    }
    
    // Fix 7: Fix file permissions
    if (await fixFilePermissions()) {
      fixed++;
    }
    
    spinner.succeed(`Auto-fix completed: ${fixed} fixes applied`);
    
    if (fixed > 0) {
      console.log(chalk.green(`\n✅ Applied ${fixed} fixes`));
    } else {
      console.log(chalk.yellow('\n⚠️  No fixes were needed'));
    }
    
    if (errors > 0) {
      console.log(chalk.red(`\n❌ ${errors} errors occurred during fixing`));
    }
    
  } catch (error) {
    spinner.fail('Auto-fix failed');
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

async function fixMissingDependencies() {
  const packagePath = path.join(process.cwd(), 'package.json');
  if (!fs.existsSync(packagePath)) {
    return false;
  }
  
  try {
    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    const nodeModulesPath = path.join(process.cwd(), 'node_modules');
    
    if (!fs.existsSync(nodeModulesPath)) {
      info('Installing missing dependencies...');
      
      const result = spawnSync('npm', ['install'], {
        stdio: 'inherit',
        cwd: process.cwd()
      });
      
      if (result.status === 0) {
        ok('Dependencies installed');
        return true;
      } else {
        err('Failed to install dependencies');
        return false;
      }
    }
    
    return false;
  } catch (error) {
    warn(`Failed to fix dependencies: ${error.message}`);
    return false;
  }
}

async function fixTypeScriptCache() {
  const tsBuildInfoFiles = [
    'tsconfig.tsbuildinfo',
    '.tsbuildinfo',
    '*.tsbuildinfo'
  ];
  
  let fixed = false;
  
  for (const file of tsBuildInfoFiles) {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        ok(`Removed TypeScript cache: ${file}`);
        fixed = true;
      } catch (error) {
        warn(`Failed to remove ${file}: ${error.message}`);
      }
    }
  }
  
  return fixed;
}

async function fixESLintConfig() {
  const eslintConfigs = [
    '.eslintrc.js',
    '.eslintrc.json',
    '.eslintrc.yaml',
    'eslint.config.js'
  ];
  
  const hasConfig = eslintConfigs.some(config => 
    fs.existsSync(path.join(process.cwd(), config))
  );
  
  if (!hasConfig) {
    info('Creating basic ESLint configuration...');
    
    const basicConfig = {
      "env": {
        "browser": true,
        "es2021": true,
        "node": true
      },
      "extends": ["eslint:recommended"],
      "parserOptions": {
        "ecmaVersion": "latest",
        "sourceType": "module"
      },
      "rules": {
        "no-unused-vars": "warn",
        "no-console": "warn"
      }
    };
    
    try {
      fs.writeFileSync(
        path.join(process.cwd(), '.eslintrc.json'),
        JSON.stringify(basicConfig, null, 2)
      );
      ok('Created basic ESLint configuration');
      return true;
    } catch (error) {
      warn(`Failed to create ESLint config: ${error.message}`);
      return false;
    }
  }
  
  return false;
}

async function fixPackageJsonScripts() {
  const packagePath = path.join(process.cwd(), 'package.json');
  if (!fs.existsSync(packagePath)) {
    return false;
  }
  
  try {
    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    const requiredScripts = {
      'doctor': 'npx dr-cursored doctor',
      'clean': 'npx dr-cursored clean',
      'debug': 'npx dr-cursored debug',
      'analyze': 'npx dr-cursored analyze'
    };
    
    let updated = false;
    
    for (const [scriptName, scriptCommand] of Object.entries(requiredScripts)) {
      if (!pkg.scripts || !pkg.scripts[scriptName]) {
        if (!pkg.scripts) pkg.scripts = {};
        pkg.scripts[scriptName] = scriptCommand;
        updated = true;
      }
    }
    
    if (updated) {
      fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2));
      ok('Updated package.json scripts');
      return true;
    }
    
    return false;
  } catch (error) {
    warn(`Failed to fix package.json: ${error.message}`);
    return false;
  }
}

async function fixGitignore() {
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
      return true;
    }
    
    return false;
  } catch (error) {
    warn(`Failed to fix .gitignore: ${error.message}`);
    return false;
  }
}

async function fixPortConflicts() {
  // This would check for common port conflicts and suggest alternatives
  // For now, just return false as this requires more complex logic
  return false;
}

async function fixFilePermissions() {
  // This would fix common file permission issues
  // For now, just return false as this is platform-specific
  return false;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runFix().catch(console.error);
}
