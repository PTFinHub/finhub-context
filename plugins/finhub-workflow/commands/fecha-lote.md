# Fechar Lote

Fecho do lote: **$ARGUMENTS**

Segue estes passos por ordem. Para entre cada um e aguarda confirmação nos checkpoints marcados.

---

## Passo 1 — Gates obrigatórios
Corre `/gates` (ou os gates directamente).

**Se FAIL:** para aqui. Lista o que falta corrigir. Não avances para os passos seguintes.
**Se PASS:** confirma e continua.

---

## Passo 2 — Verificar tasks do lote
Lê `dcos/finhub/TASKS.md` e lista o estado de cada task do lote "$ARGUMENTS":

```
✓ TASK-ID — descrição (concluída)
✗ TASK-ID — descrição (pendente)
```

Se houver tasks pendentes: alerta e pergunta como proceder antes de avançar.

---

## Passo 3 — Actualizar documentação
- Move o bloco do lote de `TASKS.md` para `TASKS_DONE.md` (cria o ficheiro se não existir) com:
  - Data de fecho (hoje)
  - Gates executados e resultado
  - Commits relevantes
- Actualiza o bloco "Estado atual" em `AI_CONTEXT.md` se o lote activo mudou.

---

## Passo 4 — Commit de fecho
Cria commit com a mensagem:
```
docs(lote): close $ARGUMENTS gates PASS
```

**Não faças push ainda.**

Reporta: *"Commit criado (`git log --oneline -1`). Posso dar push agora ou preferes fazer tu?"*

Aguarda confirmação.

---

## Passo 5 — Report final
Apresenta resumo limpo:

```
LOTE FECHADO: $ARGUMENTS
────────────────────────
Tasks concluídas: X/X
Gates: <os do repo, conforme /gates> — todos PASS
Commits: X commits nesta branch
Ficheiros alterados: lista dos principais

Próximo lote sugerido: LOTE-XX — [nome]
Branch sugerida: lote/xxx
```
