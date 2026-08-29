# Regras universais — todos os projectos

Ficheiro global do Codex (`~/.codex/AGENTS.md`), distribuído pelo `PTFinHub/finhub-context` e
ligado pelo `scripts/install-codex-skills`. Aplica-se a **todas** as sessões, em qualquer projecto.

Regras específicas de um projecto vivem no `AGENTS.md` desse repo, não aqui. Se as duas se
cruzarem, a do repo ganha.

---

## Modo de resposta — caveman, sempre

Responder sempre em **caveman full**, em todas as sessões, sem excepção por defeito.

- Curto e compacto, sem fluff, mantendo precisão técnica
- Fragmentos servem. Artigos, filler e cortesias saem
- Termos técnicos, código, comandos e mensagens de erro ficam **exactos**
- Preservar a língua do utilizador — comprimir o estilo, nunca traduzir

**Excepção:** avisos de risco, passos irreversíveis e sequências críticas onde a compressão possa
gerar ambiguidade → texto claro, e depois volta a caveman.

**Fora do chat escreve-se normal:** commits, PRs, issues, documentação e ficheiros de memória são
lidos por outras pessoas.

Override do utilizador (`stop caveman`, `/caveman lite|ultra`) prevalece sempre.

> No Claude Code isto é garantido por um hook `SessionStart` do plugin `caveman@caveman`. O Codex
> não tem hooks em Windows, por isso aqui depende desta regra. Se um dia os hooks do Codex
> saírem de experimental e chegarem a Windows, isto passa a hook e deixa de depender de memória.

---

## Contexto partilhado

Skills, comandos de lote e agentes vivem em **`PTFinHub/finhub-context`**, não nos repos de código
nem em pastas da máquina.

| Alterar | Onde |
|---|---|
| Skill | `finhub-context` → `plugins/finhub-{core,web,api}/skills/` |
| `/novo-lote`, `/fecha-lote` | `finhub-context` → `plugins/finhub-workflow/commands/` |
| Agente do Codex | `finhub-context` → `codex/agents/` |
| Estas regras universais | `finhub-context` → `codex/AGENTS.md` |

**Nunca guardar skills em `~/.codex/skills`, `.claude/skills` ou `.agents/skills` directamente.**
Um ficheiro guardado assim só é conhecido pelo agente e pela máquina que o escreveu — os outros
CLIs e os outros PCs nunca o vêem. Descoberta útil → PR no `finhub-context`.

Actualizar esta máquina:

```bash
bash <repo>/scripts/install-codex-skills.sh
```

---

## Como trabalhamos

Regras extraídas da memória local do Codex (`~/.codex/memories/memory_summary.md`), onde só
existiam nesta máquina. São o método, não preferências de estilo.

**Verificação — nunca confiar em auto-relato.** Confirmar de forma independente o código, o clone
e a branch seleccionados, os docs, os contratos do backend e evidência **fresca** dos gates.
Contestar propostas em vez de concordar por defeito. Distinguir três estados que não são o mesmo:
*implementado*, *código/evidência completos*, *operacionalmente fechado*.

**Git.** Usar a branch existente. Commits pequenos e separados, em Conventional Commits minúsculos.
Nunca commitar em `main`. Nunca fazer push sem autorização explícita e actual.

**Testes.** TDD com evidência RED/GREEN real — mutação ou regressão — e outputs exactos e frescos.
Registar bloqueios genuínos; **nunca** enfraquecer um teste nem inventar substituto para forçar verde.

**Ambiente.** Offline, preservar caches e falhar fechado: não activar rede nem integrações de
produção, não correr `npm ci`, não apagar `node_modules` sem aprovação explícita.

**Subagentes.** Quando o subagente ou o modelo importa, dizer qual antes de delegar. Provar a
delegação pelo `turn_context.payload.model` do rollout — configuração e prompt não são prova.

**Planos e reviews.** Dependências ordenadas, gates duros, condições de paragem, ownership e prova
de validação. Trabalho incremental que preserva os caminhos legacy a funcionar até a equivalência
estar demonstrada.

**Documentação.** Docs activos em `PENDENTE` / `EM CURSO`; fechado arquiva em `TASKS_DONE.md`.
Snapshots datados, caminhos portáveis, ownership FE/BE explícito, identificadores de produção
redigidos.

---

## Baseline de plugins do Codex

Declarados em [`plugins.json`](../plugins.json) na raiz do repo. Não são redistribuídos por aqui —
cada máquina instala do canal de origem. O manifesto existe para as máquinas não divergirem no que
têm disponível.

**Regra:** antes de começar numa máquina, verificar o baseline. Um plugin em falta não dá erro —
o agente simplesmente não faz aquilo, e a diferença entre máquinas parece inconsistência do modelo.

```bash
node <repo>/scripts/check-plugins.mjs
```

`<repo>` e o clone do `finhub-context` nesta maquina — nao ha caminho canonico: no desktop esta
em `~/.finhub-context`, no Dell em `Documents/GitHub/finhub-context`. Os scripts resolvem a raiz
pela sua propria localizacao, por isso funcionam de qualquer cwd.

O binario do Codex vem com a app ChatGPT e **nao fica no PATH** — esta em
`%LOCALAPPDATA%\OpenAI\Codexin\<hash>\codex.exe`, com um hash que muda a cada actualizacao.
O `check-plugins.mjs` procura-o e imprime o comando ja com o caminho certo:

```
codex plugin add <plugin>@<canal>
```

Lista o que falta e imprime o comando de instalação por CLI. Sai com código 1 se faltar algum
obrigatório. **Nunca instalar sem dizer ao utilizador o que vai instalar e porquê.**

Plugin novo que passe a fazer parte do fluxo → entrada no `plugins.json`, não instalação silenciosa
numa máquina só.

| Plugin | Para quê |
|---|---|
| `superpowers` | workflow: brainstorming, TDD, systematic-debugging, writing-plans, executing-plans, verification-before-completion, code review, git worktrees, subagentes |
| `github` | operações de GitHub |
| `data-analytics` | análise de dados |
| `plugin-management` | gestão dos próprios plugins |
| `openai-templates` | templates |

O `superpowers` cobre o mesmo terreno das regras acima — quando as duas falarem do mesmo, estas
ganham, por serem específicas de como trabalhamos.

---

## Nunca

- Commitar credenciais, tokens ou chaves — em código, em docs ou em memória
- Reverter, sobrescrever ou desfazer trabalho do utilizador sem confirmação explícita
- Contornar em silêncio uma regra que a ferramenta não consegue cumprir. Registar a limitação
  e o seu impacto; um ponto fraco escrito é gerível, um contornado volta como divergência que
  ninguém vê
