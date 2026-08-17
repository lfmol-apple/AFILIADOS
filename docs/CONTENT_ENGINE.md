# Motor de conteúdo

## Regra zero: nunca alucinar

`ContentProvider.generate()` só pode usar informações presentes no `facts` que recebe. Se um
campo está ausente, a frase correspondente é omitida — nunca estimada, inferida ou inventada.
Isso vale para especificações, garantia, avaliação, número de avaliações, desconto, preço
anterior, ou qualquer opinião de comprador. Essa regra está descrita em cada arquivo de
`prompts/*.md` (para quando um provider real de LLM for implementado) e é demonstrada de forma
mecânica em `lib/content/mock-content-provider.ts`: cada frase do template está atrás de um `if`
sobre o fato correspondente (`tests/mock-content-provider.test.ts` cobre isso: gerar conteúdo sem
`rating`/`reviewCount` nunca menciona uma nota).

## Abstração de providers

```ts
interface ContentProvider {
  readonly name: string;
  generate(request: ContentGenerationRequest): Promise<ContentGenerationResult>;
}
```

- `MockContentProvider` — template determinístico, sem chamada externa. É o padrão
  (`CONTENT_GENERATION=mock`) e o que torna possível desenvolver/testar o pipeline inteiro sem
  depender de uma API paga.
- `OpenAIContentProvider` / `AnthropicContentProvider` — esqueletos que **recusam-se a rodar** sem
  uma API key real (`OPENAI_API_KEY` / `ANTHROPIC_API_KEY`). Uma assinatura pessoal de
  ChatGPT/Claude não é uma API e não deve ser tratada como uma (seção 14 do briefing). A geração
  em si (`generate()`) ainda não está implementada — só a validação de configuração.
- `CONTENT_GENERATION=off` faz de `GENERATE_CONTENT` um no-op documentado, não uma falha.

Trocar de provider é mudar `CONTENT_GENERATION` — nenhum outro código muda.

## Prompts versionados

Cada tipo de conteúdo tem um prompt em `prompts/`, versionado no nome do arquivo
(`product-review-v1.md`, `best-products-v1.md`, `comparison-v1.md`, `deal-summary-v1.md`). O
`promptVersion` usado é gravado junto com o `GeneratedContent`, para que seja possível saber
depois qual versão de instrução gerou qual página — e comparar qualidade entre versões quando a
engenharia de prompt evoluir.

`product-review-v1.md` também serve de especificação de referência para
`MockContentProvider.generate()`: as seções que ele produz (`O preço está bom?`,
`Para quem faz sentido`, `Pontos fortes`, `Pontos de atenção`, `Metodologia`) espelham as seções
exigidas pelo prompt, para que trocar de mock para um provider real de LLM não mude a estrutura
da página.

## Nota de arquitetura: por que a página de produto não usa `GeneratedContent`

A página `/produto/[slug]` (`app/produto/[slug]/page.tsx`) computa suas seções ("O preço está
bom?", histórico, especificações) diretamente a partir de `PriceStats`/`OpportunityScore` a cada
request (com ISR), em vez de depender de um `GeneratedContent` pré-gerado. Isso é intencional: são
seções puramente determinísticas a partir de um único produto, então calculá-las ao vivo garante
que nunca fiquem desatualizadas em relação ao preço atual, sem depender do pipeline assíncrono de
geração ter rodado. O pipeline de `GeneratedContent` (com `ContentQualityGate` e publicação
opt-in) é reservado para conteúdo que exige síntese — `BEST_OF`, `COMPARISON`, `CATEGORY` — que não
dá para computar de forma trivial a partir de um único registro no request.

## Controle de qualidade

Ver [docs/SEO.md](SEO.md#controle-de-qualidade-antes-de-publicar-seo-programático) para como o
`ContentQualityGate` decide `PASS`/`REVIEW`/`FAIL`.
