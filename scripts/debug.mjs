#!/usr/bin/env node
import http from 'node:http';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import chalk from 'chalk';
import ora from 'ora';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ok = (m) => console.log(chalk.green('✅'), m);
const warn = (m) => console.log(chalk.yellow('⚠️ '), m);
const err = (m) => console.log(chalk.red('❌'), m);
const info = (m) => console.log(chalk.blue('ℹ️ '), m);

export async function startDebugInterface(options = {}) {
  const port = options.port || 3001;
  
  console.log(chalk.bold.blue('🐛 Dr. Cursored - Debug Interface\n'));
  
  const spinner = ora('Starting debug interface...').start();
  
  try {
    // Check if debug page exists
    const debugPagePath = path.join(process.cwd(), 'debug', 'index.html');
    const templatePath = path.join(__dirname, '..', 'templates', 'debug-pages', 'universal-debug.html');
    
    let debugPage;
    
    if (fs.existsSync(debugPagePath)) {
      debugPage = fs.readFileSync(debugPagePath, 'utf8');
      info('Using project debug page');
    } else if (fs.existsSync(templatePath)) {
      debugPage = fs.readFileSync(templatePath, 'utf8');
      info('Using template debug page');
    } else {
      // Create a basic debug page
      debugPage = createBasicDebugPage();
      info('Created basic debug page');
    }
    
    // Start server
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, `http://localhost:${port}`);
      
      // CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      
      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }
      
      if (url.pathname === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(debugPage);
      } else if (url.pathname === '/api/health') {
        handleHealthCheck(req, res);
      } else if (url.pathname === '/api/logs') {
        handleLogStream(req, res);
      } else if (url.pathname === '/api/metrics') {
        handleMetrics(req, res);
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
      }
    });
    
    server.listen(port, () => {
      spinner.succeed(`Debug interface started on http://localhost:${port}`);
      
      console.log(chalk.bold('\n🎉 Debug Interface Ready!'));
      console.log(`\nOpen your browser to: ${chalk.cyan(`http://localhost:${port}`)}`);
      console.log('\nAvailable endpoints:');
      console.log(`  ${chalk.green('GET')}  /api/health  - Health check`);
      console.log(`  ${chalk.green('GET')}  /api/logs    - Log stream`);
      console.log(`  ${chalk.green('GET')}  /api/metrics - Performance metrics`);
      
      console.log(chalk.yellow('\nPress Ctrl+C to stop the server'));
    });
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log(chalk.yellow('\n\nShutting down debug interface...'));
      server.close(() => {
        console.log(chalk.green('Debug interface stopped'));
        process.exit(0);
      });
    });
    
  } catch (error) {
    spinner.fail('Failed to start debug interface');
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
  }
}

function createBasicDebugPage() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dr. Cursored Debug Interface</title>
    <style>
        body { font-family: monospace; background: #0a0e14; color: #e6f1ff; padding: 20px; }
        .container { max-width: 800px; margin: 0 auto; }
        .card { background: #0e1530; border: 1px solid #30363d; border-radius: 8px; padding: 20px; margin: 20px 0; }
        button { background: #0969da; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; }
        button:hover { background: #0860ca; }
        .log-output { background: #0a0e14; border: 1px solid #30363d; padding: 15px; height: 300px; overflow-y: auto; white-space: pre-wrap; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🩺 Dr. Cursored Debug Interface</h1>
        
        <div class="card">
            <h3>Health Check</h3>
            <button onclick="checkHealth()">Run Health Check</button>
            <div id="health-result"></div>
        </div>
        
        <div class="card">
            <h3>Log Stream</h3>
            <button onclick="startLogs()">Start Log Stream</button>
            <button onclick="clearLogs()">Clear</button>
            <div class="log-output" id="logs"></div>
        </div>
        
        <div class="card">
            <h3>Metrics</h3>
            <button onclick="getMetrics()">Get Metrics</button>
            <div id="metrics-result"></div>
        </div>
    </div>
    
    <script>
        async function checkHealth() {
            const result = document.getElementById('health-result');
            result.textContent = 'Checking...';
            
            try {
                const response = await fetch('/api/health');
                const data = await response.json();
                result.textContent = JSON.stringify(data, null, 2);
            } catch (error) {
                result.textContent = 'Error: ' + error.message;
            }
        }
        
        function startLogs() {
            const logs = document.getElementById('logs');
            logs.textContent = 'Starting log stream...\\n';
            
            // Simulate log stream
            setInterval(() => {
                const timestamp = new Date().toISOString();
                const level = ['INFO', 'DEBUG', 'WARN', 'ERROR'][Math.floor(Math.random() * 4)];
                const message = 'Log message ' + Math.floor(Math.random() * 1000);
                logs.textContent += \`\${timestamp} [\${level}] \${message}\\n\`;
                logs.scrollTop = logs.scrollHeight;
            }, 1000);
        }
        
        function clearLogs() {
            document.getElementById('logs').textContent = '';
        }
        
        async function getMetrics() {
            const result = document.getElementById('metrics-result');
            result.textContent = 'Loading...';
            
            try {
                const response = await fetch('/api/metrics');
                const data = await response.json();
                result.textContent = JSON.stringify(data, null, 2);
            } catch (error) {
                result.textContent = 'Error: ' + error.message;
            }
        }
    </script>
</body>
</html>`;
}

function handleHealthCheck(req, res) {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    system: {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      uptime: Math.round(process.uptime())
    },
    memory: {
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
      heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
    }
  };
  
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(health, null, 2));
}

function handleLogStream(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/plain',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  
  // Send a few sample logs
  const logs = [
    `[${new Date().toISOString()}] [INFO] Debug interface started`,
    `[${new Date().toISOString()}] [DEBUG] Health check endpoint responding`,
    `[${new Date().toISOString()}] [INFO] Log stream connected`
  ];
  
  logs.forEach(log => {
    res.write(log + '\n');
  });
  
  // Keep connection alive
  const interval = setInterval(() => {
    const timestamp = new Date().toISOString();
    const level = ['INFO', 'DEBUG', 'WARN', 'ERROR'][Math.floor(Math.random() * 4)];
    const message = 'Sample log message ' + Math.floor(Math.random() * 1000);
    res.write(`[${timestamp}] [${level}] ${message}\n`);
  }, 2000);
  
  req.on('close', () => {
    clearInterval(interval);
  });
}

function handleMetrics(req, res) {
  const metrics = {
    timestamp: new Date().toISOString(),
    memory: {
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
      heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      external: Math.round(process.memoryUsage().external / 1024 / 1024)
    },
    uptime: Math.round(process.uptime()),
    cpu: {
      usage: Math.round(Math.random() * 100) + '%',
      loadAverage: [Math.random(), Math.random(), Math.random()]
    }
  };
  
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(metrics, null, 2));
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const port = args.find(arg => arg.startsWith('-p'))?.split('=')[1] || 3001;
  
  startDebugInterface({ port: parseInt(port) }).catch(console.error);
}
