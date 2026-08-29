# Como o sistema funciona

Um cérebro, vários corpos. As regras, skills, comandos e memória vivem em git; cada CLI e cada
máquina liga-se à mesma fonte. O que muda de máquina para máquina é apenas o que não pode ser
partilhado — credenciais, caminhos, preferências pessoais.

Este ficheiro é a fonte sobre o próprio sistema. Se algo aqui contradisser a realidade,
a realidade ganha e este ficheiro corrige-se no mesmo ciclo.

---

## Os três repos

| Repo | Visibilidade | O que guarda |
|---|---|---|
| `PTFinHub/finhub-context` | público | skills, comandos de lote, agentes do Codex, e este documento |
| `PTFinHub/FinhubFront` | privado | código do frontend, `AGENTS.md`, `dcos/finhub/**`, memória |
| `PTFinHub/Finhub_Back` | privado | código do backend, `AGENTS.md`, `dcos/finhub/**`, memória |

**Uma fonte, um canal.** Tudo o que os agentes partilham chega pelo `finhub-context` — mesmo o que
nasce noutro projecto open-source. Quando adoptamos algo de fora (skills, hooks), copiamos para cá
com a proveniência registada em `SOURCE.md`, em vez de instalar o marketplace do autor a par do
nosso. Dois canais dariam skills duplicadas e duas fontes a manter.

O `finhub-context` é público **por necessidade técnica**: o Claude Code não consegue autenticar-se
no GitHub para clonar repos privados, e o clone anónimo elimina o problema em todas as máquinas.
Por isso só entram lá padrões genéricos — Tailwind, Vite, Playwright. O contexto de negócio fica
nos repos privados.

---

## O fluxo de uma task

```
Joao define o objectivo
      |
      v
Claude  le AGENTS.md + dcos/finhub/TASKS.md + memoria
        pensa, organiza, decide a abordagem
      |
      v
Codex   aplica o codigo
      |
      v
/gates  typecheck + lint (frontend) ou typecheck + contratos (backend)
      |
      v
commit em branch de lote, nunca em main
      |
      v
PR  ->  CI: shared-context-guard + ci.yml
      |
      v
Joao revê e faz merge
```

Papéis: **Claude** decide UI/UX/layout e organiza; **Codex** aplica lógica de negócio, APIs,
testes, infra. O Codex não altera componentes de UI, CSS ou design tokens sem instrução explícita.

`/novo-lote` e `/fecha-lote` conduzem as pontas deste fluxo e vêm do `finhub-context`, por isso
comportam-se igual nos dois repos e nas duas máquinas. O `/fecha-lote` chama o `/gates` **local**,
que é diferente em cada repo — processo partilhado, validação certa em cada sítio.

---

## A fronteira

O critério é um só: **partilhado se for reutilizável entre repos; local se for do repo; da máquina
se não puder sair dela.**

| | Onde vive | Como chega |
|---|---|---|
| Skills | `finhub-context` | marketplace (Claude) · installer (Codex) |
| `/novo-lote`, `/fecha-lote` | `finhub-context` | marketplace |
| Agentes do Codex | `finhub-context` → `codex/agents/` | installer |
| Regras universais (caveman, contexto partilhado) | `finhub-context` → `codex/AGENTS.md` | installer → `~/.codex/AGENTS.md` |
| Baseline de plugins de terceiros | `finhub-context` → `plugins.json` | **declarado, não distribuído** — `check-plugins.mjs` diz o que falta |
| `/gates`, `/report` | `.claude/commands/` do repo | git clone |
| Regras do projecto | `AGENTS.md` do repo | git clone |
| Estado do lote | `dcos/finhub/TASKS.md` | git clone |
| Memória | `dcos/finhub/memory/` do repo | git clone |
| Credenciais, tokens | máquina | nunca sai |
| `~/.codex/config.toml` | máquina | por configurar à mão |
| `settings.local.json` | máquina | por configurar à mão |

`/gates` e `/report` ficam locais porque envolvem scripts diferentes: `corepack yarn typecheck:p1`
no frontend, `npm run typecheck` no backend. Não há versão partilhada possível.

`AGENTS.md` é a fonte única de cada repo. O `CLAUDE.md` reduz-se a `@AGENTS.md` mais o que é
específico do Claude. Duplicar factos entre os dois é o que os fez divergir no passado.

---

## O que cada CLI lê e o que o trava

| | Claude Code | Codex |
|---|---|---|
| Regras | `CLAUDE.md` → `@AGENTS.md` | `AGENTS.md` nativo |
| Skills | marketplace → cache | `~/.codex/skills` (links) |
| Comandos de lote | plugin `finhub-workflow` | — |
| Memória | `autoMemoryDirectory` → repo | por regra escrita |
| Caveman sempre activo | hook `SessionStart` do `finhub-core` | `~/.codex/AGENTS.md` distribuído |
| Modelo e effort | `.claude/settings.json` do repo (`opus` / `high`) | `~/.codex/config.toml` — **por máquina** |
| **Travão em sessão** | **hook `PreToolUse`** | **nenhum** |
| Travão antes do commit | hook + `pre-commit` | `pre-commit` (só no frontend) |
| Travão antes do merge | CI — **não corre** | CI — **não corre** |

O desequilíbrio é real e não tem solução hoje: os hooks do Codex são experimentais e **não existem
em Windows**. O Codex — que é quem mais aplica — depende da regra escrita.

> ⚠️ **O CI não corre nos repos privados.** Todos os jobs do `FinhubFront` e do `Finhub_Back`
> terminam com 0 passos executados e sem log, pelo menos desde 2026-08-25 — antes de qualquer
> alteração nossa. No `finhub-context`, que é público, os mesmos workflows correm 8–9 passos e
> passam. A diferença entre os repos é a visibilidade, o que aponta para minutos ou limite de
> gastos de Actions esgotados na org (não consegui ler o billing — precisa de `admin:org`).
>
> **Decisão de 2026-08-29: não se paga Actions.** O CI não é, nem será, a rede nos repos de código.
> O que resta: o hook `PreToolUse` no Claude, a regra escrita no Codex, o `pre-commit` do frontend,
> e o Qodo mais a revisão humana no PR. Escrito para ninguém voltar a contar com o CI.

---

## Máquina nova

```bash
git clone https://github.com/PTFinHub/FinhubFront.git
git clone https://github.com/PTFinHub/Finhub_Back.git
git clone https://github.com/PTFinHub/finhub-context.git

cd finhub-context && node scripts/setup.mjs --apply
```

O `setup.mjs` faz e valida os passos abaixo de uma vez; ficam documentados porque é útil saber o
que ele está a fazer, e porque um deles continua a precisar de ti.

**Claude** — abrir na pasta e confiar. O `extraKnownMarketplaces` regista o marketplace e o
`enabledPlugins` instala. Se não apanhar:

```bash
claude plugin marketplace add PTFinHub/finhub-context
claude plugin install finhub-core@finhub
```

**Codex** — uma vez por máquina:

```bash
git clone https://github.com/PTFinHub/finhub-context.git ~/.finhub-context
bash <repo>/scripts/install-codex-skills.sh
```

**Memória** — em cada repo, `.claude/settings.local.json`:

```json
{ "autoMemoryDirectory": "<caminho absoluto do repo>/dcos/finhub/memory" }
```

Esta linha é o único passo manual obrigatório. É deliberado: o `autoMemoryDirectory` é ignorado
no `settings.json` versionado, por segurança.

**Auditar antes de assumir que está alinhado:**

```bash
node <repo>/scripts/audit-local.mjs    # skills, agentes, regras
node <repo>/scripts/check-plugins.mjs  # baseline de plugins por CLI
```

Lista o que existe localmente e não está no repo, o que diverge, e o que falta.

---

## Pontos fracos

### Fechados

| Era | Estado |
|---|---|
| Skills duplicadas 4× entre repos e pastas da home | uma cópia, no `finhub-context` |
| `AGENTS.md` e `CLAUDE.md` a contradizerem-se e ao código | `AGENTS.md` fonte única, factos reconciliados |
| Task activa fixada em ficheiros de contexto | só em `TASKS.md`, que ganha em conflito |
| Memória presa à máquina | `dcos/finhub/memory/`, versionada |
| Agente podia escrever skills locais sem travão | hook `PreToolUse` + CI |
| Alterar skills sem bump silenciava a distribuição | CI exige bump em plugin alterado |
| Repo privado impedia auto-instalação | público, clone anónimo |

### Abertos

| Ponto fraco | Impacto | Estado |
|---|---|---|
| ~~GitHub Actions nos repos privados~~ | **decidido: não se paga.** O CI nunca será a rede nos repos de código | fechado por decisão — a revisão é o Qodo mais o review humano |
| Codex sem travão em sessão (Windows) | regra escrita, não garantida | limitação da ferramenta — reavaliar quando os hooks saírem de experimental |
| ~~Backend sem `pre-commit`~~ | **decidido: aceite.** O Qodo faz a revisão nos PRs | fechado por decisão |
| Dois `TASKS.md` a contradizerem-se | frontend diz `BUD-FEM-05` (2026-07-28), overlay do backend diz outra coisa (2026-08-27) | **precisa de decisão: qual é canónico** |
| `~/.codex/config.toml` não distribuído | modelo e reasoning effort do Codex podem diferir entre máquinas; o do Claude já vem do repo | por resolver |
| ~~`browser-automation` e `taste-skill` sem licença~~ | resolvido: `taste-skill` declarada de `tasteskill/tasteskill` (MIT); `browser-automation` reescrita por nós | fechado |
| Memória é por repo, não cross-repo | o que o Claude aprende no frontend não chega ao backend | por avaliar |
| `main` do backend com 2 erros de typecheck | gate vermelho antes de qualquer alteração | pré-existente |
| Portátil por auditar | pode ter skills e agentes só locais | correr `audit-local.mjs` lá |

---

## Registar uma limitação nova

Quando um agente ou CLI não conseguir cumprir uma regra:

1. Não contornar em silêncio — uma solução local reintroduz a divergência
2. Acrescentar linha em **Pontos fracos → Abertos**, com o impacto concreto
3. Se houver mitigação (CI, hook, regra escrita), dizer qual e o que ela **não** cobre
4. Reavaliar quando a ferramenta mudar

Um ponto fraco escrito é gerível. Um ponto fraco contornado localmente volta como divergência
que ninguém vê.
