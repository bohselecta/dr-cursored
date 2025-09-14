#!/usr/bin/env node
import fs from 'node:fs';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';

const ok = (m) => console.log(chalk.green('✅'), m);
const warn = (m) => console.log(chalk.yellow('⚠️ '), m);
const err = (m) => console.log(chalk.red('❌'), m);
const info = (m) => console.log(chalk.blue('ℹ️ '), m);

export async function setupProject() {
  console.log(chalk.bold.blue('🩺 Dr. Cursored - Project Setup\n'));
  
  const spinner = ora('Setting up project...').start();
  
  try {
    // Check if package.json exists
    const packagePath = path.join(process.cwd(), 'package.json');
    if (!fs.existsSync(packagePath)) {
      spinner.fail('package.json not found');
      err('Please run this command in a Node.js project directory');
      process.exit(1);
    }
    
    // Install Dr. Cursored as dev dependency
    info('Installing Dr. Cursored...');
    const { spawn } = await import('node:child_process');
    
    const installProcess = spawn('npm', ['install', '--save-dev', 'dr-cursored'], {
      stdio: 'inherit',
      shell: true
    });
    
    await new Promise((resolve, reject) => {
      installProcess.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`npm install failed with code ${code}`));
        }
      });
    });
    
    ok('Dr. Cursored installed');
    
    // Create configuration
    await createConfiguration();
    
    // Setup scripts
    await setupScripts();
    
    // Create directories
    await createDirectories();
    
    // Copy templates
    await copyTemplates();
    
    // Create example files
    await createExamples();
    
    spinner.succeed('Project setup complete!');
    
    console.log(chalk.bold('\n🎉 Setup Complete!'));
    console.log('\nAvailable commands:');
    console.log('  npm run doctor    - Run health check');
    console.log('  npm run clean     - Clean build artifacts');
    console.log('  npm run debug     - Start debug interface');
    console.log('  npm run analyze   - Analyze project structure');
    console.log('  npm run ports     - Check port usage');
    console.log('  npm run services  - Manage development services');
    
    console.log('\nNext steps:');
    console.log('1. Run "npm run doctor" to check your project health');
    console.log('2. Run "npm run debug" to start the debug interface');
    console.log('3. Check the .cursorrules file for IDE configuration');
    
  } catch (error) {
    spinner.fail('Setup failed');
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

async function createConfiguration() {
  const configPath = path.join(process.cwd(), '.dr-cursored.json');
  
  const config = {
    version: '1.0.0',
    projectType: 'unknown',
    name: path.basename(process.cwd()),
    description: 'A web application',
    packageManager: 'npm',
    port: 3000,
    enableLogging: true,
    enableHealthChecks: true,
    enableDebugInterface: true,
    timestamp: new Date().toISOString()
  };
  
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  ok('Configuration file created');
}

async function setupScripts() {
  const packagePath = path.join(process.cwd(), 'package.json');
  
  try {
    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    const scripts = {
      'doctor': 'npx dr-cursored doctor',
      'clean': 'npx dr-cursored clean',
      'debug': 'npx dr-cursored debug',
      'analyze': 'npx dr-cursored analyze',
      'ports': 'npx dr-cursored ports',
      'services': 'npx dr-cursored services',
      'fix': 'npx dr-cursored fix'
    };
    
    pkg.scripts = { ...pkg.scripts, ...scripts };
    
    fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2));
    ok('Package.json scripts updated');
  } catch (error) {
    warn(`Failed to update package.json: ${error.message}`);
  }
}

async function createDirectories() {
  const dirs = ['fixtures', 'logs', 'debug', 'templates'];
  
  for (const dir of dirs) {
    const dirPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      ok(`Created directory: ${dir}`);
    }
  }
}

async function copyTemplates() {
  // Copy .cursorrules
  const cursorrulesContent = `# Dr. Cursored - Enhanced Cursor IDE Configuration

## Quick Debug Commands
# Run these in Cursor's terminal when things break:

# 🩺 Health check everything
npm run doctor

# 🧹 Clean build artifacts
npm run clean

# 🔍 Analyze project structure
npm run analyze

# 🚀 Start with verbose logging
DEBUG=1 npm run dev

## Auto-suggestions for common issues

### Port conflicts
# If you see "port already in use":
1. Check what's using the port: \`lsof -i :3000\` (macOS/Linux) or \`netstat -ano | findstr :3000\` (Windows)
2. Kill the process: \`kill -9 <PID>\` (macOS/Linux) or \`taskkill /PID <PID> /F\` (Windows)
3. Or use a different port: \`PORT=3001 npm run dev\`

### TypeScript errors
# If you see TypeScript errors:
1. Check project references: \`npx tsc --build --dry\`
2. Clear TS cache: \`rm -rf .tsbuildinfo\`
3. Restart TS server in Cursor: Cmd+Shift+P → "TypeScript: Restart TS Server"

### CORS issues
# If frontend can't reach backend:
1. Check CORS origins in server config
2. Verify backend is running: \`curl http://localhost:8000/health\`
3. Check browser dev tools for specific CORS errors

### Missing dependencies
# If you see import errors:
1. Install dependencies: \`npm install\`
2. Check if package exists: \`npm list <package-name>\`
3. Clear node_modules: \`rm -rf node_modules && npm install\`

### Hot reload not working
# If changes aren't reflecting:
1. Check file watchers: \`echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf\` (Linux)
2. Restart dev server with: \`npm run dev --force\`
3. Clear browser cache: Cmd+Shift+R

## Debug Workflows

### When the app won't start:
1. \`npm run doctor\` - Check environment
2. \`npm run clean\` - Clear build artifacts  
3. \`npm install\` - Reinstall dependencies
4. Check ports with \`npm run ports\`

### When API calls fail:
1. Open debug page: http://localhost:3000/debug
2. Test endpoint directly in the API tester
3. Check logs for request IDs
4. Verify CORS settings

### When builds fail:
1. Check TypeScript: \`npx tsc --noEmit\`
2. Clear cache: \`npm run clean\`
3. Check for circular dependencies
4. Verify all imports resolve

## Code Quality Automation
# Auto-format and lint on save
"editor.formatOnSave": true
"editor.codeActionsOnSave": {
  "source.fixAll.eslint": true,
  "source.organizeImports": true
}

## Cursor AI Hints
# Help Cursor understand your codebase better

### Preferred patterns:
- Use TypeScript strict mode
- Prefer async/await over Promises
- Use const assertions for immutable data
- Implement error boundaries for React components
- Use proper HTTP status codes
- Log with structured data (JSON)

### Avoid these patterns:
- Any types (use unknown instead)
- Console.log in production
- Inline styles (use CSS modules/styled-components)
- Large useEffect dependencies
- Unhandled promise rejections
`;

  fs.writeFileSync(path.join(process.cwd(), '.cursorrules'), cursorrulesContent);
  ok('Created .cursorrules file');
}

async function createExamples() {
  // Create example logger usage
  const loggerExample = `import { logger } from 'dr-cursored/lib/logger.mjs';

// Basic logging
logger.info('Application started');
logger.error('Something went wrong', { error: 'Database connection failed' });

// Create child logger with context
const requestLogger = logger.child({ requestId: 'req-123' });
requestLogger.debug('Processing request', { userId: 456 });

// Performance timing
const timer = logger.timer('database-query');
// ... do work ...
timer(); // Logs the duration

// HTTP request logging
app.use(logger.httpRequest);
`;

  fs.writeFileSync(path.join(process.cwd(), 'examples', 'logger-example.js'), loggerExample);
  
  // Create example health check
  const healthExample = `import { healthChecker } from 'dr-cursored/lib/health.mjs';

// Basic health check
const health = await healthChecker.runHealthCheck({
  includeSystem: true,
  includeDependencies: true,
  includeGit: true,
  endpoints: ['http://localhost:3000/api/health'],
  ports: [3000, 8000]
});

console.log('Health status:', health.overall);

// Express middleware
app.get('/health', healthChecker.createHealthEndpoint());
`;

  fs.writeFileSync(path.join(process.cwd(), 'examples', 'health-example.js'), healthExample);
  
  // Create example fixtures
  const fixturesExample = `import { fixtures } from 'dr-cursored/lib/fixtures.mjs';

// Generate test data
const user = fixtures.generateUser({ name: 'John Doe' });
const post = fixtures.generatePost({ authorId: user.id });

// Save fixtures
await fixtures.saveFixture('test-user', user);
await fixtures.saveFixture('test-post', post);

// Load fixtures
const loadedUser = await fixtures.loadFixture('test-user');
`;

  fs.writeFileSync(path.join(process.cwd(), 'examples', 'fixtures-example.js'), fixturesExample);
  
  ok('Created example files');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  setupProject().catch(console.error);
}
