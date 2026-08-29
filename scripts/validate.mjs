// Validacao do catalogo. Corre no CI a cada PR e localmente com `node scripts/validate.mjs`.
//
// Verifica o que um agente autonomo pode partir sem dar por isso:
// catalogo e manifestos parseaveis e coerentes, e cada SKILL.md com frontmatter
// utilizavel (sem `description`, a skill nunca auto-activa por intencao).

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const errors = [];
const warnings = [];

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    errors.push(`${path.relative(root, file)}: JSON invalido — ${err.message}`);
    return null;
  }
}

function frontmatter(file) {
  const text = fs.readFileSync(file, 'utf8');
  if (!text.startsWith('---')) return null;
  const end = text.indexOf('\n---', 3);
  if (end === -1) return null;
  const lines = text.slice(3, end).split('\n');
  const fields = {};
  for (let i = 0; i < lines.length; i += 1) {
    const match = /^([a-zA-Z_-]+):\s*(.*)$/.exec(lines[i]);
    if (!match) continue;
    let value = match[2].trim();
    // Valor em bloco YAML: `description:` seguido de linhas indentadas.
    if (!value) {
      const block = [];
      while (i + 1 < lines.length && /^\s+\S/.test(lines[i + 1])) {
        block.push(lines[i + 1].trim());
        i += 1;
      }
      value = block.join(' ');
    }
    fields[match[1]] = value;
  }
  return fields;
}

const marketplace = readJson(path.join(root, '.claude-plugin', 'marketplace.json'));
if (marketplace) {
  if (!marketplace.name) errors.push('marketplace.json: falta `name`');
  if (!Array.isArray(marketplace.plugins)) errors.push('marketplace.json: `plugins` tem de ser array');

  let skillCount = 0;

  for (const entry of marketplace.plugins || []) {
    const dir = path.join(root, String(entry.source).replace(/^\.\//, ''));
    if (!fs.existsSync(dir)) {
      errors.push(`${entry.name}: source ${entry.source} nao existe`);
      continue;
    }

    const manifestPath = path.join(dir, '.claude-plugin', 'plugin.json');
    if (!fs.existsSync(manifestPath)) {
      errors.push(`${entry.name}: falta .claude-plugin/plugin.json`);
    } else {
      const manifest = readJson(manifestPath);
      if (manifest && manifest.name !== entry.name) {
        errors.push(`${entry.name}: plugin.json diz \`${manifest.name}\` — os nomes tem de bater certo`);
      }
      if (manifest && entry.version && manifest.version !== entry.version) {
        warnings.push(
          `${entry.name}: version ${entry.version} no catalogo vs ${manifest.version} no plugin.json`
        );
      }
    }

    const skillsDir = path.join(dir, 'skills');
    if (fs.existsSync(skillsDir)) {
      for (const skill of fs.readdirSync(skillsDir)) {
        const file = path.join(skillsDir, skill, 'SKILL.md');
        if (!fs.existsSync(file)) {
          errors.push(`${entry.name}/${skill}: falta SKILL.md`);
          continue;
        }
        skillCount += 1;
        const fields = frontmatter(file);
        if (!fields) {
          errors.push(`${entry.name}/${skill}: SKILL.md sem frontmatter`);
        } else {
          if (!fields.name) errors.push(`${entry.name}/${skill}: frontmatter sem \`name\``);
          if (!fields.description) {
            errors.push(
              `${entry.name}/${skill}: frontmatter sem \`description\` — sem ela a skill nunca auto-activa`
            );
          }
        }
      }
    }

    const commandsDir = path.join(dir, 'commands');
    if (fs.existsSync(commandsDir)) {
      for (const command of fs.readdirSync(commandsDir)) {
        if (!command.endsWith('.md')) {
          warnings.push(`${entry.name}/commands/${command}: os comandos sao ficheiros .md`);
        }
      }
    }
  }

  console.log(`marketplace: ${marketplace.name} — ${(marketplace.plugins || []).length} plugins, ${skillCount} skills`);
}

for (const warning of warnings) console.log(`aviso: ${warning}`);

if (errors.length) {
  for (const error of errors) console.error(`erro: ${error}`);
  console.error(`\n${errors.length} erro(s).`);
  process.exit(1);
}

console.log('validacao OK');
