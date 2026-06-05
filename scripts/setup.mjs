import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const configPath = resolve(root, 'wrangler.jsonc');

const config = readFileSync(configPath, 'utf-8');

// Only create KV namespace if placeholder still exists
if (config.includes('{{KV_ID}}')) {
  console.log('📦 Creating KV namespace "VSL_KV"...\n');
  
  let output;
  try {
    output = execSync('npx wrangler kv:namespace create "VSL_KV"', {
      cwd: root,
      encoding: 'utf-8',
      stdio: 'pipe',
    });
  } catch (err) {
    console.error('❌ Failed to create KV namespace.');
    console.error(err.stderr || err.stdout || err.message);
    process.exit(1);
  }

  // Parse the ID from wrangler output
  // Format: { binding = "VSL_KV", id = "abc123..." }
  const idMatch = output.match(/id\s*=\s*"([a-f0-9-]+)"/i);
  if (!idMatch) {
    console.error('❌ Could not parse KV namespace ID from output:');
    console.error(output);
    process.exit(1);
  }

  const kvId = idMatch[1];
  console.log(`✅ KV namespace created: ${kvId}\n`);

  const updated = config.replace('{{KV_ID}}', kvId);
  writeFileSync(configPath, updated, 'utf-8');
  console.log('✅ wrangler.jsonc updated with KV ID\n');
} else {
  console.log('✅ KV namespace already configured.\n');
}

console.log('🚀 Deploying...\n');
execSync('npx wrangler deploy', { cwd: root, stdio: 'inherit' });
