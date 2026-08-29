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
bash ~/.finhub-context/scripts/install-codex-skills.sh
```

---

## Nunca

- Commitar credenciais, tokens ou chaves — em código, em docs ou em memória
- Reverter, sobrescrever ou desfazer trabalho do utilizador sem confirmação explícita
- Contornar em silêncio uma regra que a ferramenta não consegue cumprir. Registar a limitação
  e o seu impacto; um ponto fraco escrito é gerível, um contornado volta como divergência que
  ninguém vê
