---
linear_ticket: FIN-126
linear_url: https://linear.app/finhubpt/issue/FIN-126/hub-reorg-nortes-beta-ia-estrutura-i18n
change_date: 2026-09-05
scope: shared_agent_product_context
ownership: FE_primary_BE_bridge_finhub-context_shared
evidence: decisions_documented_implementation_deferred_to_child_tickets
---

# Hub reorg — nortes beta

Contexto partilhado para agentes que trabalham no ecossistema FinHub. A especificação versionada
canónica vive em `PTFinHub/FinhubFront/dcos/finhub/HUB_REORG_NORTES_2026-09-05.md`.
A fonte humana e o estado operacional vivem no
[FIN-126](https://linear.app/finhubpt/issue/FIN-126/hub-reorg-nortes-beta-ia-estrutura-i18n)
e no [documento Linear](https://linear.app/finhubpt/document/hub-reorg-nortes-beta-2026-09-05-30600b267bc4).

## Resumo das decisões

| # | Norte | Estado | Execução |
|---:|---|---|---|
| 1 | Para Ti é feed transversal Hub + Conta por afinidade; não é Atividade nem Comunidade. | Fechado | FIN-127 |
| 2 | Conteúdos contém media de creators; Recursos contém produtos externos. | Fechado | FIN-128 |
| 3 | Hub oferece ferramentas gratuitas/stateless; Conta trabalha dados pessoais. | Fechado | FIN-129 |
| 4 | Subnav usa proposta B com sete itens, sujeita a gate mobile. | Fechado | FIN-130 |
| 5 | Mercados vive num único `/mercados`, com Premium desbloqueado no mesmo local. | Fechado | FIN-131 |
| 6 | Pesquisa é global e agrupada por categoria; desligada honestamente enquanto não funcionar. | Fechado | FIN-132 |
| 7 | Uma rota canónica por recurso, redirects legacy, sitemap/canonicals e `llm.txt`. | Fechado | FIN-133 |
| 8 | Comunidade permanece platform-owned na beta. | Parqueado | FIN-134 |
| 9 | PT-PT é canónico na beta; inglês legacy usa 301/alias; tradução por JSON. | Fechado | FIN-135 |
| 10 | Barra de qualidade/ruído fecha a beta; ausente é melhor do que enganador. | Depois | FIN-136 |

## Ordem e limites

- Waves: Conta → Hub → Mercados → Free/login não-Premium → Creators/Marcas.
- Não reabrir nortes fechados sem João.
- Não antecipar FIN-134 nem FIN-136.
- A spec HUB-UX que trata `Creators` inglês como canónico está desatualizada perante FIN-135.
- Implementar por ticket/sintoma, com ownership e contratos FE/BE explícitos; nunca num PR único.
- Este documento fixa decisões. Não prova implementação, testes, merge, deploy ou aceitação.
