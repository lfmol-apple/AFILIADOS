# Integração Amazon

## Status atual: mock

`AMAZON_PROVIDER=mock` (padrão) usa `MockAmazonProvider`, que serve um catálogo fixo e claramente
fictício (`lib/providers/mock-catalog.ts`) — sem nenhuma chamada de rede. Isso permite desenvolver
e demonstrar o produto inteiro (banco, score, SEO, páginas, jobs) antes de qualquer credencial
real da Amazon existir.

## O que falta para `AMAZON_PROVIDER=live`

`AmazonProvider` (`lib/providers/amazon-provider.ts`) existe como classe que implementa a mesma
interface `CommerceProvider`, mas **cada método lança `NotImplementedYetError`**. Antes de
implementar de verdade:

1. Confirmar acesso oficial à **Creators API** da Amazon (não a antiga PA-API sem confirmar
   compatibilidade — seção 54 do briefing).
2. Ler a documentação oficial vigente da Creators API e implementar autenticação exatamente como
   especificado.
3. Definir os endpoints reais para `searchProducts`, `getProduct`, `getProducts`, `getOffers`.
4. Respeitar limites de requisição documentados (não há orçamento de rate limit hardcoded no
   código hoje porque ainda não sabemos qual é o limite real).
5. Confirmar a política de cache permitida para o conteúdo retornado (`AMAZON_CONTENT_TTL` existe
   como variável de ambiente, mas o valor precisa vir da documentação oficial, não de um chute —
   ver [docs/AMAZON_COMPLIANCE.md](AMAZON_COMPLIANCE.md)).
6. Rodar `npm run amazon:compliance` e obter PASS antes de qualquer deploy com
   `AMAZON_PROVIDER=live`.

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
