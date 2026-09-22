/**
 * Product page of each panel product, read from the affiliate panel card itself
 * (the address the Linkbuilder needs). Keyed by the exact panel title. Rows without
 * an entry fall back to copying the title.
 */
export const ML_PANEL_URLS: Readonly<Record<string, string>> = {
  "10 Bandejas Sementeira 200 Células Mudas Flores Hortaliças":
    "https://www.mercadolivre.com.br/10-bandejas-sementeira-200-celulas-mudas-flores-hortalicas/up/MLBU4187635331?pdp_filters=item_id%3AMLB7079259224",
  "10 Placas Autocolantes Painel Madeira Ripada Montável 90x16 Freijo":
    "https://www.mercadolivre.com.br/10-placas-autocolantes-painel-madeira-ripada-montavel-90x16/up/MLBU4002733575?pdp_filters=item_id%3AMLB4712201443",
  "12 Canecas Brancas Porcelana Importada Sublimação 325ml Live Branco":
    "https://www.mercadolivre.com.br/12-canecas-brancas-porcelana-importada-sublimacao-325ml-live/up/MLBU731128169?pdp_filters=deal%3AMLB1578289-1",
  "2kg Sementes Grama São Carlos Select Plus":
    "https://www.mercadolivre.com.br/2kg-sementes-grama-sao-carlos-select-plus/up/MLBU4382216062?pdp_filters=item_id%3AMLB4918719735",
  "4 Travesseiros Antialérgico Impermeável 50x70 Super Macio Branco":
    "https://www.mercadolivre.com.br/4-travesseiros-antialergico-impermeavel-50x70-super-macio/up/MLBU1753882643?pdp_filters=item_id%3AMLB803897463",
  "85cm Escorredor De Prato Louça De Cozinha Com Porta Preto":
    "https://www.mercadolivre.com.br/85cm-escorredor-de-prato-louca-de-cozinha-com-porta/up/MLBU3382591382?pdp_filters=item_id%3AMLB4173240829",
  "Acabamento Registro Alavanca Cromado Chuveiro Padrão Deca":
    "https://www.mercadolivre.com.br/acabamento-registro-alavanca-cromado-chuveiro-padrao-deca/up/MLBU773540950?pdp_filters=item_id%3AMLB3782572853",
  "Acendedor Elétrico 1200w Churrasqueira Carvão Acende+rápido":
    "https://produto.mercadolivre.com.br/MLB-3845011479-acendedor-eletrico-1200w-churrasqueira-carvo-acenderapido-_JM",
  "Adesivo Ripado Autoadesivo 3d 3m X 60cm Parede Amadeirado Platina":
    "https://www.mercadolivre.com.br/adesivo-ripado-autoadesivo-3d-3m-x-60cm-parede-amadeirado/up/MLBU3812593028?pdp_filters=item_id%3AMLB4482873657",
  "Afiador Amolador De Facas Chaira Diamantada 30cm Vonder Amarelo E Preto":
    "https://www.mercadolivre.com.br/afiador-amolador-de-facas-chaira-diamantada-30cm-vonder/up/MLBU1441958592?pdp_filters=item_id%3AMLB3109008543",
  "Amassador De Latinhas Lata Abridor Tampa Garrafa Vonder Tup Amarelo":
    "https://www.mercadolivre.com.br/amassador-de-latinhas-lata-abridor-tampa-garrafa-vonder-tup/up/MLBU2901114230?pdp_filters=item_id%3AMLB5221221268",
  "Aparador De Cerca Viva 450w Lamina 50cm Cc500 Tekna Cor Verde-escuro":
    "https://www.mercadolivre.com.br/aparador-de-cerca-viva-450w-lamina-50cm-cc500-tekna-cor-verde-escuro/p/MLB28118450?pdp_filters=item_id%3AMLB7579098382",
  "Aparelho De Jantar 30 Peças - Pratos, Copos E Talheres Transparente":
    "https://www.mercadolivre.com.br/aparelho-de-jantar-30-pecas--pratos-copos-e-talheres/up/MLBU3952048230?pdp_filters=deal%3AMLB1578289-1",
  "Aparelho De Jantar Biona Sweet Moment Cerâmica 30 Peças 5160 Cor Rosa":
    "https://www.mercadolivre.com.br/aparelho-de-jantar-biona-sweet-moment-ceramica-30-pecas-5160-cor-rosa/p/MLB32538124?pdp_filters=deal%3AMLB1578289-1",
  "Aparelho De Jantar E Chá 20 Peças Ryo Bambu Cor Verde Oxford":
    "https://www.mercadolivre.com.br/aparelho-de-jantar-e-cha-20-pecas-ryo-bambu-cor-verde-oxford/p/MLB38202291?pdp_filters=deal%3AMLB1578289-1",
  "Aparelho De Jantar E Chá 30 Pçs Oxford Ryo Bambu":
    "https://www.mercadolivre.com.br/aparelho-de-jantar-e-cha-30-pcs-oxford-ryo-bambu/p/MLB33316144?pdp_filters=deal%3AMLB1578289-1",
  "Aparelho De Jantar E Chá/café 20 Peças Vidro Opaline Branco Branco Floral":
    "https://www.mercadolivre.com.br/aparelho-de-jantar-e-chacafe-20-pecas-vidro-opaline-branco/up/MLBU4550165459?pdp_filters=deal%3AMLB1578289-1",
  "Aparelho De Jantar Oxford Cerâmica Lola 20 Pç Cor Estampado":
    "https://www.mercadolivre.com.br/aparelho-de-jantar-oxford-ceramica-lola-20-pc-cor-estampado/p/MLB33310052?pdp_filters=deal%3AMLB1578289-1",
  "Aparelho Sonoro Contra Morcegos Ratos 150m² Ermu 1/5 Zebu 127/220v":
    "https://www.mercadolivre.com.br/aparelho-sonoro-contra-morcegos-ratos-150m-ermu-15-zebu/up/MLBU1727410673?pdp_filters=deal%3AMLB1578289-1",
  "Aparelho de Jantar Oxford Cerâmica Lola 30 Pç Biona":
    "https://www.mercadolivre.com.br/aparelho-de-jantar-oxford-ceramica-lola-30-pc-biona/p/MLB33313775?pdp_filters=deal%3AMLB1578289-1",
  "Aparelho de Jantar e Chá 20 peças Donna Colb":
    "https://www.mercadolivre.com.br/aparelho-de-jantar-e-cha-20-pecas-donna-colb/p/MLB32637954?pdp_filters=deal%3AMLB1578289-1",
  "Aparelho de Jantar e Chá Ryo Maresia 20 Peças Off White e Marrom Oxford":
    "https://www.mercadolivre.com.br/aparelho-de-jantar-e-cha-ryo-maresia-20-pecas-off-white-e-marrom-oxford/p/MLB33630217?pdp_filters=deal%3AMLB1578289-1",
  "Apoio De Cabeça Cabeceira Suporte P/ Maca Legno Todas Cores":
    "https://produto.mercadolivre.com.br/MLB-2728088318-apoio-de-cabeca-cabeceira-suporte-p-maca-legno-todas-cores-_JM",
  "Arara Cabideiro Closet Roupas Sapateira Cabides Triplo Preto":
    "https://www.mercadolivre.com.br/arara-cabideiro-closet-roupas-sapateira-cabides-triplo/up/MLBU3703880777?pdp_filters=item_id%3AMLB6128487682",
  "Armário Aéreo Suspenso Em Mdp 90x62x27 C/ Espaço Decorativo Branco":
    "https://www.mercadolivre.com.br/armario-aereo-suspenso-em-mdp-90x62x27-c-espaco-decorativo/up/MLBU3989587902?pdp_filters=item_id%3AMLB6809269184",
  "Armário Aéreo de Cozinha Branco Itatiaia 3 Portas Rose":
    "https://www.mercadolivre.com.br/armario-aereo-de-cozinha-branco-itatiaia-3-portas-rose/p/MLB27988013?pdp_filters=item_id%3AMLB4141865463",
  "Armário Cozinha Modulada Completa Compacta Xangai Plus Multimóveis com Armário/Paneleiro e Balcão com Tampo Cor Branco/Lacca Fumê":
    "https://www.mercadolivre.com.br/armario-cozinha-modulada-completa-compacta-xangai-plus-multimoveis-com-armariopaneleiro-e-balcao-com-tampo-cor-brancolacca-fume/p/MLB27390654?pdp_filters=deal%3AMLB1578289-1",
  "Armário De Cozinha 6 Portas 2 Gavetas Adelle Yescasa":
    "https://www.mercadolivre.com.br/armario-de-cozinha-6-portas-2-gavetas-adelle-yescasa/p/MLB50413741?pdp_filters=deal%3AMLB1578289-1",
  "Armário De Cozinha 8 Portas 2 Gavetas Freijó/soft Ajwt":
    "https://www.mercadolivre.com.br/armario-de-cozinha-8-portas-2-gavetas-freijosoft-ajwt/p/MLB52116798?pdp_filters=deal%3AMLB1578289-1",
  "Armário De Cozinha Completa Compacta Dália 5 Portas 1 Gaveta Com Balcão Paneleiro Blue Moby":
    "https://www.mercadolivre.com.br/armario-de-cozinha-completa-compacta-dalia-5-portas-1-gaveta-com-balcao-paneleiro-blue-moby/p/MLB66053170?pdp_filters=deal%3AMLB1578289-1",
  "Armário Multiuso Roma 2 Portas Sapateira 1,90 Lavanderia Branco":
    "https://www.mercadolivre.com.br/armario-multiuso-roma-2-portas-sapateira-190-lavanderia/up/MLBU3979110737?pdp_filters=item_id%3AMLB6815709928",
  "Armário Multiuso Vaticano 2 Portas Branco - Móveis Sim":
    "https://www.mercadolivre.com.br/armario-multiuso-vaticano-2-portas-branco-moveis-sim/p/MLB52103236?pdp_filters=deal%3AMLB1578289-1",
  "Armário de Cozinha Completa Modulada Diamante Madesa Com Armário Torre E Balcão com Tampo para Cooktop B Cor Branco":
    "https://www.mercadolivre.com.br/armario-de-cozinha-completa-modulada-diamante-madesa-com-armario-torre-e-balcao-com-tampo-para-cooktop-b-cor-branco/p/MLB27416535?pdp_filters=item_id%3AMLB4108497626",
  "Balcão de Cozinha Itatiaia Aço 3 Portas 1 Gaveta Com Tampo de 105 CM Modelo Rose Branco Neve":
    "https://www.mercadolivre.com.br/balcao-de-cozinha-itatiaia-aco-3-portas-1-gaveta-com-tampo-de-105-cm-modelo-rose-branco-neve/p/MLB28564213?pdp_filters=deal%3AMLB1578289-1",
  "Barrica Pingômetro 01 Litro Exclusivo Revestido De Madeira":
    "https://www.mercadolivre.com.br/barrica-pingometro-01-litro-exclusivo-revestido-de-madeira/p/MLB2081676769?pdp_filters=item_id%3AMLB4376753784",
  "Base Box Baú Queen 158x198 Courino Linho Areia Com Pistão":
    "https://www.mercadolivre.com.br/base-box-bau-queen-158x198-courino-linho-areia-com-pistao/p/MLB41823745?pdp_filters=item_id%3AMLB3907563829",
  "Berço 3 em 1 para Colchão 60 x 130cm vira sofá e minicama 3 anos de garantia Multimóveis Branco":
    "https://www.mercadolivre.com.br/berco-3-em-1-para-colchao-60-x-130cm-vira-sofa-e-minicama-3-anos-de-garantia-multimoveis-branco/p/MLB24027382?pdp_filters=item_id%3AMLB4199278778",
  "Bico Dosador 50ml Para Reposição Dispenser De Bebidas":
    "https://www.mercadolivre.com.br/bico-dosador-50ml-para-reposicao-dispenser-de-bebidas/p/MLB53960188?pdp_filters=item_id%3AMLB4165879537",
  "Bobina Fio Nylon Roçadeira 3mm Quadrado 2kg 245m Duraline Cor Amarelo":
    "https://www.mercadolivre.com.br/bobina-fio-nylon-rocadeira-3mm-quadrado-2kg-245m-duraline-cor-amarelo/p/MLB27054284?pdp_filters=item_id%3AMLB7313974856",
  "Cabideiro Arara De Roupas De Chão Com Sapateira Inclusa Moderno Loja Quarto Organizador Em Aço Suporta 50kg Preto":
    "https://www.mercadolivre.com.br/cabideiro-arara-de-roupas-de-chao-com-sapateira-inclusa-moderno-loja-quarto-organizador-em-aco-suporta-50kg-preto/p/MLB62805258?pdp_filters=item_id%3AMLB4345940775",
  "Cadeira De Escritório Columbus Presidente Ergonomica Cinza Mesh":
    "https://www.mercadolivre.com.br/cadeira-de-escritorio-columbus-presidente-ergonomica-cinza-mesh/p/MLB57342897?pdp_filters=item_id%3AMLB4216390803",
  "Cadeira De Escritório Ergonômica Giratória B100 Boston Preta Com Estofado Mesh Com Ajuste Lombar Luvinco":
    "https://www.mercadolivre.com.br/cadeira-de-escritorio-ergonomica-giratoria-b100-boston-preta-com-estofado-mesh-com-ajuste-lombar-luvinco/p/MLB53762748?pdp_filters=deal%3AMLB1578289-1",
  "Cadeira De Escritório Gamer Nitro Ergonômica Estofado Couro Sintético Reclinável Altura Ajustável Apoio Para Pés Cor Vermelho Luvinco":
    "https://www.mercadolivre.com.br/cadeira-de-escritorio-gamer-nitro-ergonomica-estofado-couro-sintetico-reclinavel-altura-ajustavel-apoio-para-pes-cor-vermelho-luvinco/p/MLB58860593?pdp_filters=item_id%3AMLB4258553431",
  "Cadeira Gamer Profissional Escritório Com Apoio Para Pés Azul Couro Sintético":
    "https://www.mercadolivre.com.br/cadeira-gamer-profissional-escritorio-com-apoio-para-pes/up/MLBU1732023114?pdp_filters=item_id%3AMLB6456390400",
  "Cadeira de Escritório Vincere Brasil Elegance Graphite II Ergonômica com Apoio Lombar Preta em Malha":
    "https://www.mercadolivre.com.br/cadeira-de-escritorio-vincere-brasil-elegance-graphite-ii-ergonomica-com-apoio-lombar-preta-em-malha/p/MLB67956278?pdp_filters=item_id%3AMLB6838689962",
  "Caixa Grande Organizadora 270l Baú Multiuso Marvel Keter Preto Listras":
    "https://www.mercadolivre.com.br/caixa-grande-organizadora-270l-bau-multiuso-marvel-keter/up/MLBU1953284036?pdp_filters=deal%3AMLB1578289-1",
  "Cama Box Baú Casal 138":
    "https://produto.mercadolivre.com.br/MLB-5230489894-cama-box-bau-casal-138-_JM?pdp_filters=item_id%3AMLB5230489894",
  "Cama Box Baú Casal Colchão Gazin Molas Flora Bege 138x188x63cm":
    "https://www.mercadolivre.com.br/cama-box-bau-casal-colchao-gazin-molas-flora-bege-138x188x63cm/p/MLB26886277?pdp_filters=item_id%3AMLB5318608904",
  "Cama Box Casal Colchão Gazin Molas Ensacadas Pillow Maximus Cinza e Preto 138x188x62cm":
    "https://www.mercadolivre.com.br/cama-box-casal-colchao-gazin-molas-ensacadas-pillow-maximus-cinza-e-preto-138x188x62cm/p/MLB27492296?pdp_filters=item_id%3AMLB4111944180",
  "Cama Box Com Baú Preta Solteiro King + Colchão Alabama 96cm Preto":
    "https://www.mercadolivre.com.br/cama-box-com-bau-preta-solteiro-king-colchao-alabama-96cm-preto/p/MLB67837117?pdp_filters=item_id%3AMLB6604955776",
  "Cama Box King 193 Com Colchão Little Angel Mola Superlastic":
    "https://produto.mercadolivre.com.br/MLB-3972316775-cama-box-king-193-com-colcho-little-angel-mola-superlastic-_JM?pdp_filters=item_id%3AMLB3972316775",
  "Cama Box Solteiro + Colchão Molas Ensacadas Zidi Miami 88cm":
    "https://www.mercadolivre.com.br/cama-box-solteiro-colchao-molas-ensacadas-zidi-miami-88cm/p/MLB24138857?pdp_filters=item_id%3AMLB6428436198",
  "Cama box baú Ortobom Airtech Springpocket casal colchão bege":
    "https://www.mercadolivre.com.br/cama-box-bau-ortobom-airtech-springpocket-casal-colchao-bege/p/MLB37263374?pdp_filters=deal%3AMLB1578289-1",
  "Caminho De Mesa Trilho Macramê 40x160cm Mesa Posta Rustico Cru Macramê 40x160cm":
    "https://www.mercadolivre.com.br/caminho-de-mesa-trilho-macrame-40x160cm-mesa-posta-rustico/up/MLBU3361498257?pdp_filters=item_id%3AMLB5587441698",
  "Capa Protetora Colchão Box Casal Padrão Matelado Impermeável":
    "https://produto.mercadolivre.com.br/MLB-4002919471-capa-protetora-colcho-box-casal-padro-matelado-impermeavel-_JM",
  "Capa Térmica Lona Piscina 3x6 300 Micras 6x3 Atco Cor Azul":
    "https://www.mercadolivre.com.br/capa-termica-lona-piscina-3x6-300-micras-6x3-atco-cor-azul/p/MLB27079524?pdp_filters=deal%3AMLB1578289-1",
  "Capa Térmica Piscina 6x3 Lona Prot/uv 300 Micras Manta Azul":
    "https://www.mercadolivre.com.br/capa-termica-piscina-6x3-lona-protuv-300-micras-manta-azul/p/MLB64275001?pdp_filters=deal%3AMLB1578289-1",
  "Carrinho Organizador Decorativo 3 Prateleiras Em Aço Premium Branco - Durabilidade":
    "https://www.mercadolivre.com.br/carrinho-organizador-decorativo-3-prateleiras-em-aco-premium/up/MLBU2853084921?pdp_filters=item_id%3AMLB6511390406",
  "Cervagelas 600ml 6pçs Porta Garrafa 600ml Camisinha Cerveja":
    "https://produto.mercadolivre.com.br/MLB-5286723602-cervagelas-600ml-6pcs-porta-garrafa-600ml-camisinha-cerveja-_JM?pdp_filters=item_id%3AMLB5286723602",
  "Chaleira Com Apito Brinox 2,7 L Roma Areia":
    "https://www.mercadolivre.com.br/chaleira-com-apito-brinox-27-l-roma-areia/p/MLB59870058?pdp_filters=item_id%3AMLB6937271264",
  "Chaleira Elétrica 1,8L 1200W Atacama Unitermi":
    "https://www.mercadolivre.com.br/chaleira-eletrica-18l-1200w-atacama-unitermi/p/MLB13409957?pdp_filters=deal%3AMLB1578289-1",
  "Churrasqueira Califórnia Bacia Esmaltada":
    "https://www.mercadolivre.com.br/churrasqueira-california-bacia-esmaltada/p/MLB39054437?pdp_filters=deal%3AMLB1578289-1",
  "Chuveiro Elétrico Lorenzetti Bella Ducha Ultra, de 4 Temperaturas, Branco":
    "https://www.mercadolivre.com.br/chuveiro-eletrico-lorenzetti-bella-ducha-ultra-de-4-temperaturas-branco/p/MLB66763368?pdp_filters=item_id%3AMLB4055147771",
  "Chuveiro Loren Shower Ultra Eletrônica 7500w Lorenzetti Branco 7.5 Kw":
    "https://www.mercadolivre.com.br/chuveiro-loren-shower-ultra-eletronica-7500w-lorenzetti-branco-75-kw/p/MLB63561701?pdp_filters=deal%3AMLB1578289-1",
  "Cinto Dupla Alça Profissional Colete Roçadeira Gasolina Laranja":
    "https://www.mercadolivre.com.br/cinto-dupla-alca-profissional-colete-rocadeira-gasolina/up/MLBU3495644054?pdp_filters=item_id%3AMLB4253856849",
  "Coberdrom Sherpa Cobertor E Edredom Queen Casal Dupla Face":
    "https://produto.mercadolivre.com.br/MLB-5261555450-coberdrom-sherpa-cobertor-e-edredom-queen-casal-dupla-face-_JM",
  "Cobertor Manta De Casal 2,00x1,80 Canelada Sherpa Cores":
    "https://produto.mercadolivre.com.br/MLB-5665514196-cobertor-manta-de-casal-200x180-canelada-sherpa-cores-_JM?pdp_filters=item_id%3AMLB5665514196",
  "Colchão Casal CBP Inducol Molas Ensacadas Pillow Top 138x188x27cm Branco":
    "https://www.mercadolivre.com.br/colchao-casal-cbp-inducol-molas-ensacadas-pillow-top-138x188x27cm-branco/p/MLB37180012?pdp_filters=item_id%3AMLB4723729642",
  "Colchão Casal Espuma D33 One Face - Bello Box - 17x138x188 Cor Branco C/ Preto":
    "https://www.mercadolivre.com.br/colchao-casal-espuma-d33-one-face-bello-box-17x138x188-cor-branco-c-preto/p/MLB50633225?pdp_filters=item_id%3AMLB5409224066",
  "Colchão Queen Emma Basics 17 – 158x198cm - Espuma D28 17cm com Tecnologia Alemã, Embalado à Vácuo, Firmeza Ideal, Suporte Confortável":
    "https://www.mercadolivre.com.br/colchao-queen-emma-basics-17-158x198cm-espuma-d28-17cm-com-tecnologia-alema-embalado-vacuo-firmeza-ideal-suporte-confortavel/p/MLB25469530?pdp_filters=deal%3AMLB1578289-1",
  "Colchão Solteiro Espuma D23 Zidi Washington 88x188x14cm":
    "https://www.mercadolivre.com.br/colchao-solteiro-espuma-d23-zidi-washington-88x188x14cm/p/MLB49758758?pdp_filters=item_id%3AMLB6428423618",
  "Colchão Viúva Molas Ensacadas Zidi Miami 128x188x22cm Cinza":
    "https://www.mercadolivre.com.br/colchao-viuva-molas-ensacadas-zidi-miami-128x188x22cm-cinza/p/MLB61733160?pdp_filters=item_id%3AMLB5904521876",
  "Compressor Portátil Car Air Pump Digital Com Visor Para Carro Moto Bike Calibrador De Pneu Multifuncional":
    "https://www.mercadolivre.com.br/compressor-portatil-car-air-pump-digital-com-visor-para-carro-moto-bike-calibrador-de-pneu-multifuncional/p/MLB57468821?pdp_filters=item_id%3AMLB4918691211",
  "Conj de Panelas 8 Peças Ceramic Life Smart Plus Vanilla - Brinox":
    "https://www.mercadolivre.com.br/conj-de-panelas-8-pecas-ceramic-life-smart-plus-vanilla-brinox/p/MLB32717965?pdp_filters=deal%3AMLB1578289-1",
  "Conjunto Bancada Alta Cozinha Encosto Balcão Americano 2 banqueta Itagold":
    "https://www.mercadolivre.com.br/conjunto-bancada-alta-cozinha-encosto-balcao-americano-2-banqueta-itagold/p/MLB36263125?pdp_filters=item_id%3AMLB3840145621",
  "Conjunto De 6 Canecas Ryo Maresia 260ml Oxford Branco":
    "https://www.mercadolivre.com.br/conjunto-de-6-canecas-ryo-maresia-260ml-oxford/up/MLBU1964008727?pdp_filters=item_id%3AMLB1953153394",
  "Conjunto De Panelas Caçarolas 5 Peças Antiaderente Com 3 Utensilios E Tampa De Vidro Preto":
    "https://www.mercadolivre.com.br/conjunto-de-panelas-cacarolas-5-pecas-antiaderente-com-3-utensilios-e-tampa-de-vidro-preto/p/MLB67734744?pdp_filters=item_id%3AMLB6600141906",
  "Conjunto Gabinete Para Banheiro Com Espelho Com Pia Isa Pia Branco Móvel Preto/ripado":
    "https://www.mercadolivre.com.br/conjunto-gabinete-para-banheiro-com-espelho-com-pia-isa-pia-branco-movel-pretoripado/p/MLB45044195?pdp_filters=deal%3AMLB1578289-1",
  "Conjunto Panelas Antiaderente 10 Peças Teflon Várias Cores Preto":
    "https://www.mercadolivre.com.br/conjunto-panelas-antiaderente-10-pecas-teflon-varias-cores/up/MLBU1160703222?pdp_filters=item_id%3AMLB7143036284",
  "Conjunto Sala De Jantar Com 4 Cadeiras Grupo Lopas Easy Line Cor Amêndoa":
    "https://www.mercadolivre.com.br/conjunto-sala-de-jantar-com-4-cadeiras-grupo-lopas-easy-line-cor-amendoa/p/MLB45355617?pdp_filters=item_id%3AMLB3947912507",
  "Conjunto Sala de Jantar 4 Lugares com Cadeiras Estofadas Mesa Com Tampo Retangular Semelhante Vidro Base V Mel Branco Off White":
    "https://www.mercadolivre.com.br/conjunto-sala-de-jantar-4-lugares-com-cadeiras-estofadas-mesa-com-tampo-retangular-semelhante-vidro-base-v-mel-branco-off-white/p/MLB52595849?pdp_filters=item_id%3AMLB5836403400",
  "Conjunto de 6 uni 260mL Ryo Maresia":
    "https://www.mercadolivre.com.br/conjunto-de-6-uni-260ml-ryo-maresia/p/MLB25576807?pdp_filters=item_id%3AMLB4432887369",
  "Copo Térmico Gigante 1,2l Inox Com Tampa E Inox Canudo":
    "https://produto.mercadolivre.com.br/MLB-4339787931-copo-termico-gigante-12l-inox-com-tampa-e-inox-canudo-_JM?pdp_filters=item_id%3AMLB4339787931",
  "Corrimao Escada 3 Metros Metalon Em Barras Antipânico Parede":
    "https://www.mercadolivre.com.br/corrimao-escada-3-metros-metalon-em-barras-antipanico-parede/p/MLB2084410325?pdp_filters=item_id%3AMLB5385440510",
  "Corrimão Chato Aluminio 3 Metros Escada Parede Rampa Complet":
    "https://produto.mercadolivre.com.br/MLB-4911484855-corrimo-chato-aluminio-3-metros-escada-parede-rampa-complet-_JM?pdp_filters=item_id%3AMLB4911484855",
  "Corrimão Escada 5,00 Metros Aluminio Chato Reforçado Parede":
    "https://produto.mercadolivre.com.br/MLB-4911572183-corrimo-escada-500-metros-aluminio-chato-reforcado-parede-_JM?pdp_filters=item_id%3AMLB4911572183",
  "Cortador grama á gasolina roda maior 6,5hp Lf600rm Trapp cor verde":
    "https://www.mercadolivre.com.br/cortador-grama-a-gasolina-roda-maior-65hp-lf600rm-trapp-cor-verde/p/MLB15484690?pdp_filters=deal%3AMLB1578289-1",
  "Cortina Blackout Linho 2,80 X 2,30 Vedação 100%":
    "https://produto.mercadolivre.com.br/MLB-4940695468-cortina-blackout-linho-280-x-230-vedaco-100-_JM?pdp_filters=item_id%3AMLB4940695468",
  "Cortina Microfibra 6 Metros Para Sala Luxo Decoração":
    "https://produto.mercadolivre.com.br/MLB-3573260807-cortina-microfibra-6-metros-para-sala-luxo-decoraco-_JM?pdp_filters=item_id%3AMLB3573260807",
  "Cortina Rolo Blackout 0% 1,20 L X 1,20 A Escurecer Quarto Cor Branco":
    "https://www.mercadolivre.com.br/cortina-rolo-blackout-0-120-l-x-120-a-escurecer-quarto-cor-branco/p/MLB60037652?pdp_filters=item_id%3AMLB6223946198",
  "Cortina Tecido Oxford Grosso 3 Metros X 2,50 Largura Premium":
    "https://produto.mercadolivre.com.br/MLB-3277901177-cortina-tecido-oxford-grosso-3-metros-x-250-largura-premium-_JM?pdp_filters=item_id%3AMLB3277901177",
  "Cozinha Compacta Arizona Glam Com Armário E Balcão Carraro Cor Carvalho/Preto":
    "https://www.mercadolivre.com.br/cozinha-compacta-arizona-glam-com-armario-e-balcao-carraro-cor-carvalhopreto/p/MLB27690155?pdp_filters=item_id%3AMLB3604975437",
  "Cozinha Completa 12 Portas 1 Gaveta Clarice Gb":
    "https://www.mercadolivre.com.br/cozinha-completa-12-portas-1-gaveta-clarice-gb/p/MLB62724058?pdp_filters=deal%3AMLB1578289-1",
  "Cozinha De Aço Completa 4 Peças Amanda Itatiaia Cor Branco":
    "https://www.mercadolivre.com.br/cozinha-de-aco-completa-4-pecas-amanda-itatiaia-cor-branco/p/MLB33181924?pdp_filters=item_id%3AMLB6170739940",
  "Creatina (250g) Monohidratada - Growth Supplements Sem Sabor":
    "https://www.mercadolivre.com.br/creatina-250g-monohidratada-growth-supplements-sem-sabor/p/MLB19603205?pdp_filters=deal%3AMLB1578289-1",
  "Cristaleira 2 Portas De Vidro 1 Gaveta Londres Ib":
    "https://www.mercadolivre.com.br/cristaleira-2-portas-de-vidro-1-gaveta-londres-ib/p/MLB60652483?pdp_filters=deal%3AMLB1578289-1",
  "Cristaleira Ditália 1 Porta De Vidro 1 Gaveta E-962 Cozy Cor Branco":
    "https://www.mercadolivre.com.br/cristaleira-ditalia-1-porta-de-vidro-1-gaveta-e-962-cozy-cor-branco/p/MLB37138961?pdp_filters=item_id%3AMLB4720569814",
  "Cuba Gourmet para Cozinha com Acessórios Aço Inox 201 60x42cm Carajás Pingoo.casa - Prata":
    "https://www.mercadolivre.com.br/cuba-gourmet-para-cozinha-com-acessorios-aco-inox-201-60x42cm-carajas-pingoocasa-prata/p/MLB20189776?pdp_filters=item_id%3AMLB6984928738",
  "Cuba Pia De Apoio Sobrepor 37x27cm Branca Para Banheiro Lavabo Armário Gabinete Suspenso Luce - SOS Acabamentos by Orcia":
    "https://www.mercadolivre.com.br/cuba-pia-de-apoio-sobrepor-37x27cm-branca-para-banheiro-lavabo-armario-gabinete-suspenso-luce-sos-acabamentos-by-orcia/p/MLB51901843?pdp_filters=deal%3AMLB1578289-1",
  "Cubo Temporizador Estudos Pomodoro Led Vibração Alarme Preto":
    "https://www.mercadolivre.com.br/cubo-temporizador-estudos-pomodoro-led-vibracao-alarme/up/MLBU3649701898?pdp_filters=item_id%3AMLB5992411502",
  "Câmera Intelbras IM1 Full HD 2MP Alerta Movimento Wifi":
    "https://www.mercadolivre.com.br/camera-intelbras-im1-full-hd-2mp-alerta-movimento-wifi/p/MLB47098336?pdp_filters=item_id%3AMLB4712237497",
  "Câmera Inteligente Intelbras iM5SC con Wi-Fi Full HD color Branca":
    "https://www.mercadolivre.com.br/camera-inteligente-intelbras-im5sc-con-wi-fi-full-hd-color-branca/p/MLB27705742?pdp_filters=deal%3AMLB1578289-1",
  "Câmera Lâmpada De Segurança Wifi Ip App Yoosee Visão Noturna Câmera Segurança Lampada Ip Wifi":
    "https://www.mercadolivre.com.br/camera-lampada-de-seguranca-wifi-ip-app-yoosee-visao-noturna/up/MLBU3226072371?pdp_filters=item_id%3AMLB4090804305",
  "Câmera Segurança Externa Ip Wi-fi Inteligente Com Alarme, 360° Full Hd Ptz Visão Noturna Colorida Rastreamento Humanóide Áudio Bidirecional Ip66 À Prova D'água E À Prova De Poeira Yoosee/ICSEE":
    "https://www.mercadolivre.com.br/camera-seguranca-externa-ip-wi-fi-inteligente-com-alarme-360-full-hd-ptz-visao-noturna-colorida-rastreamento-humanoide-audio-bidirecional-ip66-prova-dagua-e-prova-de-poeira-yooseeicsee/p/MLB61991207?pdp_filters=deal%3AMLB1578289-1",
  "Câmera de Segurança Wi-Fi iCSee/Yoosee A28B 4K Dupla Lente Visão Noturna Colorida Full Hd Externa Prova D'água Ip66 Sensor Movimento Woosh":
    "https://www.mercadolivre.com.br/camera-de-seguranca-wi-fi-icseeyoosee-a28b-4k-dupla-lente-visao-noturna-colorida-full-hd-externa-prova-dagua-ip66-sensor-movimento-woosh/p/MLB60074213?pdp_filters=deal%3AMLB1578289-1",
  "Câmera de segurança Wi-Fi interna/externa TP-Link Tapo C216 branca":
    "https://www.mercadolivre.com.br/camera-de-seguranca-wi-fi-internaexterna-tp-link-tapo-c216-branca/p/MLB56102173?pdp_filters=deal%3AMLB1578289-1",
  "Debulhador De Milho Para Caixote - Botini / Botimetal Cor Vermelho":
    "https://www.mercadolivre.com.br/debulhador-de-milho-para-caixote-botini-botimetal-cor-vermelho/p/MLB25123991?pdp_filters=item_id%3AMLB3990175821",
  "Defumador Para Whisky E Coqueteis Com Mini Maçarico Preto":
    "https://www.mercadolivre.com.br/defumador-para-whisky-e-coqueteis-com-mini-macarico-preto/p/MLB74760494?pdp_filters=deal%3AMLB1578289-1",
  "Ducha Chuveiro Autolimpante Redondo De Parede Mauá Pingoo Acabamento Cromado Cor Prata":
    "https://www.mercadolivre.com.br/ducha-chuveiro-autolimpante-redondo-de-parede-maua-pingoo-acabamento-cromado-cor-prata/p/MLB41844244?pdp_filters=item_id%3AMLB4884582597",
  "Ducha Eletrônica Intense Fame 5400w Preta E Inox Cor Preto Potência":
    "https://www.mercadolivre.com.br/ducha-eletronica-intense-fame-5400w-preta-e-inox-cor-preto-potencia/p/MLB39457109?pdp_filters=deal%3AMLB1578289-1",
  "Ducha Lorenzetti Top Jet Multitemperaturas 5500w":
    "https://www.mercadolivre.com.br/ducha-lorenzetti-top-jet-multitemperaturas-5500w/p/MLB47271037?pdp_filters=deal%3AMLB1578289-1",
  "Ducha Relax Ultra Branca 5500w Lorenzetti":
    "https://www.mercadolivre.com.br/ducha-relax-ultra-branca-5500w-lorenzetti/p/MLB15483796?pdp_filters=deal%3AMLB1578289-1",
  "Elevador Assento Vaso Sanitário Alça Regulável Sit 5 Larde":
    "https://www.mercadolivre.com.br/elevador-assento-vaso-sanitario-alca-regulavel-sit-5-larde/p/MLB36203109?pdp_filters=item_id%3AMLB5105416328",
  "Escorredor de Louças Suspenso 65cm Preto Zelvi para Pratos Copos Talheres Organizador Pia Cozinha com Armário em Aço":
    "https://www.mercadolivre.com.br/escorredor-de-loucas-suspenso-65cm-preto-zelvi-para-pratos-copos-talheres-organizador-pia-cozinha-com-armario-em-aco/p/MLB55052720?pdp_filters=item_id%3AMLB5682525312",
  "Escova Secadora 4 em 1 Britânia BEC07R Cerâmica 1300W Bivolt Rosa - Seca, alisa, modela e dá volume aos cabelos.":
    "https://www.mercadolivre.com.br/escova-secadora-4-em-1-britania-bec07r-ceramica-1300w-bivolt-rosa-seca-alisa-modela-e-da-volume-aos-cabelos/p/MLB19694427?pdp_filters=deal%3AMLB1578289-1",
  "Escrivaninha Dobravel Ciplafe Link 0.80m Cor Preto":
    "https://www.mercadolivre.com.br/escrivaninha-dobravel-ciplafe-link-080m-cor-preto/p/MLB19731781?pdp_filters=deal%3AMLB1578289-1",
  "Escrivaninha Industrial 110cm Mesa Estudo Aparador Pés Aço":
    "https://produto.mercadolivre.com.br/MLB-5392068894-escrivaninha-industrial-110cm-mesa-estudo-aparador-pes-aco-_JM",
  "Escrivaninha Industrial Mesa Estudo Aparador Office Aço Mdf":
    "https://produto.mercadolivre.com.br/MLB-4641352916-escrivaninha-industrial-mesa-estudo-aparador-office-aco-mdf-_JM",
  "Escrivaninha Mesa Escritório Industrial 90cm - Home Office":
    "https://produto.mercadolivre.com.br/MLB-4067007109-escrivaninha-mesa-escritorio-industrial-90cm-home-office-_JM",
  "Escrivaninha Penteadeira Branco/Rosa Com Espelho MDP Notável Móveis":
    "https://www.mercadolivre.com.br/escrivaninha-penteadeira-brancorosa-com-espelho-mdp-notavel-moveis/p/MLB25345486?pdp_filters=item_id%3AMLB3396402689",
  "Espelheira Armarinho Banheiro Armário Suspenso Prateleira":
    "https://produto.mercadolivre.com.br/MLB-5451889162-espelheira-armarinho-banheiro-armario-suspenso-prateleira-_JM?pdp_filters=item_id%3AMLB5451889162",
  "Espelho De Chão Base Reta Corpo Inteiro Com Moldura E Suporte Dourado 146x36cm":
    "https://www.mercadolivre.com.br/espelho-de-chao-base-reta-corpo-inteiro-com-moldura-e-suporte-dourado-146x36cm/p/MLB52062423?pdp_filters=item_id%3AMLB4415219211",
  "Espelho De Chão Corpo Inteiro Com Moldura E Suporte Dourado":
    "https://www.mercadolivre.com.br/espelho-de-chao-corpo-inteiro-com-moldura-e-suporte-dourado/p/MLB65153572?pdp_filters=item_id%3AMLB4656490845",
  "Espelho De Chão Corpo Inteiro Com Moldura E Suporte Dourado Lhp E-commerce":
    "https://www.mercadolivre.com.br/espelho-de-chao-corpo-inteiro-com-moldura-e-suporte-dourado-lhp-e-commerce/p/MLB66384747?pdp_filters=item_id%3AMLB6720103320",
  "Espelho Mirano Orgânico Madrid 100x40cm Lapidado Design Luxo Suporte":
    "https://www.mercadolivre.com.br/espelho-mirano-organico-madrid-100x40cm-lapidado-design-luxo/up/MLBU5174982647?pdp_filters=item_id%3AMLB7646164250",
  "Espelho Orgânico 150x50cm Para Parede Com Moldura Mod Flame":
    "https://produto.mercadolivre.com.br/MLB-5395272564-espelho-orgnico-150x50cm-para-parede-com-moldura-mod-flame-_JM?pdp_filters=item_id%3AMLB5395272564",
  "Espelho Orgânico com LED 170x70 cm Ideal para Quarto, Banheiro, Escritório, Hall e Sala - Modelo Flame com Iluminação LED Quente, Perfeito para Ambientes com Decoração Moderna":
    "https://www.mercadolivre.com.br/espelho-organico-com-led-170x70-cm-ideal-para-quarto-banheiro-escritorio-hall-e-sala-modelo-flame-com-iluminacao-led-quente-perfeito-para-ambientes-com-decoracao-moderna/p/MLB61433721?pdp_filters=item_id%3AMLB4281111781",
  "Espelho Vildrex Roma 70x50cm Design Moderno Lapidado Luxo Suporte":
    "https://www.mercadolivre.com.br/espelho-vildrex-roma-70x50cm-design-moderno-lapidado-luxo-suporte/p/MLB55945060?pdp_filters=item_id%3AMLB6721914946",
  "Espeto Giratório Flex (kit 2 Peças) (linha Economia )":
    "https://produto.mercadolivre.com.br/MLB-1129371488-espeto-giratorio-flex-kit-2-pecas-linha-economia--_JM",
  "Espremedor De Limão Inox Manual Maciço Super Forte":
    "https://www.mercadolivre.com.br/espremedor-de-limao-inox-manual-macico-super-forte/p/MLB38277786?pdp_filters=item_id%3AMLB5775764426",
  "Estante Armário De Aço 6 Bandejas 90cm Cinza Cinza-escuro":
    "https://www.mercadolivre.com.br/estante-armario-de-aco-6-bandejas-90cm-cinza/up/MLBU3659521487?pdp_filters=deal%3AMLB1578289-1",
  "Estante Armário Prateleira de Aço 6 Bandejas Organizador Galvanizada Suporta 150kg 190cm x 90cm x 28cm":
    "https://www.mercadolivre.com.br/estante-armario-prateleira-de-aco-6-bandejas-organizador-galvanizada-suporta-150kg-190cm-x-90cm-x-28cm/p/MLB45892583?pdp_filters=deal%3AMLB1578289-1",
  "Estante Para Livros Industrial 63cm Mdp Metalon 5 Andares Marrom-claro":
    "https://www.mercadolivre.com.br/estante-para-livros-industrial-63cm-mdp-metalon-5-andares/up/MLBU3933972950?pdp_filters=item_id%3AMLB6681382906",
  "Faca Carne 8 Chef Cabo Branco Tramontina Premium Açougueiro Branco":
    "https://www.mercadolivre.com.br/faca-carne-8--chef-cabo-branco-tramontina-premium-acougueiro/up/MLBU3350073941?pdp_filters=item_id%3AMLB4156586411",
  "Fechadura Digital De Sobrepor Fd 1000 D Preta Intelbras":
    "https://www.mercadolivre.com.br/fechadura-digital-de-sobrepor-fd-1000-d-preta-intelbras/p/MLB63323182?pdp_filters=deal%3AMLB1578289-1",
  "Fechadura Digital De Sobrepor Fr 102 Preto Intelbras":
    "https://www.mercadolivre.com.br/fechadura-digital-de-sobrepor-fr-102-preto-intelbras/p/MLB41972204?pdp_filters=deal%3AMLB1578289-1",
  "Fechadura Digital De Sobrepor Intelbras Fr 101":
    "https://www.mercadolivre.com.br/fechadura-digital-de-sobrepor-intelbras-fr-101/p/MLB20938205?pdp_filters=deal%3AMLB1578289-1",
  "Fechadura Digital Eletronica Inova Biometria Senha Cartão Magnético Compatível 40mm A 55mm Apoiar O Português":
    "https://www.mercadolivre.com.br/fechadura-digital-eletronica-inova-biometria-senha-cartao-magnetico-compativel-40mm-a-55mm-apoiar-o-portugues/p/MLB75213836?pdp_filters=item_id%3AMLB4996111687",
  "Fechadura Digital Papaiz SL125 Sobrepor | IP55 Chuva Sol Maresia | Senha Touchscreen Painel Vertical":
    "https://www.mercadolivre.com.br/fechadura-digital-papaiz-sl125-sobrepor-ip55-chuva-sol-maresia-senha-touchscreen-painel-vertical/p/MLB30904810?pdp_filters=deal%3AMLB1578289-1",
  "Festão Aramado Com 300 Galhos Natal Grosso 2,70 Metros Cheios Flexível Decoração - Inpari Imports":
    "https://www.mercadolivre.com.br/festao-aramado-com-300-galhos-natal-grosso-270-metros-cheios-flexivel-decoracao-inpari-imports/p/MLB77776673?pdp_filters=item_id%3AMLB5095956241",
  "Fluido P/ Lamparina E Tocheiro 1 L Sem Fumaça Velas Bistrot Incolor":
    "https://www.mercadolivre.com.br/fluido-p-lamparina-e-tocheiro-1-l-sem-fumaca-velas-bistrot/up/MLBU2198724769?pdp_filters=item_id%3AMLB2896952395",
  "Frigideira Cerâmica Antiaderente Fogão Cooktop Indução Gás Bege 20cm":
    "https://www.mercadolivre.com.br/frigideira-ceramica-antiaderente-fogao-cooktop-inducao-gas-bege-20cm/p/MLB65696785?pdp_filters=item_id%3AMLB4479093319",
  "Frigideira De Ferro Fundido Com Tampa De Vidro 28cm Santana":
    "https://www.mercadolivre.com.br/frigideira-de-ferro-fundido-com-tampa-de-vidro-28cm-santana/p/MLB32099597?pdp_filters=item_id%3AMLB5174489231",
  "Gabinete Armario De Banheiro 100% Mdf - Salerno 80cm Branco Um Furo":
    "https://www.mercadolivre.com.br/gabinete-armario-de-banheiro-100-mdf--salerno-80cm/up/MLBU4147792492?pdp_filters=item_id%3AMLB7016014644",
  "Gabinete Armário Banheiro Completo 80cm - Puxador Alumínio":
    "https://produto.mercadolivre.com.br/MLB-1305093917-gabinete-armario-banheiro-completo-80cm-puxador-aluminio-_JM?pdp_filters=item_id%3AMLB1305093917",
  "Gabinete De Pia 1,20 Balcão De Cozinha Multiuso 3 Portas Armário De Pia Armário De Cozinha 120x80x52cm Organizador Para Pia Cor Branco Ideal Para Cozinha Compacta E Área De Serviço Porta Panela Branco":
    "https://www.mercadolivre.com.br/gabinete-de-pia-120-balcao-de-cozinha-multiuso-3-portas-armario-de-pia-armario-de-cozinha-120x80x52cm-organizador-para-pia-cor-branco-ideal-para-cozinha-compacta-e-area-de-servico-porta-panela-branco/p/MLB46566679?pdp_filters=deal%3AMLB1578289-1",
  "Garrafa Térmica Stanley Aerolight Transit Slim Black 2.0 591ml":
    "https://www.mercadolivre.com.br/garrafa-termica-stanley-aerolight-transit-slim-black-20-591ml/p/MLB57797847?pdp_filters=deal%3AMLB1578289-1",
  "Globo De Plástico Polietileno Esférico 15x30 Branco Lisa":
    "https://www.mercadolivre.com.br/globo-de-plastico-polietileno-esferico-15x30/up/MLBU3226711336?pdp_filters=item_id%3AMLB4087854311",
  "Guarda Roupa Casal 3 Portas 4 Gavetas Costa Rica Cinamomo/off-white":
    "https://www.mercadolivre.com.br/guarda-roupa-casal-3-portas-4-gavetas-costa-rica/up/MLBU2720298530?pdp_filters=deal%3AMLB1578289-1",
  "Guarda Roupa Casal 3 Portas 9 Gavetas Luana Sallêto Móveis":
    "https://www.mercadolivre.com.br/guarda-roupa-casal-3-portas-9-gavetas-luana-salleto-moveis/p/MLB36202566?pdp_filters=deal%3AMLB1578289-1",
  "Guarda Roupa Casal 4 Portas Roupeiro Com Gavetas E Espelho Cor Freijó Com Off White":
    "https://www.mercadolivre.com.br/guarda-roupa-casal-4-portas-roupeiro-com-gavetas-e-espelho-cor-freijo-com-off-white/p/MLB54761218?pdp_filters=item_id%3AMLB5673066296",
  "Guarda Roupa Casal 8 Portas 4 Gavetas Paris Espresso Móveis Onix":
    "https://www.mercadolivre.com.br/guarda-roupa-casal-8-portas-4-gavetas-paris-espresso-moveis-onix/p/MLB65574727?pdp_filters=deal%3AMLB1578289-1",
  "Guarda Roupa Casal Mônaco Madesa 3 Portas Correr Espelho P Cor Preto":
    "https://www.mercadolivre.com.br/guarda-roupa-casal-monaco-madesa-3-portas-correr-espelho-p-cor-preto/p/MLB19493953?pdp_filters=item_id%3AMLB5314330756",
  "Guarda Roupa Casal Toronto Mdf 8 Portas Moderna Mobília Cor Naturale/Off White/Naturale":
    "https://www.mercadolivre.com.br/guarda-roupa-casal-toronto-mdf-8-portas-moderna-mobilia-cor-naturaleoff-whitenaturale/p/MLB41828890?pdp_filters=deal%3AMLB1578289-1",
  "Guarda Roupa Casal Valencia 6 Portas 6 Gavetas Com Espelho":
    "https://produto.mercadolivre.com.br/MLB-1611084421-guarda-roupa-casal-valencia-6-portas-6-gavetas-com-espelho-_JM?pdp_filters=item_id%3AMLB1611084421",
  "Guarda Roupa Com 4 Colunas Organizador Roupeiro Expositor":
    "https://produto.mercadolivre.com.br/MLB-5517304328-guarda-roupa-com-4-colunas-organizador-roupeiro-expositor-_JM?pdp_filters=item_id%3AMLB5517304328",
  "Guarda Roupa Solteiro 2 Portas De Correr 1 Porta Com Ii Branco":
    "https://www.mercadolivre.com.br/guarda-roupa-solteiro-2-portas-de-correr-1-porta-com-ii/up/MLBU1713115672?pdp_filters=deal%3AMLB1578289-1",
  "Guarda Roupa Solteiro 2 Portas De Correr 2 Gavetas Jb Cor Branco":
    "https://www.mercadolivre.com.br/guarda-roupa-solteiro-2-portas-de-correr-2-gavetas-jb-cor-branco/p/MLB58714631?pdp_filters=deal%3AMLB1578289-1",
  "Guarda Roupa Solteiro Armário Quarto Denver Madesa 2 Pts Correr Espelho B Cor Branco 1094091E":
    "https://www.mercadolivre.com.br/guarda-roupa-solteiro-armario-quarto-denver-madesa-2-pts-correr-espelho-b-cor-branco-1094091e/p/MLB22016472?pdp_filters=item_id%3AMLB3479421007",
  "Guarda Roupa Solteiro Capri 2 Portas 6 Gav Com Espelho Cor Branco Branco":
    "https://www.mercadolivre.com.br/guarda-roupa-solteiro-capri-2-portas-6-gav-com-espelho-cor-branco-branco/p/MLB64959316?pdp_filters=item_id%3AMLB4472976509",
  "Guarda Roupas Multiuso Solteiro Belem Madeir/off Notável Cor Madeirado Off White":
    "https://www.mercadolivre.com.br/guarda-roupas-multiuso-solteiro-belem-madeiroff-notavel-cor-madeirado-off-white/p/MLB50673761?pdp_filters=deal%3AMLB1578289-1",
  "Guarda-Roupa Paris 8 Portas 200x237x47cm Cinamomo Off White":
    "https://www.mercadolivre.com.br/guarda-roupa-paris-8-portas-200x237x47cm-cinamomo-off-white/p/MLB50997439?pdp_filters=deal%3AMLB1578289-1",
  "Guarda-roupa Casal 100% Mdf 8 Portas 4 Gavetas Jatobá Cinamomo":
    "https://www.mercadolivre.com.br/guardaroupa-casal-100-mdf-8-portas-4-gavetas-jatoba/up/MLBU2293847881?pdp_filters=deal%3AMLB1578289-1",
  "Guarda-roupa Casal 6 Portas 2 Gavetas França Cinamomo/off White":
    "https://www.mercadolivre.com.br/guardaroupa-casal-6-portas-2-gavetas-franca/up/MLBU2295333697?pdp_filters=deal%3AMLB1578289-1",
  "Guarda-roupa Casal 6 Portas 2 Gavetas França Espresso Móveis cor cinamomo off-white":
    "https://www.mercadolivre.com.br/guarda-roupa-casal-6-portas-2-gavetas-franca-espresso-moveis-cor-cinamomo-off-white/p/MLB42613392?pdp_filters=deal%3AMLB1578289-1",
  "Guarda-roupa Casal Bartira Ville Com 6 Portas E 2 Gavetas Cor Avelã com Cappuccino":
    "https://www.mercadolivre.com.br/guarda-roupa-casal-bartira-ville-com-6-portas-e-2-gavetas-cor-avela-com-cappuccino/p/MLB37653171?pdp_filters=deal%3AMLB1578289-1",
  "Guarda-roupa Casal Branco 3 Portas Corrediça Espelhada Milão MDF Yescasa":
    "https://www.mercadolivre.com.br/guarda-roupa-casal-branco-3-portas-corredica-espelhada-milao-mdf-yescasa/p/MLB38223010?pdp_filters=deal%3AMLB1578289-1",
  "Guarda-roupa Casal Com Espelho 6 Portas 2 Gavetas França":
    "https://www.mercadolivre.com.br/guarda-roupa-casal-com-espelho-6-portas-2-gavetas-franca/p/MLB50525645?pdp_filters=deal%3AMLB1578289-1",
  "Guarda-roupa Casal Easy Slim 8 Portas C/ Espelho Amendoa/off":
    "https://www.mercadolivre.com.br/guarda-roupa-casal-easy-slim-8-portas-c-espelho-amendoaoff/p/MLB51396300?pdp_filters=item_id%3AMLB5445396068",
  "Guarda-roupa Casal Reno Madesa 3 Portas De Correr Esp Rci Cor Rustic/Cinza 1095H91E":
    "https://www.mercadolivre.com.br/guarda-roupa-casal-reno-madesa-3-portas-de-correr-esp-rci-cor-rusticcinza-1095h91e/p/MLB19635574?pdp_filters=item_id%3AMLB3327802251",
  "Guarda-roupa Casal Yescasa Milão 3 Portas Espelho Preto MDF 191x208x45cm":
    "https://www.mercadolivre.com.br/guarda-roupa-casal-yescasa-milao-3-portas-espelho-preto-mdf-191x208x45cm/p/MLB41883958?pdp_filters=deal%3AMLB1578289-1",
  "Guarda-roupa Casal com Espelho 6 Portas 2 Gavetas Sallêto Cinamomo/Off White":
    "https://www.mercadolivre.com.br/guarda-roupa-casal-com-espelho-6-portas-2-gavetas-salleto-cinamomooff-white/p/MLB53934006?pdp_filters=deal%3AMLB1578289-1",
  "Jogo 3 Frigideiras Turim Listrada Com Tampa":
    "https://www.mercadolivre.com.br/jogo-3-frigideiras-turim-listrada-com-tampa/p/MLB39866623?pdp_filters=deal%3AMLB1578289-1",
  "Jogo 6 Taças Cristal Titanium Vinho Tinto 560ml Xtra Bohemia Incolor":
    "https://www.mercadolivre.com.br/jogo-6-tacas-cristal-titanium-vinho-tinto-560ml-xtra-bohemia/up/MLBU3903195352?pdp_filters=item_id%3AMLB4602043427",
  "Jogo De Jantar E Chá 20 Peças Unni Brisa Oxford Aw20-5903":
    "https://www.mercadolivre.com.br/jogo-de-jantar-e-cha-20-pecas-unni-brisa-oxford-aw20-5903/p/MLB33795714?pdp_filters=deal%3AMLB1578289-1",
  "Jogo De Panela Cerâmica Premium 20 Pç - Antiaderente Marrom Marrom-escuro":
    "https://www.mercadolivre.com.br/jogo-de-panela-ceramica-premium-20-pc--antiaderente-marrom/up/MLBU3567222336?pdp_filters=deal%3AMLB1578289-1",
  "Jogo De Panelas 10 Peças Antiaderente Frigideira Tampa Vidro Marfim":
    "https://www.mercadolivre.com.br/jogo-de-panelas-10-pecas-antiaderente-frigideira-tampa-vidro-marfim/p/MLB69001679?pdp_filters=item_id%3AMLB4647606299",
  "Jogo De Panelas Antiaderente 10 Peças Prime Alumínio Teflon Cor Marrom-escuro":
    "https://www.mercadolivre.com.br/jogo-de-panelas-antiaderente-10-pecas-prime-aluminio-teflon-cor-marrom-escuro/p/MLB64318530?pdp_filters=item_id%3AMLB7029015864",
  "Jogo De Panelas Induçao Antiaderente Cerâmica 10 Peças Ppg Pfoa Free Baunilha":
    "https://www.mercadolivre.com.br/jogo-de-panelas-inducao-antiaderente-ceramica-10-pecas-ppg-pfoa-free-baunilha/p/MLB62276296?pdp_filters=item_id%3AMLB5946286600",
  "Jogo De Panelas Teflon Antiaderente 8 Peças Cereja":
    "https://produto.mercadolivre.com.br/MLB-1376105143-jogo-de-panelas-teflon-antiaderente-8-pecas-cereja-_JM?pdp_filters=item_id%3AMLB1376105143",
  "Jogo De Panelas Tramontina Antiaderente Turim 10 Pç Preto":
    "https://www.mercadolivre.com.br/jogo-de-panelas-tramontina-antiaderente-turim-10-pc-preto/p/MLB32643222?pdp_filters=deal%3AMLB1578289-1",
  "Jogo De Toalhas Buddemeyer Bella Extra Soft Banho 4 Grafite/cinza Lisa":
    "https://www.mercadolivre.com.br/jogo-de-toalhas-buddemeyer-bella-extra-soft-banho-4-grafitecinza-lisa/p/MLB48810551?pdp_filters=deal%3AMLB1578289-1",
  "Jogo De Toalhas Relevo Clássicas Papel Lavabo Banheiro 100ud Cor Branco Clássico":
    "https://www.mercadolivre.com.br/jogo-de-toalhas-relevo-classicas-papel-lavabo-banheiro-100ud-cor-branco-classico/p/MLB25710230?pdp_filters=item_id%3AMLB4561888392",
  "Jogo Panelas 12 Peças Antiaderente Alumínio Turim Tramontina Cor Vermelho":
    "https://www.mercadolivre.com.br/jogo-panelas-12-pecas-antiaderente-aluminio-turim-tramontina-cor-vermelho/p/MLB32486122?pdp_filters=deal%3AMLB1578289-1",
  "Jogo Panelas 7 Peças Turim Tramontina Antiaderente Alumínio Cor Preto":
    "https://www.mercadolivre.com.br/jogo-panelas-7-pecas-turim-tramontina-antiaderente-aluminio-cor-preto/p/MLB33325410?pdp_filters=deal%3AMLB1578289-1",
  "Jogo Toalhas Banho Grossas Macias Algodão 4pç Absorventes":
    "https://produto.mercadolivre.com.br/MLB-4125132275-jogo-toalhas-banho-grossas-macias-algodo-4pc-absorventes-_JM?pdp_filters=item_id%3AMLB4125132275",
  "Jogo de Panelas 5 Peças Antiaderente Cerâmico Grafite Mimo Style - Conjunto Completo":
    "https://www.mercadolivre.com.br/jogo-de-panelas-5-pecas-antiaderente-ceramico-grafite-mimo-style-conjunto-completo/p/MLB43328371?pdp_filters=deal%3AMLB1578289-1",
  "Jogo de Panelas Brinox Antiaderente Ceramic Life 6 Peças Sirius - Preto":
    "https://www.mercadolivre.com.br/jogo-de-panelas-brinox-antiaderente-ceramic-life-6-pecas-sirius-preto/p/MLB46668772?pdp_filters=item_id%3AMLB4122755649",
  "Jogo de Panelas Cerâmica Antiaderente Indução Zenith 5 Peças Cinza":
    "https://www.mercadolivre.com.br/jogo-de-panelas-ceramica-antiaderente-inducao-zenith-5-pecas-cinza/p/MLB61258362?pdp_filters=item_id%3AMLB5856712146",
  "Jogo de Panelas Rochedo Natural Stone 5 peças color negro":
    "https://www.mercadolivre.com.br/jogo-de-panelas-rochedo-natural-stone-5-pecas-color-negro/p/MLB45450465?pdp_filters=deal%3AMLB1578289-1",
  "Jogos Conjuntos Mesa Bar Dobrável Madeira 1,20x70 Com 6 Cad.":
    "https://produto.mercadolivre.com.br/MLB-1188702777-jogos-conjuntos-mesa-bar-dobravel-madeira-120x70-com-6-cad-_JM",
  "Kit 10 Lâmpadas LED Bulbo 80W Alta Potência Branco Frio 6500K Bivolt E27 - Super Bulbo Econômica 8000 Lúmens Ideal Galpão Fábrica Comércio":
    "https://www.mercadolivre.com.br/kit-10-lampadas-led-bulbo-80w-alta-potencia-branco-frio-6500k-bivolt-e27-super-bulbo-economica-8000-lumens-ideal-galpao-fabrica-comercio/p/MLB51227551?pdp_filters=deal%3AMLB1578289-1",
  "Kit 10 Potes Herméticos Vidro 640ml Starhouse Marmita Forno Micro-ondas Airfryer com 4 travas de super vedação":
    "https://www.mercadolivre.com.br/kit-10-potes-hermeticos-vidro-640ml-starhouse-marmita-forno-micro-ondas-airfryer-com-4-travas-de-super-vedacao/p/MLB53222689?pdp_filters=item_id%3AMLB5574851656",
  "Kit 10 Potes Herméticos Vidro Tampa Bambu Seiri Para Mantimentos Cozinha":
    "https://www.mercadolivre.com.br/kit-10-potes-hermeticos-vidro-tampa-bambu-seiri-para-mantimentos-cozinha/p/MLB57492845?pdp_filters=item_id%3AMLB5764953630",
  "Kit 100 Placas Ripada Mdf Autocolante Decoração Parede 45x11":
    "https://produto.mercadolivre.com.br/MLB-4181602941-kit-100-placas-ripada-mdf-autocolante-decoraco-parede-45x11-_JM",
  "Kit 100 Placas Ripadas Mdf 45x10cm Decoração Painel Sala":
    "https://produto.mercadolivre.com.br/MLB-5412502816-kit-100-placas-ripadas-mdf-45x10cm-decoraco-painel-sala-_JM?pdp_filters=item_id%3AMLB5412502816",
  "Kit 12 Guardanapos De Tecido Linho Misto Para Mesa Posta":
    "https://produto.mercadolivre.com.br/MLB-4953622156-kit-12-guardanapos-de-tecido-linho-misto-para-mesa-posta-_JM",
  "Kit 2 Cadeira Poltrona Para Sala Lua Confortável E Reforçada":
    "https://produto.mercadolivre.com.br/MLB-5946502262-kit-2-cadeira-poltrona-para-sala-lua-confortavel-e-reforcada-_JM?pdp_filters=item_id%3AMLB5946502262",
  "Kit 2 Capas Sofá (2 E 3 Lugares) Malha Gel Lavável Elásticas":
    "https://produto.mercadolivre.com.br/MLB-3758289917-kit-2-capas-sofa-2-e-3-lugares-malha-gel-lavavel-elasticas-_JM?pdp_filters=item_id%3AMLB3758289917",
  "Kit 2 Câmeras Segurança Ip Interna Externa Wifi iCSee Infravermelho Prova D’Água - HW":
    "https://www.mercadolivre.com.br/kit-2-cameras-seguranca-ip-interna-externa-wifi-icsee-infravermelho-prova-dagua-hw/p/MLB46836439?pdp_filters=item_id%3AMLB5735296442",
  "Kit 2 Estantes Para Livros 5 Prateleiras 188cmx121m Office":
    "https://www.mercadolivre.com.br/kit-2-estantes-para-livros-5-prateleiras-188cmx121m-office/p/MLB43440467?pdp_filters=deal%3AMLB1578289-1",
  "Kit 2 Esteiras Porta Copos Controle Braço Sofá Mdf Caramelo Caramelo":
    "https://www.mercadolivre.com.br/kit-2-esteiras-porta-copos-controle-braco-sofa-mdf-caramelo/up/MLBU1442166835?pdp_filters=item_id%3AMLB3388830171",
  "Kit 2 Glade Refil Odorizador Lavanda & Vanilla 269ml Bom Ar":
    "https://www.mercadolivre.com.br/kit-2-glade-refil-odorizador-lavanda--vanilla-269ml-bom-ar/up/MLBU3787584987?pdp_filters=deal%3AMLB1578289-1",
  "Kit 2 Prendedores De Cortina Magnético Bege Presilha Abraçadeira Ímã Forte Cortineiro Sem Furar Parede Decoração Sala Quarto Escritório Luxo Moderno":
    "https://www.mercadolivre.com.br/kit-2-prendedores-de-cortina-magnetico-bege-presilha-abracadeira-ima-forte-cortineiro-sem-furar-parede-decoracao-sala-quarto-escritorio-luxo-moderno/p/MLB77854205?pdp_filters=item_id%3AMLB7471420362",
  "Kit 2 Puxa Saco Porta Sacolas Sacolinhas + 2 Ganchos Preto E Cinza Lisa":
    "https://www.mercadolivre.com.br/kit-2-puxa-saco-porta-sacolas-sacolinhas-2-ganchos-preto-e-cinza-lisa/p/MLB75324078?pdp_filters=item_id%3AMLB4925405141",
  "Kit 2 Travesseiros 70x50 Antialérgico Lavável Fibra Siliconada Toque de Pluma de Ganso Oaktex Cor Branco":
    "https://www.mercadolivre.com.br/kit-2-travesseiros-70x50-antialergico-lavavel-fibra-siliconada-toque-de-pluma-de-ganso-oaktex-cor-branco/p/MLB43954645?pdp_filters=item_id%3AMLB5197670602",
  "Kit 231 Pcs Irrigação Nebulização Completo Névoa 60m Tubo":
    "https://www.mercadolivre.com.br/kit-231-pcs-irrigacao-nebulizacao-completo-nevoa-60m-tubo/up/MLBU3885795872?pdp_filters=deal%3AMLB1578289-1",
  "Kit 3 Pendentes Dubai 17cm Preto Com Cobre Alumínio E27 Bivolt":
    "https://www.mercadolivre.com.br/kit-3-pendentes-dubai-17cm-preto-com-cobre-aluminio-e27-bivolt/p/MLB31005025?pdp_filters=item_id%3AMLB3602561391",
  "Kit 3 Refletores LED 200W SMD Branco Frio IP66 Carcaça Preta Externo Double Wise":
    "https://www.mercadolivre.com.br/kit-3-refletores-led-200w-smd-branco-frio-ip66-carcaca-preta-externo-double-wise/p/MLB46356018?pdp_filters=item_id%3AMLB7209528884",
  "Kit 3 Vasos Polietileno Para Plantas Decorativo Cone Bacia":
    "https://produto.mercadolivre.com.br/MLB-3745993753-kit-3-vasos-polietileno-para-plantas-decorativo-cone-bacia-_JM?pdp_filters=item_id%3AMLB3745993753",
  "Kit 30 Cabides De Madeira Com Barra Antideslizante":
    "https://www.mercadolivre.com.br/kit-30-cabides-de-madeira-com-barra-antideslizante/p/MLB35433886?pdp_filters=item_id%3AMLB4586845180",
  "Kit 30 Cabides de Madeira Antiderrapantes IRSINA com Gancho Giratório":
    "https://www.mercadolivre.com.br/kit-30-cabides-de-madeira-antiderrapantes-irsina-com-gancho-giratorio/p/MLB53043155?pdp_filters=item_id%3AMLB4131992167",
  "Kit 4 Banquetas Itagold Florida Top Alta Cozinha Americana Bar Balcão Alto Estrutura Preta Atlanta Cor Assento Preto 90cm":
    "https://www.mercadolivre.com.br/kit-4-banquetas-itagold-florida-top-alta-cozinha-americana-bar-balcao-alto-estrutura-preta-atlanta-cor-assento-preto-90cm/p/MLB33391021?pdp_filters=item_id%3AMLB6990926526",
  "Kit 4 Camiseta Dry-fit Sandrini Masculina Academia Caminhada":
    "https://produto.mercadolivre.com.br/MLB-4592320910-kit-4-camiseta-dry-fit-sandrini-masculina-academia-caminhada-_JM?pdp_filters=item_id%3AMLB4592320910",
  "Kit 4 Pote Inox Vidro Hermetico Visor Mantimento Organizador Inox":
    "https://www.mercadolivre.com.br/kit-4-pote-inox-vidro-hermetico-visor-mantimento-organizador-inox/p/MLB67841356?pdp_filters=item_id%3AMLB6644492386",
  "Kit 4 Tapete Protetor Para Cooktop Indução Fogão Cor Preto Preto":
    "https://www.mercadolivre.com.br/kit-4-tapete-protetor-para-cooktop-inducao-fogao-cor-preto/up/MLBU3269616252?pdp_filters=item_id%3AMLB4111090215",
  "Kit 4 Tapetes De Banheiro 40x60 Antiderrapante Bolinha Macio":
    "https://produto.mercadolivre.com.br/MLB-5474407220-kit-4-tapetes-de-banheiro-40x60-antiderrapante-bolinha-macio-_JM?pdp_filters=item_id%3AMLB5474407220",
  "Kit 48 Garfo E Faca Em Inox Talheres De Mesa Buffet Cozinha":
    "https://www.mercadolivre.com.br/kit-48-garfo-e-faca-em-inox-talheres-de-mesa-buffet-cozinha/up/MLBU3859731488?pdp_filters=item_id%3AMLB6486417900",
  "Kit 5 Cabos de Alumínio 1,6m com Rosca Universal para Vassoura e Rodo":
    "https://www.mercadolivre.com.br/kit-5-cabos-de-aluminio-16m-com-rosca-universal-para-vassoura-e-rodo/p/MLB39076648?pdp_filters=deal%3AMLB1578289-1",
  "Kit 5 Capa Para Maca Estética Lençol Lavável 1.90 X 0.80":
    "https://produto.mercadolivre.com.br/MLB-3279098785-kit-5-capa-para-maca-estetica-lencol-lavavel-190-x-080-_JM?pdp_filters=item_id%3AMLB3279098785",
  "Kit 5 Conjunto Acessorios Suporte Banheiro Lavabo Inox 304 Prateado Brilhante":
    "https://www.mercadolivre.com.br/kit-5-conjunto-acessorios-suporte-banheiro-lavabo-inox-304/up/MLBU3398761105?pdp_filters=item_id%3AMLB5664882512",
  "Kit 5 Lençóis Planos de Algodão Lavável para Maca Estética - Branco":
    "https://www.mercadolivre.com.br/kit-5-lencois-planos-de-algodao-lavavel-para-maca-estetica-branco/p/MLB52973351?pdp_filters=item_id%3AMLB4199416129",
  "Kit 6 Capa Cadeira Jantar Malha Spandex Lisa E Estampada":
    "https://produto.mercadolivre.com.br/MLB-2806382228-kit-6-capa-cadeira-jantar-malha-spandex-lisa-e-estampada-_JM?pdp_filters=item_id%3AMLB2806382228",
  "Kit 6 Travesseiros Antialérgico Impermeável 50x70 Lavável Branco":
    "https://www.mercadolivre.com.br/kit-6-travesseiros-antialergico-impermeavel-50x70-lavavel/up/MLBU1719280685?pdp_filters=item_id%3AMLB2664392798",
  "Kit 8 Pilhas Recarregáveis + Carregador Rápido Bivolt Aa/aaa":
    "https://www.mercadolivre.com.br/kit-8-pilhas-recarregaveis--carregador-rapido-bivolt-aaaaa/up/MLBU1727357011?pdp_filters=deal%3AMLB1578289-1",
  "Kit Amassador De Batatas Descascador Espremedor Alho E Limão Prateado":
    "https://www.mercadolivre.com.br/kit-amassador-de-batatas-descascador-espremedor-alho-e-limao/up/MLBU4148215982?pdp_filters=item_id%3AMLB7016615980",
  "Kit C/ 4 Toalha De Banho Gigante 80 X 150 Cm Atacado + Softmax":
    "https://www.mercadolivre.com.br/kit-c-4-toalha-de-banho-gigante-80-x-150-cm-atacado-softmax/p/MLB29561684?pdp_filters=deal%3AMLB1578289-1",
  "Kit Cafeteira Hario V60 Jarra+tampa+suporte+colher+40 Filtro":
    "https://www.mercadolivre.com.br/kit-cafeteira-hario-v60-jarratampasuportecolher40-filtro/up/MLBU785216040?pdp_filters=item_id%3AMLB3383128162",
  "Kit Caipirinha Profissional 7 Peças Inox Coqueteleira 500 Ml":
    "https://www.mercadolivre.com.br/kit-caipirinha-profissional-7-pecas-inox-coqueteleira-500-ml/up/MLBU1742946970?pdp_filters=item_id%3AMLB3761186582",
  "Kit Chimarrão Autochima Couro Mate - 2 Peças Cor Preto":
    "https://www.mercadolivre.com.br/kit-chimarrao-autochima-couro-mate-2-pecas-cor-preto/p/MLB67397582?pdp_filters=item_id%3AMLB6660297782",
  "Kit Cobre Leito Colcha Casal 3 Peças Boutis Lisas Dupla Face Porta Travesseiro Aba Americana Isabel Areia":
    "https://www.mercadolivre.com.br/kit-cobre-leito-colcha-casal-3-pecas-boutis-lisas-dupla-face-porta-travesseiro-aba-americana-isabel-areia/p/MLB67977426?pdp_filters=item_id%3AMLB4436848309",
  "Kit Com 3 Caixas Isca Mata Baratas Mortein Pro C 6 Unid Cada":
    "https://www.mercadolivre.com.br/kit-com-3-caixas-isca-mata-baratas-mortein-pro-c-6-unid-cada/p/MLB26323990?pdp_filters=item_id%3AMLB5725066982",
  "Kit Com 4 Suporte Gancho Parede Decorativo Pendurar Pratos Tamanho Jantar":
    "https://www.mercadolivre.com.br/kit-com-4-suporte-gancho-parede-decorativo-pendurar-pratos-tamanho-jantar/p/MLB65732374?pdp_filters=item_id%3AMLB6294544196",
  "Kit Faqueiro Dourado Luxo Jogo Talheres Inox 24pçs + Maleta Caixa De Papel Bourada":
    "https://www.mercadolivre.com.br/kit-faqueiro-dourado-luxo-jogo-talheres-inox-24pcs--maleta/up/MLBU3994476114?pdp_filters=item_id%3AMLB4701043187",
  "Kit Jogo De Cama Casal 400 Fios 4 Peças Fronhas Ponto Palito Extra Macio Suave Resistente Cor Azul Marinho Premium":
    "https://www.mercadolivre.com.br/kit-jogo-de-cama-casal-400-fios-4-pecas-fronhas-ponto-palito-extra-macio-suave-resistente-cor-azul-marinho-premium/p/MLB53488174?pdp_filters=item_id%3AMLB5552010910",
  "Kit Peseira Cama Casal Queen Trico Manta +2 Capas Almofadas":
    "https://produto.mercadolivre.com.br/MLB-4133684102-kit-peseira-cama-casal-queen-trico-manta-2-capas-almofadas-_JM",
  "Kit Pia Lixeira 5l Dispenser Inox Sabão Organizador Cozinha Cinza":
    "https://www.mercadolivre.com.br/kit-pia-lixeira-5l-dispenser-inox-sabao-organizador-cozinha/up/MLBU4396395925?pdp_filters=item_id%3AMLB7237427980",
  "Kit Potes Porta Mantimento Hermético Quadrado Cozinha 12 Uni":
    "https://www.mercadolivre.com.br/kit-potes-porta-mantimento-hermetico-quadrado-cozinha-12-uni/p/MLB37246326?pdp_filters=item_id%3AMLB3733990167",
  "Krups Heineken Chopeira De Cerveja Preto De Com 5l":
    "https://www.mercadolivre.com.br/krups-heineken-chopeira-de-cerveja-preto-de-com-5l/p/MLB43207749?pdp_filters=deal%3AMLB1578289-1",
  "LUMAI Kit Tábua Grande Para Queijos e Frios de Bambu Premium Polimento Duplo + Petisqueira - Suporte Magnético - Tabua para Servir de 40cm x 29,5cm - Qualidade para Receber em Casa Familia e Amigos":
    "https://www.mercadolivre.com.br/lumai-kit-tabua-grande-para-queijos-e-frios-de-bambu-premium-polimento-duplo-petisqueira-suporte-magnetico-tabua-para-servir-de-40cm-x-295cm-qualidade-para-receber-em-casa-familia-e-amigos/p/MLB51230564?pdp_filters=item_id%3AMLB4469866875",
  "Lareira A Lenha Portátil Rústica 55cm Aço Carbono":
    "https://www.mercadolivre.com.br/lareira-a-lenha-portatil-rustica-55cm-aco-carbono/p/MLB2099030246?pdp_filters=deal%3AMLB1578289-1",
  "Lavadora Lava Jato Portátil Pressão 2 Baterias + Maleta Preto 127/220v 50 Hz X 60 Hz":
    "https://www.mercadolivre.com.br/lavadora-lava-jato-portatil-pressao-2-baterias--maleta/up/MLBU605239077?pdp_filters=item_id%3AMLB3621404839",
  "Leiteira Caneco Tramontina 1,7 Litros Canecão Fervedor Antiaderente Starflon Max Turim Cor Chumbo 14 Cm De Diâmetro Fogão A Gás Elétrico E Vitrocerâmico Fácil De Limpar Mais Durável Cabo Baquelite":
    "https://www.mercadolivre.com.br/leiteira-caneco-tramontina-17-litros-canecao-fervedor-antiaderente-starflon-max-turim-cor-chumbo-14-cm-de-diametro-fogao-a-gas-eletrico-e-vitroceramico-facil-de-limpar-mais-duravel-cabo-baquelite/p/MLB47631250?pdp_filters=item_id%3AMLB4019438161",
  "Lorenzetti Chuveiro Elétrico Advanced Multitemperaturas Branco 127V​":
    "https://www.mercadolivre.com.br/lorenzetti-chuveiro-eletrico-advanced-multitemperaturas-branco-127v/p/MLB28580023?pdp_filters=deal%3AMLB1578289-1",
  "Lorenzetti Ducha Elétrica de parede Advanced Multitemperaturas branco":
    "https://www.mercadolivre.com.br/lorenzetti-ducha-eletrica-de-paredeadvancedmultitemperaturas-branco/p/MLB15488155?pdp_filters=deal%3AMLB1578289-1",
  "Luminária Abajur Atlas Chão Quarto De Madeira Mdf Imbuia Cru Imbúia":
    "https://www.mercadolivre.com.br/luminaria-abajur-atlas-chao-quarto--de-madeira-mdf-imbuia/up/MLBU1155298090?pdp_filters=item_id%3AMLB3729727342",
  "Luminária De Chão Pedestal De Piso Abajur Articulada Flexive":
    "https://www.mercadolivre.com.br/luminaria-de-chao-pedestal-de-piso-abajur-articulada-flexive/p/MLB66372201?pdp_filters=deal%3AMLB1578289-1",
  "Lustre Led Sala Moderno 60w, 3 Arcos Pendente Luminária Teto 127/220v Dourado":
    "https://www.mercadolivre.com.br/lustre-led-sala-moderno-60w-3-arcos-pendente-luminaria-teto/up/MLBU3320959149?pdp_filters=item_id%3AMLB5522151066",
  "Lustre Pendente Moderna Led,luminaria Dourado Redondo Sala 127/220v Dourado":
    "https://www.mercadolivre.com.br/lustre-pendente-moderna-ledluminaria-dourado-redondo-sala/up/MLBU3389318166?pdp_filters=item_id%3AMLB5644117516",
  "Manta Para Sofá 400x180 Mts Luxo Super King Gigante":
    "https://produto.mercadolivre.com.br/MLB-4660643073-manta-para-sofa-400x180-mts-luxo-super-king-gigante-_JM?pdp_filters=item_id%3AMLB4660643073",
  "Mesa De Jantar 6 Lugares Retangular Rufato Alvorada Londrina Cor Vel. Capuccino Off White Imbuia":
    "https://www.mercadolivre.com.br/mesa-de-jantar-6-lugares-retangular-rufato-alvorada-londrina-cor-vel-capuccino-off-white-imbuia/p/MLB43994432?pdp_filters=deal%3AMLB1578289-1",
  "Mesa De Jantar Mdf 4 Lugares Retangular Moderna - Blue Moby Off Write Freijó":
    "https://www.mercadolivre.com.br/mesa-de-jantar-mdf-4-lugares-retangular-moderna--blue-moby/up/MLBU4036939854?pdp_filters=deal%3AMLB1578289-1",
  "Mesa Dobravel Parede Retratil 90x40 Cozinha Quarto Suspensa Branco":
    "https://www.mercadolivre.com.br/mesa-dobravel-parede-retratil-90x40-cozinha-quarto-suspensa/up/MLBU4037729853?pdp_filters=item_id%3AMLB6895945052",
  "Mesa Jantar Redonda G&d Madeira 80cm Industrial":
    "https://produto.mercadolivre.com.br/MLB-3983937103-mesa-jantar-redonda-gd-madeira-80cm-industrial-_JM?pdp_filters=item_id%3AMLB3983937103",
  "Mesa Tabua De Passar Roupa Slim Dobrável Reforçada Passadera Cor Branca Liso":
    "https://www.mercadolivre.com.br/mesa-tabua-de-passar-roupa-slim-dobravel-reforcada-passadera-cor-branca-liso/p/MLB64578882?pdp_filters=item_id%3AMLB5979802832",
  "Mini Ventilador Soprador Ar Turbo 130000rpm Assoprador Sem Fio Recarregável USB-C 3 Níveis Jato Forte Portátil Multiuso Limpeza Teclado Carro Acende Churrasqueira Davely":
    "https://www.mercadolivre.com.br/mini-ventilador-soprador-ar-turbo-130000rpm-assoprador-sem-fio-recarregavel-usb-c-3-niveis-jato-forte-portatil-multiuso-limpeza-teclado-carro-acende-churrasqueira-davely/p/MLB69649128?pdp_filters=item_id%3AMLB6781687878",
  "Mop Giratório 8l Rodinhas Esfregão 130cm Cesto Inox C/ Refil":
    "https://www.mercadolivre.com.br/mop-giratorio-8l-rodinhas-esfregao-130cm-cesto-inox-c-refil/p/MLB44676406?pdp_filters=item_id%3AMLB4215460487",
  "Mosquiteiro De Teto Casal Queen Box Com Elástico Proteção":
    "https://produto.mercadolivre.com.br/MLB-5885559268-mosquiteiro-de-teto-casal-queen-box-com-elastico-proteco-_JM?pdp_filters=item_id%3AMLB5885559268",
  "Motosserra + Tesoura Elétrica C/2 Baterias Recarregável 48v Laranja 48v":
    "https://www.mercadolivre.com.br/motosserra--tesoura-eletrica-c2-baterias-recarregavel-48v/up/MLBU3740516721?pdp_filters=item_id%3AMLB4433889763",
  "Movel Balcao Maquina Lavar Loucas E Roupas Metal Preto Tampo Preto":
    "https://www.mercadolivre.com.br/movel-balcao-maquina-lavar-loucas-e-roupas/up/MLBU3388830858?pdp_filters=item_id%3AMLB4178426381",
  "Módulo Relé Cortina Persiana + Controle Rf Weg Bivolt Alexa":
    "https://www.mercadolivre.com.br/modulo--rele-cortina-persiana--controle-rf-weg-bivolt-alexa/up/MLBU3026827934?pdp_filters=deal%3AMLB1578289-1",
  "Omeleteira Elétrica Dupla Omelete Antiaderente Kian":
    "https://www.mercadolivre.com.br/omeleteira-eletrica-dupla-omelete-antiaderente-kian/p/MLB62193949?pdp_filters=deal%3AMLB1578289-1",
  "Organizador De Roupas De Chão Arara Desmontável C/ Sapateira Preto":
    "https://www.mercadolivre.com.br/organizador-de-roupas-de-chao-arara-desmontavel-c-sapateira-preto/p/MLB77351120?pdp_filters=deal%3AMLB1578289-1",
  "Organizador De Roupas Portátil Grande Metal P/ Quarto Closet Arara Com Sapateira Preto":
    "https://www.mercadolivre.com.br/organizador-de-roupas-portatil-grande-metal-p-quarto-closet/up/MLBU3760491386?pdp_filters=item_id%3AMLB6200426510",
  "Painel Clique Móveis Tv 50” Ripado 3D Off White com Nichos":
    "https://www.mercadolivre.com.br/painel-clique-moveis-tv-50-ripado-3d-off-white-com-nichos/p/MLB40556621?pdp_filters=deal%3AMLB1578289-1",
  "Painel Led Grow Quantum Samsung Lm281b 120w Dimmer Cultivo Full Spectrum 127/220v":
    "https://www.mercadolivre.com.br/painel-led-grow-quantum-samsung-lm281b-120w-dimmer-cultivo/up/MLBU1736837866?pdp_filters=deal%3AMLB1578289-1",
  "Painel Madeira Ripado Laminado Linha Madeto 2,5m Cor Cinamomo Meu Rodapé":
    "https://www.mercadolivre.com.br/painel-madeira-ripado-laminado-linha-madeto-25m-cor-cinamomo-meu-rodape/p/MLB35729854?pdp_filters=item_id%3AMLB5271005844",
  "Painel Rack Suspenso Tv 55 Led Prateleira Denver Led Cinamomo/off White":
    "https://www.mercadolivre.com.br/painel-rack-suspenso-tv-55--led-prateleira-denver-led/up/MLBU4323371771?pdp_filters=deal%3AMLB1578289-1",
  "Painel TV Ripado Preto 3D com Nichos e Prateleira 50 Polegadas":
    "https://www.mercadolivre.com.br/painel-tv-ripado-preto-3d-com-nichos-e-prateleira-50-polegadas/p/MLB39878021?pdp_filters=deal%3AMLB1578289-1",
  "Panela De Pressão 4,5l Tramontina Vancouver Effect 20591-720 Cor Vermelho":
    "https://www.mercadolivre.com.br/panela-de-pressao-45l-tramontina-vancouver-effect-20591-720-cor-vermelho/p/MLB42501702?pdp_filters=deal%3AMLB1578289-1",
  "Panela De Pressão Antiaderente Fecho Externo Vanila 5 Litros":
    "https://www.mercadolivre.com.br/panela-de-pressao-antiaderente-fecho-externo-vanila-5-litros/p/MLB53365642?pdp_filters=deal%3AMLB1578289-1",
  "Panela De Pressão Brinox Pressure 4,2l Ø20 X 14,5 Cm Vanilla Baunilha":
    "https://www.mercadolivre.com.br/panela-de-pressao-brinox-pressure-42l-20-x-145-cm-vanilla-baunilha/p/MLB22663071?pdp_filters=deal%3AMLB1578289-1",
  "Panela de Pressão Vitrex Ceramic 4.2 L Cinza, com Indução e Antiaderente":
    "https://www.mercadolivre.com.br/panela-de-pressao-vitrex-ceramic-42-l-cinza-com-inducao-e-antiaderente/p/MLB75898879?pdp_filters=deal%3AMLB1578289-1",
  "Parafusadeira E Furadeira Impacto The Black Tools Tb-21pw 3/8 Cor Amarelo Frequência 50/60 Hz":
    "https://www.mercadolivre.com.br/parafusadeira-e-furadeira-impacto-the-black-tools-tb-21pw-38-cor-amarelo-frequencia-5060-hz/p/MLB38053317?pdp_filters=deal%3AMLB1578289-1",
  "Penteadeira Camarim Com Espelho França Off Ic Off White/freijó":
    "https://www.mercadolivre.com.br/penteadeira-camarim-com-espelho-franca-off-ic-off-whitefreijo/p/MLB63167176?pdp_filters=deal%3AMLB1578289-1",
  "Penteadeira Camarim Jolie Com LED Espelho E 2 Gavetas Organizadora Maquiagem Para Studio E Quarto Cor Branco":
    "https://www.mercadolivre.com.br/penteadeira-camarim-jolie-com-led-espelho-e-2-gavetas-organizadora-maquiagem-para-studio-e-quarto-cor-branco/p/MLB61373993?pdp_filters=deal%3AMLB1578289-1",
  "Penteadeira Ditália 7 Gavetas Pe-80 Branco Uv Acetinado":
    "https://www.mercadolivre.com.br/penteadeira-ditalia-7-gavetas-pe-80-branco-uv-acetinado/p/MLB23608023?pdp_filters=item_id%3AMLB3396073611",
  "Penteadeira Paris C/ Espelho - Beleza E Praticidade Branco":
    "https://www.mercadolivre.com.br/penteadeira-paris-c-espelho--beleza-e-praticidade/up/MLBU2994397600?pdp_filters=item_id%3AMLB5273869780",
  "Pillow Top Protetor Colchão Cama Casal 400 Fios Toque Macio Branco Matelado Liso Casal":
    "https://www.mercadolivre.com.br/pillow-top-protetor-colchao-cama-casal-400-fios-toque-macio/up/MLBU3245235010?pdp_filters=item_id%3AMLB4096832661",
  "Pingômetro 03 Litros Barrica Revestido Madeira Whisky, Pinga":
    "https://www.mercadolivre.com.br/pingometro-03-litros-barrica-revestido-madeira-whisky-pinga/p/MLB2083007227?pdp_filters=item_id%3AMLB5324112096",
  "Piscina 2000 Litros Botafogo Lar & Lazer Estrutura Aço Retangular":
    "https://www.mercadolivre.com.br/piscina-2000-litros-botafogo-lar-lazer-estrutura-aco-retangular/p/MLB12174055?pdp_filters=deal%3AMLB1578289-1",
  "Placa De Números Residenciais Alumínio Composto Acm Moderna":
    "https://produto.mercadolivre.com.br/MLB-3918497427-placa-de-numeros-residenciais-aluminio-composto-acm-moderna-_JM?pdp_filters=item_id%3AMLB3918497427",
  "Placa Porcionadora Dosadora 15g 50 Furos Doces Brigadeiro Branco":
    "https://www.mercadolivre.com.br/placa-porcionadora-dosadora-15g-50-furos-doces-brigadeiro/up/MLBU3984719126?pdp_filters=item_id%3AMLB6798244822",
  "Poltrona Decorativa Opala Suede Para Sala Arapongas Luxo":
    "https://produto.mercadolivre.com.br/MLB-5219426134-poltrona-decorativa-opala-suede-para-sala-arapongas-luxo-_JM",
  "Poltrona Inflável Ultra Lounge Com Pufe Sofá Preguiçoso Cor Marrom":
    "https://www.mercadolivre.com.br/poltrona-inflavel-ultra-lounge-com-pufe-sofa-preguicoso-cor-marrom/p/MLB24673624?pdp_filters=item_id%3AMLB4578704442",
  "Porta Cinzeiro Ferro Fundido Fornalha Fogão A Lenha":
    "https://www.mercadolivre.com.br/porta-cinzeiro-ferro-fundido-fornalha-fogao-a-lenha/p/MLB47583736?pdp_filters=item_id%3AMLB7574368488",
  "Porta Condimentos Giratório Inox 12 Potes Vidro Quadrado Prateado":
    "https://www.mercadolivre.com.br/porta-condimentos-giratorio-inox-12-potes-vidro-quadrado/up/MLBU3938771307?pdp_filters=deal%3AMLB1578289-1",
  "Porta Guarda-chuva Suporte Decorativo Feito Em Aço Metal Preto":
    "https://www.mercadolivre.com.br/porta-guarda-chuva-suporte-decorativo-feito-em-aco-metal-preto/p/MLB69031396?pdp_filters=item_id%3AMLB6760719272",
  "Porta Pães Tampa Retrátil De Bambu Ecokitchen Mimo Style":
    "https://www.mercadolivre.com.br/porta-paes-tampa-retratil-de-bambu-ecokitchen-mimo-style/p/MLB24154450?pdp_filters=item_id%3AMLB5048226501",
  "Porteiro Eletrônico Interfone Residencial HLG 110/220v Cinza/preto":
    "https://www.mercadolivre.com.br/porteiro-eletronico-interfone-residencial-hlg-110220v/up/MLBU1418741748?pdp_filters=item_id%3AMLB2036155731",
  "Porteiro Residencial Ipr 8010 Preto/Branco Intelbras":
    "https://www.mercadolivre.com.br/porteiro-residencial-ipr-8010-pretobranco-intelbras/p/MLB38112373?pdp_filters=deal%3AMLB1578289-1",
  "Prateleira 6 Andares De Ferro Estante Para Escritório Aço Preto":
    "https://www.mercadolivre.com.br/prateleira-6-andares-de-ferro-estante-para-escritorio-aco/up/MLBU3932895698?pdp_filters=item_id%3AMLB4638505847",
  "Prateleira Estante Aço Galvanizado 6 Bandejas 1,98x90x28cm Cinza":
    "https://www.mercadolivre.com.br/prateleira-estante-aco-galvanizado-6-bandejas-198x90x28cm/up/MLBU5128954321?pdp_filters=item_id%3AMLB5213996863",
  "Prateleira Tampo Amadeirado 180x20 15mm Com Suporte Amadeirado":
    "https://www.mercadolivre.com.br/prateleira-tampo-amadeirado-180x20-15mm-com-suporte/up/MLBU1170400106?pdp_filters=item_id%3AMLB4724188012",
  "Rack Bancada Para Tv Até 75 Aurora 1.8 Mobler 1 Porta Com Pés Design Sala Moderna Cor Pérola Metalizado/cinamomo Mel":
    "https://www.mercadolivre.com.br/rack-bancada-para-tv-ate-75-aurora-18-mobler-1-porta-com-pes-design-sala-moderna-cor-perola-metalizadocinamomo-mel/p/MLB49608935?pdp_filters=deal%3AMLB1578289-1",
  "Rack Com Painel Para Tv Até 75 Polegadas Com Led Impressão":
    "https://www.mercadolivre.com.br/rack-com-painel-para-tv-ate-75-polegadas-com-led-impressao/p/MLB36469822?pdp_filters=deal%3AMLB1578289-1",
  "Rack Estante Industrial Mdp 120x60 Com Espaço Pra Decoração Preto":
    "https://www.mercadolivre.com.br/rack-estante-industrial-mdp-120x60-com-espaco-pra-decoracao/up/MLBU3983714178?pdp_filters=item_id%3AMLB6796635100",
  "Rafia De Solo 4,2x10m 42m² Jardim Proteção Ervas Daninhas":
    "https://www.mercadolivre.com.br/rafia-de-solo-42x10m-42m-jardim-protecao-ervas-daninhas/p/MLB65158309?pdp_filters=item_id%3AMLB4455509291",
  "Rafia De Solo Preta 4,2x5m Para Jardim Horta E Canteiro 21m":
    "https://www.mercadolivre.com.br/rafia-de-solo-preta-42x5m-para-jardim-horta-e-canteiro-21m/p/MLB65159861?pdp_filters=item_id%3AMLB6216008462",
  "Rechaud Buffet Redondo 6L em Aço Inoxidável Dourado com Sistema Banho Maria, Tampa e Suporte, Ideal para Buffet, Restaurante, Hotel, Casamentos, Catering, Festas e Eventos":
    "https://www.mercadolivre.com.br/rechaud-buffet-redondo-6l-em-aco-inoxidavel-dourado-com-sistema-banho-maria-tampa-e-suporte-ideal-para-buffet-restaurante-hotel-casamentos-catering-festas-e-eventos/p/MLB74954225?pdp_filters=deal%3AMLB1578289-1",
  "Rede De Descanso Aconchego Gigante Casal Promoção Atacado":
    "https://produto.mercadolivre.com.br/MLB-5517879268-rede-de-descanso-aconchego-gigante-casal-promoco-atacado-_JM?pdp_filters=item_id%3AMLB5517879268",
  "Relógio Parede LED Digital Grande 46x22cm Hall Entrada Academia Hospital Igreja Comércio Recepção Calendário Termômetro Data Hora 12/24h Temperatura Dia Mês Ano Memória Bivolt 110/220 Cor Preto":
    "https://www.mercadolivre.com.br/relogio-parede-led-digital-grande-46x22cm-hall-entrada-academia-hospital-igreja-comercio-recepcao-calendario-termometro-data-hora-1224h-temperatura-dia-mes-ano-memoria-bivolt-110220-cor-preto/p/MLB47887434?pdp_filters=item_id%3AMLB5363461592",
  "Repelente Ultrassônico Zebu Ermu Turbo Rato Morcego Sonoro 127/220v":
    "https://www.mercadolivre.com.br/repelente-ultrassonico-zebu-ermu-turbo-rato-morcego-sonoro/up/MLBU4226018846?pdp_filters=item_id%3AMLB7097409214",
  "Resistencia Chuveiro Lorenzetti Acqua Duo Ultra 220v 7800w Branco":
    "https://www.mercadolivre.com.br/resistencia-chuveiro-lorenzetti-acqua-duo-ultra-220v-7800w/up/MLBU2569013459?pdp_filters=item_id%3AMLB3890548595",
  "Revitalizador Limpa Granito Mármore Black 140ml Brilho Novo":
    "https://www.mercadolivre.com.br/revitalizador-limpa-granito-marmore-black-140ml-brilho-novo/up/MLBU3856434633?pdp_filters=deal%3AMLB1578289-1",
  "Sabao Liquido Omo Lavanderia Profissional 7 L":
    "https://www.mercadolivre.com.br/sabao-liquido-omo-lavanderia-profissional-7-l/p/MLB20706880?pdp_filters=item_id%3AMLB5140298491",
  "Safety 1st, Berço Mini Play, Grey Denim":
    "https://www.mercadolivre.com.br/safety-1st-berco-mini-play-grey-denim/p/MLB25326850?pdp_filters=deal%3AMLB1578289-1",
  "Saia Para Cama Box Casal Ponto Palito Luxuosa Toque Macio":
    "https://produto.mercadolivre.com.br/MLB-4433041399-saia-para-cama-box-casal-ponto-palito-luxuosa-toque-macio-_JM?pdp_filters=item_id%3AMLB4433041399",
  "Saia Para Cama Box Queen Ponto Palito Moderna Elegante Macia":
    "https://produto.mercadolivre.com.br/MLB-4433157451-saia-para-cama-box-queen-ponto-palito-moderna-elegante-macia-_JM?pdp_filters=item_id%3AMLB4433157451",
  "Sala De Jantar 160x80 Lottus Mdf/vidro 6 Cadeiras Bom Pastor Base Naturale Cadeiras Bege Matelassê (losangos)":
    "https://www.mercadolivre.com.br/sala-de-jantar-160x80-lottus-mdfvidro-6-cadeiras-bom-pastor/up/MLBU3768302407?pdp_filters=item_id%3AMLB6223242366",
  "Sapateira Organizador Sapatos Empilhável Vertical 6 Andares":
    "https://produto.mercadolivre.com.br/MLB-5312090728-sapateira-organizador-sapatos-empilhavel-vertical-6-andares-_JM",
  "Sino de Fazenda Bronze 1,5 kg com Suporte de Ferro Cobre Lux":
    "https://www.mercadolivre.com.br/sino-de-fazenda-bronze-15-kg-com-suporte-de-ferro-cobre-lux/p/MLB24796873?pdp_filters=item_id%3AMLB3404812627",
  "Skimmer Flutuante Para Piscina Com 3m De Mangueira":
    "https://www.mercadolivre.com.br/skimmer-flutuante-para-piscina-com-3m-de-mangueira/p/MLB28086847?pdp_filters=deal%3AMLB1578289-1",
  "Sofá 2 Lugares 2,00m Retrátil E Reclinável Milano Bom Pastor":
    "https://produto.mercadolivre.com.br/MLB-4202911771-sofa-2-lugares-200m-retratil-e-reclinavel-milano-bom-pastor-_JM?pdp_filters=item_id%3AMLB4202911771",
  "Sofá Cama Retrátil Linho Com Rinheira Bom Pastor Innova Cor Linho Cinza":
    "https://www.mercadolivre.com.br/sofa-cama-retratil-linho-com-rinheira-bom-pastor-innova-cor-linho-cinza/p/MLB26845258?pdp_filters=item_id%3AMLB6222877388",
  "Sofá Inflável Poltrona Preguiços Com Pufe Para Praia Camping Bege":
    "https://www.mercadolivre.com.br/sofa-inflavel-poltrona-preguicos-com-pufe-para-praia-camping/up/MLBU4443872942?pdp_filters=deal%3AMLB1578289-1",
  "Sofá Retrátil Reclinável Verona Plus 1,50 Velut Hellen Decor Cinza Liso":
    "https://www.mercadolivre.com.br/sofa-retratil-reclinavel-verona-plus-150-velut-hellen-decor/up/MLBU3543062210?pdp_filters=deal%3AMLB1578289-1",
  "Sofá-cama 2 Lugares Reclinável Veludo Captone Estrutura Madeira Cinza 130x190cm":
    "https://www.mercadolivre.com.br/sofa-cama-2-lugares-reclinavel-veludo-captone-estrutura-madeira-cinza-130x190cm/p/MLB44878625?pdp_filters=deal%3AMLB1578289-1",
  "TP-Link Tapo C200 Câmera de Segurança Wifi 1080P 360° Pan/Tilt":
    "https://www.mercadolivre.com.br/tp-link-tapo-c200-camera-de-seguranca-wifi-1080p-360-pantilt/p/MLB18593981?pdp_filters=deal%3AMLB1578289-1",
  "Tabua De Passar Roupa Reforçada Com Porta Ferro 3 Alturas Cor Preto Liso":
    "https://www.mercadolivre.com.br/tabua-de-passar-roupa-reforcada-com-porta-ferro-3-alturas-cor-preto-liso/p/MLB62377315?pdp_filters=item_id%3AMLB5954685424",
  "Tampa De Proteção P/ Dispositivo Aspiração Piscina -roscavel Branco":
    "https://www.mercadolivre.com.br/tampa-de-protecao-p-dispositivo-aspiracao-piscina-roscavel/up/MLBU3696482474?pdp_filters=item_id%3AMLB4037137341",
  "Tapete Antiderrapante Box Piso Banheiro Piscina 80cmx120 Cm":
    "https://produto.mercadolivre.com.br/MLB-5407211878-tapete-antiderrapante-box-piso-banheiro-piscina-80cmx120-cm-_JM?pdp_filters=item_id%3AMLB5407211878",
  "Tapete Grande 3,00x2,00 Sala Luxo Macio Antiderrapante Lindo 3 M 2 M Marrom":
    "https://www.mercadolivre.com.br/tapete-grande-300x200-sala-luxo-macio-antiderrapante-lindo/up/MLBU3833789813?pdp_filters=deal%3AMLB1578289-1",
  "Tapete Redondo 100% Algodão 1,00x1,00. Fácil De Limpar!":
    "https://produto.mercadolivre.com.br/MLB-3429584493-tapete-redondo-100-algodo-100x100-facil-de-limpar-_JM?pdp_filters=item_id%3AMLB3429584493",
  "Tapete Sala Quarto Grande 300x200 Jacquard Antiderrapante 2 M 3 M Boho Marrom":
    "https://www.mercadolivre.com.br/tapete-sala-quarto-grande-300x200-jacquard-antiderrapante/up/MLBU3941206193?pdp_filters=deal%3AMLB1578289-1",
  "Tela Sombrite 5m X 3m 80% Sombreamento Pergolado Acabamento Preto":
    "https://www.mercadolivre.com.br/tela-sombrite-5m-x-3m-80-sombreamento-pergolado-acabamento/up/MLBU3953376002?pdp_filters=item_id%3AMLB4661217259",
  "Tela Sombrite 90% Alças Reforçadas Toldo Garagem Piscinas Preto 3m X 5m":
    "https://www.mercadolivre.com.br/tela-sombrite-90-alcas-reforcadas-toldo-garagem-piscinas/up/MLBU3941641713?pdp_filters=item_id%3AMLB4661303179",
  "Tenda Gazebo Sanfonada Articulada Desmontável 3x3 Metros Marqs Home Impermeável Estrutura Aço Leve E Reforçada Proteção Solar Uv Chuva Vento Barraca Camping Praia Eventos Feira Carro Azul":
    "https://www.mercadolivre.com.br/tenda-gazebo-sanfonada-articulada-desmontavel-3x3-metros-marqs-home-impermeavel-estrutura-aco-leve-e-reforcada-protecao-solar-uv-chuva-vento-barraca-camping-praia-eventos-feira-carro-azul/p/MLB64971022?pdp_filters=item_id%3AMLB6928133034",
  "Termômetro Para Compostagem / Solo Haste 50 Cm 0 A 120 Graus":
    "https://www.mercadolivre.com.br/termometro-para-compostagem-solo-haste-50-cm-0-a-120-graus/p/MLB2089725638?pdp_filters=item_id%3AMLB3023501195",
  "Torneira Cozinha Gourmet Bancada Flexível Monocomando Pia Preto B22-black":
    "https://www.mercadolivre.com.br/torneira-cozinha-gourmet-bancada-flexivel-monocomando-pia/up/MLBU3376382968?pdp_filters=deal%3AMLB1578289-1",
  "Torneira Para Pia Cozinha Bancada Gourmet Monocomando Escovada Acabamento Aço Inox 304 Cor Prateado Escovado Winda Prateado Escovado":
    "https://www.mercadolivre.com.br/torneira-para-pia-cozinha-bancada-gourmet-monocomando-escovada-acabamento-aco-inox-304-cor-prateado-escovado-winda-prateado-escovado/p/MLB50402011?pdp_filters=item_id%3AMLB6573998484",
  "Torre Chopp Chopeira Refil Congelante Aço Inox 2,5l Vollekz":
    "https://www.mercadolivre.com.br/torre-chopp-chopeira-refil-congelante-aco-inox-25l-vollekz/p/MLB63701000?pdp_filters=item_id%3AMLB6115896136",
  "Triturador De Folhas Forrageiro Te 26t 2cv Bivolt Tramontina":
    "https://www.mercadolivre.com.br/triturador-de-folhas-forrageiro-te-26t-2cv-bivolt-tramontina/p/MLB61753627?pdp_filters=deal%3AMLB1578289-1",
  "Tênis Masculino Feminino Kappa Park 2.0 Original":
    "https://produto.mercadolivre.com.br/MLB-4049279695-tnis-masculino-feminino-kappa-park-20-original-_JM",
  "Varal De Chão Grande Reforçado Com Abas Dobrável Retrátil Slim":
    "https://www.mercadolivre.com.br/varal-de-chao-grande-reforcado-com-abas-dobravel-retratil-slim/p/MLB75657162?pdp_filters=item_id%3AMLB4931079017",
  "Varal De Chão Roupa 3 Andares Retrátil Dobrável Liga Metálica Resistente Cinza":
    "https://www.mercadolivre.com.br/varal-de-chao-roupa-3-andares-retratil-dobravel-liga-metalica-resistente-cinza/p/MLB72196405?pdp_filters=item_id%3AMLB4917199057",
  "Varal Dobrável De Chão 3 Andares De Roupas Grande Com Rodinha Aba Lateral Retrátil Para Cabide Irsina":
    "https://www.mercadolivre.com.br/varal-dobravel-de-chao-3-andares-de-roupas-grande-com-rodinha-aba-lateral-retratil-para-cabide-irsina/p/MLB51534391?pdp_filters=item_id%3AMLB5528348396",
  "Varal Inox Suspenso 40 Prendedores Fixos Para Secagem Roupas Prata":
    "https://www.mercadolivre.com.br/varal-inox-suspenso-40-prendedores-fixos-para-secagem-roupas/up/MLBU4120311851?pdp_filters=item_id%3AMLB6996265396",
  "Vaso Sanitário Tubrax Monobloco VAB0002 Caixa Acoplada Completo Privada Cor Branco":
    "https://www.mercadolivre.com.br/vaso-sanitario-tubrax-monobloco-vab0002-caixa-acoplada-completo-privada-cor-branco/p/MLB24273671?pdp_filters=deal%3AMLB1578289-1",
  "Ventilador Soprador De Ar Turbo 130000 Rpm Sem Fio Portátil Sortido 127/220v":
    "https://www.mercadolivre.com.br/ventilador-soprador-de-ar-turbo-130000-rpm-sem-fio-portatil/up/MLBU3394654802?pdp_filters=deal%3AMLB1578289-1",
  "Árvore De Natal Verde Luxo 150 500 Galho - Pé De Ferro DEKASA":
    "https://www.mercadolivre.com.br/arvore-de-natal-verde-luxo-150-500-galho-pe-de-ferro-dekasa/p/MLB54096512?pdp_filters=item_id%3AMLB5643054880",
  "Árvore de Natal Verde Premium 180 cm com 1000 Galhos Cheios e Pé de Ferro Atelier Enovelada":
    "https://www.mercadolivre.com.br/arvore-de-natal-verde-premium-180-cm-com-1000-galhos-cheios-e-pe-de-ferro-atelier-enovelada/p/MLB22234448?pdp_filters=item_id%3AMLB7347726074",
};
