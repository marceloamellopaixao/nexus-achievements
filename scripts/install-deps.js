import { execSync } from 'child_process';

console.log('Running npm install in monorepo root...');
try {
  const result = execSync('cd /vercel/share/v0-project && npm install --legacy-peer-deps', {
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
