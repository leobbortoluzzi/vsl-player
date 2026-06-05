import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const configPath = resolve(root, 'wrangler.jsonc');
const examplePath = resolve(root, 'wrangler.example.jsonc');

function step(msg: string) { console.log(`\n▶ ${msg}`); }
function done(msg: string) { console.log(`✅ ${msg}`); }
function fail(msg: string) { console.error(`\n❌ ${msg}`); process.exit(1); }

function wrangle(args: string): string {
  try {
    return execSync(`npx wrangler ${args}`, { cwd: root, encoding: 'utf-8', stdio: 'pipe' });
  } catch (err: any) {
    if (err.stderr) console.error(err.stderr);
    throw err;
  }
}

// ── 0. Create wrangler.jsonc from example if missing ────────
if (!existsSync(configPath)) {
  step('wrangler.jsonc não encontrado — copiando do template...');
  if (!existsSync(examplePath)) {
    fail('wrangler.example.jsonc também não encontrado. Reclone o repositório.');
  }
  copyFileSync(examplePath, configPath);
  done('Arquivo wrangler.jsonc criado');

  fail(
    '⚠️  Antes de continuar, edite wrangler.jsonc com suas credenciais do Bunny:\n' +
    '   - BUNNY_LIBRARY_ID: ID da sua Library no Bunny Stream\n' +
    '   - BUNNY_API_KEY: sua API Key do Bunny Stream\n' +
    'Depois rode novamente: npm run deploy'
  );
}

// ── 1. Check wrangler auth ──────────────────────────────────
step('Verificando autenticação do Wrangler...');
try {
  wrangle('whoami');
} catch {
  fail(
    'Wrangler não está autenticado.\n' +
    'Rode: npx wrangler login\n' +
    'Depois tente novamente: npm run deploy'
  );
}
done('Wrangler autenticado');

// ── 2. Validate Bunny credentials ───────────────────────────
const config = readFileSync(configPath, 'utf-8');

const bunnyIdMatch = config.match(/"BUNNY_LIBRARY_ID":\s*"([^"]+)"/);
const bunnyKeyMatch = config.match(/"BUNNY_API_KEY":\s*"([^"]+)"/);

if (!bunnyIdMatch || !bunnyKeyMatch) {
  fail('wrangler.jsonc não contém BUNNY_LIBRARY_ID ou BUNNY_API_KEY.');
}

const bunnyLibraryId = bunnyIdMatch[1];
const bunnyApiKey = bunnyKeyMatch[1];

const placeholders = ['SEU_BUNNY_LIBRARY_ID', 'SUA_BUNNY_API_KEY', '{{BUNNY_LIBRARY_ID}}', '{{BUNNY_API_KEY}}'];

if (placeholders.includes(bunnyLibraryId)) {
  fail(
    'BUNNY_LIBRARY_ID ainda está com placeholder.\n' +
    'Edite wrangler.jsonc e coloque o ID real da sua Library do Bunny Stream.\n' +
    'Ex: "BUNNY_LIBRARY_ID": "676737"'
  );
}

if (placeholders.includes(bunnyApiKey)) {
  fail(
    'BUNNY_API_KEY ainda está com placeholder.\n' +
    'Edite wrangler.jsonc e coloque sua API Key real do Bunny Stream.\n' +
    'Ex: "BUNNY_API_KEY": "81081ffb-...-4b7c"'
  );
}

done('Credenciais do Bunny configuradas');

// ── 3. Create KV namespace (if needed) ──────────────────────
if (config.includes('{{KV_ID}}')) {
  step('Criando KV namespace "VSL_KV"...');

  let output: string;
  try {
    output = wrangle('kv:namespace create "VSL_KV"');
  } catch {
    fail('Falha ao criar KV namespace. Verifique o erro acima.');
  }

  const idMatch = output.match(/id\s*=\s*"([a-f0-9-]+)"/i);
  if (!idMatch) {
    fail('Não foi possível extrair o ID do KV namespace.\nOutput:\n' + output);
  }

  const kvId = idMatch[1];
  done(`KV namespace criado: ${kvId}`);

  const updated = config.replace('{{KV_ID}}', kvId);
  writeFileSync(configPath, updated, 'utf-8');
  done('wrangler.jsonc atualizado com KV ID');
} else {
  done('KV namespace já configurado');
}

// ── 4. Deploy ───────────────────────────────────────────────
step('Deployando Worker...');
try {
  execSync('npx wrangler deploy', { cwd: root, stdio: 'inherit' });
} catch {
  fail('Falha no deploy. Verifique os logs acima.');
}

done('Deploy concluído!');
