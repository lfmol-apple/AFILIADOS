# Padrão Visual Henrique — especificação oficial v1

**Status: definitivo.** Este documento registra o padrão visual comercial já
aprovado pelo Henrique para o PreçoCaindo. Ele não cria um novo modelo
visual — documenta e protege o que já existia, para que nenhuma alteração
futura no código mude a aparência das peças sem passar por aqui primeiro.

Congelado em: 2026-11-24.

## 1. Origem e fontes

Tudo abaixo vem destes arquivos, preservados nesta mesma pasta:

| Arquivo | O que é |
|---|---|
| `MANIFESTO.md` | Inventário com hash sha256 de todas as 15 artes reais do Henrique e dos 3 pilotos gerados, extraído em 2026-11-21 |
| `henrique-visual-profile.ts.snapshot` | Perfil visual extraído por inspeção direta das 15 artes reais — o que é fixo vs. o que varia por produto |
| `pilot-henrique-style.ts.snapshot` | O script real do piloto que gerou `pilot-result-3.png`, incluindo o prompt literal enviado à IA |
| `pilot-3-tssaper-APROVADO.png` | A peça aprovada pelo Henrique (Pistola Tssaper) — a referência de resultado final |
| `piloto-tssaper-comparacao-2026-11-21.pdf` | Comparação real entre essa aprovação e uma tentativa de generalização, incluindo o primeiro registro conhecido do bug de "badge de desconto inventado" |

A referência visual **efetivamente enviada à IA** em todas as 3 gerações do
piloto (e em toda geração `one_shot_v1` desde então) é um único arquivo:

- Nome original: `Imagem do ChatGPT 20 de nov. de 2026, 16_20_49.png`
- sha256: `d157c33851b7c15513335042d0105fb35281f03c882d2db500c9f22882303a90`
- **Agora versionado em `public/vitrine/henrique-style-reference.png`** (commitado,
  ships no build do Docker via `COPY --from=builder /app/public ./public`).
  Antes vivia só em `data/vitrine-creative-reference/` (bind mount,
  gitignored) — essa cópia continua existindo e sendo a que o pipeline usa
  por padrão hoje, mas o arquivo em si agora também está no git, nunca mais
  dependente só de um volume do host ou do Mac do dono do projeto.
- Hash verificado idêntico nas duas cópias antes de escrever este documento.

## 2. Modelo de geração

- Modelo: `gpt-image-2` (`OPENAI_IMAGE_MODEL`, padrão no código)
- Qualidade: `medium` (`VITRINE_CREATIVE_QUALITY`, padrão `auto` → resolve para `medium`)
- Tamanho pedido à API: `1024x1536` (`AI_GENERATION_SIZE`, em `openai-image-client.ts`) —
  o maior retrato que a API aceita, mais próximo possível do 4:5 final
- Custo real por imagem (gpt-image-2, medium, 1024x1536): US$ 0,041 — confirmado
  em duas gerações reais de validação em 2026-11-24
- Endpoint: `POST https://api.openai.com/v1/images/edits`, com a foto real do
  produto como primeira imagem e a referência Henrique como segunda imagem

## 3. Processamento posterior (o que o código faz DEPOIS da IA responder)

Esta seção existe porque um erro real, de 2026-11-24, tratou esta etapa como
inexistente — o que quebrou o padrão duas vezes antes de ser corrigido de
verdade (ver §6).

1. **Corte determinístico (`renderCatalogClean`, `compositor.tsx`)**: a
   imagem bruta 1024x1536 é desenhada num `<img>` com `object-fit: cover`
   dentro de uma caixa `1080x1350`. Isso escala pela MAIOR das duas razões
   (`1080/1024`), produzindo uma imagem escalada de `1080x1620`, e então
   corta o centro vertical para caber em 1350px de altura — removendo
   **~8,33% da altura do canvas bruto em CADA borda** (cima e baixo),
   sempre, automaticamente, para toda imagem gerada por este mecanismo.
2. **Faixa do Mercado Livre determinística (`compositeDeterministicCtaBar`)**:
   depois do corte, os **12,625% inferiores** (`CTA_BAR_HEIGHT_FRACTION`) da
   imagem já cortada (1080x1350) são sobrescritos pelo asset aprovado
   versionado (`public/vitrine/cta-bar-1080w.png`) — pixel-idêntico sempre,
   zero liberdade da IA sobre essa região. Decisão do dono do projeto,
   2026-11-24: duas tentativas de pedir pra IA desenhar essa faixa corretamente
   via texto de prompt falharam num asset real de produção; a faixa não é
   mais desenhada pela IA.

Dimensões finais: `1080x1350` (`CREATIVE_FINAL_DIMENSIONS`, em `compositor.tsx`).

## 4. Margens de segurança (o que o prompt pede pra IA deixar vazio)

Como existe um corte real (§3.1) E uma faixa reservada (§3.2), o prompt
pede duas margens vazias, calculadas — nunca digitadas à mão — a partir das
constantes reais do pipeline (`one-shot-ad-generator.ts`):

- **Margem superior: 18%** da altura total — o mesmo valor exato usado na
  geração aprovada pelo Henrique (`pilot-result-3`). Cobre com folga real
  o corte de ~8,33%.
- **Margem inferior: ~25%** da altura total (valor exato recalculado
  automaticamente = corte de ~8,33% + faixa reservada de ~10,5% + 6 pontos
  percentuais de folga, arredondado para cima). Maior que a de cima porque
  soma DOIS motivos reais, não um.

Se `AI_GENERATION_SIZE`, `CREATIVE_FINAL_DIMENSIONS` ou
`CTA_BAR_HEIGHT_FRACTION` mudarem no futuro, essas margens são recalculadas
automaticamente — nunca mais um número solto que pode ficar desatualizado
silenciosamente (foi exatamente assim que o bug de 2026-11-24 aconteceu).

## 5. Estrutura visual fixa (nunca varia)

Do `henrique-visual-profile.ts.snapshot` (15 artes reais inspecionadas):

- **Título**: nome do produto/categoria em destaque, bold, normalmente 2
  linhas, 2 cores alternadas, tiradas da paleta real da marca/categoria.
- **Selo de preço**: faixa vermelha "Por apenas" (só quando há desconto real
  confirmado) sobre uma bolha amarela com o preço em destaque. Sem desconto
  real, a bolha aparece sozinha — nunca um selo de desconto inventado.
- **Faixa do Mercado Livre**: amarela, full-width, logo real (aperto de
  mãos) + wordmark à esquerda, botão azul-marinho arredondado "Compre agora
  no Mercado Livre" com chevron à direita. 100% determinística desde
  2026-11-24 (§3.2) — nunca mais desenhada pela IA.
- **Foto do produto**: elemento dominante (50-70% da área), preservado
  exatamente como na foto real (cor, formato, proporções) — nunca
  redesenhado ou alterado.

## 6. Estrutura visual variável (por produto/categoria — nunca forçar um padrão único)

- **Ícones de benefício**: 0 a 5 no padrão real observado (perfil Henrique);
  **o código atual limita a 3** (`buildOneShotPrompt`, `.slice(0, 3)`) — uma
  simplificação deliberada da automação, não um limite que o Henrique
  realmente usa. Documentado aqui para não ser esquecido, não corrigido
  nesta rodada (fora do escopo desta correção).
- **Layout**: foto full-bleed, coluna de texto + foto, ou colagem com inset
  — a escolha depende de quanto conteúdo real existe pra mostrar.
- **Fundo/ambientação**: profundidade real (textura, iluminação, contexto),
  nunca um fundo liso e genérico de "estúdio plano" — correção de 2026-11-21
  confirmada ainda funcionando na validação de 2026-11-24 (fundo saiu
  escuro, texturizado, tipo oficina, nos dois testes reais do dia).

## 7. O que NUNCA pode aparecer (histórico real de defeitos)

| Defeito | Quando foi visto | Correção |
|---|---|---|
| Badge de desconto inventado ("39% DE DESCONTO REAL", depois "39% OFF / economize R$147,80") | 2026-11-21 (PDF de comparação) E de novo 2026-11-24 — nunca foi de fato corrigido entre as duas datas | Proibição explícita e genérica no prompt + aviso específico para produto sem desconto real (`one-shot-ad-generator.ts`) |
| Troca de 1 ícone de benefício por outro diferente do esperado | 2026-11-21 | Aceito como variação legítima (ver §6) — não é um defeito |
| Fundo claro/genérico em vez do estilo oficina escuro aprovado | 2026-11-21 | Corrigido via `ambientationLine` — confirmado ainda funcionando |
| Título/faixa cortados na borda | 2026-11-24 — 3 tentativas de diagnóstico antes da correção real (ver §3) | Margens derivadas + corte determinístico da faixa (§3, §4) |
| Controle de qualidade aprovando a imagem errada (bruta, não a final) | 2026-11-24 | QC agora roda sobre a imagem final, pós-corte e pós-faixa (`jobs/vitrine-creative-factory.ts`) |
| Ícone/selo de qualquer tipo além dos exatamente pedidos | 2026-11-24 | Proibição explícita no prompt |

## 8. O que este documento NÃO é

Não é uma reinterpretação do padrão Henrique, não é um novo template, e não
autoriza nenhuma geração paga nova. É o registro do que já existia e já foi
aprovado, para que correções técnicas futuras tenham uma referência única,
versionada, para conferir — em vez de cada sessão reconstruir esse
entendimento do zero (como aconteceu, por duas vezes, em 2026-11-24).

Qualquer mudança real no padrão visual (não apenas na correção de bugs que o
descaracterizam) exige aprovação explícita do dono do projeto, documentada
aqui com uma nova versão deste arquivo (v2, v3...), nunca uma edição
silenciosa da v1.
