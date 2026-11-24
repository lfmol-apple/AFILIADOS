# Incidente: gasto pago real durante teste em ambiente isolado

**Data:** 2026-11-20
**Status:** corrigido estruturalmente, gasto reconciliado, não reincidente (comprovado por teste automatizado)

## O que aconteceu

Durante a Etapa 3 ("Automação Real") do plano de correção da Vitrine
Inteligente, rodei o ciclo completo (`jobs/vitrine-discovery.ts` →
`ml-trend-rollup.ts` → `vitrine-renew.ts` → `vitrine-creative-factory.ts`
→ `commercial-lab-run.ts` → `commercial-lab-checkpoints.ts` →
`vitrine-meta-spend-sync.ts`) em um ambiente deliberadamente isolado:
container Postgres próprio (`precocaindo-db-isolated-test`), rede Docker
separada (`precocaindo-isolated-test`), nenhuma gravação na base de
produção.

O que eu não verifiquei antes de disparar: `jobs/vitrine-creative-factory.ts`
chama a API real da OpenAI usando a **mesma `OPENAI_API_KEY` de
produção** — não há (nem pode haver, sem uma segunda conta/projeto) uma
chave "de teste" separada. O controle de orçamento existente
(`checkCreativeBudget()`) soma o gasto do dia a partir do banco de dados
— e o banco isolado, recém-migrado, estava com a tabela
`VitrineCreativeSpend` vazia. O resultado: o job viu "US$ 0 gastos hoje",
considerou o orçamento de US$ 2/dia livre, e gerou — de verdade, contra a
API real — 28 criativos (imagem + checagem visual) antes que eu
percebesse (CPU ~0%, sem novas linhas de log por vários minutos) e
matasse o processo.

## Valor real gasto

**US$ 1,4539**, em 57 lançamentos (29 gerações de imagem reais + 28
checagens visuais reais), registrados em
`docs/incidents/2026-11-20-isolated-spend-evidence.json` (exportado do
banco isolado antes de qualquer limpeza — timestamps, IDs de execução e
notas de cada lançamento preservados integralmente).

**Este valor NÃO está e nunca deve ser misturado** com:
- O ledger real de produção (`VitrineCreativeSpend` na base de produção,
  que segue intacto, em ~US$ 3,22 no dia — nenhuma linha do incidente foi
  escrita lá).
- Qualquer métrica comercial (ROAS, cliques, conversão) — os 28 produtos
  afetados nem são, em sua maioria, os mesmos 30 ativos de produção (a
  seleção isolada partiu de um banco vazio e escolheu um conjunto
  diferente).

## Causa raiz

Não foi "orçamento mal configurado" — foi uma suposição errada minha: que
isolar o **banco de dados** isolaria o **gasto**. A chave de API é
externa ao banco; nenhum controle que só olha uma tabela do nosso próprio
banco pode proteger contra isso quando o ambiente "isolado" ainda assina
as chamadas reais com a chave real.

## Correção estrutural aplicada

Um novo portão central, dentro de `generateCreativeBase()`
(`lib/services/ai-creative-factory/openai-image-client.ts`) — o único
lugar do projeto inteiro que faz a chamada paga real — não mais apenas
em quem chama essa função:

- **`VITRINE_CREATIVE_MODE`** (`teste` | `piloto_autorizado` | `producao`),
  **padrão `teste`** quando a variável não está definida. Em `teste`,
  toda chamada paga é bloqueada incondicionalmente, antes de qualquer
  requisição de rede ser montada.
- **`piloto_autorizado`**: permite chamadas reais, mas com um teto rígido
  por processo (`VITRINE_CREATIVE_PILOT_MAX_CALLS`, padrão 0 — ausente =
  bloqueado, nunca aberto por omissão).
- **`producao`**: comportamento real e contínuo — `generateCreativeBase`
  agora também reconsulta `checkCreativeBudget()` internamente, mesmo
  que quem chama já tenha checado antes (defesa em profundidade).

Isso significa: **a partir de agora, qualquer ambiente — isolado ou não —
bloqueia geração paga por padrão**, a menos que `VITRINE_CREATIVE_MODE`
seja explicitamente definido como `producao` (o `.env` real de produção
precisa ganhar essa variável antes do próximo deploy, ou a fábrica de
criativos para de gerar — isso ainda não foi feito; aguardando
autorização para deploy).

## Comprovação (sem gastar nada)

`tests/creative-generation-mode-gate.test.ts` — 5 testes, `fetch`
mockado e explicitamente verificado como nunca chamado nos cenários de
bloqueio:
1. Variável ausente → bloqueado.
2. `teste` explícito → bloqueado.
3. `piloto_autorizado` sem teto definido → bloqueado (nunca abre por
   omissão).
4. `piloto_autorizado` com teto definido → permite exatamente N chamadas,
   bloqueia a (N+1)-ésima mesmo que o chamador insista.
5. `producao` → a checagem de orçamento real é consultada pela própria
   função, não só por quem chama.

Todos os 5 passam. Suíte completa do projeto rodada: nenhuma regressão
introduzida (as únicas falhas presentes já existiam antes desta correção,
em `ml-token-store`/`ml-oauth`/`automation-operational-v1`/`amazon-match`
— confirmadas como pré-existentes, não relacionadas).

## Pendências / recomendações ainda não implementadas

1. **Separação de credenciais/projeto na OpenAI** (item 6 da diretiva do
   proprietário): a plataforma da OpenAI permite criar "Projects"
   separados, cada um com sua própria API key e limite de gasto
   configurável diretamente no painel da OpenAI (reforço real, imposto
   pela própria OpenAI, independente do nosso código). Isso exige uma
   ação humana no painel da conta OpenAI (criar um projeto "teste",
   gerar uma chave só para ele, definir um teto de gasto baixo lá) — não
   é algo que eu possa fazer sozinho. Recomendo fortemente, mas **não
   deve ser tratado como garantia absoluta** — o portão de código acima
   continua sendo a proteção primária.
2. O `.env` real de produção ainda não tem `VITRINE_CREATIVE_MODE`
   definida — isso precisa ser adicionado (`producao`) antes do próximo
   deploy que toque a fábrica de criativos, ou ela para de funcionar
   (fail-closed, nunca fail-open).

## O que foi preservado, sem alteração

- Nenhum prompt da fábrica de criativos foi alterado.
- Nenhuma lógica de composição visual (`compositor.tsx`) foi alterada.
- O mecanismo que já reproduziu o padrão visual do Henrique continua
  exatamente como estava.
