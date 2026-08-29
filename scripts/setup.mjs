// Preparar e validar uma máquina — um comando só.
//
//   node scripts/setup.mjs           verifica e relata
//   node scripts/setup.mjs --apply   verifica e aplica o que é seguro aplicar
//
// Orquestra os scripts que já existem em vez de repetir a lógica deles, e no fim
// diz o que falta e o que só o humano pode fazer.
//
// Existe porque "preparar uma máquina" eram cinco passos espalhados por dois CLIs
// e duas linguagens de script — e um passo esquecido não dá erro, só faz o agente
// comportar-se de forma diferente naquela máquina.

import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const home = os.homedir();
const apply = process.argv.includes('--apply');
const isWindows = process.platform === 'win32';

const results = [];
const ok = (step, detail) => results.push({ state: 'OK', step, detail });
const todo = (step, detail, action) => results.push({ state: 'FALTA', step, detail, action });
const human = (step, detail, action) => results.push({ state: 'HUMANO', step, detail, action });

// Em Windows o CLI pode ser um .exe (spawn directo funciona) ou um shim .cmd/.ps1
// (spawn directo devolve ENOENT). Tenta-se sem shell e so se recorre a shell quando
// o binario nao foi encontrado — evita o aviso de deprecacao no caso comum.
function run(cmd, args, opts = {}) {
  const base = { encoding: 'utf8', cwd: repoRoot, ...opts };
  const direct = spawnSync(cmd, args, base);
  if (direct.error && direct.error.code === 'ENOENT') {
    return spawnSync(cmd, args, { ...base, shell: true });
  }
  return direct;
}

// ---------- 1. Repo actualizado ----------

try {
  const before = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).trim();
  if (apply) run('git', ['pull', '--ff-only', '--quiet']);
  const after = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).trim();
  const behind = run('git', ['rev-list', '--count', 'HEAD..@{u}']).stdout?.trim();

  if (before !== after) ok('repo', `actualizado ${before.slice(0, 7)} -> ${after.slice(0, 7)}`);
  else if (behind && behind !== '0') todo('repo', `${behind} commit(s) por trazer`, 'git pull --ff-only');
  else ok('repo', `em dia (${after.slice(0, 7)})`);
} catch {
  todo('repo', 'não foi possível ler o estado do git', 'confirmar que este clone é um repo git');
}

// ---------- 2. Codex: skills, agentes e regras universais ----------

const installer = isWindows ? 'install-codex-skills.ps1' : 'install-codex-skills.sh';
const codexPresent = fs.existsSync(path.join(home, '.codex'));

if (!codexPresent) {
  ok('codex', 'não instalado nesta máquina — nada a ligar');
} else if (apply) {
  const r = isWindows
    ? run('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(repoRoot, 'scripts', installer)])
    : run('bash', [path.join(repoRoot, 'scripts', installer)]);
  const out = `${r.stdout || ''}${r.stderr || ''}`;
  const skipped = out.split('\n').filter((l) => l.includes('nao tocado'));
  if (skipped.length) {
    human('codex', `${skipped.length} ficheiro(s) com conteúdo próprio, não substituídos`, 'rever e decidir se sobem ao repo');
  }
  ok('codex', (out.match(/(\d+) skills ligadas/) || [, '?'])[1] + ' skills ligadas');
} else {
  const linked = fs.existsSync(path.join(home, '.codex', 'skills'))
    ? fs.readdirSync(path.join(home, '.codex', 'skills')).length
    : 0;
  const rules = fs.existsSync(path.join(home, '.codex', 'AGENTS.md'))
    ? fs.statSync(path.join(home, '.codex', 'AGENTS.md')).size
    : 0;
  if (linked && rules) ok('codex', `${linked} skills, regras universais presentes`);
  else todo('codex', 'skills ou regras universais em falta', `node scripts/setup.mjs --apply`);
}

// ---------- 3. Claude: marketplace e plugins ----------

const pluginsDir = path.join(home, '.claude', 'plugins');
const readJson = (f) => {
  try {
    return JSON.parse(fs.readFileSync(f, 'utf8'));
  } catch {
    return null;
  }
};

if (!fs.existsSync(pluginsDir)) {
  ok('claude', 'não instalado nesta máquina');
} else {
  const known = readJson(path.join(pluginsDir, 'known_marketplaces.json')) || {};
  const manifest = readJson(path.join(repoRoot, 'plugins.json')) || { claude: [] };
  const installed = readJson(path.join(pluginsDir, 'installed_plugins.json'));
  const have = new Set(Object.keys((installed && installed.plugins) || {}));
  const wanted = manifest.claude.filter((p) => p.required && !have.has(`${p.name}@${p.marketplace}`));

  if (!apply) {
    if (!known.finhub) todo('claude', 'marketplace finhub não registado', 'node scripts/setup.mjs --apply');
    else if (wanted.length) todo('claude', `${wanted.length} plugin(s) obrigatório(s) por instalar`, 'node scripts/setup.mjs --apply');
    else ok('claude', 'marketplace registado, plugins instalados');
  } else {
    // Registar e instalar, nao so relatar: numa maquina nova isto e o que evita
    // ter de pedir ao agente que va ler o repo antes de o /cerebro existir.
    if (!known.finhub) run('claude', ['plugin', 'marketplace', 'add', 'PTFinHub/finhub-context']);
    else run('claude', ['plugin', 'marketplace', 'update', 'finhub']);

    const failed = [];
    for (const p of wanted) {
      const r = run('claude', ['plugin', 'install', `${p.name}@${p.marketplace}`]);
      if (r.status !== 0) failed.push(p.name);
    }

    const after = readJson(path.join(pluginsDir, 'known_marketplaces.json')) || {};
    if (!after.finhub) {
      todo('claude', 'marketplace continua por registar', 'confirmar que o CLI `claude` esta no PATH');
    } else if (failed.length) {
      todo('claude', `falhou a instalar: ${failed.join(', ')}`, 'claude plugin install <nome>@finhub');
    } else if (wanted.length) {
      human('claude', `${wanted.length} plugin(s) instalado(s)`, 'reiniciar a sessao para os comandos e skills entrarem');
    } else {
      ok('claude', 'marketplace actualizado, plugins já instalados');
    }
  }
}

// ---------- 4. Baseline de plugins ----------

const plugins = run('node', [path.join(repoRoot, 'scripts', 'check-plugins.mjs')]);
const pluginsOut = plugins.stdout || '';
if (plugins.status === 0) {
  ok('plugins', 'baseline completo');
} else {
  const missing = pluginsOut.split('\n').filter((l) => l.includes('EM FALTA')).length;
  todo('plugins', `${missing} obrigatório(s) em falta`, 'node scripts/check-plugins.mjs   (imprime o comando por CLI)');
}

// ---------- 5. Memória apontada para dentro do repo de código ----------

const codeRepos = ['FinhubFront', 'Finhub_Back'];

// Os repos não estão num sítio previsível: neste desktop vivem sete níveis abaixo de
// Desktop/, no Dell em Documents/GitHub. Procura-se em largura até oito níveis (~3s);
// FINHUB_REPOS_DIR salta a procura quando o caminho já é conhecido.
function findRepo(name) {
  const override = process.env.FINHUB_REPOS_DIR;
  const roots = override
    ? [override]
    : [path.join(home, 'Documents', 'GitHub'), path.join(home, 'Documents'), path.join(home, 'Desktop')];

  const skip = new Set(['node_modules', '.git', 'AppData', 'dist', 'build']);
  for (const root of roots) {
    const queue = [[root, 0]];
    while (queue.length) {
      const [dir, depth] = queue.shift();
      if (depth > 8) continue;
      let entries;
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const e of entries) {
        if (!e.isDirectory() || skip.has(e.name) || e.name.startsWith('.')) continue;
        const full = path.join(dir, e.name);
        if (e.name === name && fs.existsSync(path.join(full, '.git'))) return full;
        queue.push([full, depth + 1]);
      }
    }
  }
  return null;
}

let memoryChecked = 0;

for (const name of codeRepos) {
  const found = findRepo(name);
  if (!found) continue;
  memoryChecked += 1;
  const local = readJson(path.join(found, '.claude', 'settings.local.json'));
  if (local && local.autoMemoryDirectory) ok(`memória ${name}`, 'aponta para o repo');
  else
    human(
      `memória ${name}`,
      'autoMemoryDirectory não definido',
      `pôr em ${path.join(found, '.claude', 'settings.local.json')}: {"autoMemoryDirectory": "${path.join(found, 'dcos', 'finhub', 'memory').split(path.sep).join('/')}"}`
    );
}
if (!memoryChecked) ok('memória', 'nenhum repo de código encontrado nos sítios habituais');

// ---------- 6. Modelo e effort declarados ----------

const baseline = readJson(path.join(repoRoot, 'baseline.json'));

if (baseline && baseline.models) {
  // Claude: a preferência global da máquina. O settings.json versionado de cada repo
  // ganha sobre isto, mas se a global divergir o comportamento muda fora dos repos.
  const wantClaude = baseline.models.claude;
  if (fs.existsSync(path.join(home, '.claude'))) {
    const s = readJson(path.join(home, '.claude', 'settings.json')) || {};
    const same = s.model === wantClaude.model && s.effortLevel === wantClaude.effortLevel;
    if (same) ok('modelo claude', `${s.model}/${s.effortLevel}`);
    else
      human(
        'modelo claude',
        `${s.model || 'default'}/${s.effortLevel || 'default'} — declarado: ${wantClaude.model}/${wantClaude.effortLevel}`,
        `pôr em ~/.claude/settings.json (merge): "model": "${wantClaude.model}", "effortLevel": "${wantClaude.effortLevel}"`
      );
  }

  // Codex: chaves de topo do config.toml. Nunca reescrever o ficheiro — só estas duas linhas.
  const wantCodex = baseline.models.codex;
  const codexConfigPath = path.join(home, '.codex', 'config.toml');
  if (fs.existsSync(codexConfigPath)) {
    const toml = fs.readFileSync(codexConfigPath, 'utf8');
    const pick = (key) => (toml.match(new RegExp(`^${key}\\s*=\\s*"([^"]+)"`, 'm')) || [, null])[1];
    const model = pick('model');
    const effort = pick('model_reasoning_effort');
    const personality = pick('personality');
    const want = `${wantCodex.model}/${wantCodex.model_reasoning_effort}/${wantCodex.personality}`;
    const got = `${model || '—'}/${effort || '—'}/${personality || 'ausente'}`;
    if (got === want) {
      ok('modelo codex', got);
    } else {
      human(
        'modelo codex',
        `${got} — declarado: ${want}`,
        `editar as chaves de topo de ~/.codex/config.toml, preservando o resto do ficheiro`
      );
    }
  }
}

// ---------- 7. Auditoria do que só existe aqui ----------

const audit = run('node', [path.join(repoRoot, 'scripts', 'audit-local.mjs')]);
const needsDecision = (audit.stdout || '').match(/(\d+) a precisar de decisao/);
if (needsDecision && needsDecision[1] !== '0') {
  human('auditoria', `${needsDecision[1]} item(s) só nesta máquina ou divergentes`, 'node scripts/audit-local.mjs');
} else {
  ok('auditoria', 'alinhado com o repo');
}

// ---------- Relatório ----------

const width = Math.max(...results.map((r) => r.step.length));
const icon = { OK: '  ok  ', FALTA: ' falta', HUMANO: ' tu   ' };

console.log(`\nSetup — ${os.hostname()}${apply ? '  (--apply)' : '  (só verificação)'}\n`);
for (const r of results) {
  console.log(`  [${icon[r.state]}] ${r.step.padEnd(width)}  ${r.detail}`);
  if (r.action) console.log(`${' '.repeat(width + 12)}${r.action}`);
}

const falta = results.filter((r) => r.state === 'FALTA');
const teu = results.filter((r) => r.state === 'HUMANO');

console.log('');
if (!falta.length && !teu.length) {
  console.log('Máquina alinhada. Mesmas skills, regras, comandos e memória que as outras.\n');
} else {
  if (falta.length) console.log(`${falta.length} passo(s) automáticos por fazer — correr com --apply.`);
  if (teu.length) console.log(`${teu.length} passo(s) que só tu podes decidir — ver acima.`);
  console.log('');
}

process.exit(falta.length ? 1 : 0);
