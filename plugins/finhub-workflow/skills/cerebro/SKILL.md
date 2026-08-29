---
name: cerebro
description: Verifica se esta máquina corresponde ao repo de contexto PTFinHub/finhub-context — regras universais, skills, plugins, modelo e effort — e alinha-a quando o utilizador mandar. Usar ao começar numa máquina que não se usa há dias, depois de novidades no repo, ou quando um agente se comporta de forma diferente do esperado e não se sabe porquê. Activa em "cerebro", "estou em dia?", "esta máquina está alinhada?", "verifica o setup", "sincroniza o contexto".
---

# cerebro

Equivalente do comando `/cerebro` do Claude Code, para agentes que não têm comandos próprios.

## Porque existe

Um `git pull` no repo de contexto actualiza as skills, porque estão ligadas por symlink ou junction.
**Não** actualiza as regras universais em `~/.codex/AGENTS.md` nem os plugins do Claude — esses são
cópias. A máquina fica com metade das novidades e nada avisa.

Já aconteceu três vezes: regras congeladas depois da primeira instalação, plugins presos numa versão
antiga, e uma skill nova que nunca chegou a ser ligada. Nos três casos, tudo parecia verde.

## Localizar o repo

Não há caminho fixo — cada máquina clona onde quer. Procurar por esta ordem:

1. `~/.claude/plugins/known_marketplaces.json` → `finhub.installLocation`
2. `~/.finhub-context`
3. Perguntar ao utilizador

## Verificar

```bash
node <repo>/scripts/drift.mjs
```

Instantâneo, sem rede. Diz apenas se o que está instalado corresponde ao repo.

Para o quadro completo — memória, plugins de terceiros, auditoria do que só existe nesta máquina:

```bash
node <repo>/scripts/setup.mjs
```

Nenhum dos dois altera nada.

## Alinhar

**Dizer primeiro o que vai mudar, e esperar confirmação.**

```bash
node <repo>/scripts/setup.mjs --apply
```

Faz `git pull`, liga skills e agentes, actualiza as regras universais, regista o marketplace do
Claude e instala ou actualiza os plugins.

## O que nunca se aplica sozinho

O script marca estes como decisão humana, e há razão para cada um:

| | Porquê |
|---|---|
| `autoMemoryDirectory` | manual de propósito — a chave é ignorada no `settings.json` versionado, por segurança |
| modelo, effort ou personality fora do baseline | o `config.toml` do Codex tem dezenas de secções que não são nossas; editar só as chaves de topo, com backup, e confirmar que o resto ficou intacto |
| ficheiro alterado fora do installer | ver o que lá está antes de forçar; se for contexto útil, sobe ao repo por PR em vez de se perder |

## Provar que duas máquinas são iguais

```bash
node <repo>/scripts/fingerprint.mjs
```

A linha `RESUMO` é comparável: o mesmo valor significa o mesmo comportamento. Quando difere, a linha
que difere diz em quê.
