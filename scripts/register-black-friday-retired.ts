import { registerPanelPick, PanelRegisterError } from "@/lib/services/ml-panel-register";

/**
 * 2026-11-27: registers the 45 products from the two aborted Black Friday
 * campaigns (black-friday-2026, black-friday-fim-do-mundo) as real site
 * products, through the exact same path as any /admin/fila-links save
 * (registerPanelPick: resolves the catalog id from the page the affiliate
 * link already leads to, enriches real title/price/photo from Mercado
 * Livre, saves the affiliate link as MANUAL_ADMIN_CATEGORY). Their
 * affiliateUrl already works (confirmed while debugging the campaigns —
 * same /social/ "Ir para produto" landing as the site's other 1,655 live
 * ML links), so no new link is generated here, only reused.
 *
 * `sold` is intentionally omitted (never fabricated — these never came
 * from the affiliate panel): no MonetizationScore gets created, so
 * normal /ofertas ranking alone would sink them. They're pinned to the
 * top of /ofertas separately (lib/config/pinned-offers.ts), not through
 * a fabricated score here.
 *
 * Usage (inside the production container, where the DB and the Mercado
 * Livre API token live): npx tsx scripts/register-black-friday-retired.ts
 */
const ITEMS: { id: string; title: string; affiliateUrl: string; price: number }[] = [
  { id: "bf-retired-fdm-2", title: "Drone Mini 5 Pro Fly More Plus com Controle RC 2", affiliateUrl: "https://meli.la/1JjvRBX", price: 9035.99 },
  { id: "bf-retired-fdm-1", title: "Notebook Gamer Nitro V15 Intel i7 RTX 4050 8GB 512GB SSD", affiliateUrl: "https://meli.la/2q9D7Xy", price: 5439.99 },
  { id: "bf-retired-fdm-12", title: "Console PlayStation 5 Slim Edição Digital 825GB Branco", affiliateUrl: "https://meli.la/2NtHA2a", price: 4596.60 },
  { id: "bf-retired-fdm-7", title: "Lava e Seca Front Load 13kg Smart AI Control WD13FG6B34BX/AZ", affiliateUrl: "https://meli.la/29H9abX", price: 4439.00 },
  { id: "bf-retired-fdm-11", title: "Galaxy S24 Galaxy AI 256GB 8GB RAM Preto", affiliateUrl: "https://meli.la/2gNHDXE", price: 3849.00 },
  { id: "bf-retired-fdm-3", title: "Projetor Multimídia Powerlite E24 3.600 Lúmens XGA", affiliateUrl: "https://meli.la/1mL5yJk", price: 3229.90 },
  { id: "bf-retired-fdm-5", title: "Smart TV PRO 65\" 4K Ultra HD AI", affiliateUrl: "https://meli.la/1j9RChQ", price: 2869.00 },
  { id: "bf-retired-fdm-9", title: "Ar Condicionado Split WindFree AI Pro 12.000 BTUs Frio", affiliateUrl: "https://meli.la/21m7Qxj", price: 2799.00 },
  { id: "bf-retired-fdm-4", title: "Impressora 3D A1 FDM Aberta", affiliateUrl: "https://meli.la/1HSjBme", price: 2697.05 },
  { id: "bf-retired-fdm-6", title: "Geladeira Frost Free Duplex Inox 385 Litros BRM46MK", affiliateUrl: "https://meli.la/2Hdb1AS", price: 2679.38 },
  { id: "bf-retired-bf26-26", title: "Bicicleta Elétrica Dobrável 400W 48V Aro 14", affiliateUrl: "https://meli.la/1LXBWMg", price: 2240.00 },
  { id: "bf-retired-fdm-10", title: "Ar Condicionado Portátil Smart 700 12.000 BTUs Quente e Frio", affiliateUrl: "https://meli.la/2rdBwuG", price: 1869.99 },
  { id: "bf-retired-bf26-25", title: "Robô Aspirador e Passa Pano D15 Plus 13000Pa", affiliateUrl: "https://meli.la/15k2PP4", price: 1808.19 },
  { id: "bf-retired-fdm-8", title: "Lavadora de Roupas Wave Agitator 13kg Branca", affiliateUrl: "https://meli.la/1db6EXR", price: 1647.00 },
  { id: "bf-retired-bf26-28", title: "Patinete Elétrico Dobrável GM5 P1", affiliateUrl: "https://meli.la/13Yat8s", price: 1159.20 },
  { id: "bf-retired-fdm-14", title: "Guarda-roupa Easy Slim 8 Portas com 2 Espelhos", affiliateUrl: "https://meli.la/13LbQAm", price: 996.31 },
  { id: "bf-retired-bf26-14", title: "Purificador de Água Eletrônico Compacto PE11B", affiliateUrl: "https://meli.la/1E6tnrV", price: 755.00 },
  { id: "bf-retired-bf26-20", title: "Kit Multi Ferramentas 4 em 1 48V (2 baterias)", affiliateUrl: "https://meli.la/29haeiU", price: 699.56 },
  { id: "bf-retired-fdm-15", title: "Esteira Ergométrica Elétrica Dobrável Residencial Cardio", affiliateUrl: "https://meli.la/2Zv9eQn", price: 689.99 },
  { id: "bf-retired-bf26-27", title: "Carrinho de Bebê Passeio 3 em 1 Reversível", affiliateUrl: "https://meli.la/1hB2UC4", price: 597.81 },
  { id: "bf-retired-bf26-3", title: "Cadeira de Escritório Ergonômica Genebra B500", affiliateUrl: "https://meli.la/1ULhSVv", price: 549.90 },
  { id: "bf-retired-bf26-10", title: "Kit de Ferramentas 110 Peças com Maleta", affiliateUrl: "https://meli.la/1rMwJUT", price: 479.90 },
  { id: "bf-retired-bf26-15", title: "Escova e Secador de Cabelos PSC3500 4 em 1", affiliateUrl: "https://meli.la/1gM34pq", price: 441.60 },
  { id: "bf-retired-bf26-13", title: "Jogo de Panelas Turim 10 Peças", affiliateUrl: "https://meli.la/1SMvYWw", price: 339.14 },
  { id: "bf-retired-fdm-13", title: "Fritadeira Sem Óleo Air Fryer AFN-40-BI 4L 1500W", affiliateUrl: "https://meli.la/1FyeCpN", price: 323.00 },
  { id: "bf-retired-bf26-4", title: "Relógio Casio G-Shock DW-5600BB-1DR", affiliateUrl: "https://meli.la/1GxvPUC", price: 302.00 },
  { id: "bf-retired-bf26-7", title: "Chapinha Profissional Gloss", affiliateUrl: "https://meli.la/2vRDo5A", price: 278.99 },
  { id: "bf-retired-bf26-18", title: "Lavadora de Alta Pressão EasyWash QWS1650 1650psi", affiliateUrl: "https://meli.la/2Js4mw9", price: 263.12 },
  { id: "bf-retired-bf26-2", title: "Árvore de Natal Verde Premium 180cm 1000 galhos", affiliateUrl: "https://meli.la/1zDiwm7", price: 238.90 },
  { id: "bf-retired-bf26-11", title: "Câmera de Segurança IM5SC Wi-Fi Full HD", affiliateUrl: "https://meli.la/1FYZG95", price: 204.76 },
  { id: "bf-retired-bf26-12", title: "Parafusadeira de Impacto 21V 2 Baterias 46 Peças", affiliateUrl: "https://meli.la/1UzmLee", price: 199.90 },
  { id: "bf-retired-bf26-17", title: "Parafusadeira/Furadeira de Impacto TB-21PX 2 Baterias", affiliateUrl: "https://meli.la/1JSgh3i", price: 199.00 },
  { id: "bf-retired-bf26-6", title: "Kit 6 Cuecas Boxer", affiliateUrl: "https://meli.la/27utPmB", price: 176.61 },
  { id: "bf-retired-bf26-30", title: "Loção Hidratante Corporal e Facial Pele Sensível 1L", affiliateUrl: "https://meli.la/1KgsDq9", price: 150.76 },
  { id: "bf-retired-bf26-5", title: "Whey 100% Pure Chocolate 900g", affiliateUrl: "https://meli.la/2bFnxeX", price: 150.35 },
  { id: "bf-retired-bf26-1", title: "Chuveiro Loren Shower Eletrônico 5500W", affiliateUrl: "https://meli.la/25oLBM5", price: 140.64 },
  { id: "bf-retired-bf26-23", title: "Fralda Pants Ajuste Total XXG 74 unidades", affiliateUrl: "https://meli.la/2GrEexh", price: 135.90 },
  { id: "bf-retired-bf26-8", title: "Aparador e Barbeador OneBlade 5 em 1", affiliateUrl: "https://meli.la/11W6aFd", price: 130.00 },
  { id: "bf-retired-bf26-22", title: "Cadeira de Escritório Ergonômica Begonia Mesh", affiliateUrl: "https://meli.la/2Hg6iUd", price: 115.10 },
  { id: "bf-retired-bf26-21", title: "Escova Elétrica Pro Series 1", affiliateUrl: "https://meli.la/27deazj", price: 101.08 },
  { id: "bf-retired-bf26-29", title: "Loção Hidratante Corporal 3 Ceramidas 473ml", affiliateUrl: "https://meli.la/2mV5Mit", price: 79.90 },
  { id: "bf-retired-bf26-19", title: "Pista de Carrinhos Lava-Rápido", affiliateUrl: "https://meli.la/1uNPhSo", price: 64.90 },
  { id: "bf-retired-bf26-16", title: "Cicaplast Baume B5+ 40ml", affiliateUrl: "https://meli.la/1PT6Gow", price: 64.37 },
  { id: "bf-retired-bf26-9", title: "Fotoprotetor Facial Fusion Water FPS 60", affiliateUrl: "https://meli.la/2a7S6za", price: 59.90 },
  { id: "bf-retired-bf26-24", title: "Garrafa Térmica 800ml Inox Bico Duplo Canudo", affiliateUrl: "https://meli.la/2UUr9d3", price: 44.99 },
];

async function main() {
  const ok: { id: string; catalogProductId: string; title: string | null }[] = [];
  const failed: { id: string; reason: string }[] = [];
  for (const item of ITEMS) {
    try {
      const result = await registerPanelPick({
        panelId: item.id,
        panelTitle: item.title,
        affiliateUrl: item.affiliateUrl,
        rate: 0,
        price: item.price,
      });
      ok.push({ id: item.id, catalogProductId: result.catalogProductId, title: result.title });
      console.log(`OK  ${item.id} -> ${result.catalogProductId} (${result.title ?? item.title})`);
    } catch (error) {
      const reason = error instanceof PanelRegisterError ? error.message : String(error);
      failed.push({ id: item.id, reason });
      console.log(`FAIL ${item.id} -> ${reason}`);
    }
  }
  console.log(`\n${ok.length} registrados, ${failed.length} falharam.`);
  if (failed.length) {
    console.log(JSON.stringify(failed, null, 2));
  }
  console.log("\nCatalog ids registrados (para o pin do /ofertas):");
  console.log(JSON.stringify(ok.map((o) => o.catalogProductId)));
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => process.exit(process.exitCode ?? 0));
