# Proveniência — família caveman

Cópias literais de [`juliusbrussee/caveman`](https://github.com/juliusbrussee/caveman):

| Skill aqui | Origem upstream |
|---|---|
| `caveman` | `skills/caveman` |
| `caveman-commit` | `skills/caveman-commit` |
| `caveman-review` | `skills/caveman-review` |
| `caveman-compress` | `skills/caveman-compress` (inclui `scripts/`) |

## Licença

O `LICENSE` do upstream é **MIT para todo o repo excepto** os directórios ligados ao Engine
(`engine/`, `proxy/`, `cacheengine/`, `rewriter/`, `browse/`, `mcp/`, `shrink/`, cavemem Go core,
`shared/platform/`), esses sob BSL-1.1.

`skills/` não está nessa lista — os quatro ficheiros acima são **MIT**, incluindo os scripts
Python do `caveman-compress`. Redistribuição aqui mantém a atribuição.

## Manter verbatim

Editar à mão diverge da fonte e reintroduz a deriva que este repo existe para eliminar.
Actualizar = voltar a copiar:

```bash
for s in caveman caveman-commit caveman-review caveman-compress; do
  curl -fsSL "https://raw.githubusercontent.com/juliusbrussee/caveman/main/skills/$s/SKILL.md" \
    -o "plugins/finhub-core/skills/$s/SKILL.md"
done
```
