// Auditoria do que existe localmente e nao esta neste repo.
//
// Corre em cada maquina: `node scripts/audit-local.mjs`
// Compara ~/.claude e ~/.codex com o catalogo e classifica cada item.
//
// Existe porque a migracao das pastas dos repos nao chegou: as pastas da home sao
// o segundo sitio onde a divergencia se instala, e sao as que nenhum git status mostra.
//
// Nao altera nada. So relata.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const home = os.homedir();
// A raiz vem da localizacao deste ficheiro, nao do cwd — o clone pode estar em qualquer caminho.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const hash = (file) => {
  try {
    return crypto
      .createHash('sha256')
      .update(fs.readFileSync(file, 'utf8').replace(/\r/g, ''))
      .digest('hex')
      .slice(0, 12);
  } catch {
    return null;
  }
};

const isLink = (target) => {
  try {
    return fs.lstatSync(target).isSymbolicLink();
  } catch {
    return false;
  }
};

const list = (dir) => {
  try {
    return fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
};

// Skills de terceiros declaradas em skills.json: nao vivem em plugins/, mas sao
// conhecidas e obrigatorias. Sem isto apareciam como "SO LOCAL" e mandavam decidir
// algo que ja esta decidido.
const declared = new Map();
try {
  for (const d of JSON.parse(fs.readFileSync(path.join(root, 'skills.json'), 'utf8')).skills) {
    declared.set(d.name, `${d.repo}@${d.ref.slice(0, 7)}`);
  }
} catch {
  // sem skills.json: nada declarado
}

// Catalogo: nome da skill -> caminho do SKILL.md neste repo
const catalog = new Map();
for (const plugin of list(path.join(root, 'plugins'))) {
  const skillsDir = path.join(root, 'plugins', plugin.name, 'skills');
  for (const skill of list(skillsDir)) {
    catalog.set(skill.name, path.join(skillsDir, skill.name, 'SKILL.md'));
  }
}

const rows = [];

function auditSkills(label, dir) {
  for (const entry of list(dir)) {
    if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
    const name = entry.name;
    const local = path.join(dir, name, 'SKILL.md');
    if (!fs.existsSync(local)) continue;

    if (declared.has(name)) {
      rows.push([label, name, 'declarada', `de ${declared.get(name)} — ver skills.json`]);
      continue;
    }
    if (!catalog.has(name)) {
      rows.push([label, name, 'SO LOCAL', 'nao existe no repo — avaliar se deve subir']);
      continue;
    }
    if (isLink(path.join(dir, name))) {
      rows.push([label, name, 'ligado', 'symlink/junction para o repo']);
      continue;
    }
    const same = hash(local) === hash(catalog.get(name));
    rows.push([
      label,
      name,
      same ? 'copia igual' : 'DIVERGE',
      same ? 'copia real mas identica — pode passar a link' : 'conteudo diferente do repo — reconciliar',
    ]);
  }
}

auditSkills('claude', path.join(home, '.claude', 'skills'));
auditSkills('codex', path.join(home, '.codex', 'skills'));

// Agentes do Codex
const repoAgents = new Set(list(path.join(root, 'codex', 'agents')).map((e) => e.name));
for (const entry of list(path.join(home, '.codex', 'agents'))) {
  if (!entry.name.endsWith('.toml')) continue;
  const local = path.join(home, '.codex', 'agents', entry.name);
  if (!repoAgents.has(entry.name)) {
    rows.push(['codex/agents', entry.name, 'SO LOCAL', 'nao existe no repo — avaliar se deve subir']);
  } else {
    const same = hash(local) === hash(path.join(root, 'codex', 'agents', entry.name));
    rows.push(['codex/agents', entry.name, same ? 'copia igual' : 'DIVERGE', same ? '' : 'reconciliar']);
  }
}

// Do repo que nao chegou a esta maquina
for (const [name] of catalog) {
  const inClaude = fs.existsSync(path.join(home, '.claude', 'skills', name));
  const inCodex = fs.existsSync(path.join(home, '.codex', 'skills', name));
  if (!inCodex && !inClaude) {
    rows.push(['codex', name, 'EM FALTA', 'esta no repo mas nao nesta maquina — correr o installer']);
  }
}

const width = (i) => Math.max(...rows.map((r) => r[i].length), 0);
const [w0, w1, w2] = [width(0), width(1), width(2)];

console.log(`\nAuditoria local — ${os.hostname()}\n`);
for (const row of rows.sort((a, b) => a[2].localeCompare(b[2]) || a[1].localeCompare(b[1]))) {
  console.log(`  ${row[0].padEnd(w0)}  ${row[1].padEnd(w1)}  ${row[2].padEnd(w2)}  ${row[3]}`);
}

const attention = rows.filter((r) => !['ligado', 'copia igual', 'declarada'].includes(r[2]));
console.log(
  `\n${rows.length} itens · ${attention.length} a precisar de decisao\n` +
    (attention.length
      ? 'SO LOCAL -> decidir se sobe ao repo · DIVERGE -> reconciliar · EM FALTA -> correr o installer\n'
      : 'Nada a fazer: esta maquina esta alinhada com o repo.\n')
);

// Configuracao que nao e distribuida por nenhum canal — sempre por maquina
const manual = [
  ['~/.claude/settings.json', 'preferencias globais do Claude'],
  ['~/.codex/config.toml', 'modelo, reasoning effort, trust por projecto'],
  ['<repo>/.claude/settings.local.json', 'autoMemoryDirectory e permissoes locais'],
];
console.log('Fica sempre por maquina (verificar a olho, nao e distribuido):');
for (const [file, what] of manual) console.log(`  ${file.padEnd(38)} ${what}`);
console.log('');
