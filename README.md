# finhub-context

Fonte única das skills usadas pelos agentes de IA nos repos FinHub.

Objectivo: trabalhar **de qualquer máquina e de qualquer CLI** sempre com as mesmas skills,
sem copiar ficheiros à mão por máquina. As skills vivem aqui, versionadas; cada CLI liga-se
a este repo à sua maneira.

## Conteúdo

| Plugin | Skills |
|---|---|
| `finhub-core` | `caveman`, `typescript-advanced-types` |
| `finhub-web` | `accessibility`, `frontend-design`, `playwright-best-practices`, `seo`, `shadcn`, `tailwind-css-patterns`, `tailwind-v4-shadcn`, `vercel-composition-patterns`, `vercel-react-best-practices`, `vite`, `vitest` |
| `finhub-api` | `nodejs-backend-patterns`, `nodejs-best-practices`, `nodejs-express-server` |
| `finhub-workflow` | comandos `/novo-lote` e `/fecha-lote` |

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

## Regras

- **Uma skill vive num sítio só** — aqui. Não voltar a copiar para `.claude/skills` ou
  `.agents/skills` dentro dos repos de código.
- Markdown sempre em **LF** (`.gitattributes` força). PT-PT com acentos + CRLF no Windows
  gera diffs falsos de centenas de linhas.
- Para congelar uma versão num repo, usar o campo `version` ou `sha` no `marketplace.json`.

## Ficheiros de contexto

Este repo guarda **skills**. As regras de cada projecto continuam no `AGENTS.md` do repo
respectivo, com o `CLAUDE.md` a importá-lo via `@AGENTS.md`.
