#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process';
import http from 'node:http';
import chalk from 'chalk';
import ora from 'ora';

const ok = (m) => console.log(chalk.green('✅'), m);
const warn = (m) => console.log(chalk.yellow('⚠️ '), m);
const err = (m) => console.log(chalk.red('❌'), m);
const info = (m) => console.log(chalk.blue('ℹ️ '), m);

async function checkPort(port) {
  return new Promise((resolve) => {
    const server = http.createServer();
    server.listen(port, () => {
      server.close();
      resolve({ free: true, port });
    });
    server.on('error', () => {
      resolve({ free: false, port });
    });
  });
}

function getProcessUsingPort(port) {
  try {
    // Try different methods based on platform
    const isWindows = process.platform === 'win32';
    
    if (isWindows) {
      const result = spawnSync('netstat', ['-ano'], { 
        stdio: 'pipe', 
        encoding: 'utf8' 
      });
      
      if (result.status === 0) {
        const lines = result.stdout.split('\n');
        const portLine = lines.find(line => 
          line.includes(`:${port}`) && line.includes('LISTENING')
        );
        
        if (portLine) {
          const parts = portLine.trim().split(/\s+/);
          const pid = parts[parts.length - 1];
          
          // Get process name
          const taskResult = spawnSync('tasklist', ['/FI', `PID eq ${pid}`], {
            stdio: 'pipe',
            encoding: 'utf8'
          });
          
          if (taskResult.status === 0) {
            const taskLines = taskResult.stdout.split('\n');
            const taskLine = taskLines.find(line => line.includes(pid));
            if (taskLine) {
              const taskParts = taskLine.trim().split(/\s+/);
              return {
                pid,
                name: taskParts[0],
                command: `taskkill /PID ${pid} /F`
              };
            }
          }
          
          return { pid, name: 'Unknown', command: `taskkill /PID ${pid} /F` };
        }
      }
    } else {
      // Unix-like systems
      const result = spawnSync('lsof', ['-i', `:${port}`], { 
        stdio: 'pipe', 
        encoding: 'utf8' 
      });
      
      if (result.status === 0) {
        const lines = result.stdout.split('\n');
        const dataLine = lines.find(line => line.includes('LISTEN'));
        
        if (dataLine) {
          const parts = dataLine.trim().split(/\s+/);
          const pid = parts[1];
          const name = parts[0];
          
          return {
            pid,
            name,
            command: `kill -9 ${pid}`
          };
        }
      }
    }
    
    return null;
  } catch (e) {
    return null;
  }
}

async function killProcess(pid, command) {
  try {
    const isWindows = process.platform === 'win32';
    const cmd = isWindows ? command.split(' ') : command.split(' ');
    
    const result = spawnSync(cmd[0], cmd.slice(1), {
      stdio: 'pipe',
      encoding: 'utf8'
    });
    
    return result.status === 0;
  } catch (e) {
    return false;
  }
}

async function scanPorts(startPort = 3000, endPort = 3010) {
  const results = [];
  
  for (let port = startPort; port <= endPort; port++) {
    const result = await checkPort(port);
    if (!result.free) {
      const process = getProcessUsingPort(port);
      results.push({
        port,
        inUse: true,
        process
      });
    } else {
      results.push({
        port,
        inUse: false,
        process: null
      });
    }
  }
  
  return results;
}

export async function runPorts(options = {}) {
  const args = process.argv.slice(2);
  const specificPort = options.port || (args.find(arg => arg.startsWith('-p'))?.split('=')[1]);
  const kill = options.kill || args.includes('-k') || args.includes('--kill');
  
  console.log(chalk.bold.blue('🔌 Dr. Cursored - Port Manager\n'));
  
  if (specificPort) {
    const port = parseInt(specificPort);
    if (isNaN(port)) {
      err('Invalid port number');
      process.exit(1);
    }
    
    console.log(`Checking port ${port}...`);
    const result = await checkPort(port);
    
    if (result.free) {
      ok(`Port ${port} is available`);
    } else {
      warn(`Port ${port} is in use`);
      
      const process = getProcessUsingPort(port);
      if (process) {
        console.log(`  Process: ${process.name} (PID: ${process.pid})`);
        console.log(`  Command to kill: ${process.command}`);
        
        if (kill) {
          const spinner = ora(`Killing process ${process.pid}...`).start();
          const success = await killProcess(process.pid, process.command);
          
          if (success) {
            spinner.succeed(`Killed process ${process.pid}`);
            
            // Verify port is now free
            const newResult = await checkPort(port);
            if (newResult.free) {
              ok(`Port ${port} is now available`);
            } else {
              warn(`Port ${port} is still in use`);
            }
          } else {
            spinner.fail(`Failed to kill process ${process.pid}`);
            err('You may need to run with elevated privileges');
          }
        }
      } else {
        warn('Could not identify process using this port');
      }
    }
  } else {
    // Scan common development ports
    console.log('Scanning common development ports...\n');
    
    const commonPorts = [3000, 3001, 3002, 5173, 8000, 8080, 4000, 5000, 7531];
    const results = [];
    
    for (const port of commonPorts) {
      const result = await checkPort(port);
      if (!result.free) {
        const process = getProcessUsingPort(port);
        results.push({
          port,
          inUse: true,
          process
        });
      } else {
        results.push({
          port,
          inUse: false,
          process: null
        });
      }
    }
    
    // Display results
    console.log('Port Status:');
    console.log('─'.repeat(50));
    
    for (const result of results) {
      if (result.inUse) {
        if (result.process) {
          warn(`Port ${result.port}: ${result.process.name} (PID: ${result.process.pid})`);
        } else {
          warn(`Port ${result.port}: Unknown process`);
        }
      } else {
        ok(`Port ${result.port}: Available`);
      }
    }
    
    const usedPorts = results.filter(r => r.inUse);
    if (usedPorts.length > 0) {
      console.log(chalk.yellow(`\n⚠️  ${usedPorts.length} ports are in use`));
      console.log('Use -k flag to kill processes: dr-cursored ports -k');
    } else {
      console.log(chalk.green('\n✅ All common ports are available'));
    }
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runPorts().catch(console.error);
}
