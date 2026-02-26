#!/usr/bin/env node
import { execSync } from 'child_process';

console.log('Running npm install in monorepo root...');
try {
  execSync('cd /vercel/share/v0-project && npm install --legacy-peer-deps', { stdio: 'inherit' });
  console.log('npm install completed successfully');
} catch (e) {
  console.error('npm install failed:', e.message);
}

// Verify react-icons is installed
try {
  const result = execSync('ls /vercel/share/v0-project/node_modules/react-icons/package.json 2>/dev/null || echo "NOT FOUND"', { encoding: 'utf-8' });
  console.log('react-icons check:', result.trim());
} catch(e) {
  console.log('react-icons NOT FOUND in node_modules');
}

try {
  const result = execSync('ls /vercel/share/v0-project/node_modules/react-toastify/package.json 2>/dev/null || echo "NOT FOUND"', { encoding: 'utf-8' });
  console.log('react-toastify check:', result.trim());
} catch(e) {
  console.log('react-toastify NOT FOUND in node_modules');
}
