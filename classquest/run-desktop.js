#!/usr/bin/env node
const { spawn } = require('node:child_process');
const { resolve } = require('node:path');
const { existsSync } = require('node:fs');

const projectRoot = resolve(__dirname, '..');
const modulePath = 'ui.main_window';

const pythonCandidates = [process.env.PYTHON, process.platform === 'win32' ? 'py' : 'python3', 'python'].filter(Boolean);

if (!existsSync(resolve(projectRoot, 'ui', 'main_window.py'))) {
  console.error('\n❌ Unable to locate ui/main_window.py. Did you clone the repository completely?');
  process.exit(1);
}

console.log('\n📢  The web client now lives in "classquest_legacy/".');
console.log('🚀  Launching the new PyQt desktop app via `python -m ui.main_window`...\n');

const trySpawn = (index) => {
  if (index >= pythonCandidates.length) {
    console.error('❌ Could not find a usable Python interpreter.');
    console.error('   Please install Python 3.10+ and try again, or set the PYTHON env variable.');
    process.exit(1);
  }

  const cmd = pythonCandidates[index];
  const child = spawn(cmd, ['-m', modulePath], {
    cwd: projectRoot,
    stdio: 'inherit',
  });

  child.on('error', () => {
    trySpawn(index + 1);
  });

  child.on('exit', (code) => {
    process.exit(code ?? 0);
  });
};

trySpawn(0);
