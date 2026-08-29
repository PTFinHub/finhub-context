# Proveniência — família caveman

Cópias literais de [`juliusbrussee/caveman`](https://github.com/juliusbrussee/caveman):

| Skill aqui | Origem upstream |
|---|---|
| `caveman` | `skills/caveman` |
| `caveman-commit` | `skills/caveman-commit` |
| `caveman-review` | `skills/caveman-review` |
| `caveman-compress` | `skills/caveman-compress` (inclui `scripts/`) |
| `../../hooks/caveman-activate.js` | hook `SessionStart` do plugin upstream |

## Licença

O `LICENSE` do upstream é **MIT para todo o repo excepto** os directórios ligados ao Engine
(`engine/`, `proxy/`, `cacheengine/`, `rewriter/`, `browse/`, `mcp/`, `shrink/`, cavemem Go core,
`shared/platform/`), esses sob BSL-1.1.

`skills/` não está nessa lista — os quatro ficheiros acima são **MIT**, incluindo os scripts
Python do `caveman-compress`. Redistribuição aqui mantém a atribuição.

## Porque distribuimos nos, e nao o plugin upstream

O plugin `caveman@caveman` faria o mesmo trabalho, mas seria um **segundo canal de distribuicao**
a chegar as maquinas — skills duplicadas no Claude (`caveman:caveman` e `finhub-core:caveman`) e
duas fontes a manter. Este repo e a fonte unica; o upstream e de onde o conteudo vem, nao por onde
ele chega.

Por isso o `finhub-core` declara ele proprio o hook `SessionStart` que activa o modo caveman em
todas as sessoes do Claude. O ficheiro do hook e copia literal do upstream (MIT, `hooks/LICENSE`).

## Porque esta e a excepcao

A regra do repo e: skills de terceiros sao **declaradas** em [`skills.json`](../../../../skills.json)
e instaladas da origem, nao redistribuidas. A familia caveman e a unica excepcao, e por um motivo
concreto: o hook `SessionStart` que garante o modo caveman em todas as sessoes vive no
`finhub-core` e serve estes ficheiros. Separar o hook do conteudo devolvia a garantia ao acaso.

Actualizar a partir do upstream — <https://github.com/juliusbrussee/caveman>:

## Manter verbatim

Editar à mão diverge da fonte e reintroduz a deriva que este repo existe para eliminar.
Actualizar = voltar a copiar:

```bash
for s in caveman caveman-commit caveman-review caveman-compress; do
  curl -fsSL "https://raw.githubusercontent.com/juliusbrussee/caveman/main/skills/$s/SKILL.md" \
    -o "plugins/finhub-core/skills/$s/SKILL.md"
done
```
