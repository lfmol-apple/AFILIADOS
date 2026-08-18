# Integração Amazon

## Contexto de negócio

A operação é a **PETMOL**, que já possui uma conta aprovada no Programa de Associados Amazon
Brasil, com **Store ID `petmol-20`**. O PreçoCaindo é uma propriedade digital diferente da mesma
operação (não um site pet) e deve operar com um **Tracking ID próprio**, para manter o analytics
separado do `petmol-20`. Esse Tracking ID específico do PreçoCaindo ainda não foi criado/fornecido
— até que exista, `AMAZON_ASSOCIATE_TAG` fica vazio. **Nunca usar `petmol-20` como tag do
PreçoCaindo.**

## Status atual: mock

`AMAZON_PROVIDER=mock` (padrão) usa `MockAmazonProvider`, que serve um catálogo fixo e claramente
fictício (`lib/providers/mock-catalog.ts`) — sem nenhuma chamada de rede. Isso permite desenvolver
e demonstrar o produto inteiro (banco, score, SEO, páginas, jobs) antes de qualquer credencial
real da Amazon existir.

## Elegibilidade para a Creators API (segundo a Amazon)

De acordo com a página oficial de FAQ da Creators API:

- É necessário ter uma **conta de associado aprovada**, e estar logado com uma conta com acesso
  total para criar aplicativos e gerar credenciais.
- Para acessar a **PA API através da Creators API**, é necessário ter **pelo menos 10 vendas
  qualificadas nos últimos 30 dias**. Sem isso, chamadas retornam o erro `AssociateNotEligible`.
- Após gerar uma credencial, pode levar **até 48 horas** para a elegibilidade ser reavaliada e o
  acesso ser concedido. Se `AssociateNotEligible` persistir além de 48h, a conta não atende aos
  critérios acima.
- É possível criar até duas aplicações, cada uma com dois conjuntos de credenciais (para
  rotação, mas utilizáveis de forma independente).

Isso significa que ativar `AMAZON_PROVIDER=live` depende de duas coisas fora do nosso controle de
engenharia: (a) o Tracking ID próprio do PreçoCaindo ser criado, e (b) a conta ter volume de
vendas qualificadas suficiente para desbloquear a Creators API. Nenhuma das duas pode ser resolvida
com código.

## O que falta para `AMAZON_PROVIDER=live`

`AmazonProvider` (`lib/providers/amazon-provider.ts`) existe como classe que implementa a mesma
interface `CommerceProvider`, mas **cada método lança `NotImplementedYetError`**. Antes de
implementar de verdade:

1. Confirmar acesso oficial à **Creators API** da Amazon (não a antiga PA-API sem confirmar
   compatibilidade — seção 54 do briefing), incluindo os critérios de elegibilidade acima.
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
risco (seção 55 do briefing). Se a Creators API estiver indisponível, o comportamento correto é
falhar, não improvisar.

## Tag de afiliado

Nunca hardcoded. `AMAZON_ASSOCIATE_TAG` vem de variável de ambiente; `buildAmazonProductUrl()`
(`lib/amazon/policy-guard.ts`) recusa-se a construir um link se a tag não estiver configurada.

## Whitelist de hosts de redirect

`amzn.to` (encurtador da própria Amazon) foi deliberadamente removido da allowlist de destinos —
o PreçoCaindo sempre constrói/armazena URLs canônicas (`amazon.com.br/dp/<ASIN>`), então não há
necessidade operacional de aceitar um link curto cujo destino final não podemos validar antes do
redirect. Ver `lib/amazon/policy-guard.ts` e `tests/amazon-policy-guard.test.ts`.
