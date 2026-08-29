# Setup — máquina nova

Como pôr uma máquina a trabalhar nos projectos FinHub com as mesmas skills, regras, comandos e
memória que todas as outras. Vale para Windows, macOS e Linux, e para Claude Code e Codex.

Se só queres perceber o sistema antes de o instalar, começa em [index.md](index.md).

---

## Antes de começar

| Precisas | Porquê |
|---|---|
| **git** | tudo é distribuído por git |
| **Node 18+** | os scripts de setup e validação |
| **Claude Code** e/ou **Codex** | pelo menos um; o setup adapta-se ao que encontrar |

Não precisas de credenciais para o repo de contexto — é público e o clone é anónimo. Para os repos
de código precisas de acesso à org `PTFinHub`.

---

## 1. Preparar a máquina

Duas coisas para saber de cor: o URL e o comando.

```bash
git clone https://github.com/PTFinHub/finhub-context.git
cd finhub-context
node scripts/setup.mjs --apply
```

Isto regista o marketplace do Claude, instala os plugins obrigatórios, e liga as skills, os agentes
e as regras universais ao Codex. Adapta-se: se um dos CLIs não estiver instalado, salta-o.

O `finhub-context` pode ficar em qualquer pasta. Os scripts resolvem-se pela própria localização.

## 2. Clonar os repos de código

```bash
git clone https://github.com/PTFinHub/FinhubFront.git
git clone https://github.com/PTFinHub/Finhub_Back.git
```

## 3. Apontar a memória para dentro do repo

Em **cada** repo de código, criar ou editar `.claude/settings.local.json`:

```json
{ "autoMemoryDirectory": "<caminho absoluto do repo>/dcos/finhub/memory" }
```

Este ficheiro é ignorado pelo git, de propósito — é por máquina. O `autoMemoryDirectory` também é
ignorado no `settings.json` versionado, por segurança, e é por isso que este passo é manual.

Sem ele, o que o agente aprende fica na máquina e nunca chega a mais lado nenhum.

## 4. Reiniciar a sessão

Os comandos e skills de um plugin acabado de instalar **só aparecem na sessão seguinte**. É assim
que os plugins funcionam; o `setup.mjs` avisa-te.

---

## Confirmar

```bash
node scripts/setup.mjs
```

Sem `--apply` só verifica. Três estados:

| | |
|---|---|
| `ok` | feito |
| `falta` | automático — voltar a correr com `--apply` |
| `tu` | decisão humana; o script explica qual |

Sai com código 1 se faltar um passo automático, por isso serve de gate em scripts.

Verificações mais estreitas, quando precisares:

```bash
node scripts/check-plugins.mjs  # baseline de plugins, por CLI
node scripts/audit-local.mjs    # o que existe nesta máquina e não no repo
node scripts/validate.mjs       # o catálogo em si
node scripts/fingerprint.mjs    # o resumo comparável entre máquinas
node scripts/install-skills.mjs # skills de terceiros declaradas
node scripts/drift.mjs          # instantâneo: o instalado corresponde ao repo?
```

Nenhum destes altera nada.

### Provar que duas máquinas são equivalentes

O `setup.mjs` prova presença — existe, está ligado. Não prova que duas máquinas se comportam da
mesma maneira. Para isso:

```bash
node scripts/fingerprint.mjs
```

Resume o que a máquina vai realmente dar aos agentes: versão do cérebro, hash das regras universais,
hash das skills, versões dos plugins, e modelo/effort de cada CLI. Caminhos e hostnames ficam de
fora — senão nunca haveria dois iguais.

**Mesmo RESUMO = mesmo comportamento.** Se diferirem, a linha que difere diz em quê.

---

## Quando voltar a correr

- **Sempre que houver novidades no repo de contexto** — skill nova, regra alterada, comando novo.
  Nos repos de código o hook `SessionStart` avisa-te sozinho; dentro da sessão basta `/cerebro`
- Ao mudar de máquina depois de um tempo sem lá tocar
- Quando um agente se portar de forma diferente numa máquina e não souberes porquê

```bash
node scripts/setup.mjs --apply
```

É idempotente. Correr duas vezes não faz mal.

---

## O que fica sempre por máquina

Não é distribuído por nenhum canal. Se duas máquinas divergirem aqui, os agentes comportam-se de
forma diferente com as mesmas regras — e parece inconsistência do modelo quando é configuração.

| Ficheiro | O que guarda |
|---|---|
| `~/.claude/settings.json` | preferências globais do Claude |
| `~/.codex/config.toml` | modelo e reasoning effort do Codex, trust por projecto |
| `<repo>/.claude/settings.local.json` | `autoMemoryDirectory` e permissões locais |
| credenciais, tokens, sessões | nunca saem da máquina |

### Modelo e effort — obrigatório

| CLI | Modelo | Effort | Onde |
|---|---|---|---|
| Codex | `gpt-5.6-sol` | `medium` | `~/.codex/config.toml`, chaves de topo |
| Claude | `opus` | `high` | `~/.claude/settings.json` |

Declarado em [`baseline.json`](baseline.json). O `setup.mjs` verifica e avisa quando diverge; a
alteração é manual de propósito, porque tocar no `config.toml` do Codex sem cuidado parte
configuração que não é nossa.

No Claude, os repos de código já fixam `opus`/`high` no `settings.json` versionado — isso ganha
sobre a preferência global dentro desses repos. A global continua a valer fora deles.

---

## Problemas conhecidos

**`claude plugin marketplace add` falha com `Permission denied (publickey)`**
O cliente monta um URL SSH. O repo de contexto é público, por isso o mais simples é reescrever para
HTTPS de vez:

```bash
git config --global url."https://github.com/".insteadOf "git@github.com:"
```

**`API Error: Usage credits required for 1M context`**
A sessão arrancou com um modelo de contexto 1M. `/model` corrige, mas **só para sessões novas** —
é preciso sair e voltar a entrar.

**`claude plugin update` diz "already at the latest version" mas falta conteúdo**
O cache é indexado pela versão. Quem publicou a alteração esqueceu-se do bump em `plugin.json` e
`marketplace.json`. O CI do repo de contexto rejeita isso, mas confirma o `version`.

**`codex` não é reconhecido no terminal**
O binário vem com a app ChatGPT e não fica no PATH. Está em
`%LOCALAPPDATA%\OpenAI\Codex\bin\<hash>\codex.exe`, e o hash muda a cada actualização. O
`check-plugins.mjs` encontra-o e imprime o caminho completo.

**O `setup.mjs` não encontra os repos de código**
Procura em `Documents/GitHub`, `Documents` e `Desktop` até oito níveis. Se estiverem noutro sítio:

```bash
FINHUB_REPOS_DIR=/caminho/para/a/pasta node scripts/setup.mjs
```

**O installer diz que um ficheiro "foi alterado fora do installer" e não lhe tocou**
É deliberado — nunca substitui trabalho local sem confirmação. Vê o que lá está: se for contexto que
vale a pena, sobe ao repo por PR em vez de o perder. Só depois `FINHUB_FORCE=1` (bash) ou `-Force`
(PowerShell).

O installer sabe distinguir o que escreveu do que alguém alterou: guarda o hash do que instalou em
`~/.codex/.finhub-installed.json`, e reconhece também qualquer versão histórica do ficheiro no repo.
Actualizações do repo chegam sem `--force`; edições tuas ficam protegidas.

---

## Regras que passam a valer

Chegam via `~/.codex/AGENTS.md` (Codex) e via plugin (Claude). Estão por extenso em
[codex/AGENTS.md](codex/AGENTS.md); em resumo:

- **Skills, comandos de lote e agentes vivem neste repo.** Nunca guardar em `~/.claude/skills`,
  `~/.codex/skills` ou `.agents/skills` — assim só aquele agente naquela máquina os vê
- **Memória durável vai para `dcos/finhub/memory/`** do repo de código, versionada. Nunca
  credenciais
- **Modo caveman em todas as sessões**, excepto avisos de risco e passos irreversíveis. Commits, PRs
  e docs escrevem-se normal
- **Nunca confiar em auto-relato** — verificar código, branch, docs e evidência fresca dos gates
- **Nunca commitar em `main`**; nunca fazer push sem autorização actual
- **Não contornar em silêncio** uma regra que a ferramenta não consegue cumprir: registar a
  limitação e o impacto

---

## Melhorias

Melhoria numa máquina → **PR neste repo** → CI valida → merge humano → nas outras,
`node scripts/setup.mjs --apply`.

Nunca ficheiro local: só aquele agente, naquela máquina, o veria.
