// EchoRead AI - Automated Package Script for Chrome Web Store
// Excludes development files, node_modules, git, and documentation per CWS guidelines

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const zipFile = path.join(distDir, 'echoread-ai-v1.0.0.zip');

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

console.log('[EchoRead AI] Packaging extension for Chrome Web Store...');

try {
  // Use zip command with exclusion patterns
  const cmd = `zip -r "${zipFile}" . -x "*.git*" "*node_modules*" "*.env*" "*CHROMEWEBSTORE.md*" "*dist*" "*scripts*" "*.DS_Store"`;
  execSync(cmd, { cwd: rootDir, stdio: 'inherit' });
  console.log(`\n✅ Package created successfully: ${zipFile}`);
} catch (err) {
  console.error('Packaging error:', err);
}
