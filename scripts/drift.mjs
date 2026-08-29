// Deteccao de desvio, barata o suficiente para correr em cada arranque de sessao.
//
//   node scripts/drift.mjs            texto legivel
//   node scripts/drift.mjs --json     para hooks
//
// Sem rede, sem subprocessos, sem procurar pastas: le ficheiros e compara. O
// `setup.mjs` e a ferramenta completa e demora segundos; isto tem de ser
// instantaneo, senao ninguem o poe no arranque.
//
// Responde a uma pergunta so: o que esta instalado nesta maquina ainda
// corresponde ao que o repo diz? Um `git pull` actualiza as skills por junction
// mas nao as regras nem os plugins — e nada avisa.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const home = os.homedir();
const asJson = process.argv.includes('--json');

const read = (f) => {
  try {
    return fs.readFileSync(f, 'utf8');
  } catch {
    return null;
  }
};
const readJson = (f) => {
  try {
    return JSON.parse(read(f) || '');
  } catch {
    return null;
  }
};
const sha = (t) => crypto.createHash('sha256').update(t.replace(/\r/g, '')).digest('hex').slice(0, 12);
const dirs = (d) => {
  try {
    return fs.readdirSync(d, { withFileTypes: true }).filter((e) => e.isDirectory() || e.isSymbolicLink()).map((e) => e.name);
  } catch {
    return [];
  }
};

const drift = [];

// 1. Regras universais do Codex — copia, nao link: nao segue o git pull
const rulesRepo = read(path.join(repoRoot, 'codex', 'AGENTS.md'));
const rulesLocal = read(path.join(home, '.codex', 'AGENTS.md'));
if (rulesRepo && fs.existsSync(path.join(home, '.codex'))) {
  if (!rulesLocal) drift.push('as regras universais do Codex nao estao instaladas');
  else if (sha(rulesRepo) !== sha(rulesLocal)) drift.push('as regras universais do Codex estao desactualizadas');
}

// 2. Skills que o repo distribui mas que nao estao ligadas
if (fs.existsSync(path.join(home, '.codex', 'skills'))) {
  const ours = [];
  for (const plugin of dirs(path.join(repoRoot, 'plugins'))) {
    ours.push(...dirs(path.join(repoRoot, 'plugins', plugin, 'skills')));
  }
  const linked = new Set(dirs(path.join(home, '.codex', 'skills')));
  const missing = ours.filter((n) => !linked.has(n));
  if (missing.length) drift.push(`${missing.length} skill(s) por ligar ao Codex: ${missing.join(', ')}`);
}

// 3. Skills de terceiros declaradas
for (const d of (readJson(path.join(repoRoot, 'skills.json')) || { skills: [] }).skills) {
  const present = d.targets.some((t) => {
    const base = t === 'claude' ? path.join(home, '.claude', 'skills') : path.join(home, '.codex', 'skills');
    return fs.existsSync(path.join(base, d.name, 'SKILL.md'));
  });
  if (!present) drift.push(`skill declarada em falta: ${d.name}`);
}

// 4. Plugins do Claude: versao instalada contra a do catalogo
const catalog = readJson(path.join(repoRoot, '.claude-plugin', 'marketplace.json'));
const installed = readJson(path.join(home, '.claude', 'plugins', 'installed_plugins.json'));
if (catalog && installed) {
  for (const entry of catalog.plugins) {
    const key = `${entry.name}@finhub`;
    const got = installed.plugins[key]?.[0]?.version;
    if (got && entry.version && got !== entry.version) {
      drift.push(`plugin ${entry.name} instalado em ${got}, o repo tem ${entry.version}`);
    }
  }
}

// 5. Modelo e effort declarados
const baseline = readJson(path.join(repoRoot, 'baseline.json'));
if (baseline?.models) {
  const claude = readJson(path.join(home, '.claude', 'settings.json'));
  if (claude && (claude.model !== baseline.models.claude.model || claude.effortLevel !== baseline.models.claude.effortLevel)) {
    drift.push(`modelo do Claude e ${claude.model}/${claude.effortLevel}, o baseline pede ${baseline.models.claude.model}/${baseline.models.claude.effortLevel}`);
  }
  const toml = read(path.join(home, '.codex', 'config.toml'));
  if (toml) {
    const pick = (k) => (toml.match(new RegExp(`^${k}\\s*=\\s*"([^"]+)"`, 'm')) || [, null])[1];
    const want = baseline.models.codex;
    const got = [pick('model'), pick('model_reasoning_effort'), pick('personality')];
    const exp = [want.model, want.model_reasoning_effort, want.personality];
    if (got.join('/') !== exp.join('/')) drift.push(`modelo do Codex e ${got.join('/')}, o baseline pede ${exp.join('/')}`);
  }
}

// ---------- Saida ----------

if (asJson) {
  const context =
    drift.length === 0
      ? 'Cerebro em dia: regras, skills, plugins e modelos correspondem ao PTFinHub/finhub-context.'
      : 'DESVIO detectado entre esta maquina e o PTFinHub/finhub-context:\n' +
        drift.map((d) => `- ${d}`).join('\n') +
        '\n\nUm `git pull` actualiza as skills por junction mas nao as regras nem os plugins. ' +
        'Correr `/cerebro` para ver e corrigir, ou dizer ao utilizador o que falta antes de comecar.';

  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: context } }));
} else if (drift.length === 0) {
  console.log('\n  Cérebro em dia — regras, skills, plugins e modelos correspondem ao repo.\n');
} else {
  console.log(`\n  ${drift.length} desvio(s) entre esta máquina e o repo:\n`);
  for (const d of drift) console.log(`    ${d}`);
  console.log('\n  Corrigir:  node scripts/setup.mjs --apply\n');
}

process.exit(drift.length ? 1 : 0);
