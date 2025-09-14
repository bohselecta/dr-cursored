# Contributing to Dr. Cursored 🤝

Thank you for considering contributing to Dr. Cursored! We're excited to work with you to make debugging easier for developers everywhere.

## 🌟 Ways to Contribute

- 🐛 **Report bugs** - Help us identify and fix issues
- 💡 **Suggest features** - Share ideas for new functionality
- 📝 **Improve documentation** - Make our docs clearer and more helpful
- 🔧 **Submit code** - Fix bugs or implement new features
- 🧪 **Add tests** - Improve our test coverage
- 🎨 **Framework templates** - Add support for new project types

## 🚀 Getting Started

### Prerequisites

- Node.js 16+ (we recommend using [nvm](https://github.com/nvm-sh/nvm))
- npm or pnpm
- Git

### Development Setup

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/dr-cursored.git
   cd dr-cursored
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Run tests to ensure everything works**
   ```bash
   npm test
   ```

4. **Start development**
   ```bash
   npm run dev
   ```

5. **Test your changes**
   ```bash
   # Run the tool locally
   node scripts/doctor.mjs
   
   # Test in a sample project
   cd ../test-project
   npx ../dr-cursored/scripts/doctor.mjs
   ```

## 📝 Development Guidelines

### Code Style

- **ES Modules only** - Use `import`/`export`, not `require()`
- **TypeScript where beneficial** - For complex logic and APIs
- **Functional approach** - Prefer pure functions when possible
- **Clear naming** - Functions and variables should be self-documenting
- **Error handling** - Always handle potential failures gracefully

### Code Examples

**✅ Good:**
```javascript
async function checkPort(port) {
  try {
    const result = await isPortAvailable(port);
    return { available: result, port };
  } catch (error) {
    logger.warn(`Failed to check port ${port}`, { error: error.message });
    return { available: false, port, error: error.message };
  }
}
```

**❌ Avoid:**
```javascript
function checkPort(port) {
  // No error handling, unclear return value
  return isPortAvailable(port);
}
```

### Commit Message Format

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

feat(health): add memory usage monitoring
fix(ports): handle EADDRINUSE error properly
docs(readme): update installation instructions
test(clean): add dry-run mode tests
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `test` - Adding or updating tests
- `refactor` - Code refactoring
- `perf` - Performance improvements
- `chore` - Maintenance tasks

### Testing

We use [Vitest](https://vitest.dev/) for testing:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

**Test Structure:**
```javascript
import { describe, it, expect } from 'vitest';
import { checkPort } from '../lib/ports.mjs';

describe('Port Checker', () => {
  it('should detect available ports', async () => {
    const result = await checkPort(0); // 0 = random available port
    expect(result.available).toBe(true);
    expect(result.port).toBeGreaterThan(0);
  });

  it('should handle port conflicts', async () => {
    // Test with known busy port
    const result = await checkPort(22); // SSH port
    expect(result.available).toBe(false);
  });
});
```

### Documentation

- **JSDoc comments** for public APIs
- **README updates** for new features
- **Examples** for complex functionality
- **Type definitions** where helpful

## 🎯 Project Structure

```
dr-cursored/
├── scripts/           # Main CLI scripts
│   ├── doctor.mjs     # Health checker
│   ├── clean.mjs      # Artifact cleaner
│   ├── ports.mjs      # Port manager
│   └── services.mjs   # Service orchestrator
├── lib/               # Shared utilities
│   ├── logger.mjs     # Logging utilities
│   ├── health.mjs     # Health check functions
│   └── fixtures.mjs   # Test fixtures
├── templates/         # Project templates
│   ├── cursorrules/   # Cursor IDE configs
│   ├── debug-pages/   # Debug interfaces
│   └── health-endpoints/ # Health check templates
├── test/              # Test files
└── docs/              # Documentation
```

## 🐛 Bug Reports

When reporting bugs, please include:

1. **Clear description** of the issue
2. **Steps to reproduce** the problem
3. **Expected behavior** vs actual behavior
4. **Environment details**:
   - Node.js version (`node --version`)
   - OS and version
   - Dr. Cursored version
   - Project type (React, Vue, etc.)
5. **Console output** (run with `--verbose` flag)
6. **Screenshots** if relevant

## 💡 Feature Requests

For new features, please provide:

1. **Problem description** - What pain point does this solve?
2. **Proposed solution** - How should it work?
3. **Use cases** - Who would benefit and how?
4. **Alternatives considered** - Other approaches you've thought about

## 🧪 Adding Framework Support

To add support for a new framework:

1. **Update PROJECT_TYPES** in `scripts/doctor.mjs`:
   ```javascript
   myframework: { 
     files: ['my-framework.config.js'], 
     deps: ['my-framework'], 
     ports: [4000] 
   }
   ```

2. **Add health checks** specific to the framework
3. **Create templates** in `templates/`
4. **Add tests** for the new functionality
5. **Update documentation**

## 🔄 Pull Request Process

1. **Create a feature branch** from `main`
   ```bash
   git checkout -b feat/awesome-new-feature
   ```

2. **Make your changes** following our guidelines

3. **Add tests** for new functionality

4. **Update documentation** if needed

5. **Run the full test suite**
   ```bash
   npm test
   npm run lint
   npm run type-check
   ```

6. **Commit your changes** using conventional commits

7. **Push and create a PR** with:
   - Clear title and description
   - Link to related issues
   - Screenshots/demos if applicable

8. **Respond to feedback** and iterate

## 🎉 Recognition

Contributors are recognized in:
- Our [README](README.md) contributors section
- [Release notes](https://github.com/bohselecta/dr-cursored/releases)
- [Contributors page](https://github.com/bohselecta/dr-cursored/graphs/contributors)

## 📞 Getting Help

- 💬 [GitHub Discussions](https://github.com/bohselecta/dr-cursored/discussions) - General questions
- 🐛 [GitHub Issues](https://github.com/bohselecta/dr-cursored/issues) - Bug reports
- 📧 Email: hello@dr-cursored.dev

## 📜 Code of Conduct

### Our Pledge

We pledge to make participation in our project a harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, gender identity and expression, level of experience, nationality, personal appearance, race, religion, or sexual identity and orientation.

### Our Standards

**Positive behavior includes:**
- Using welcoming and inclusive language
- Being respectful of differing viewpoints
- Gracefully accepting constructive criticism
- Focusing on what's best for the community
- Showing empathy towards other community members

**Unacceptable behavior includes:**
- Trolling, insulting comments, and personal attacks
- Public or private harassment
- Publishing others' private information without permission
- Other conduct that could reasonably be considered inappropriate

### Enforcement

Project maintainers are responsible for clarifying standards and taking corrective action in response to unacceptable behavior. Report issues to hello@dr-cursored.dev.

---

**Thank you for contributing to Dr. Cursored! 🩺💙**

*Together, we're making debugging less mysterious for developers everywhere.*
