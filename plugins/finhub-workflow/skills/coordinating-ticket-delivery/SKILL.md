---
name: coordinating-ticket-delivery
description: Use when selecting, assigning, implementing, reviewing, merging, deploying, accepting, or closing a FinHub ticket across agents, Linear, frontend, or backend.
---

# Fluxo canónico de entrega FinHub

Este documento é a fonte única do processo partilhado de coordenação, implementação, revisão e
fecho de trabalho nos projectos FinHub. Os `AGENTS.md` dos repos acrescentam stack, comandos e
gates locais; Linear e a documentação privada dos repos mantêm prioridade, dependências,
contratos e estado operacional. Em conflito, a instrução explícita actual do utilizador ganha,
seguida das regras do repo e depois deste fluxo. Autonomia geral nunca autoriza reduzir um gate,
incorrer em custos, alterar produção, fazer merge ou apagar branches: o override tem de nomear a
acção e a consequência, ou a autoridade tem de estar explicitamente delegada no projecto.

## Papéis e autoridade

- O **coordenador** escolhe trabalho, gere estado/assignee/delegate e decide aceitação técnica. Faz
  merge, limpa branches e fecha tickets apenas quando essa autoridade estiver explicitamente
  delegada pelo projecto ou pelo utilizador actual.
- O **implementador** altera código, testa, documenta, prepara o PR, resolve findings e comunica
  conclusão ou bloqueio directamente ao coordenador. Não escolhe fila, não faz merge e não altera
  Linear salvo delegação explícita.
- Sessões de análise produzem evidência e propostas. Não criam automaticamente implementação,
  prioridade ou dívida bloqueante.
- O utilizador decide produto, custos, acessos, produção e validação humana. Aceitação operacional
  que exija julgamento humano continua humana. O utilizador não deve funcionar como mensageiro
  rotineiro entre agentes.
- Modelo, reasoning effort e parceiro de implementação são configuração explícita. Não mudam por
  inferência nem por uma amostra curta de desempenho.

## Estados e capacidade

- `Todo`: pronto, sem execução activa.
- `In Progress`: implementação técnica activa; branch ou corretivo ainda exigem trabalho do
  implementador.
- `In Review`: implementação técnica terminou e o implementador entregou `HEAD` e evidência; falta
  review, merge, deploy, smoke ou aceitação, mas não execução técnica activa. Finding técnico move
  a folha novamente para `In Progress`.
- `Done`: todos os critérios do ticket estão provados. Merge, isoladamente, nunca basta.
- Máximo duas folhas `In Progress`, salvo limite local mais restritivo. Pais de tracking não contam.
- Uma folha independente pode começar quando a anterior passa explicitamente para `In Review` por
  depender apenas de deploy, QA ou decisão humana. Isto não antecipa `Done`.
- Esta regra substitui a regra antiga “não iniciar novo ticket antes do fecho operacional do
  actual”. O hard stop antigo só continua se um repo o reafirmar explicitamente depois desta
  migração.
- Paralelizar apenas trabalho independente, com ownership de ficheiros, contratos e ambientes
  resolvido. Rever acumulação em `In Review` antes de admitir mais execução.
- Gates finais nomeados pelo projecto são gates, nunca inbox ou substitutos da fila.

## Ciclo por ticket

1. O coordenador escolhe uma folha executável na fonte operacional e confirma dependências.
2. Lê uma vez o contexto obrigatório, ticket, contrato e evidência relevante; depois lê deltas
   apenas quando essas fontes mudarem.
3. Confirma repo, `HEAD`, branch, diff, alterações locais protegidas, duplicados e consumidores
   FE/BE. Não repete uma auditoria global por ticket.
4. Abre execução no estado correcto e entrega um pacote curto: identidade e endereço do
   coordenador, canal/fallback de retorno, objectivo, baseline, scope,
   ownership, invariantes, critérios, teste discriminante, gates por impacto, riscos, condições de
   paragem e links canónicos.
5. O implementador confirma recepção e ownership, trabalha em branch própria e envia uma mensagem
   directa ao coordenador ao concluir ou bloquear. Para acompanhamento, preferir eventos/cursor a
   polling fixo; estado inalterado não exige mensagens.
6. O implementador devolve ticket, SHAs FE/BE, delta, RED/GREEN, gates, review/head exacto,
   limitações e próximo responsável. A prova extensa fica num ficheiro ou PR canónico.
7. O coordenador verifica independentemente diff, contratos, consumidores, evidência, browser
   aplicável, documentação, PR e `HEAD` realmente revisto.
8. Um finding volta ao mesmo implementador como delta: problema, comportamento esperado e prova
   necessária. Não reenviar o pacote inteiro.
9. Após critérios técnicos e reviews obrigatórios, o coordenador faz merge, sincroniza `main` e
   remove branches integradas.
10. Actualiza estado sem confundir implementação, evidência técnica, merge, deploy e aceitação.

## Gates proporcionais ao impacto

Os comandos exactos vivem no `AGENTS.md` e nos scripts de cada repo. Esta matriz escolhe a
profundidade; nunca omite um gate obrigatório local.

| Impacto | Prova mínima |
|---|---|
| Documentação | Diff, gate local por commit, links, metadados e rastreabilidade. Um review de SHA anterior não cobre o novo commit. |
| Lógica local | RED/GREEN discriminante, tipos/lint, testes afectados e regressão proporcional ao risco. |
| Contrato, persistência, finanças ou auth | Testes reais de domínio/API/persistência isolada, invariantes, falhas, concorrência, isolamento e consumidores. Browser funcional nos percursos afectados. |
| UI, tema ou rotas | Interacção real, SSR quando aplicável, DOM/estilos/geometria, consola/rede e screenshots nos viewports exigidos. Exige observações visuais escritas do implementador e inspecção independente do reviewer; screenshots verdes isolados não bastam. |
| Cross-repo | Baseline FE/BE, contrato, compatibilidade, ordem de rollout e cadeia completa. |

- Executar o aggregate amplo no `HEAD` técnico final quando as regras locais ou o risco o exigem.
  Depois, repetir os gates afectados por código, contrato, dependência, ambiente, merge ou rebase.
  Docs-only não repete matemática/build/browser sem impacto demonstrado, mas continua a executar
  qualquer gate que o repo imponha antes de cada commit.
- Mapear comandos compostos antes de automatizar para não executar o mesmo gate várias vezes no
  mesmo contexto. Verde antigo só é reutilizável quando inputs e ambiente são equivalentes.
- Falha flaky exige diagnóstico. Repetir até passar ou aumentar timeout sem causa não é prova.
- Provar que o teste detecta o defeito com RED, regressão ou mutação dirigida conforme risco;
  quantidade de testes não mede qualidade.

## Integridade financeira

- A mesma métrica, período, moeda e scope tem de reconciliar entre persistência, API e consumidores.
- `0`, ausência de dado e erro são estados diferentes.
- Origem factual, estimativa, cenário e freshness devem ser explícitos.
- Expected values são independentes das funções testadas, com fixture auditável, unidades,
  arredondamento e tolerâncias definidos.
- Exercitar persistência → HTTP → consumidor, incluindo refresh/nova sessão quando relevante.
- Cobrir falha entre escritas e retry/idempotência, concorrência entre tabs, resposta fora de
  ordem, isolamento entre utilizadores e cache com interleaving determinístico quando aplicável.
- Usar muitas combinações no domínio/API e jornadas representativas no browser. Não repetir toda a
  matemática em cada viewport; não reduzir testes visuais obrigatórios.
- Divergência financeira conhecida mantém o gate bloqueado até correcção e revalidação, ou até
  contraprova demonstrada. Triagem, ownership ou ticket futuro não desbloqueiam beta nem tornam os
  números aceitáveis.

## Reviews

- Congelar código e documentação previstos antes da última review externa.
- Review estrutural `thermo-nuclear` aplica-se nas condições definidas no contexto partilhado;
  arquitectura é meio, não motivo para bloquear beta por classificação isolada.
- Qodo revê o SHA exacto enquanto fizer parte do fluxo. Um commit documental posterior recebe
  validação documental e review explícita do delta, preservando o SHA técnico revisto; só exige
  nova review paga quando muda comportamento/contrato ou quando a política do repo exige head final
  revisto. Nunca afirmar que a review anterior cobriu o commit novo. Se Qodo for formalmente
  retirado, aplicar o fallback independente já definido nas regras partilhadas; nunca omitir em
  silêncio.
- O coordenador conserva review final de corretude e pode rejeitar auto-relato, Qodo ou análise.
- Refactors opcionais recebem dono, critérios e ticket próprios. Não entram oportunisticamente nem
  ficam `Done` por terem sido sugeridos.

## Performance

- Medir num ambiente controlado: HTTP/queries por acção, mediana/p95, cache fria/quente, fan-out de
  invalidação e carregamento das rotas pertinentes.
- Optimizar apenas gargalos medidos, comparando antes/depois na mesma fixture e preservando
  correcção. Cache correcta vem antes de cache rápida; dado stale nunca é rotulado como fresco.
- Metas são acordadas. Não prometer ganhos não medidos.

## Evidência, custo e fecho operacional

- Transporte curto; prova completa em ficheiro/PR canónico. Não copiar o mesmo relatório para chat,
  Linear e vários documentos.
- Guardar logs grandes e consultar apenas trechos relevantes. Nunca alegar evidência não inspeccionada.
- Actions indisponíveis por billing não são declaradas verdes nem substituídas por atalhos; usar a
  política local de gates e registar o limite.
- Smoke live de tickets integrados pode partilhar a mesma execução, mas cada percurso e critério
  conserva prova e decisão próprias. Produção é read-only salvo autorização; mutações QA usam
  ambiente isolado.
- Bloqueio humano é encaminhado ao dono correcto com pergunta concreta.
- Medir custo total até aceitação apenas por telemetria passiva ou amostras planeadas, sem polling
  nem mensagens de estado inalterado: tokens, loops correctivos, findings independentes, tempo até
  RED, runtime dos gates, espera entre handoffs e regressões escapadas.
  Ausência de medição é `desconhecido`, não zero.
- Comparar implementadores apenas após amostra de tickets comparáveis; uma amostra curta não prova
  superioridade geral.

## Sinais de processo quebrado

Parar e reconciliar antes de avançar quando acontecer qualquer um destes casos:

- o utilizador serve de ponte rotineira entre implementador e coordenador;
- uma terceira folha entra em `In Progress`;
- trabalho técnico continua numa folha marcada `In Review`;
- review externa e `HEAD` final têm SHAs diferentes sem review explícita do delta;
- screenshots automáticos são apresentados como aceitação visual sem observações e inspecção;
- divergência financeira conhecida é classificada como limitação não bloqueante;
- retry sem diagnóstico transforma um gate vermelho em verde;
- refactor sugerido por auditoria entra num ticket sem critérios e ownership próprios;
- merge, deploy ou `Done` são tratados como o mesmo estado.

## O que permanece local ao projecto

Tickets, dependências, nomes de gates finais, incidentes, contratos, viewports vinculativos,
comandos e alterações locais protegidas permanecem em Linear e nos repos privados. Não copiar esse
estado volátil para este repositório público.
