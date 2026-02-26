import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

console.log('CWD from process:', process.cwd());
console.log('Root resolved to:', root);

console.log('Running npm install in monorepo root...');
try {
  const result = execSync('npm install --legacy-peer-deps', {
    cwd: root,
    encoding: 'utf-8',
    timeout: 120000,
    stdio: 'pipe'
  });
  console.log(result);
  console.log('npm install completed successfully');
} catch (error) {
  console.error('npm install failed:', error.message);
  if (error.stdout) console.log('stdout:', error.stdout);
  if (error.stderr) console.log('stderr:', error.stderr);
}
