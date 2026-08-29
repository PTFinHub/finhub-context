# Iniciar Novo Lote

Vamos iniciar o lote: **$ARGUMENTS**

Segue estes passos por ordem. Para entre cada um, reporta o que fizeste e aguarda confirmação quando indicado.

---

## Passo 1 — Ler o plano do lote
Lê `dcos/finhub/TASKS.md` e identifica o bloco do lote "$ARGUMENTS".
Mostra:
- Objectivo do lote
- Lista de tasks incluídas (IDs + descrição)
- Branch sugerida
- Docs de referência a ler (TOOL_*_TASKS.md, PROMPTS_*.md, etc.)

---

## Passo 2 — Verificar estado git
Corre `git status` e `git log --oneline -5`.
- Se houver trabalho por commitar: para e alerta. Não avances sem working tree limpo.
- Se estiver limpo: confirma branch actual e prossegue.

---

## Passo 3 — Criar branch local
Cria a branch com o nome sugerido em TASKS.md.

**Não faças push ainda.**

Reporta: *"Branch `lote/xxx` criada localmente. Posso publicar agora (`git push -u origin lote/xxx`) ou preferes fazer tu?"*

Aguarda confirmação antes de qualquer push.

---

## Passo 4 — Ler docs de referência do lote
Lê os ficheiros indicados no Passo 1 (TOOL_*_TASKS.md e PROMPTS_*.md correspondentes).
Resume em 5-10 linhas o que o lote exige: contratos obrigatórios, dependências, o que não duplicar.

---

## Passo 5 — Checklist de arranque
Apresenta a lista de tasks em formato checklist pronta para executar:

```
[ ] TASK-ID — descrição
[ ] TASK-ID — descrição
...
```

Pergunta: *"Começo pelo primeiro ponto ou queres ajustar alguma coisa primeiro?"*
