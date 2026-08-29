# Começa aqui

Este repo é o cérebro dos agentes de IA do FinHub. Regras, skills, comandos, agentes e a memória
vivem aqui; cada máquina e cada CLI ligam-se à mesma fonte. Só fica local o que não pode ser
partilhado — credenciais, caminhos, preferências pessoais.

**Máquina nova — do zero, sem depender de nenhum agente:**

```bash
git clone https://github.com/PTFinHub/finhub-context.git
cd finhub-context
node scripts/setup.mjs --apply
```

São as duas únicas coisas que tens de saber de cor: o URL e o comando. Nada mais precisa de
existir na máquina — o repo é público, o clone é anónimo.

O `--apply` regista o marketplace, instala os plugins obrigatórios do Claude, liga as skills, os
agentes e as regras universais ao Codex. **Os comandos do Claude só aparecem na sessão seguinte** —
é assim que os plugins funcionam, e o script diz-to.

**Máquina que já usas, para confirmar que está em dia:** o mesmo comando. Sem `--apply` só verifica.

Passos completos, o que fica por máquina e os problemas conhecidos: **[SETUP.md](SETUP.md)**.

---

## O que está onde

| Quero… | Ler |
|---|---|
| Pôr uma máquina a trabalhar, do zero | [SETUP.md](SETUP.md) |
| Perceber o sistema todo — fluxos, fronteira, pontos fracos | [ARCHITECTURE.md](ARCHITECTURE.md) |
| Saber o que este repo distribui e como cada CLI se liga | [README.md](README.md) |
| As regras que valem em todos os projectos | [codex/AGENTS.md](codex/AGENTS.md) |
| Que plugins de terceiros o fluxo assume | [plugins.json](plugins.json) |
| Que skills de terceiros usamos, e quais rejeitámos | [skills.json](skills.json) |
| Que modelo e effort são obrigatórios | [baseline.json](baseline.json) |
| Regras de **um** projecto | `AGENTS.md` do repo de código, não aqui |
| O que está a ser feito agora | `dcos/finhub/TASKS.md` do repo de código |

---

## O que é partilhado e o que não é

Um critério: **partilhado se for reutilizável entre repos; do repo se for do repo; da máquina se
não puder sair dela.**

| | Onde vive | Como chega |
|---|---|---|
| Skills | aqui, `plugins/*/skills/` | marketplace (Claude) · installer (Codex) |
| `/novo-lote`, `/fecha-lote` | aqui, `plugins/finhub-workflow/commands/` | marketplace |
| Agentes do Codex | aqui, `codex/agents/` | installer |
| Regras universais | aqui, `codex/AGENTS.md` | installer → `~/.codex/AGENTS.md` |
| Baseline de plugins | aqui, `plugins.json` | **declarado, não distribuído** |
| `/gates`, `/report` | `.claude/commands/` do repo de código | git clone |
| Regras do projecto | `AGENTS.md` do repo de código | git clone |
| Memória | `dcos/finhub/memory/` do repo de código | git clone |
| Credenciais, `config.toml`, `settings.local.json` | máquina | nunca saem |

`/gates` e `/report` ficam locais porque envolvem scripts diferentes — `corepack yarn typecheck:p1`
no frontend, `npm run typecheck` no backend. Não há versão partilhada possível.

---

## Uma fonte, um canal

Tudo o que os agentes partilham chega por aqui, **mesmo o que nasce noutro projecto**. Quando
adoptamos algo de fora — uma skill, um hook — copiamos para cá com a proveniência registada num
`SOURCE.md`, em vez de instalar o marketplace do autor a par do nosso.

Dois canais dariam skills duplicadas e duas fontes a manter. Foi assim que o `caveman` acabou a
aparecer duas vezes no Claude antes de corrigirmos.

**Skills de terceiros declaram-se, não se copiam.** Ficam em [`skills.json`](skills.json) com origem,
commit fixo e licença; cada máquina instala com `node scripts/install-skills.mjs --apply`. Fixar o
commit não é zelo: entre duas instalações, o `impeccable` consolidou 21 skills numa só — sem commit
fixo, duas máquinas ficariam com coisas diferentes.

A família `caveman` é a única excepção, porque servimos o hook que a activa. Está escrito no
`SOURCE.md` dela, com o link do upstream e o comando de refresh.

Excepção declarada: plugins de terceiros que não podemos redistribuir (`superpowers` e os outros do
canal curated da OpenAI). Esses ficam **declarados** no `plugins.json` e cada máquina instala da
origem — o `check-plugins.mjs` diz o que falta e imprime o comando.

---

## Como as melhorias chegam a toda a gente

1. Melhoria numa máquina → **PR neste repo**, nunca ficheiro local. Um ficheiro guardado em
   `~/.claude/skills` ou `~/.codex/skills` só é conhecido por aquele agente naquela máquina.
2. O CI valida: catálogo e manifestos coerentes, cada `SKILL.md` com `name` e `description`,
   markdown em LF, e **bump de `version`** em qualquer plugin alterado.
3. Merge é humano.
4. Nas outras máquinas: `node scripts/setup.mjs --apply`.

O bump de versão não é burocracia: o cache do Claude é indexado pela versão. Sem bump,
`claude plugin update` responde *"already at the latest version"* e as máquinas já instaladas nunca
recebem a alteração — falha que parece sucesso.

---

## `/cerebro`

Dentro de uma sessão, em vez de decorar caminhos:

```
/cerebro
```

Existe como comando no Claude e como skill com o mesmo nome no Codex. Verifica, mostra o que está
fora do sítio, e **pergunta antes de aplicar**. O que nunca aplica sozinho — memória, `config.toml`,
ficheiros alterados à mão — vem listado com o motivo.

Nos repos de código, o hook `SessionStart` corre a mesma verificação sozinho e avisa logo na
primeira linha da sessão. São 225 ms, sem rede.

---

## Verificar

```bash
node scripts/setup.mjs          # tudo: repo, Codex, Claude, plugins, memória, auditoria
node scripts/check-plugins.mjs  # só o baseline de plugins, por CLI
node scripts/audit-local.mjs    # o que existe nesta máquina e não no repo
node scripts/validate.mjs       # o catálogo em si (corre também no CI)
node scripts/fingerprint.mjs    # resumo comparável: duas máquinas iguais dão o mesmo
node scripts/drift.mjs          # instantâneo: o instalado ainda corresponde ao repo?
```

O `setup.mjs` sai com código 1 se faltar um passo automático — serve como gate.

Nenhum destes altera nada sem `--apply`.

---

## O que ainda não está resolvido

Os pontos fracos abertos estão em [ARCHITECTURE.md](ARCHITECTURE.md#pontos-fracos), com o impacto de
cada um. Os que mais pesam hoje:

- **GitHub Actions não corre nos repos privados** — o CI que servia de rede para o Codex não existe
  na prática lá; nos repos de código o travão é o hook `pre-commit`
- **Codex sem travão em sessão** — hooks experimentais e sem Windows; depende da regra escrita
- **Dois `TASKS.md` contradizem-se** — precisa de decisão, não de código

Quando uma ferramenta não conseguir cumprir uma regra: **não contornar em silêncio.** Escrever a
limitação e o seu impacto. Um ponto fraco escrito é gerível; um contornado localmente volta como
divergência que ninguém vê.
