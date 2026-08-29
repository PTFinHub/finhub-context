# finhub-context — Agent Instructions

Repo de skills partilhadas dos projectos FinHub. **Não tem código de aplicação.**

## O que é

Catálogo de skills no formato `SKILL.md`, distribuído como plugin marketplace do Claude Code
e como pasta de skills do Codex. Ver `README.md` para as três formas de ligação.

## Estrutura

```
.claude-plugin/marketplace.json    catálogo — lista os plugins
plugins/<plugin>/
  .claude-plugin/plugin.json       manifesto do plugin
  skills/<skill>/SKILL.md          a skill
scripts/install-codex-skills.*     liga as skills a ~/.codex/skills
```

## Regras ao alterar

- Adicionar skill → criar `plugins/<plugin>/skills/<nome>/SKILL.md` e confirmar que o plugin
  já está listado em `.claude-plugin/marketplace.json`. Skills novas dentro de um plugin
  existente não precisam de entrada nova no catálogo.
- Plugin novo → entrada em `marketplace.json` **e** `.claude-plugin/plugin.json` próprio.
- Subir `version` no `plugin.json` e no `marketplace.json` a cada alteração com impacto.
- Markdown em **LF**, sempre.
- Não duplicar aqui as regras dos projectos — essas vivem no `AGENTS.md` de cada repo.

## Validação antes de commit

```bash
node -e "JSON.parse(require('fs').readFileSync('.claude-plugin/marketplace.json','utf8'))"
```

Cada `plugin.json` tem de fazer parse e cada `source` tem de apontar para uma pasta existente.
