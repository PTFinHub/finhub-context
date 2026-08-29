# Cérebro — estado e alinhamento desta máquina

Verifica se esta máquina corresponde ao `PTFinHub/finhub-context`, e alinha-a se o utilizador
mandar. **Não aplicar nada sem dizer primeiro o que vai mudar.**

---

## Passo 1 — Localizar o repo de contexto

Não há caminho canónico: neste desktop está em `~/.finhub-context`, noutra máquina em
`Documents/GitHub/finhub-context`. Descobre-o assim, pela ordem:

1. `~/.claude/plugins/known_marketplaces.json` → `finhub.installLocation` — é um clone completo do
   repo e existe em qualquer máquina que tenha o marketplace registado
2. `~/.finhub-context`
3. Perguntar ao utilizador

## Passo 2 — Verificar

```bash
node <repo>/scripts/setup.mjs
```

Sem `--apply` não altera nada. Devolve cada verificação como `ok`, `falta` (automático) ou `tu`
(decisão humana), e sai com código 1 se faltar algo automático.

Apresenta o resultado tal como veio. Não resumas para "está tudo bem" se houver linhas `falta`
ou `tu` — é precisamente isso que o utilizador precisa de ver.

## Passo 3 — Propor, não aplicar

Se houver `falta`, dizer **o que** vai ser feito antes de o fazer:

> Faltam 2 passos automáticos: actualizar o repo de contexto e ligar 1 skill nova ao Codex.
> Corro `setup.mjs --apply`?

Só depois de o utilizador confirmar:

```bash
node <repo>/scripts/setup.mjs --apply
```

Se houver linhas `tu`, listá-las e explicar cada uma. Estas nunca se aplicam sozinhas:

- **`autoMemoryDirectory` por definir** — o passo é manual de propósito; a chave é ignorada no
  `settings.json` versionado, por segurança
- **modelo ou effort fora do baseline** — mexer no `config.toml` do Codex sem cuidado parte
  configuração que não é nossa. Editar só as chaves de topo, com backup, e confirmar que o resto
  do ficheiro ficou intacto
- **ficheiro alterado fora do installer** — ver o que lá está antes de forçar. Se for contexto que
  vale a pena, sobe ao repo por PR em vez de se perder
- **itens só nesta máquina** — `node <repo>/scripts/audit-local.mjs` mostra quais

## Passo 4 — Provar

```bash
node <repo>/scripts/fingerprint.mjs
```

A linha `RESUMO` é comparável entre máquinas: o mesmo valor significa o mesmo comportamento. Se o
utilizador tiver o resumo da outra máquina, comparar linha a linha e nomear a que difere.

---

## O que este comando existe para apanhar

Um `git pull` actualiza as skills, porque são junctions para o repo — mas **não** actualiza as
regras universais nem os plugins do Claude, que são cópias. A máquina fica com metade das novidades
e nada avisa.

Já aconteceu três vezes: o `~/.codex/AGENTS.md` congelado depois da primeira instalação, os plugins
presos numa versão antiga, e uma skill nova que nunca chegou a ser ligada. Nos três casos tudo
reportava verde.

## Quando correr

Ao começar numa máquina em que não se trabalha há uns dias, depois de novidades no repo de
contexto, e sempre que um agente se comportar de forma diferente daquilo que se espera e não se
souber porquê.
