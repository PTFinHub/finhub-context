// Instala as skills de terceiros declaradas em skills.json.
//
//   node scripts/install-skills.mjs           relata o que falta
//   node scripts/install-skills.mjs --apply   clona e liga
//
// Declaradas, nao redistribuidas: o conteudo fica com quem o escreveu, e este repo
// so guarda de onde vem e em que commit. Sem o commit fixo, duas maquinas que
// instalem em dias diferentes ficam com conteudo diferente — foi o que aconteceu
// com o impeccable, que consolidou 21 skills numa so entre uma instalacao e outra.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const home = os.homedir();
const apply = process.argv.includes('--apply');
const isWindows = process.platform === 'win32';

const manifest = JSON.parse(fs.readFileSync(path.join(repoRoot, 'skills.json'), 'utf8'));
const cacheRoot = process.env.FINHUB_SKILLS_CACHE || path.join(home, '.finhub-skills');

const run = (cmd, args, opts = {}) => spawnSync(cmd, args, { encoding: 'utf8', ...opts });

// Um link por CLI. Em Windows usa-se junction, que nao precisa de privilegios.
function link(target, source) {
  if (fs.existsSync(target)) {
    const stat = fs.lstatSync(target);
    if (!stat.isSymbolicLink() && !stat.isDirectory()) return 'conflito';
    if (!stat.isSymbolicLink()) {
      // pasta real: pode ser uma instalacao anterior por outra ferramenta
      return 'conflito';
    }
    fs.rmSync(target, { recursive: true, force: true });
  }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  if (isWindows) {
    const r = run('cmd', ['/c', 'mklink', '/J', target, source]);
    return r.status === 0 ? 'ligada' : 'falhou';
  }
  fs.symlinkSync(source, target, 'dir');
  return 'ligada';
}

const rows = [];
let missing = 0;
let conflicts = 0;

for (const skill of manifest.skills) {
  const checkout = path.join(cacheRoot, skill.repo.replace('/', '__'));
  const source = path.join(checkout, skill.path);

  if (apply) {
    if (!fs.existsSync(path.join(checkout, '.git'))) {
      fs.mkdirSync(cacheRoot, { recursive: true });
      run('git', ['clone', '--quiet', skill.url, checkout]);
    }
    // Fixar exactamente o que esta declarado. `main` significa seguir o upstream.
    run('git', ['-C', checkout, 'fetch', '--quiet', 'origin', skill.ref]);
    run('git', ['-C', checkout, 'checkout', '--quiet', skill.ref === 'main' ? 'origin/main' : skill.ref]);
  }

  if (!fs.existsSync(path.join(source, 'SKILL.md'))) {
    rows.push([skill.name, 'EM FALTA', apply ? 'o caminho declarado nao existe neste commit' : 'correr com --apply']);
    missing += 1;
    continue;
  }

  const states = [];
  for (const target of skill.targets) {
    const dir = target === 'claude' ? path.join(home, '.claude', 'skills') : path.join(home, '.codex', 'skills');
    if (!fs.existsSync(path.dirname(dir))) continue;
    if (!apply) {
      states.push(`${target}:${fs.existsSync(path.join(dir, skill.name)) ? 'presente' : 'ausente'}`);
      continue;
    }
    const state = link(path.join(dir, skill.name), source);
    if (state === 'conflito') conflicts += 1;
    states.push(`${target}:${state}`);
  }

  rows.push([skill.name, states.join('  '), `${skill.repo}@${skill.ref.slice(0, 7)} · ${skill.license}`]);
}

const w = Math.max(...rows.map((r) => r[0].length));
const w1 = Math.max(...rows.map((r) => r[1].length));
console.log(`\nSkills de terceiros — ${os.hostname()}${apply ? '  (--apply)' : '  (só verificação)'}\n`);
for (const r of rows) console.log(`  ${r[0].padEnd(w)}  ${r[1].padEnd(w1)}  ${r[2]}`);

const rejected = Object.keys(manifest.rejeitadas || {}).filter((k) => !k.startsWith('$'));
console.log(`\n  ${manifest.skills.length} declaradas · ${rejected.length} avaliadas e rejeitadas (ver skills.json)`);

if (conflicts) {
  console.log(`\n  ${conflicts} conflito(s): existe uma pasta real onde ia o link — provavelmente instalada`);
  console.log('  por outra ferramenta. Não foi tocada. Apagar à mão depois de confirmar o conteúdo.');
}
console.log('');

process.exit(missing ? 1 : 0);
