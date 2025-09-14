#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ok = (m) => console.log(chalk.green('✅'), m);
const info = (m) => console.log(chalk.blue('ℹ️ '), m);

export async function build() {
  console.log(chalk.bold.blue('🔨 Dr. Cursored - Build Process\n'));
  
  try {
    // Create dist directory
    const distDir = path.join(process.cwd(), 'dist');
    if (!fs.existsSync(distDir)) {
      fs.mkdirSync(distDir, { recursive: true });
      ok('Created dist directory');
    }
    
    // Copy all necessary files to dist
    const filesToCopy = [
      'bin',
      'scripts',
      'lib',
      'templates',
      'package.json',
      'README.md',
      'LICENSE',
      'CHANGELOG.md'
    ];
    
    for (const file of filesToCopy) {
      const srcPath = path.join(process.cwd(), file);
      const destPath = path.join(distDir, file);
      
      if (fs.existsSync(srcPath)) {
        if (fs.statSync(srcPath).isDirectory()) {
          copyDirectory(srcPath, destPath);
        } else {
          fs.copyFileSync(srcPath, destPath);
        }
        ok(`Copied ${file}`);
      }
    }
    
    // Update package.json for distribution
    const packagePath = path.join(distDir, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    // Remove dev dependencies and scripts for production
    delete pkg.devDependencies;
    delete pkg.scripts.lint;
    delete pkg.scripts['lint:fix'];
    delete pkg.scripts.format;
    delete pkg.scripts['format:check'];
    delete pkg.scripts['test:watch'];
    delete pkg.scripts['test:coverage'];
    delete pkg.scripts['type-check'];
    delete pkg.scripts.build;
    delete pkg.scripts.prepublishOnly;
    
    fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2));
    ok('Updated package.json for distribution');
    
    console.log(chalk.bold.green('\n🎉 Build completed successfully!'));
    console.log(chalk.blue('📦 Distribution files are ready in the dist/ directory'));
    
  } catch (error) {
    console.error(chalk.red('❌ Build failed:'), error.message);
    process.exit(1);
  }
}

function copyDirectory(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  build().catch(console.error);
}
