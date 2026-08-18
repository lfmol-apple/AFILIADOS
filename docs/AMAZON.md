# Integração Amazon

## Contexto de negócio (atualizado)

A operação é a **PETMOL NEGOCIOS DIGITAIS LTDA**. PreçoCaindo é uma propriedade digital
diferente da mesma operação (não um site pet) e opera com marketplaces Amazon configurados
independentemente — hoje só Brasil está habilitado; EUA existe apenas como configuração
preparada. Ver `lib/config/marketplaces.ts` para a implementação.

### Amazon Brasil

- **Store ID da conta PETMOL:** `petmol-20` (a tag da própria PETMOL, não do PreçoCaindo).
- **Tracking ID do PreçoCaindo: `precocaindo-20` — já criado e configurado.** Não é mais
  pendente; qualquer documentação antiga afirmando o contrário estava desatualizada. É a tag
  usada em `AMAZON_BR_ASSOCIATE_TAG`.
- **Elegibilidade para a Creators API: PENDENTE.** A página oficial da Creators API para a conta
  BR atualmente mostra a conta como **não aprovada** para a Creators API (checkbox desmarcado).
  Isso é independente de o Tracking ID existir — são dois fatos diferentes.
- **Requisito de vendas qualificadas: PENDENTE.** Ver seção de elegibilidade abaixo. Dados atuais
  do painel de afiliados BR (29 cliques, 13 produtos pedidos, 3 produtos enviados, R$ 15,86 em
  comissões) **não** comprovam o requisito de "10 vendas qualificadas nos últimos 30 dias" — esses
  números são atividade do painel, não a confirmação de elegibilidade que só a própria Amazon dá.
  Nunca inferir um do outro.
- **`AMAZON_PROVIDER` continua `mock`.**

### Amazon Estados Unidos

- Nova conta de Amazon Associates criada em affiliate-program.amazon.com.
- **Associate ID: `petmol07-20`**, vinculado à propriedade `petmol.com.br` — **não** ao
  PreçoCaindo.
- `precocaindo.com.br` **não** foi cadastrado nessa conta ainda.
- Conta em fase inicial/revisão; configuração de recebimento bancário (parece exigir dados
  ABA/internacional) **ainda não resolvida**.
- Consequência: `AMAZON_US_ASSOCIATE_TAG` fica vazio, `AMAZON_US_ENABLED=false`. **Nunca usar
  `petmol07-20` como tag de um link do PreçoCaindo** — pertence a outra propriedade, sob uma
  conta cuja situação ainda não está validada para o PreçoCaindo.
- EUA é, por enquanto, **marketplace futuro / configuração preparada** — não operacional.

## Configuração multi-marketplace

`lib/config/marketplaces.ts` é a única fonte de verdade sobre "qual marketplace, configurado
como" — nenhum outro código lê as variáveis `AMAZON_BR_*`/`AMAZON_US_*` diretamente.

```ts
interface AmazonMarketplaceConfig {
  marketplace: "BR" | "US";
  country: string;
  host: string;          // amazon.com.br | amazon.com
  currency: string;       // BRL | USD
  associateTag: string;   // vazio = "não construir links para este marketplace ainda"
  enabled: boolean;
  apiEnabled: boolean;
}
```

`AMAZON_ASSOCIATE_TAG` (variável antiga, pré-multi-marketplace) continua funcionando como
fallback silencioso para `AMAZON_BR_ASSOCIATE_TAG` quando esta não está definida — mantido só por
compatibilidade; configuração nova deve usar `AMAZON_BR_ASSOCIATE_TAG` diretamente.

`AmazonPolicyGuard` (`lib/amazon/policy-guard.ts`) é totalmente marketplace-aware:
`buildAmazonProductUrl(asin, marketplace)` e `assertAllowedAmazonDestination(url, marketplace)`
recusam qualquer operação para um marketplace desabilitado **antes mesmo de checar o host** — um
link para `amazon.com` só é aceito quando `AMAZON_US_ENABLED=true`, independentemente de o host em
si ser um domínio Amazon legítimo.

## Rotas de redirect

`/go/amazon/[asin]` continua funcionando exatamente como antes — nenhum link existente quebra.
Foi preparada `/go/amazon/[marketplace]/[asin]` (ex.: `/go/amazon/US/B0EXEMPLO1`) para marketplaces
futuros; hoje ela sempre retorna 404 para `US` porque `AmazonPolicyGuard` recusa qualquer destino
para um marketplace desabilitado — não porque a rota está incompleta. As duas URLs são servidas
por uma única rota catch-all (`app/go/amazon/[...segments]/route.ts`, ver o comentário no arquivo
sobre por que não são duas rotas dinâmicas irmãs) chamando a mesma implementação
(`lib/services/go-amazon-handler.ts`), então o fluxo de clique-depois-redirect nunca diverge entre
as duas formas de URL.

## Status atual: mock

`AMAZON_PROVIDER=mock` (padrão) usa `MockAmazonProvider`, que serve um catálogo fixo e claramente
fictício (`lib/providers/mock-catalog.ts`) — sem nenhuma chamada de rede. Isso permite desenvolver
e demonstrar o produto inteiro (banco, score, SEO, páginas, jobs) antes de qualquer credencial
real da Amazon existir, para qualquer marketplace.

## Elegibilidade para a Creators API (segundo a Amazon)

De acordo com a página oficial de FAQ da Creators API:

- É necessário ter uma **conta de associado aprovada**, e estar logado com uma conta com acesso
  total para criar aplicativos e gerar credenciais. **A conta BR ainda mostra esse item como não
  cumprido.**
- Para acessar a **PA API através da Creators API**, é necessário ter **pelo menos 10 vendas
  qualificadas nos últimos 30 dias**. Sem isso, chamadas retornam o erro `AssociateNotEligible`.
- Após gerar uma credencial, pode levar **até 48 horas** para a elegibilidade ser reavaliada e o
  acesso ser concedido. Se `AssociateNotEligible` persistir além de 48h, a conta não atende aos
  critérios acima.
- É possível criar até duas aplicações, cada uma com dois conjuntos de credenciais (para
  rotação, mas utilizáveis de forma independente).

Isso significa que ativar `AMAZON_PROVIDER=live` para o BR depende de duas coisas fora do nosso
controle de engenharia, que só a Amazon confirma: (a) aprovação da conta para a Creators API, e
(b) volume de vendas qualificadas suficiente. O Tracking ID **não é mais** um bloqueador — já
existe (`precocaindo-20`) — mas isso sozinho não desbloqueia a API.

## O que falta para `AMAZON_PROVIDER=live`

`AmazonProvider` (`lib/providers/amazon-provider.ts`) existe como classe que implementa a mesma
interface `CommerceProvider`, mas **cada método lança `NotImplementedYetError`**. Antes de
implementar de verdade (para qualquer marketplace):

1. Confirmar acesso oficial à **Creators API** da Amazon (não a antiga PA-API sem confirmar
   compatibilidade), incluindo os critérios de elegibilidade acima — para BR isso significa
   aprovação da conta + vendas qualificadas; para US, adicionalmente, cadastro de
   `precocaindo.com.br` na conta e resolução do pagamento.
2. Ler a documentação oficial vigente da Creators API e implementar autenticação exatamente como
   especificado. **Não presumir que a autenticação é idêntica à PA-API legada** — os nomes de
   variável em `.env.example` (`AMAZON_CREATORS_API_KEY`/`AMAZON_CREATORS_API_SECRET`) são
   placeholders neutros, marcados `CREDENTIALS_PENDING_OFFICIAL_CONFIGURATION`, não uma garantia
   de que essa é a forma real de autenticação.
3. Definir os endpoints reais para `searchProducts`, `getProduct`, `getProducts`, `getOffers`.
4. Respeitar limites de requisição documentados (não há orçamento de rate limit hardcoded no
   código hoje porque ainda não sabemos qual é o limite real) — ver `RefreshPlanner`
   (`lib/services/refresh-planner.ts`) e `RetryPolicy` (`lib/http/retry-policy.ts`), já prontos
   para receber esse orçamento quando confirmado.
5. Confirmar a política de cache permitida para o conteúdo retornado (`AMAZON_CONTENT_TTL` existe
   como variável de ambiente, mas o valor precisa vir da documentação oficial, não de um chute —
   ver [docs/AMAZON_COMPLIANCE.md](AMAZON_COMPLIANCE.md)).
6. Rodar `npm run amazon:compliance` e `npm run production:readiness`, obtendo PASS/READY antes de
   qualquer deploy com `AMAZON_PROVIDER=live`.

Até que isso aconteça, `AmazonProvider` deve continuar falhando alto e claro — nunca cair
silenciosamente para dados mock em produção, e nunca para scraping.

## Por que não há scraping

Não existe, em nenhum lugar do código, Puppeteer/Playwright/Cheerio apontado para páginas da
Amazon, rotação de user-agent, proxy, ou bypass de CAPTCHA. Isso é uma decisão de arquitetura, não
uma lacuna: scraping violaria os Termos de Uso da Amazon e colocaria a conta de Associado em
risco. Se a Creators API estiver indisponível, o comportamento correto é falhar, não improvisar.

## Tag de afiliado

Nunca hardcoded no sentido de "chutada" — mas o Tracking ID BR confirmado (`precocaindo-20`) É o
valor padrão documentado em `.env.example`, porque é um identificador público (aparece em toda URL
de saída), não um segredo, e já foi confirmado pelo dono do negócio. `buildAmazonProductUrl()`
(`lib/amazon/policy-guard.ts`) recusa-se a construir um link se a tag do marketplace pedido não
estiver configurada ou se esse marketplace não estiver habilitado.

## Pré-lançamento: catálogo público desligado por padrão

Com `AMAZON_PROVIDER=mock`, os preços exibidos são fictícios por definição — publicar isso para a
internet indexável seria mostrar preço falso para um visitante real. `PUBLIC_CATALOG_ENABLED`
(padrão `false`, ver `lib/config/public-catalog.ts`) é o interruptor explícito que uma pessoa liga
quando o lançamento for de fato decidido; mesmo ligado, `isPublicCatalogSafeToShow()` ainda força
`false` sempre que `NODE_ENV=production` e `AMAZON_PROVIDER=mock` ao mesmo tempo — essa combinação
nunca é permitida, independentemente do flag. Enquanto desligado, `/`, `/ofertas`, `/categorias`,
`/produto`, `/melhores` e `/comparar` continuam de pé (a home some apenas as seções de catálogo,
substituídas por um aviso de pré-lançamento), mas `/produto/[slug]`, `/categorias/[slug]`,
`/melhores/[slug]` e `/comparar/[slug]` retornam 404, e `sitemap.xml`/`robots.txt` nunca listam uma
URL de catálogo. Dev local usa mock livremente (`PUBLIC_CATALOG_ENABLED=true` no `.env` local, onde
`NODE_ENV` nunca é `production`).

Os checks de elegibilidade Amazon (`lib/amazon/readiness-checks.ts`) foram renomeados nesta sprint
para casar com `npm run production:readiness`: `AMAZON_BR_TRACKING_ID`, `AMAZON_BR_ACCOUNT_APPROVED`,
`AMAZON_BR_QUALIFIED_SALES`, `AMAZON_BR_API_CREDENTIALS`, `AMAZON_BR_LIVE_PROVIDER` (BR) e os
`AMAZON_US_*` equivalentes. Só `AMAZON_BR_TRACKING_ID` bloqueia o veredito `BR_LAUNCH_READY` — os
demais (aprovação de conta, vendas qualificadas, credenciais, provider ao vivo) só bloqueiam o
veredito `PRODUCTION` (venda de verdade via API), e nenhuma linha `AMAZON_US_*` bloqueia nenhum dos
dois — ver docs/PRODUCTION_READINESS.md.

## Whitelist de hosts de redirect

`amzn.to` (encurtador da própria Amazon) foi deliberadamente removido da allowlist de destinos —
o PreçoCaindo sempre constrói/armazena URLs canônicas (`<host>/dp/<ASIN>`), então não há
necessidade operacional de aceitar um link curto cujo destino final não podemos validar antes do
redirect. A allowlist é escopada por marketplace: `amazon.com.br` só é válido para BR,
`amazon.com` só para US (e só quando US está habilitado). Ver `lib/amazon/policy-guard.ts` e
`tests/amazon-policy-guard.test.ts`.
