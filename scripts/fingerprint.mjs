// Impressão digital do que esta máquina vai realmente dar aos agentes.
//
//   node scripts/fingerprint.mjs
//
// O setup.mjs prova presença — "existe, está ligado". Isto prova equivalência:
// duas máquinas com o mesmo resumo comportam-se da mesma maneira, e quando
// diferem diz-se exactamente em quê.
//
// Só entra aqui o que influencia o comportamento do agente. Caminhos, hostnames
// e credenciais ficam de fora de propósito — senão nunca haveria dois iguais.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const home = os.homedir();

const sha = (text) => crypto.createHash('sha256').update(text).digest('hex').slice(0, 12);
const readText = (f) => {
  try {
    return fs.readFileSync(f, 'utf8').replace(/\r/g, '');
  } catch {
    return null;
  }
};
const readJson = (f) => {
  try {
    return JSON.parse(readText(f) || '');
  } catch {
    return null;
  }
};
const listDirs = (dir) => {
  try {
    return fs.readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory() || e.isSymbolicLink()).map((e) => e.name).sort();
  } catch {
    return [];
  }
};

const parts = [];
const add = (name, value, detail) => parts.push({ name, value, detail });

// 1. Versão do cérebro
try {
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).trim();
  const dirty = execFileSync('git', ['status', '--porcelain'], { cwd: repoRoot, encoding: 'utf8' }).trim();
  add('contexto', head.slice(0, 12), dirty ? 'ATENÇÃO: alterações não commitadas' : 'limpo');
} catch {
  add('contexto', 'sem-git', 'este clone não é um repo git');
}

// 2. Regras universais que o Codex vai ler
const codexRules = readText(path.join(home, '.codex', 'AGENTS.md'));
add('regras-codex', codexRules ? sha(codexRules) : 'ausente', codexRules ? `${codexRules.split('\n').length} linhas` : 'nenhuma regra global');

// 3. Skills que o Codex vai carregar — nomes e conteúdo
const codexSkillsDir = path.join(home, '.codex', 'skills');
// `.system` e uma pasta interna do Codex, invisivel ao `ls` e sem SKILL.md — nao e uma skill.
const codexSkills = listDirs(codexSkillsDir).filter(
  (name) => !name.startsWith('.') && fs.existsSync(path.join(codexSkillsDir, name, 'SKILL.md'))
);

// So entram no resumo as skills que ESTE repo distribui. Uma maquina pode ter skills
// de outros plugins — isso e legitimo e nao a torna diferente no que nos controlamos.
// Sao contadas a parte, como informacao.
const ourSkills = new Set();
for (const plugin of listDirs(path.join(repoRoot, 'plugins'))) {
  for (const skill of listDirs(path.join(repoRoot, 'plugins', plugin, 'skills'))) ourSkills.add(skill);
}
const mine = codexSkills.filter((n) => ourSkills.has(n));
const extra = codexSkills.filter((n) => !ourSkills.has(n));

const codexSkillHash = mine
  .map((name) => `${name}:${sha(readText(path.join(codexSkillsDir, name, 'SKILL.md')) || '')}`)
  .join('|');
add('skills-finhub', mine.length ? sha(codexSkillHash) : 'nenhuma', `${mine.length} de ${ourSkills.size} distribuidas por este repo`);
add('skills-extra', String(extra.length), extra.length ? `fora do repo: ${extra.slice(0, 6).join(', ')}${extra.length > 6 ? '…' : ''}` : '—');

// 4. Agentes do Codex
const codexAgents = (() => {
  try {
    return fs.readdirSync(path.join(home, '.codex', 'agents')).filter((f) => f.endsWith('.toml')).sort();
  } catch {
    return [];
  }
})();
add('agentes-codex', codexAgents.length ? sha(codexAgents.join('|')) : 'nenhum', codexAgents.join(', ') || '—');

// 5. Plugins do Claude — nome e versão, que é o que decide o conteúdo servido
const installed = readJson(path.join(home, '.claude', 'plugins', 'installed_plugins.json'));
const claudePlugins = Object.entries((installed && installed.plugins) || {})
  .map(([key, entries]) => `${key}@${(entries[0] && entries[0].version) || '?'}`)
  .sort();
const finhubPlugins = claudePlugins.filter((p) => p.includes('@finhub@'));
add('plugins-finhub', finhubPlugins.length ? sha(finhubPlugins.join('|')) : 'nenhum', finhubPlugins.join(', ') || '—');

// 6. Modelo e effort — comportamento muda com isto, mesmo com regras iguais
const claudeSettings = readJson(path.join(home, '.claude', 'settings.json')) || {};
add('modelo-claude', `${claudeSettings.model || 'default'}/${claudeSettings.effortLevel || 'default'}`, 'preferência global da máquina');

const codexConfig = readText(path.join(home, '.codex', 'config.toml')) || '';
const pick = (key) => (codexConfig.match(new RegExp(`^${key}\\s*=\\s*"?([^"\\n]+)"?`, 'm')) || [, '—'])[1].trim();
// personality entra no valor, nao no detalhe: muda o registo das respostas com as mesmas regras.
add('modelo-codex', `${pick('model')}/${pick('model_reasoning_effort')}/${pick('personality')}`, 'modelo, effort e personality');

// ---------- Relatório ----------

// Só as partes que TÊM de bater certo entre máquinas entram no resumo combinado.
// O modelo do Codex entra: effort diferente muda respostas com as mesmas regras.
const comparable = ['contexto', 'regras-codex', 'skills-finhub', 'plugins-finhub', 'modelo-claude', 'modelo-codex'];
const combined = sha(parts.filter((p) => comparable.includes(p.name)).map((p) => `${p.name}=${p.value}`).join('\n'));

const w = Math.max(...parts.map((p) => p.name.length));
console.log(`\nImpressão digital — ${os.hostname()}\n`);
for (const p of parts) {
  const mark = comparable.includes(p.name) ? ' ' : '·';
  console.log(`${mark} ${p.name.padEnd(w)}  ${String(p.value).padEnd(14)}  ${p.detail}`);
}
console.log(`\n  RESUMO  ${combined}\n`);
console.log('Duas máquinas com o mesmo RESUMO operam da mesma maneira.');
console.log('Se diferirem, a linha que difere diz em quê. (· = informativo, fora do resumo)\n');
