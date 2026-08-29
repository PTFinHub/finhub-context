// Verifica o baseline de plugins desta maquina contra `plugins.json`.
//
//   node scripts/check-plugins.mjs
//
// Nao instala nada. Diz o que falta e imprime o comando exacto para cada CLI.
// Existe porque um plugin em falta nao da erro — o agente simplesmente nao faz
// aquilo, e a diferenca entre maquinas parece inconsistencia do modelo.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const home = os.homedir();
const manifest = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'plugins.json'), 'utf8'));

const read = (file) => {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
};
const dirs = (dir) => {
  try {
    return fs.readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return [];
  }
};

// ---------- Claude ----------

const claudeDir = path.join(home, '.claude', 'plugins');
const installed = read(path.join(claudeDir, 'installed_plugins.json'));
const claudeHas = new Set(Object.keys((installed && installed.plugins) || {}));
const marketplaces = new Set(Object.keys(read(path.join(claudeDir, 'known_marketplaces.json')) || {}));
const claudeAvailable = installed !== null;

// ---------- Codex ----------

const codexCache = path.join(home, '.codex', 'plugins', 'cache');
const codexAvailable = fs.existsSync(codexCache);
const codexHas = new Map(); // nome -> versao
for (const channel of dirs(codexCache)) {
  for (const plugin of dirs(path.join(codexCache, channel))) {
    const versions = dirs(path.join(codexCache, channel, plugin));
    codexHas.set(plugin, { channel, version: versions.sort().pop() || '?' });
  }
}

// ---------- Relatorio ----------

const missing = { claude: [], codex: [] };
const rows = [];

for (const p of manifest.claude) {
  const key = `${p.name}@${p.marketplace}`;
  const present = claudeHas.has(key);
  if (!present && p.required) missing.claude.push(p);
  rows.push(['claude', p.name, present ? 'instalado' : p.required ? 'EM FALTA' : 'opcional, ausente', p.why]);
}

for (const p of manifest.codex) {
  const found = codexHas.get(p.name);
  if (!found && p.required) missing.codex.push(p);
  rows.push([
    'codex',
    p.name,
    found ? `instalado ${found.version}` : p.required ? 'EM FALTA' : 'opcional, ausente',
    p.why,
  ]);
}

const w = (i) => Math.max(...rows.map((r) => r[i].length));
const [w0, w1, w2] = [w(0), w(1), w(2)];

console.log(`\nBaseline de plugins — ${os.hostname()}\n`);
if (!claudeAvailable) console.log('  (Claude Code nao encontrado nesta maquina)');
if (!codexAvailable) console.log('  (Codex nao encontrado nesta maquina)');

for (const r of rows) {
  console.log(`  ${r[0].padEnd(w0)}  ${r[1].padEnd(w1)}  ${r[2].padEnd(w2)}  ${r[3]}`);
}

// Instalados fora do baseline — informativo, nao e erro
const extraCodex = [...codexHas.keys()].filter((n) => !manifest.codex.some((p) => p.name === n));
if (extraCodex.length) console.log(`\n  codex, fora do baseline: ${extraCodex.join(', ')}`);

// ---------- Como instalar o que falta ----------

if (missing.claude.length) {
  console.log('\nClaude — correr:');
  for (const p of missing.claude) {
    if (!marketplaces.has(p.marketplace)) {
      console.log(`  claude plugin marketplace add ${p.source}`);
    }
    console.log(`  claude plugin install ${p.name}@${p.marketplace}`);
  }
}

if (missing.codex.length) {
  console.log('\nCodex — instalar do canal curated:');
  for (const p of missing.codex) console.log(`  ${p.name}  (canal ${p.channel})`);
  console.log(
    '  O comando exacto vem do plugin `plugin-management`; no Codex, pedir "instala o plugin <nome>".\n' +
      '  Se `plugin-management` for o que falta, instalar pela interface de plugins do Codex primeiro.'
  );
}

const total = missing.claude.length + missing.codex.length;
console.log(
  total
    ? `\n${total} plugin(s) obrigatorio(s) em falta.\n`
    : '\nBaseline completo: esta maquina tem tudo o que o fluxo precisa.\n'
);

process.exit(total ? 1 : 0);
