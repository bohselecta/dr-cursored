import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { logger } from './logger.mjs';

export class FixturesManager {
  constructor(options = {}) {
    this.fixturesDir = options.fixturesDir || path.join(process.cwd(), 'fixtures');
    this.logger = options.logger || logger;
    this.ensureFixturesDir();
  }

  ensureFixturesDir() {
    if (!fs.existsSync(this.fixturesDir)) {
      fs.mkdirSync(this.fixturesDir, { recursive: true });
      this.logger.debug('Created fixtures directory', { path: this.fixturesDir });
    }
  }

  // Generate test data
  generateUser(overrides = {}) {
    return {
      id: randomUUID(),
      email: `user-${Date.now()}@example.com`,
      name: `User ${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
      ...overrides
    };
  }

  generatePost(overrides = {}) {
    return {
      id: randomUUID(),
      title: `Test Post ${Math.floor(Math.random() * 1000)}`,
      content: 'This is a test post content.',
      authorId: randomUUID(),
      published: false,
      createdAt: new Date().toISOString(),
      ...overrides
    };
  }

  generateProduct(overrides = {}) {
    return {
      id: randomUUID(),
      name: `Product ${Math.floor(Math.random() * 1000)}`,
      price: Math.floor(Math.random() * 1000) + 10,
      description: 'A test product description.',
      category: 'test',
      inStock: true,
      createdAt: new Date().toISOString(),
      ...overrides
    };
  }

  generateApiResponse(overrides = {}) {
    return {
      success: true,
      data: null,
      message: 'Success',
      timestamp: new Date().toISOString(),
      requestId: randomUUID().slice(0, 8),
      ...overrides
    };
  }

  generateErrorResponse(overrides = {}) {
    return {
      success: false,
      error: {
        code: 'TEST_ERROR',
        message: 'Test error message',
        details: {}
      },
      timestamp: new Date().toISOString(),
      requestId: randomUUID().slice(0, 8),
      ...overrides
    };
  }

  // File-based fixtures
  async loadFixture(fixtureName) {
    const fixturePath = path.join(this.fixturesDir, `${fixtureName}.json`);
    
    try {
      const content = fs.readFileSync(fixturePath, 'utf8');
      const data = JSON.parse(content);
      this.logger.debug('Loaded fixture', { fixtureName, path: fixturePath });
      return data;
    } catch (error) {
      this.logger.error('Failed to load fixture', { fixtureName, error: error.message });
      throw error;
    }
  }

  async saveFixture(fixtureName, data) {
    const fixturePath = path.join(this.fixturesDir, `${fixtureName}.json`);
    
    try {
      const content = JSON.stringify(data, null, 2);
      fs.writeFileSync(fixturePath, content);
      this.logger.debug('Saved fixture', { fixtureName, path: fixturePath });
    } catch (error) {
      this.logger.error('Failed to save fixture', { fixtureName, error: error.message });
      throw error;
    }
  }

  async listFixtures() {
    try {
      const files = fs.readdirSync(this.fixturesDir);
      return files
        .filter(file => file.endsWith('.json'))
        .map(file => file.replace('.json', ''));
    } catch (error) {
      this.logger.error('Failed to list fixtures', { error: error.message });
      return [];
    }
  }

  async deleteFixture(fixtureName) {
    const fixturePath = path.join(this.fixturesDir, `${fixtureName}.json`);
    
    try {
      fs.unlinkSync(fixturePath);
      this.logger.debug('Deleted fixture', { fixtureName, path: fixturePath });
    } catch (error) {
      this.logger.error('Failed to delete fixture', { fixtureName, error: error.message });
      throw error;
    }
  }

  // Database fixtures
  async generateDatabaseFixtures(schema) {
    const fixtures = {};
    
    for (const [tableName, config] of Object.entries(schema)) {
      const { count = 10, generator, dependencies = [] } = config;
      const records = [];
      
      for (let i = 0; i < count; i++) {
        let record = generator ? generator() : {};
        
        // Handle dependencies
        for (const dep of dependencies) {
          if (fixtures[dep.table]) {
            const depRecord = fixtures[dep.table][Math.floor(Math.random() * fixtures[dep.table].length)];
            record[dep.field] = depRecord[dep.foreignKey];
          }
        }
        
        records.push(record);
      }
      
      fixtures[tableName] = records;
    }
    
    return fixtures;
  }

  // API testing fixtures
  generateHttpRequest(method = 'GET', url = '/api/test', overrides = {}) {
    return {
      method,
      url,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Dr-Cursored-Test/1.0'
      },
      body: null,
      ...overrides
    };
  }

  generateHttpResponse(status = 200, data = null, overrides = {}) {
    return {
      status,
      statusText: status >= 400 ? 'Error' : 'OK',
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': randomUUID().slice(0, 8)
      },
      data,
      ...overrides
    };
  }

  // Mock data generators
  generateMockData(type, count = 1) {
    const generators = {
      users: () => this.generateUser(),
      posts: () => this.generatePost(),
      products: () => this.generateProduct(),
      apiResponses: () => this.generateApiResponse(),
      errors: () => this.generateErrorResponse()
    };

    const generator = generators[type];
    if (!generator) {
      throw new Error(`Unknown data type: ${type}`);
    }

    if (count === 1) {
      return generator();
    }

    return Array.from({ length: count }, generator);
  }

  // Test environment setup
  async setupTestEnvironment(config = {}) {
    const {
      clearDatabase = false,
      seedData = true,
      mockExternalServices = true
    } = config;

    this.logger.info('Setting up test environment', config);

    if (clearDatabase) {
      // This would be implemented based on your database setup
      this.logger.debug('Clearing test database');
    }

    if (seedData) {
      // This would seed test data
      this.logger.debug('Seeding test data');
    }

    if (mockExternalServices) {
      // This would set up mocks for external services
      this.logger.debug('Setting up external service mocks');
    }

    this.logger.info('Test environment setup complete');
  }

  // Cleanup
  async cleanup() {
    try {
      const files = fs.readdirSync(this.fixturesDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          fs.unlinkSync(path.join(this.fixturesDir, file));
        }
      }
      this.logger.debug('Cleaned up fixtures directory');
    } catch (error) {
      this.logger.error('Failed to cleanup fixtures', { error: error.message });
    }
  }
}

// Create default fixtures manager
export const fixtures = new FixturesManager();

// Utility functions
export const createFixturesManager = (options) => new FixturesManager(options);

// Common fixture templates
export const fixtureTemplates = {
  user: {
    id: 'string',
    email: 'string',
    name: 'string',
    createdAt: 'string'
  },
  post: {
    id: 'string',
    title: 'string',
    content: 'string',
    authorId: 'string',
    published: 'boolean',
    createdAt: 'string'
  },
  product: {
    id: 'string',
    name: 'string',
    price: 'number',
    description: 'string',
    category: 'string',
    inStock: 'boolean',
    createdAt: 'string'
  }
};
