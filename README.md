# Dr. Cursored 🩺💻

*The ultimate debugging and development health toolkit for modern web projects*

[![npm version](https://badge.fury.io/js/dr-cursored.svg)](https://badge.fury.io/js/dr-cursored)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/node/v/dr-cursored.svg)](https://nodejs.org/)

Dr. Cursored is a comprehensive debugging and development health toolkit that helps developers maintain healthy development environments, debug issues faster, and improve project quality. It provides universal health checks, smart cleaning, port management, service orchestration, and powerful debugging tools.

## ✨ Features

- 🩺 **Universal Health Checks** - Auto-detect project types and run comprehensive health checks
- 🧹 **Smart Cleaning** - Intelligent artifact and cache cleaning with dry-run support
- 🔌 **Port Management** - Check port availability and resolve conflicts
- 🚀 **Service Orchestration** - Start, stop, and manage development services
- 📊 **Project Analysis** - Deep insights into project structure and dependencies
- 🐛 **Debug Interface** - Web-based debugging dashboard with live monitoring
- 📝 **Structured Logging** - Universal logging with request IDs and performance tracking
- 🔍 **Runtime Inspection** - Performance monitoring and error tracking
- 🧪 **Test Fixtures** - Generate and manage test data
- ⚡ **Cursor IDE Integration** - Enhanced .cursorrules for better AI assistance

## 🚀 Quick Start

### Installation

```bash
# Install as dev dependency
npm install --save-dev dr-cursored

# Or run directly
npx dr-cursored init
```

### Setup

```bash
# Initialize in your project
npx dr-cursored setup

# Run health check
npm run doctor

# Start debug interface
npm run debug
```

## 📋 Commands

### Core Commands

```bash
# Health check everything
npx dr-cursored doctor

# Clean build artifacts
npx dr-cursored clean

# Check port usage
npx dr-cursored ports

# Manage services
npx dr-cursored services

# Analyze project
npx dr-cursored analyze

# Start debug interface
npx dr-cursored debug

# Auto-fix issues
npx dr-cursored fix
```

### Advanced Commands

```bash
# Generate debug report
npx dr-cursored report

# Clean with specific categories
npx dr-cursored clean --all

# Check specific port
npx dr-cursored ports -p 3000

# Kill processes using ports
npx dr-cursored ports -k

# Start specific service
npx dr-cursored services -s dev

# Analyze with JSON output
npx dr-cursored analyze -j
```

## 🎯 Project Types Supported

Dr. Cursored automatically detects and supports:

- **React** - Create React App, Vite, Next.js
- **Vue** - Vue CLI, Vite, Nuxt.js
- **Svelte** - SvelteKit, Vite
- **Node.js** - Express, Fastify, NestJS
- **TypeScript** - Any TypeScript project
- **Vite** - Universal Vite projects
- **And more!**

## 🛠️ Usage Examples

### Health Checking

```bash
# Basic health check
npx dr-cursored doctor

# Verbose output
npx dr-cursored doctor --verbose

# Auto-fix issues
npx dr-cursored doctor --fix
```

### Cleaning

```bash
# Clean build artifacts
npx dr-cursored clean

# Dry run to see what would be cleaned
npx dr-cursored clean --dry

# Clean everything including node_modules
npx dr-cursored clean --all

# Clean specific categories
npx dr-cursored clean build cache logs
```

### Port Management

```bash
# Check common development ports
npx dr-cursored ports

# Check specific port
npx dr-cursored ports -p 3000

# Kill processes using ports
npx dr-cursored ports -k
```

### Service Management

```bash
# Interactive service manager
npx dr-cursored services

# Start specific service
npx dr-cursored services -s dev

# Stop service
npx dr-cursored services -t dev

# Restart service
npx dr-cursored services -r dev
```

### Project Analysis

```bash
# Analyze project structure
npx dr-cursored analyze

# Output to file
npx dr-cursored analyze -o analysis.json

# JSON output
npx dr-cursored analyze -j
```

## 🔧 Integration

### Package.json Scripts

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "doctor": "npx dr-cursored doctor",
    "clean": "npx dr-cursored clean",
    "debug": "npx dr-cursored debug",
    "analyze": "npx dr-cursored analyze",
    "ports": "npx dr-cursored ports",
    "services": "npx dr-cursored services",
    "fix": "npx dr-cursored fix"
  }
}
```

### Express.js Integration

```javascript
import express from 'express';
import { healthChecker, logger, requestLogger } from 'dr-cursored';

const app = express();

// Add request logging
app.use(requestLogger);

// Health check endpoint
app.get('/health', healthChecker.createHealthEndpoint());

// Error logging
app.use((error, req, res, next) => {
  logger.errorWithStack('Unhandled error', error, {
    method: req.method,
    url: req.url,
    requestId: req.requestId
  });
  next(error);
});
```

### React Integration

```javascript
import { logger } from 'dr-cursored/lib/logger.mjs';

// Create logger instance
const appLogger = logger.child({ component: 'App' });

// Use in components
function App() {
  useEffect(() => {
    appLogger.info('App component mounted');
  }, []);

  return <div>My App</div>;
}
```

### TypeScript Integration

```typescript
import { HealthChecker, Logger } from 'dr-cursored';

const logger = new Logger({ 
  service: 'my-app',
  level: 'debug' 
});

const healthChecker = new HealthChecker({
  logger,
  timeout: 5000
});
```

## 🎨 Debug Interface

Access the debug interface at `http://localhost:3001` (or your configured port):

- **Health Checks** - Real-time system status
- **API Testing** - Test endpoints with custom headers and bodies
- **Live Logs** - Stream application logs
- **Performance** - Monitor CPU, memory, and response times
- **Services** - Manage development services

## 📊 Health Checks

Dr. Cursored performs comprehensive health checks:

### System Health
- Memory usage (process and system)
- CPU load and cores
- Disk space
- Process uptime

### Project Health
- Dependencies installation
- TypeScript compilation
- ESLint configuration
- Git repository status
- File system integrity

### Network Health
- Port availability
- Service endpoints
- CORS configuration
- API responsiveness

### Code Quality
- Linting setup
- Prettier configuration
- Test coverage
- Bundle size analysis

## 🧹 Smart Cleaning

Intelligent cleaning with category support:

- **Build artifacts** - dist/, build/, .next/, .nuxt/
- **Cache files** - .cache/, .vite/, .turbo/, .eslintcache
- **Log files** - *.log, logs/
- **Temporary files** - .tmp/, *.tmp, .DS_Store
- **Coverage reports** - coverage/, .nyc_output/
- **TypeScript cache** - *.tsbuildinfo

## 🔍 Project Analysis

Deep project insights:

- File structure analysis
- Dependency categorization
- Bundle size breakdown
- Code quality metrics
- Performance recommendations

## 📝 Structured Logging

Universal logging with:

- Request ID tracking
- Performance timing
- Error stack traces
- Contextual metadata
- Multiple output formats (JSON, text)
- Color support

## 🧪 Test Fixtures

Generate and manage test data:

```javascript
import { fixtures } from 'dr-cursored/lib/fixtures.mjs';

// Generate test data
const user = fixtures.generateUser({ name: 'John Doe' });
const post = fixtures.generatePost({ authorId: user.id });

// Save and load fixtures
await fixtures.saveFixture('test-user', user);
const loadedUser = await fixtures.loadFixture('test-user');
```

## 🔧 Configuration

Create `.dr-cursored.json` in your project root:

```json
{
  "version": "1.0.0",
  "projectType": "react",
  "name": "my-app",
  "port": 3000,
  "enableLogging": true,
  "enableHealthChecks": true,
  "enableDebugInterface": true,
  "healthCheck": {
    "endpoints": ["http://localhost:3000/api/health"],
    "ports": [3000, 8000],
    "files": ["package.json", "src/index.js"]
  }
}
```

## 🎯 Cursor IDE Integration

Dr. Cursored includes enhanced `.cursorrules` for better AI assistance:

- Quick debug commands
- Common issue solutions
- Project structure insights
- Code quality automation
- Debugging workflows

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

```bash
# Clone the repository
git clone https://github.com/your-username/dr-cursored.git

# Install dependencies
npm install

# Run tests
npm test

# Build the project
npm run build
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by the need for better debugging tools in modern web development
- Built with the community in mind
- Thanks to all contributors and users

## 📞 Support

- 📖 [Documentation](https://github.com/your-username/dr-cursored#readme)
- 🐛 [Issue Tracker](https://github.com/your-username/dr-cursored/issues)
- 💬 [Discussions](https://github.com/your-username/dr-cursored/discussions)

## 🚀 Roadmap

- [ ] Docker integration
- [ ] CI/CD health checks
- [ ] Database health monitoring
- [ ] Performance profiling
- [ ] Error tracking integration
- [ ] Team collaboration features

---

**Made with ❤️ for developers who value their sanity**

*Dr. Cursored - Because debugging shouldn't be a mystery*
