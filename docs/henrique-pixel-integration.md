# Pixel Meta × Catálogo da Vitrine Inteligente — guia operacional para o Henrique

Documento de entrega, 2026-11-25. Escrito para quem vai configurar a campanha no
Gerenciador de Negócios/Eventos da Meta — não é um documento de engenharia.

**Status: publicado em produção em 2026-11-26.** Tudo descrito abaixo já está
no ar em `precocaindo.com.br` — não é um plano, é o que está funcionando agora.

## 1. URLs oficiais

| O que | URL |
|---|---|
| Catálogo (feed XML) | `https://precocaindo.com.br/catalogo/mercado-livre.xml` |
| Link de cada produto no catálogo | `https://precocaindo.com.br/go/vitrine/mercado-livre/{código do Mercado Livre}` (gerado automaticamente pelo feed, você não precisa montar isso manualmente) |

## 2. Identificação do Pixel

- **Pixel ID**: `1718278203328773`
- Nenhuma credencial, token de acesso ou chave de API aparece neste documento ou no código — o Pixel ID em si não é secreto (ele literalmente aparece no HTML público de toda página do site).
- Se você usa um **Conjunto de Dados** (Dataset) unificado em vez de um Pixel isolado, confirme no Gerenciador de Eventos que esse mesmo ID `1718278203328773` está registrado nele — o código do site sempre usa esse ID fixo.

## 3. Eventos implementados

| Evento | Onde dispara | Tipo |
|---|---|---|
| `PageView` | Toda página do site, incluindo a página de redirecionamento do catálogo | Padrão Meta |
| `ViewContent` | Página de produto (quando o visitante chega pela Vitrine) **e** na página de redirecionamento do catálogo (quando o clique vem do anúncio) | Padrão Meta |
| `AffiliateOutboundClick` | Clique no botão "Ver no Mercado Livre" na página de produto **e** na página de redirecionamento do catálogo | **Evento customizado** (não é um evento padrão da Meta) |

**Decisão explícita, 2026-11-25**: o PreçoCaindo não tem carrinho de compras, então o evento padrão `AddToCart` **nunca** é disparado — usar `AddToCart` para algo que não é literalmente "adicionar ao carrinho" distorceria os relatórios da Meta e a otimização de campanha. `AffiliateOutboundClick` é o evento oficial para "o visitante está saindo para o Mercado Livre" em todo o site.

## 4. Parâmetros enviados em cada evento

Todos os eventos (`ViewContent` e `AffiliateOutboundClick`) enviam exatamente:

```js
{
  content_ids: ["<id interno do produto>"],  // ver seção 5 — é o MESMO valor do g:id do catálogo
  content_name: "<título real do produto>",
  value: <preço atual em reais>,
  currency: "BRL",
  content_type: "product"
}
```

- `value`/`currency` só aparecem com dados **reais** — nunca um valor inventado. Se o preço do produto não estiver disponível no momento, o evento simplesmente não é disparado (nenhum dos dois).
- Nenhum dado pessoal do visitante (nome, e-mail, telefone, IP) é enviado em nenhum desses eventos.

## 5. Correspondência entre `content_ids` e `g:id` do catálogo

Essa é a correspondência que faz a Meta ligar um clique ao produto certo do catálogo.

- Cada item do feed XML tem um `<g:id>` (ex.: `cmwjnyrpl0008pf01cyhwi12o`).
- Todo evento (`ViewContent`/`AffiliateOutboundClick`) usa **esse mesmo valor exato** como `content_ids`.
- **Validado em produção, por leitura direta do banco (sem gerar nenhum clique de teste)**: os 17 produtos atualmente publicados no feed têm correspondência exata e sem ambiguidade entre `g:id` e o identificador usado nos eventos — confirmado item por item, incluindo o preço de cada um.

## 6. Vincular o catálogo ao Pixel (Gerenciador de Comércio)

1. No Gerenciador de Comércio (Commerce Manager), abra o catálogo já associado à sua conta.
2. Em **Configurações do catálogo → Rastreamento de eventos**, selecione o Pixel/Dataset `1718278203328773`.
3. A Meta vai automaticamente comparar o `content_ids` que chega nos eventos (`ViewContent`/`AffiliateOutboundClick`) com o `g:id` de cada item do catálogo — é exatamente a correspondência validada na seção 5.

## 7. Atualização automática do feed XML

- A URL do feed (seção 1) é dinâmica — sempre reflete o que está publicado no momento em que é acessada, sem nenhum passo manual do nosso lado.
- No Gerenciador de Comércio, configure a **busca automática (feed fetch)** apontando para essa URL, com frequência diária (recomendado) ou conforme a rotina de atualização de produtos da Vitrine.
- Não é necessário nenhum passo manual nosso para "atualizar" o feed — ele já está sempre atualizado quando a Meta o busca.

## 8. Configurar `AffiliateOutboundClick` como conversão personalizada

No Gerenciador de Eventos:

1. Vá em **Conversões Personalizadas → Criar Conversão Personalizada**.
2. Selecione o Pixel/Dataset `1718278203328773` como origem.
3. Em "Evento baseado em", escolha o evento personalizado `AffiliateOutboundClick` (ele só aparece na lista depois que o evento disparar pelo menos uma vez de verdade — veja a validação na seção 9).
4. Dê um nome claro (ex.: "Clique de saída — Vitrine PreçoCaindo") e salve.
5. Essa conversão personalizada pode então ser usada como objetivo de otimização de campanha, já que é o sinal mais próximo de intenção comercial real que este site envia (não existe um evento de "compra confirmada" — o PreçoCaindo não processa a venda, ela acontece no Mercado Livre).

## 9. Validar no Gerenciador de Eventos (Test Events)

Isso precisa ser feito por você, em um navegador real, com acesso ao Gerenciador de Negócios — não é algo que pode ser verificado só lendo código.

1. Gerenciador de Eventos → selecione o Pixel `1718278203328773` → aba **Testar Eventos**.
2. Abra `precocaindo.com.br` em uma aba nova, aceite o consentimento de marketing quando aparecer.
3. Deve aparecer `PageView` no painel em tempo real.
4. Navegue até uma página de produto da Vitrine (chegando por `?src=vitrine`, ou qualquer produto do catálogo) — deve aparecer `ViewContent`, com `content_ids` igual ao `g:id` daquele produto no feed.
5. Clique em "Ver no Mercado Livre" — deve aparecer `AffiliateOutboundClick`.
6. **Importante, teste específico**: copie a URL exata de um `<link>` do feed (`.../go/vitrine/mercado-livre/MLB...`) e abra direto, sem navegar pelo site. Deve aparecer `ViewContent` + `AffiliateOutboundClick` juntos, e a aba deve seguir para o Mercado Livre sozinha, em menos de 1-2 segundos.
7. Repita o passo 6 recarregando a mesma URL — confirme que não aparecem eventos duplicados além do esperado (um `ViewContent` + um `AffiliateOutboundClick` por visita real).
8. Teste também **sem aceitar o consentimento de marketing** (ou recusando): nenhum evento de marketing deve aparecer, mas o navegador ainda deve seguir normalmente para o Mercado Livre.

### Capturas de tela que você vai precisar (para comprovar a integração)

Como isso depende do seu acesso ao Gerenciador de Negócios, as capturas abaixo precisam ser feitas por você durante o teste acima — eu não tenho acesso a essa conta:

1. Aba "Testar Eventos" mostrando o `PageView` logo após abrir o site.
2. A mesma aba mostrando `ViewContent` com o `content_ids` visível, batendo com o `g:id` do produto testado.
3. A mesma aba mostrando `AffiliateOutboundClick` após o clique/chegada direta pelo link do catálogo.
4. Tela de "Conversões Personalizadas" mostrando `AffiliateOutboundClick` já disponível para seleção (depois do passo 8 da seção 8).
5. Configuração de "Rastreamento de eventos" do catálogo (seção 6), mostrando o Pixel vinculado.

## 10. Procedimento de teste da campanha (antes de ativar de verdade)

1. Confirme os passos da seção 9 primeiro — sem isso, a campanha roda sem sinal de otimização real.
2. Crie a campanha como **rascunho/pausada** primeiro.
3. Defina um orçamento diário baixo para o primeiro teste (sugestão: o mínimo que a Meta permitir).
4. Ative por um período curto (ex.: 24-48h) e confirme no Gerenciador de Eventos que os eventos reais de clique de anúncio estão chegando (não só os seus testes manuais).
5. Só depois disso, ajuste orçamento/duração para a operação real.

## 11. O que NÃO foi alterado

- Links afiliados existentes — intactos, nenhum reescrito.
- Seleção de produtos da Vitrine, preços, IDs — nenhum alterado.
- Nenhuma campanha da Meta foi criada, editada ou ativada por este trabalho — isso continua sendo feito por você, manualmente, no Gerenciador de Negócios.
