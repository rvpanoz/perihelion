// npm has no built-in way to run workspace dev servers in parallel; this avoids an extra dependency.
import { spawn } from 'node:child_process';

const DEV_WORKSPACES = ['@perihelion/server', '@perihelion/web'];

function startDevServer(workspace) {
  return spawn('npm', ['run', 'dev', '--workspace', workspace], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
}

const devServers = DEV_WORKSPACES.map(startDevServer);

function stopAll(signal) {
  for (const devServer of devServers) devServer.kill(signal);
}

// If either server dies, take the other down too so a half-running stack is never left behind.
for (const devServer of devServers) {
  devServer.on('exit', (code) => {
    process.exitCode = code ?? 0;
    stopAll('SIGTERM');
  });
}

process.on('SIGINT', () => stopAll('SIGINT'));
process.on('SIGTERM', () => stopAll('SIGTERM'));
