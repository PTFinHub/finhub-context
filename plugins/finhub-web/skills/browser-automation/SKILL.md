---
name: browser-automation
description: Carrega uma página num browser headless e relata o que aconteceu — erros de consola, excepções, pedidos falhados, título, e verificações de selector ou texto, incluindo se o texto vem no HTML do servidor. Usar para confirmar o próprio trabalho em vez de perguntar ao utilizador se a página abriu. Activa em "a página abre?", "verifica a UI", "está partido?", "erros de consola", "a minha alteração funcionou?", "confirma o SSR".
allowed-tools: Bash(node *skills/browser-automation/check.mjs:*)
---

# browser-automation

Escrita por nós, para este projecto. Usa o Playwright que o `FinhubFront` já tem como
dependência — nada a instalar.

## Porque existe

Um agente que altera UI e depois pergunta *"consegues verificar se abriu?"* está a devolver ao
humano o trabalho que devia fazer. Isto carrega a página e diz o que aconteceu.

## Correr

A partir da raiz do `FinhubFront`, com o dev server a correr:

```bash
node <caminho-da-skill>/check.mjs http://localhost:3000/conta
```

Sai com código 1 se houver erros de consola, excepções, pedidos ≥400, ou verificações falhadas.
Serve como gate.

## Opções

| Flag | Para quê |
|---|---|
| `--selector "css"` | falha se o selector não existir na página |
| `--text "..."` | falha se o texto não estiver no `body` |
| `--shot f.png` | screenshot de página inteira |
| `--wait ms` | espera extra depois do `networkidle` |
| `--no-ssr` | não exige que o `--text` venha no HTML do servidor |

## A verificação de SSR

Esta é a razão de a skill ser nossa e não genérica. O frontend é **Vike com SSR**: conteúdo que só
aparece depois da hidratação não existe para o Google nem para quem tem JS lento.

Com `--text`, verificam-se **duas** coisas: se o texto está na página depois de hidratar, e se já
vinha no HTML que o servidor mandou. A segunda falha sozinha quando alguém move dados para um
`useEffect` sem dar por isso.

```bash
node check.mjs http://localhost:3000/artigos/x --text "Título do artigo"
```

```
  ok    texto "Título do artigo"
  FALHA texto no HTML do servidor — so aparece depois da hidratacao — quebra SSR e SEO
```

## Ler o relatório

- **erros de consola** — `console.error` da aplicação e do browser
- **excepções na página** — erros de JS não apanhados; costumam significar ecrã em branco
- **pedidos falhados** — rede caída ou respostas ≥400, incluindo APIs que o SSR precisa

Um `404` numa chamada à API costuma explicar o ecrã vazio melhor do que qualquer screenshot.

## Limites

Não faz login nem sequências de cliques. Para fluxos com estado, os testes Playwright do repo
(`e2e/`) são a ferramenta certa — esta é para a verificação rápida a seguir a uma alteração.
