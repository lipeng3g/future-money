import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const usage = () => {
  console.error('Usage: node scripts/run-with-log.mjs <logPath> <cmd> [...args]');
  console.error('Example: node scripts/run-with-log.mjs build.log npm run build');
};

const [, , logArg, cmd, ...cmdArgs] = process.argv;

if (!logArg || !cmd) {
  usage();
  process.exit(2);
}

const logPath = path.resolve(logArg);
fs.mkdirSync(path.dirname(logPath), { recursive: true });

const logStream = fs.createWriteStream(logPath, { flags: 'w' });

const spawnCommand = (command, args) => {
  // npm is npm.cmd on Windows.
  if (process.platform === 'win32' && command === 'npm') {
    return { command: 'npm.cmd', args };
  }
  return { command, args };
};

const { command, args } = spawnCommand(cmd, cmdArgs);

const child = spawn(command, args, {
  stdio: ['inherit', 'pipe', 'pipe'],
  env: process.env,
});

const writeChunk = (chunk) => {
  logStream.write(chunk);
};

child.stdout.on('data', (chunk) => {
  process.stdout.write(chunk);
  writeChunk(chunk);
});

child.stderr.on('data', (chunk) => {
  process.stderr.write(chunk);
  writeChunk(chunk);
});

child.on('error', (error) => {
  logStream.end();
  console.error(`[run-with-log] failed to spawn: ${error?.message || error}`);
  process.exit(1);
});

child.on('close', (code, signal) => {
  logStream.end();

  if (signal) {
    console.error(`[run-with-log] terminated by signal: ${signal}`);
    process.exit(1);
  }

  process.exit(code ?? 0);
});
