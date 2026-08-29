# finhub-context

Fonte única das skills usadas pelos agentes de IA nos repos FinHub.

Objectivo: trabalhar **de qualquer máquina e de qualquer CLI** sempre com as mesmas skills,
sem copiar ficheiros à mão por máquina. As skills vivem aqui, versionadas; cada CLI liga-se
a este repo à sua maneira.

## Conteúdo

| Plugin | Skills |
|---|---|
| `finhub-core` | `caveman`, `caveman-commit`, `caveman-review`, `caveman-compress`, `typescript-advanced-types` — e o hook `SessionStart` que activa o modo caveman |
| `finhub-web` | `accessibility`, `frontend-design`, `playwright-best-practices`, `seo`, `shadcn`, `tailwind-css-patterns`, `tailwind-v4-shadcn`, `vercel-composition-patterns`, `vercel-react-best-practices`, `vite`, `vitest` |
| `finhub-api` | `nodejs-backend-patterns`, `nodejs-best-practices`, `nodejs-express-server` |
| `finhub-workflow` | comandos `/novo-lote` e `/fecha-lote` |

Fora dos plugins:

- `codex/AGENTS.md` — regras universais que se aplicam a **todas** as sessões do Codex, em
  qualquer projecto. Ligado a `~/.codex/AGENTS.md` pelo installer.
- `codex/agents/` — sub-agentes do Codex (`.toml`), ligados a `~/.codex/agents`.

Formato `SKILL.md`, lido por Claude Code, Codex e restantes agentes compatíveis.

## O que fica de fora, e porquê

Só migra para aqui o que é **reutilizável entre repos**. Fica no repo de código:

- `AGENTS.md`, `CLAUDE.md`, `dcos/**` — específicos do projecto, e já portáteis via git
- `/gates` e `/report` — invocam os scripts do `package.json` de cada repo
  (`corepack yarn typecheck:p1` no frontend, `npm run typecheck` no backend), por isso
  não têm versão partilhada possível

`/novo-lote` e `/fecha-lote` não invocam nenhum script — só leem `dcos/finhub/TASKS.md` e
chamam o `/gates` local — por isso vivem aqui e servem qualquer repo.

## Como cada superfície se liga

> Este repo é **público**. Não é preciso SSH, token nem credential helper em máquina nenhuma —
> o clone é anónimo. Foi essa a razão de o tornar público: os repos de código continuam
> privados, e aqui só vivem padrões de Tailwind, Vite, Playwright e afins.

### Claude Code — automático, zero setup

Já está declarado no `.claude/settings.json` do `FinhubFront` e do `Finhub_Back`:

```json
{
  "extraKnownMarketplaces": {
    "finhub": { "source": { "source": "github", "repo": "PTFinHub/finhub-context" } }
  },
  "enabledPlugins": {
    "finhub-core@finhub": true,
    "finhub-web@finhub": true,
    "finhub-workflow@finhub": true
  }
}
```

Abrir o repo numa máquina nova e confiar na pasta chega. Actualizar: `/plugin marketplace update`.

### Codex CLI — uma vez por máquina

```bash
bash scripts/install-codex-skills.sh
```

```powershell
powershell -ExecutionPolicy Bypass -File scripts/install-codex-skills.ps1
```

Clona este repo para `~/.finhub-context` e liga cada skill em `~/.codex/skills/`.
Correr outra vez faz `git pull` e actualiza — é idempotente.

### Codex cloud — no setup script do environment

Os containers são efémeros e não têm `~/.codex/skills`. Colar no **setup script**:

```bash
git clone --depth 1 https://github.com/PTFinHub/finhub-context.git "$HOME/.finhub-context"
bash "$HOME/.finhub-context/scripts/install-codex-skills.sh"
```

### Claude cloud

Vem do `.claude/settings.json` do repo clonado. Nada a fazer.

## Validacao

```bash
node scripts/validate.mjs     # catalogo, manifestos, frontmatter
node scripts/audit-local.mjs  # o que esta nesta maquina e nao no repo
node scripts/check-plugins.mjs # baseline de plugins por CLI (Claude e Codex)
```

Corre no CI a cada PR (`.github/workflows/validate.yml`): catalogo e manifestos coerentes,
cada `SKILL.md` com `name` e `description` no frontmatter, markdown em LF. Uma skill sem
`description` nunca auto-activa por intencao — passa a existir sem nunca ser usada.

Este repo alimenta todas as maquinas e CLIs: um erro aqui chega a todos no proximo pull.
Por isso nada entra sem passar no CI, e o merge e humano.

## Regras

- **Uma skill vive num sítio só** — aqui. Não voltar a copiar para `.claude/skills` ou
  `.agents/skills` dentro dos repos de código.
- Markdown sempre em **LF** (`.gitattributes` força). PT-PT com acentos + CRLF no Windows
  gera diffs falsos de centenas de linhas.
- Para congelar uma versão num repo, usar o campo `version` ou `sha` no `marketplace.json`.

## Ficheiros de contexto

Este repo guarda **skills**. As regras de cada projecto continuam no `AGENTS.md` do repo
respectivo, com o `CLAUDE.md` a importá-lo via `@AGENTS.md`.
