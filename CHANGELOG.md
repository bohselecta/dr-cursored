# Changelog

All notable changes to Dr. Cursored will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-12-13

### Added
- 🩺 Universal health checker with project type auto-detection
- 🧹 Smart cleaning system with category support
- 🔌 Port management and conflict resolution
- 🚀 Service orchestration and management
- 📊 Comprehensive project analysis
- 🐛 Web-based debug interface
- 📝 Structured logging with request IDs
- 🔍 Runtime inspection and performance monitoring
- 🧪 Test fixtures management
- ⚡ Cursor IDE integration with enhanced .cursorrules
- 🔧 Auto-fix capabilities for common issues
- 📋 Debug report generation
- 🎯 Support for React, Vue, Next.js, Express, Fastify, NestJS, Svelte, Nuxt, and Vite projects

### Features
- **Health Checks**: System, project, network, and code quality checks
- **Smart Cleaning**: Build artifacts, cache files, logs, and temporary files
- **Port Management**: Check availability and resolve conflicts
- **Service Management**: Start, stop, and restart development services
- **Project Analysis**: File structure, dependencies, bundle size, and performance
- **Debug Interface**: Real-time monitoring and testing dashboard
- **Structured Logging**: JSON and text formats with contextual metadata
- **Runtime Inspection**: Performance timing and error tracking
- **Test Fixtures**: Generate and manage test data
- **Auto-fix**: Automatically resolve common development issues

### CLI Commands
- `dr-cursored doctor` - Run comprehensive health check
- `dr-cursored clean` - Clean build artifacts and caches
- `dr-cursored ports` - Check and manage port usage
- `dr-cursored services` - Manage development services
- `dr-cursored analyze` - Analyze project structure
- `dr-cursored debug` - Start debug interface
- `dr-cursored fix` - Auto-fix common issues
- `dr-cursored report` - Generate debug report
- `dr-cursored init` - Initialize in project
- `dr-cursored setup` - Setup project configuration

### Dependencies
- Node.js >= 18.0.0
- glob ^10.3.10
- chalk ^5.3.0
- commander ^11.1.0
- ora ^7.0.1
- inquirer ^9.2.12

### Documentation
- Comprehensive README with usage examples
- Cursor IDE integration guide
- API documentation
- Contributing guidelines
- MIT License
