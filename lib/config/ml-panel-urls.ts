/**
 * Product page of each panel product, read from the affiliate panel card itself
 * (the address the Linkbuilder needs). Keyed by the exact panel title. Rows without
 * an entry fall back to copying the title.
 */
export const ML_PANEL_URLS: Readonly<Record<string, string>> = {
  "Aparelho De Jantar E Chá/café 20 Peças Vidro Opaline Branco Branco Floral":
    "https://www.mercadolivre.com.br/aparelho-de-jantar-e-chacafe-20-pecas-vidro-opaline-branco/up/MLBU4550165459?pdp_filters=deal%3AMLB1578289-1",
  "Cama Box Solteiro + Colchão Molas Ensacadas Zidi Miami 88cm":
    "https://www.mercadolivre.com.br/cama-box-solteiro-colchao-molas-ensacadas-zidi-miami-88cm/p/MLB24138857?pdp_filters=item_id%3AMLB6428436198",
  "Capa Protetora Colchão Box Casal Padrão Matelado Impermeável":
    "https://produto.mercadolivre.com.br/MLB-4002919471-capa-protetora-colcho-box-casal-padro-matelado-impermeavel-_JM",
  "Conjunto Panelas Antiaderente 10 Peças Teflon Várias Cores Preto":
    "https://www.mercadolivre.com.br/conjunto-panelas-antiaderente-10-pecas-teflon-varias-cores/up/MLBU1160703222?pdp_filters=item_id%3AMLB7143036284",
  "Copo Térmico Gigante 1,2l Inox Com Tampa E Inox Canudo":
    "https://produto.mercadolivre.com.br/MLB-4339787931-copo-termico-gigante-12l-inox-com-tampa-e-inox-canudo-_JM?pdp_filters=item_id%3AMLB4339787931",
  "Kit 10 Potes Herméticos Vidro 640ml Starhouse Marmita Forno Micro-ondas Airfryer com 4 travas de super vedação":
    "https://www.mercadolivre.com.br/kit-10-potes-hermeticos-vidro-640ml-starhouse-marmita-forno-micro-ondas-airfryer-com-4-travas-de-super-vedacao/p/MLB53222689?pdp_filters=item_id%3AMLB5574851656",
  "Kit 2 Câmeras Segurança Ip Interna Externa Wifi iCSee Infravermelho Prova D’Água - HW":
    "https://www.mercadolivre.com.br/kit-2-cameras-seguranca-ip-interna-externa-wifi-icsee-infravermelho-prova-dagua-hw/p/MLB46836439?pdp_filters=item_id%3AMLB5735296442",
  "Kit 2 Travesseiros 70x50 Antialérgico Lavável Fibra Siliconada Toque de Pluma de Ganso Oaktex Cor Branco":
    "https://www.mercadolivre.com.br/kit-2-travesseiros-70x50-antialergico-lavavel-fibra-siliconada-toque-de-pluma-de-ganso-oaktex-cor-branco/p/MLB43954645?pdp_filters=item_id%3AMLB5197670602",
  "Kit C/ 4 Toalha De Banho Gigante 80 X 150 Cm Atacado + Softmax":
    "https://www.mercadolivre.com.br/kit-c-4-toalha-de-banho-gigante-80-x-150-cm-atacado-softmax/p/MLB29561684?pdp_filters=deal%3AMLB1578289-1",
  "Kit Potes Porta Mantimento Hermético Quadrado Cozinha 12 Uni":
    "https://www.mercadolivre.com.br/kit-potes-porta-mantimento-hermetico-quadrado-cozinha-12-uni/p/MLB37246326?pdp_filters=item_id%3AMLB3733990167",
  "Varal Inox Suspenso 40 Prendedores Fixos Para Secagem Roupas Prata":
    "https://www.mercadolivre.com.br/varal-inox-suspenso-40-prendedores-fixos-para-secagem-roupas/up/MLBU4120311851?pdp_filters=item_id%3AMLB6996265396",
  "Armário de cozinha Compacta Completa Modulada Pequim Premium Multimóveis MP2933 com armário e balcão incluso cor Carvalho com Preto":
    "https://www.mercadolivre.com.br/armario-de-cozinha-compacta-completa-modulada-pequim-premium-multimoveis-mp2933-com-armario-e-balcao-incluso-cor-carvalho-com-preto/p/MLB29636220?pdp_filters=item_id%3AMLB4370812892",
  "Cadeira Xtreme Gamers Ergonômica 130º Escritório Reclinável Cor Vermelho":
    "https://www.mercadolivre.com.br/cadeira-xtreme-gamers-ergonomica-130-escritorio-reclinavel-cor-vermelho/p/MLB27141377?pdp_filters=item_id%3AMLB3607432803",
  "Armário de Cozinha Compacta Xangai Multimóveis VM2840 Branco/Lacca Fumê":
    "https://www.mercadolivre.com.br/armario-de-cozinha-compacta-xangai-multimoveis-vm2840-brancolacca-fume/p/MLB27679774?pdp_filters=item_id%3AMLB3515847839",
  "Cozinha Compacta Armário E Balcão Xangai Multimóveis Vm2840 Cor Preto/grafite":
    "https://www.mercadolivre.com.br/cozinha-compacta-armario-e-balcao-xangai-multimoveis-vm2840-cor-pretografite/p/MLB27665208?pdp_filters=item_id%3AMLB3517783253",
  "Armário de cozinha modulada completa compacta Emilly pop com armário e balcão cor rustic/preto GREM229002":
    "https://www.mercadolivre.com.br/armario-de-cozinha-modulada-completa-compacta-emilly-pop-com-armario-e-balcao-cor-rusticpreto-grem229002/p/MLB27417990?pdp_filters=item_id%3AMLB3534874263",
  "Cama Box Baú Casal Com Colchão Pillow Angel Molas Ensacadas":
    "https://www.mercadolivre.com.br/cama-box-bau-casal-com-colchao-pillow-angel-molas-ensacadas/p/MLB50735569?pdp_filters=item_id%3AMLB4080564733",
  "Berco Bebe Portatil Retratil Acoplado Moise Balanço Infantil Bebê Berço Bege":
    "https://www.mercadolivre.com.br/berco-bebe-portatil-retratil-acoplado-moise-balanco-infantil/up/MLBU3831501571?pdp_filters=item_id%3AMLB4520010415",
  "Sala Jantar Estofada Mesa Tampo Vidro 4 Cadeiras Madesa Anaju Rci Cor Rustic/Crema/Imperial MDJA0401387GSIM":
    "https://www.mercadolivre.com.br/sala-jantar-estofada-mesa-tampo-vidro-4-cadeiras-madesa-anaju-rci-cor-rusticcremaimperial-mdja0401387gsim/p/MLB23479068?pdp_filters=item_id%3AMLB3345760367",
  "6 Cadeiras Ratan Plástica Preto Reforçada Top Chairs Jardim":
    "https://www.mercadolivre.com.br/6-cadeiras-ratan-plastica-preto-reforcada-top-chairs-jardim/p/MLB50063564?pdp_filters=item_id%3AMLB6011009478",
  "Cadeira Escritório Presidente Ergonômica NR17 Marqs Home Arcanis Preta com Apoio Lombar e Encosto Mesh Premium":
    "https://www.mercadolivre.com.br/cadeira-escritorio-presidente-ergonomica-nr17-marqs-home-arcanis-preta-com-apoio-lombar-e-encosto-mesh-premium/p/MLB52429969?pdp_filters=item_id%3AMLB6079832470",
  "Jogo De Panelas Induçao Antiaderente Cerâmica 10 Peças Ppg Pfoa Free Grafite":
    "https://www.mercadolivre.com.br/jogo-de-panelas-inducao-antiaderente-ceramica-10-pecas-ppg-pfoa-free-grafite/p/MLB61862927?pdp_filters=item_id%3AMLB5915142756",
  "Roçadeira A Gasolina Nakasaki 75cc 6 Em 1 3,6hp":
    "https://www.mercadolivre.com.br/rocadeira-a-gasolina-nakasaki-75cc-6-em-1-36hp/up/MLBU3894296813?pdp_filters=item_id%3AMLB6613039926",
  "Jogo De Panelas Antiaderente Cerâmica Mimo Style 10 Peças Mármore":
    "https://www.mercadolivre.com.br/jogo-de-panelas-antiaderente-ceramica-mimo-style-10-pecas/up/MLBU2901657290?pdp_filters=item_id%3AMLB4238600761",
  "Sofá 3 Lugares Retrátil Lubeck Linho Cru":
    "https://www.mercadolivre.com.br/sofa-3-lugares-retratil-lubeck-linho-cru/p/MLB44025400?pdp_filters=item_id%3AMLB5199239174",
  "Cozinha Compacta Arizona Glam Carvalho com Branco Carraro":
    "https://www.mercadolivre.com.br/cozinha-compacta-arizona-glam-carvalho-com-branco-carraro/p/MLB29119748?pdp_filters=item_id%3AMLB4407443824",
  "Jogo De Panelas Cerâmico Triplo Indução Tuut Ecoglid 5 Peças Cor Baunilha":
    "https://www.mercadolivre.com.br/jogo-de-panelas-ceramico-triplo-inducao-tuut-ecoglid-5-pecas-cor-baunilha/p/MLB53314583?pdp_filters=item_id%3AMLB7030186142",
  "Poltrona Cadeira Do Papai Com Encosto Macio Reclinável E Retrátil Revestido Em Corino Para Sala De Descanso E Amamentação Cor Marrom":
    "https://www.mercadolivre.com.br/poltrona-cadeira-do-papai-com-encosto-macio-reclinavel-e-retratil-revestido-em-corino-para-sala-de-descanso-e-amamentacao-cor-marrom/p/MLB50913618?pdp_filters=deal%3AMLB1578289-1",
  "Guarda-roupa Solteiro Madesa Denver 2 Portas C Espelho P Cor Preto":
    "https://www.mercadolivre.com.br/guarda-roupa-solteiro-madesa-denver-2-portas-c-espelho-p-cor-preto/p/MLB42138451?pdp_filters=item_id%3AMLB3907529365",
  "Tela Alambrado 1,50 Altura X 25 Metros Fio Belgo-14 Malha 7 Galvanizado":
    "https://www.mercadolivre.com.br/tela-alambrado-150-altura-x-25-metros-fio-belgo14-malha-7/up/MLBU1126919991?pdp_filters=item_id%3AMLB3848528203",
  "Banco Madeira Lyptus TZP Tamandua 3 Lugares Castanho Jardim 150x60cm":
    "https://www.mercadolivre.com.br/banco-madeira-lyptus-tzp-tamandua-3-lugares-castanho-jardim-150x60cm/p/MLB27022892?pdp_filters=deal%3AMLB1578289-1",
  "Coberdrom Cobertor Queen 1 Peça Cold 100% Poliéster":
    "https://www.mercadolivre.com.br/coberdrom-cobertor-queen-1-peca-cold-100-poliester/p/MLB52298850?pdp_filters=item_id%3AMLB4122887919",
  "Espelho Rocco Corpo Inteiro Organico 90x40 Pinterest Grande Retangular - Suporte":
    "https://www.mercadolivre.com.br/espelho-rocco-corpo-inteiro-organico-90x40-pinterest-grande/up/MLBU3329125627?pdp_filters=item_id%3AMLB6534712504",
  "Conjunto Completo: 5 Panelas Brinox Ceramic Life Cinza":
    "https://www.mercadolivre.com.br/conjunto-completo-5-panelas-brinox-ceramic-life-cinza/p/MLB45857500?pdp_filters=item_id%3AMLB5428359602",
  "Jogo de Panelas Cerâmica Antiaderente Casambiente Sahara 8 Peças":
    "https://www.mercadolivre.com.br/jogo-de-panelas-ceramica-antiaderente-casambiente-sahara-8-pecas/p/MLB42894775?pdp_filters=deal%3AMLB1578289-1",
  "Gabinete P/ Banheiro Suspensa Com Cuba Apoio Branca Fendi / Madeiral Branca Um Furo":
    "https://www.mercadolivre.com.br/gabinete-p-banheiro-suspensa-com-cuba-apoio-branca/up/MLBU3376640382?pdp_filters=item_id%3AMLB4169399481",
  "Sapateira Com Espelho 2 Portas 01 Gaveta Grife He":
    "https://www.mercadolivre.com.br/sapateira-com-espelho-2-portas-01-gaveta-grife-he/p/MLB23511420?pdp_filters=deal%3AMLB1578289-1",
  "Poltrona Cadeira Do Papai Com Encosto Macio Reclinável E Retrátil Revestido Em Corino Para Sala De Descanso E Amamentação Cor Bege":
    "https://www.mercadolivre.com.br/poltrona-cadeira-do-papai-com-encosto-macio-reclinavel-e-retratil-revestido-em-corino-para-sala-de-descanso-e-amamentacao-cor-bege/p/MLB50913632?pdp_filters=deal%3AMLB1578289-1",
  "Kit 5 Toalhas Banho Gigante Grossa Hotel Luxo 75x150cm 480g Branco Hotel":
    "https://www.mercadolivre.com.br/kit-5-toalhas-banho-gigante-grossa-hotel-luxo-75x150cm-480g/up/MLBU749495123?pdp_filters=item_id%3AMLB2653771991",
  "Rack Tv 55 Polegadas Sala Home Estante Organizador Multiuso Cor Branco":
    "https://www.mercadolivre.com.br/rack-tv-55-polegadas-sala-home-estante-organizador-multiuso-cor-branco/p/MLB54357224?pdp_filters=item_id%3AMLB4185070969",
  "Jogo De Panelas Antiaderente Cerâmica 10 Peças Gas Indução Areia":
    "https://www.mercadolivre.com.br/jogo-de-panelas-antiaderente-ceramica-10-pecas-gas-inducao/up/MLBU3841276535?pdp_filters=deal%3AMLB1578289-1",
  "Palha Indiana Tipo Rattan Sextavada Tela Natural 2m X 50cm":
    "https://produto.mercadolivre.com.br/MLB-5177883730-palha-indiana-tipo-rattan-sextavada-tela-natural-2m-x-50cm-_JM?pdp_filters=item_id%3AMLB5177883730",
  "Kit Cuba Pia Torneira Gourmet Aço Inox 304 Escovada Bancada Preto":
    "https://www.mercadolivre.com.br/kit-cuba-pia-torneira-gourmet-aco-inox-304-escovada-bancada/up/MLBU4883467424?pdp_filters=item_id%3AMLB5102284085",
  "Poltrona Cadeira Glória Mamãe E Papai Com Encosto Macio Reclinável E Retrátil Para Sala De Descanso E Amamentação Cor Marrom":
    "https://www.mercadolivre.com.br/poltrona-cadeira-gloria-mamae-e-papai-com-encosto-macio-reclinavel-e-retratil-para-sala-de-descanso-e-amamentacao-cor-marrom/p/MLB49100258?pdp_filters=deal%3AMLB1578289-1",
  "Soprador De Folhas Profissional A Gasolina 25,4cc 2 Tempos":
    "https://www.mercadolivre.com.br/soprador-de-folhas-profissional-a-gasolina-254cc-2-tempos/p/MLB47072900?pdp_filters=deal%3AMLB1578289-1",
  "Escorredor de Pratos de 2 Andares Preto para Pia em Aço Inoxidável Com Porta-Talheres e Porta-Copos":
    "https://www.mercadolivre.com.br/escorredor-de-pratos-de-2-andares-preto-para-pia-em-aco-inoxidavel-com-porta-talheres-e-porta-copos/p/MLB69348794?pdp_filters=item_id%3AMLB4666424787",
  "Jogo de Toalhas Buddemeyer Brisa Banho Branco 5 peças":
    "https://www.mercadolivre.com.br/jogo-de-toalhas-buddemeyer-brisa-banho-branco-5-pecas/p/MLB29596516?pdp_filters=deal%3AMLB1578289-1",
  "Jogo De Panelas Cerâmico Antiaderente Indução 10 Peças":
    "https://www.mercadolivre.com.br/jogo-de-panelas-ceramico-antiaderente-inducao-10-pecas/p/MLB33381355?pdp_filters=deal%3AMLB1578289-1",
  "Kit 10 Balizador Spot Led Embutir Chao Piso Jardim 3w Cúpula Banco Quente":
    "https://www.mercadolivre.com.br/kit-10-balizador-spot-led-embutir-chao-piso-jardim-3w-cupula-banco-quente/p/MLB35244936?pdp_filters=item_id%3AMLB4574554736",
  "Pendente Luminárias Led Teto Modernas, Lustre Para Sala 60w 127/220v Dourado":
    "https://www.mercadolivre.com.br/pendente-luminarias-led-teto-modernas-lustre-para-sala-60w/up/MLBU3516958803?pdp_filters=item_id%3AMLB5862685042",
  "Escorredor De Pratos Louça Preto Cozinha Suspensa 65cm 18pçs Preto":
    "https://www.mercadolivre.com.br/escorredor-de-pratos-louca-preto-cozinha-suspensa-65cm-18pcs/up/MLBU3164642850?pdp_filters=item_id%3AMLB5377321364",
  "Câmera Dupla Segurança Wifi Ip Externa Lente 6mp App Yoosee Câmera Dupla Segurança Wifi Yoosee":
    "https://www.mercadolivre.com.br/camera-dupla-seguranca-wifi-ip-externa-lente-6mp-app-yoosee/up/MLBU3421115330?pdp_filters=item_id%3AMLB4202928033",
  "Kit 02 Poltronas Decorativas Opala Suede Porto Decor Cor Capuccino":
    "https://www.mercadolivre.com.br/kit-02-poltronas-decorativas-opala-suede-porto-decor-cor-capuccino/p/MLB44012695?pdp_filters=deal%3AMLB1578289-1",
  "Vaso Sanitário Caixa Acoplada Monobloco Privada Banheiro Design Vivaz Kit Completo":
    "https://www.mercadolivre.com.br/vaso-sanitario-caixa-acoplada-monobloco-privada-banheiro-design-vivaz-kit-completo/p/MLB58273209?pdp_filters=deal%3AMLB1578289-1",
  "Escorredor Louças Organizador Pia Suspenso Armario Cozinha Preto 85cm":
    "https://www.mercadolivre.com.br/escorredor-loucas-organizador-pia-suspenso-armario-cozinha/up/MLBU3921250427?pdp_filters=item_id%3AMLB6678116678",
  "Cuba Pia de Apoio Sobrepor Oval 43x25 Branca Banheiro Lavabo Beltempo BT-2030":
    "https://www.mercadolivre.com.br/cuba-pia-de-apoio-sobrepor-oval-43x25-branca-banheiro-lavabo-beltempo-bt-2030/p/MLB36943302?pdp_filters=item_id%3AMLB4692768696",
  "Sofá Curvo Orgânico Feijão 2 Lugares Confortável 130 Cm":
    "https://produto.mercadolivre.com.br/MLB-6171734308-sofa-curvo-orgnico-feijo-2-lugares-confortavel-130-cm-_JM",
  "Fechadura Digital Biométrica Ali Ron Com Senha E Cartão Ic, Para Casa Ou Hotel Preto":
    "https://www.mercadolivre.com.br/fechadura-digital-biometrica-ali-ron-com-senha-e-cartao-ic-para-casa-ou-hotel-preto/p/MLB63956560?pdp_filters=item_id%3AMLB4447472247",
  "Rechaud Gaonas Retangular de Aço Inoxidável com 3 Cubas 1/3 (11L), Banho-Maria e Fogão a Álcool para Bufês e Restaurantes":
    "https://www.mercadolivre.com.br/rechaud-gaonas-retangular-de-aco-inoxidavel-com-3-cubas-13-11l-banho-maria-e-fogao-a-alcool-para-bufes-e-restaurantes/p/MLB52906827?pdp_filters=deal%3AMLB1578289-1",
  "Ducha Eletrônica Lorenzetti Loren Shower Ultra 7500W 220V Branco":
    "https://www.mercadolivre.com.br/ducha-eletronica-lorenzetti-loren-shower-ultra-7500w-220v-branco/p/MLB19590092?pdp_filters=item_id%3AMLB5886423754",
  "Tenda Gazebo Azul Polietileno 3x3 Metros Desmontável Camping Praia Pésca Usd":
    "https://www.mercadolivre.com.br/tenda-gazebo-azul-polietileno-3x3-metros-desmontavel-camping-praia-pesca-usd/p/MLB63331544?pdp_filters=item_id%3AMLB6102903498",
  "Fechadura Digital De Sobrepor Fr 101 V Preta Intelbras":
    "https://www.mercadolivre.com.br/fechadura-digital-de-sobrepor-fr-101-v-preta-intelbras/p/MLB63279922?pdp_filters=deal%3AMLB1578289-1",
  "Kit Cadeiras Fibra Sintética PS Móveis Preto Com Mesa Centro Jardim":
    "https://www.mercadolivre.com.br/kit-cadeiras-fibra-sintetica-ps-moveis-preto-com-mesa-centro-jardim/p/MLB36511446?pdp_filters=deal%3AMLB1578289-1",
  "Lustre Teto Led Pendente Moderno Para Sala Quarto Cozinha 127/220v Dourado":
    "https://www.mercadolivre.com.br/lustre-teto-led-pendente-moderno-para-sala-quarto-cozinha/up/MLBU3521618922?pdp_filters=item_id%3AMLB5852505024",
  "Panela De Pressão Brinox Indução Antiaderente Verde Botanika":
    "https://www.mercadolivre.com.br/panela-de-pressao-brinox-inducao-antiaderente-verde-botanika/p/MLB35738036?pdp_filters=deal%3AMLB1578289-1",
  "Smart Fechadura Digital Wi-Fi de Sobrepor Positivo Casa Inteligente, Abertura por Senha, Biometria, Tag, Chave e Aplicativo, Fechamento Automático – Preta":
    "https://www.mercadolivre.com.br/smart-fechadura-digital-wi-fi-de-sobrepor-positivo-casa-inteligente-abertura-por-senha-biometria-tag-chave-e-aplicativo-fechamento-automatico-preta/p/MLB51474206?pdp_filters=item_id%3AMLB4301946653",
  "Kit 10 Pote Herméticos Empilháveis Porta Mantimento Rebirth":
    "https://www.mercadolivre.com.br/kit-10-pote-hermeticos-empilhaveis-porta-mantimento-rebirth/p/MLB67631120?pdp_filters=item_id%3AMLB4850874397",
  "Panela De Pressão Brinox Vanilla 5,4l Indução Ceramic Life C Creme":
    "https://www.mercadolivre.com.br/panela-de-pressao-brinox-vanilla-54l-inducao-ceramic-life-c-creme/p/MLB41865039?pdp_filters=deal%3AMLB1578289-1",
  "Aparelho De Jantar 30 Peças - Pratos + Copos + Talheres Inox":
    "https://www.mercadolivre.com.br/aparelho-de-jantar-30-pecas--pratos--copos--talheres-inox/up/MLBU3189629070?pdp_filters=item_id%3AMLB4069161929",
  "Armário Organizador Utilitário 1 Porta Branco Carraro":
    "https://www.mercadolivre.com.br/armario-organizador-utilitario-1-porta-branco-carraro/p/MLB28505157?pdp_filters=item_id%3AMLB3576577437",
  "Abajur Luminária De Mesa Roma P 20x40cm 127/220v":
    "https://www.mercadolivre.com.br/abajur-luminaria-de-mesa-roma-p-20x40cm/up/MLBU1448434699?pdp_filters=item_id%3AMLB3575041059",
  "Jogo De Facas Com 7 Peças Em Aço Inox E Suporte De Madeira":
    "https://www.mercadolivre.com.br/jogo-de-facas-com-7-pecas-em-aco-inox-e-suporte-de-madeira/p/MLB44241770?pdp_filters=item_id%3AMLB4732199793",
  "Pano Prato Pé De Galinha Tati Com Bainha Liso Atacado 50un":
    "https://www.mercadolivre.com.br/pano-prato-pe-de-galinha-tati-com-bainha-liso-atacado-50un/p/MLB22034304?pdp_filters=item_id%3AMLB5553115952",
  "Cabeceira Modular King Premium 10 Placas 110x20 Infiniteline Cinza-escuro":
    "https://www.mercadolivre.com.br/cabeceira-modular-king-premium-10-placas-110x20-infiniteline/up/MLBU3987596273?pdp_filters=item_id%3AMLB6830383732",
  "Colchão Solteiro D33 Extra Firme 88x188x19 Suporta 130kg Preto Com Branco":
    "https://www.mercadolivre.com.br/colchao-solteiro-d33-extra-firme-88x188x19-suporta-130kg-preto-com-branco/p/MLB63405294?pdp_filters=item_id%3AMLB6084707686",
  "Assadeira Forma Tramontina Retangular Antiaderente Funda 3pç Grafite":
    "https://www.mercadolivre.com.br/assadeira-forma-tramontina-retangular-antiaderente-funda-3pc/up/MLBU1755623395?pdp_filters=item_id%3AMLB3833481586",
  "Travesseiro De Corpo Xuxão Capivara Pelúcia Gigante 65cm Almofada Abração Antialérgico Toque Super Macio Confortável Para Dormir Decorar Presentear Infantil Adulto Acabamento Premium Brasiliana Tech":
    "https://www.mercadolivre.com.br/travesseiro-de-corpo-xuxao-capivara-pelucia-gigante-65cm-almofada-abracao-antialergico-toque-super-macio-confortavel-para-dormir-decorar-presentear-infantil-adulto-acabamento-premium-brasiliana-tech/p/MLB63280529?pdp_filters=item_id%3AMLB6077595704",
  "Lustres Led Pendente Moderno,luminaria De Teto 2anéis 4bolas 127/220v Dourado":
    "https://www.mercadolivre.com.br/lustres-led-pendente-modernoluminaria-de-teto-2aneis-4bolas/up/MLBU3380861345?pdp_filters=item_id%3AMLB5634563694",
  "Jogo 6 Taças Vinho Tinto 450ml Cristal Titanium Gastro Cristal":
    "https://www.mercadolivre.com.br/jogo-6-tacas-vinho-tinto-450ml-cristal-titanium-gastro/up/MLBU610020055?pdp_filters=item_id%3AMLB4931476362",
  "Câmera De Segurança Wifi Yoosee Externa Mini Dome Full Hd Infravermelho Prova D'água Woosh":
    "https://www.mercadolivre.com.br/camera-de-seguranca-wifi-yoosee-externa-mini-dome-full-hd-infravermelho-prova-dagua-woosh/p/MLB26988439?pdp_filters=deal%3AMLB1578289-1",
  "Jogo De Panelas 10 Peças Antiaderente Teflon ivory – Linha Familiar Para Cozinha Completa, Ideal Para Fritura, Arroz, Vapor – Alumínio Com Tampa De Vidro – Fogão Gás Elétrico":
    "https://www.mercadolivre.com.br/jogo-de-panelas-10-pecas-antiaderente-teflon-ivory-linha-familiar-para-cozinha-completa-ideal-para-fritura-arroz-vapor-aluminio-com-tampa-de-vidro-fogao-gas-eletrico/p/MLB56726886?pdp_filters=item_id%3AMLB5724321264",
  "Kit 4 Cadeiras 1 Mesa Junco Sintético Varanda Jardim Externo":
    "https://www.mercadolivre.com.br/kit-4-cadeiras-1-mesa-junco-sintetico-varanda-jardim-externo/p/MLB45253892?pdp_filters=deal%3AMLB1578289-1",
  "Jogo Toalhas Banho Karsten 4pçs Grossas Macias 100% Algodão":
    "https://produto.mercadolivre.com.br/MLB-4125118381-jogo-toalhas-banho-karsten-4pcs-grossas-macias-100-algodo-_JM?pdp_filters=item_id%3AMLB4125118381",
  "Espelho convexo 60cm":
    "https://www.mercadolivre.com.br/espelho-convexo-60cm/p/MLB23431236?pdp_filters=deal%3AMLB1578289-1",
  "Conjunto de panelas antiaderente 10 peças Coffee cappuccino Imperial":
    "https://www.mercadolivre.com.br/conjunto-de-panelas-antiaderente-10-pecas-coffee-cappuccino-imperial/p/MLB62276281?pdp_filters=deal%3AMLB1578289-1",
  "Aparelho de Jantar 20 Peças Porcelana Prisma Branco Schmidt":
    "https://www.mercadolivre.com.br/aparelho-de-jantar-20-pecas-porcelana-prisma-branco-schmidt/p/MLB32541141?pdp_filters=deal%3AMLB1578289-1",
  "Jogo 2 Panela De Pressao 4,5 Litros E 3 Litros Antiaderente Cor Grafite":
    "https://www.mercadolivre.com.br/jogo-2-panela-de-pressao-45-litros-e-3-litros-antiaderente-cor-grafite/p/MLB54491774?pdp_filters=deal%3AMLB1578289-1",
  "Kit 10 Porta Mantimentos Hermetico, Pote Para Alimentos":
    "https://www.mercadolivre.com.br/kit-10-porta-mantimentos-hermetico-pote-para-alimentos/p/MLB37212212?pdp_filters=item_id%3AMLB3858097737",
  "Kit 4 Cestos Organizadores De Geladeira 4,0L Acrílico Plástico Transparente Para Frutas E Verduras Conservar Alimentos":
    "https://www.mercadolivre.com.br/kit-4-cestos-organizadores-de-geladeira-40l-acrilico-plastico-transparente-para-frutas-e-verduras-conservar-alimentos/p/MLB54488178?pdp_filters=item_id%3AMLB5677181906",
  "Suqueira Vidro - Suqueira 5 Litros C/torneira Jarra De Vidro Cristal":
    "https://www.mercadolivre.com.br/suqueira-vidro--suqueira-5-litros-ctorneira-jarra-de-vidro/up/MLBU3738994886?pdp_filters=item_id%3AMLB4424291025",
  "Cadeira De Escritorio Begonia Tela Mesh Ergonomica Giratoria Preto":
    "https://www.mercadolivre.com.br/cadeira-de-escritorio-begonia-tela-mesh-ergonomica-giratoria/up/MLBU3779321624?pdp_filters=deal%3AMLB1578289-1",
  "Espelho Convexo Segurança OBRAGLASS 50cm Preto Estacionamento Garagem":
    "https://www.mercadolivre.com.br/espelho-convexo-seguranca-obraglass-50cm-preto-estacionamento-garagem/p/MLB23981097?pdp_filters=deal%3AMLB1578289-1",
  "Faqueiro Wolff Firenze 54 Peças Inox Serve 6 Pessoas Premium":
    "https://www.mercadolivre.com.br/faqueiro-wolff-firenze-54-pecas-inox-serve-6-pessoas-premium/p/MLB42123572?pdp_filters=deal%3AMLB1578289-1",
  "ASJ Panela De Pressão 6 Litros Fechamento Externo Com Válvula De Segurança, Aço inoxidável":
    "https://www.mercadolivre.com.br/asj-panela-de-pressao-6-litros-fechamento-externo-com-valvula-de-seguranca-aco-inoxidavel/p/MLB61381256?pdp_filters=deal%3AMLB1578289-1",
  "Tapete Jacquard 4 X 3 Metros Grande Antiderrapante Moderno":
    "https://produto.mercadolivre.com.br/MLB-5233788666-tapete-jacquard-4-x-3-metros-grande-antiderrapante-moderno-_JM",
  "Criado Mudor P/ Cama Box Compacto C/ Prateleira Max Cor Off white/Cinamomo":
    "https://www.mercadolivre.com.br/criado-mudor-p-cama-box-compacto-c-prateleira-max-cor-off-whitecinamomo/p/MLB75945924?pdp_filters=item_id%3AMLB7286297166",
  "Varal De Chão Grande De Roupas 3 Andares Dobrável Cor Azul Kontuz 170 cm":
    "https://www.mercadolivre.com.br/varal-de-chao-grande-de-roupas-3-andares-dobravel-cor-azul-kontuz-170-cm/p/MLB26417959?pdp_filters=item_id%3AMLB3421967823",
  "Kit 2 Câmeras Lampada De Segurança Ip Wifi Com Visão Noturna Interna Externa App Yoosee Espiã 360º Cor Branco":
    "https://www.mercadolivre.com.br/kit-2-cameras-lampada-de-seguranca-ip-wifi-com-visao-noturna-interna-externa-app-yoosee-espia-360-cor-branco/p/MLB53857717?pdp_filters=deal%3AMLB1578289-1",
  "Câmera Speed Dome Ip Com Sirene E Alarme Duas Versões V3-c404-1-wifi":
    "https://www.mercadolivre.com.br/camera-speed-dome-ip-com-sirene-e-alarme-duas-versoes/up/MLBU3516213984?pdp_filters=item_id%3AMLB5842016082",
  "Jogo De Panelas Tramontina Turim 12pçs C/ Kit Tigelas Inox Vermelho":
    "https://www.mercadolivre.com.br/jogo-de-panelas-tramontina-turim-12pcs-c-kit-tigelas-inox-vermelho/p/MLB63260574?pdp_filters=deal%3AMLB1578289-1",
  "Kit 6 Potes de Vidro Herméticos Retangulares 640 mL para Marmita, Freezer e Organização":
    "https://www.mercadolivre.com.br/kit-6-potes-de-vidro-hermeticos-retangulares-640-ml-para-marmita-freezer-e-organizacao/p/MLB67180686?pdp_filters=item_id%3AMLB4545895607",
  "Kit Cabides Veludo De Roupa Antideslizante Slim Adulto 50 Un":
    "https://www.mercadolivre.com.br/kit-cabides-veludo-de-roupa-antideslizante-slim-adulto-50-un/p/MLB25860165?pdp_filters=item_id%3AMLB3886986358",
  "Cesto De Roupa Suja De Bambu Com Tampa E Alças 50 Litros Kontuz":
    "https://www.mercadolivre.com.br/cesto-de-roupa-suja-de-bambu-com-tampa-e-alcas-50-litros-kontuz/p/MLB25294667?pdp_filters=item_id%3AMLB3396420525",
  "Kit 6 Pote Tampa De Bambu 300ml Hermético Vidro Borossilicato Porta Temperos Mantimentos Alimentos Redondo Cor Transparente Bravli":
    "https://www.mercadolivre.com.br/kit-6-pote-tampa-de-bambu-300ml-hermetico-vidro-borossilicato-porta-temperos-mantimentos-alimentos-redondo-cor-transparente-bravli/p/MLB57776464?pdp_filters=item_id%3AMLB5740274158",
  "Frigideira Cerâmica 24cm Grande Premium Antiaderente Fogão Cooktop Indução Gás Elétrico Fundo Triplo Frita sem Óleo Cozinha Cabo de Baquelite Soft Touch Antitérmico Profissional VYROX":
    "https://www.mercadolivre.com.br/frigideira-ceramica-24cm-grande-premium-antiaderente-fogao-cooktop-inducao-gas-eletrico-fundo-triplo-frita-sem-oleo-cozinha-cabo-de-baquelite-soft-touch-antitermico-profissional-vyrox/p/MLB70041765?pdp_filters=item_id%3AMLB6815531802",
  "Porta Organizador De Jogo Americano Sousplat Retangular Cor Transparente":
    "https://www.mercadolivre.com.br/porta-organizador-de-jogo-americano-sousplat-retangular-cor-transparente/p/MLB28294090?pdp_filters=item_id%3AMLB6895456616",
  "Cadeira Escritório Oficial Diretor Mesh Ergonômica Office Preto Tela Mesh":
    "https://www.mercadolivre.com.br/cadeira-escritorio-oficial-diretor-mesh-ergonomica-office/up/MLBU4304807429?pdp_filters=deal%3AMLB1578289-1",
  "Espelho Ravenna 100x50cm Corpo Inteiro Grande Moderno Luxo Suporte":
    "https://www.mercadolivre.com.br/espelho-ravenna-100x50cm-corpo-inteiro-grande-moderno-luxo/up/MLBU3910334173?pdp_filters=item_id%3AMLB4625927819",
  "Kit Colcha Cobre Leito Casal Queen 3 Pçs Dupla Face 200 Fios":
    "https://produto.mercadolivre.com.br/MLB-3907795825-kit-colcha-cobre-leito-casal-queen-3-pcs-dupla-face-200-fios-_JM?pdp_filters=item_id%3AMLB3907795825",
  "Kit 15 Potes Hermético Cadencia Mantimentos Quadrado Cozinha Branco":
    "https://www.mercadolivre.com.br/kit-15-potes-hermetico-cadencia-mantimentos-quadrado-cozinha-branco/p/MLB54481836?pdp_filters=deal%3AMLB1578289-1",
  "Tapete Antiderrapante Para Box Banheiro Piscina 0,80 X 1,20":
    "https://produto.mercadolivre.com.br/MLB-4229556574-tapete-antiderrapante-para-box-banheiro-piscina-080-x-120-_JM?pdp_filters=item_id%3AMLB4229556574",
  "Espelho Orgânico 70cm Decoração Lapidado Design Moderno Luxo E05 70x30":
    "https://www.mercadolivre.com.br/espelho-organico-70cm-decoracao-lapidado-design-moderno-luxo/up/MLBU3460372802?pdp_filters=item_id%3AMLB4231512439",
  "Torneira Gourmet Luxo Com Filtro Puficador Flexível Cozinha Parede 2 Jatos Cor Cromada - Marca Camperluz":
    "https://www.mercadolivre.com.br/torneira-gourmet-luxo-com-filtro-puficador-flexivel-cozinha-parede-2-jatos-cor-cromada-marca-camperluz/p/MLB65743269?pdp_filters=item_id%3AMLB4265036235",
  "Kit 10 Pote De Vidro Marmita Hermético 640ml Freezer Fitness Rishon":
    "https://www.mercadolivre.com.br/kit-10-pote-de-vidro-marmita-hermetico-640ml-freezer-fitness-rishon/p/MLB63904966?pdp_filters=deal%3AMLB1578289-1",
  "Panela Pressão 4,2l Indução Cerâmica 4 Válvulas Segurança Cor Granito":
    "https://www.mercadolivre.com.br/panela-pressao-42l-inducao-ceramica-4-valvulas-seguranca-cor-granito/p/MLB75784002?pdp_filters=deal%3AMLB1578289-1",
  "Protetor De Sofá Dalia Jogo 2e3 Lugares Capa C/ Bababado":
    "https://produto.mercadolivre.com.br/MLB-3429168051-protetor-de-sofa-dalia-jogo-2e3-lugares-capa-c-bababado-_JM?pdp_filters=item_id%3AMLB3429168051",
  "Kit Colcha Casal 3 Peças Itália 150 Fios Poá Dupla Face":
    "https://produto.mercadolivre.com.br/MLB-5395235934-kit-colcha-casal-3-pecas-italia-150-fios-poa-dupla-face-_JM?pdp_filters=item_id%3AMLB5395235934",
  "Armário Multiuso 2 Portas Nature/off-white Regente Bege":
    "https://www.mercadolivre.com.br/armario-multiuso-2-portas-natureoff-white-regente-bege/p/MLB67527386?pdp_filters=item_id%3AMLB6562794032",
  "Espelho Jateado Redondo 60x60 Led 3 Cores":
    "https://www.mercadolivre.com.br/espelho-jateado-redondo-60x60-led-3-cores/p/MLB36941355?pdp_filters=item_id%3AMLB4013653615",
  "Poste Balizador 50 Cm Alumínio Chão Jardim Piso Solo Deck Cor da cúpula Preto":
    "https://www.mercadolivre.com.br/poste-balizador-50-cm-aluminio-chao-jardim-piso-solo-deck-cor-da-cupula-preto/p/MLB24377697?pdp_filters=item_id%3AMLB4471290030",
  "Jogo De 6 Pratos Rasos 27,5cm Ryo Maresia Cor Marrom Off White Oxford":
    "https://www.mercadolivre.com.br/jogo-de-6-pratos-rasos-275cm-ryo-maresia-cor-marrom-off-white-oxford/p/MLB23544122?pdp_filters=deal%3AMLB1578289-1",
  "Kit 10 Organizadores Multiuso Para Geladeira, Cozinha E Despensa Em Acrílico Transparente":
    "https://www.mercadolivre.com.br/kit-10-organizadores-multiuso-para-geladeira-cozinha-e-despensa-em-acrilico-transparente/p/MLB58713114?pdp_filters=item_id%3AMLB5813127784",
  "Kit Fondue Jogo De Panela Para Fondue 6 Pessoas Chocolate Ou Queijo 10 peças 1L Inox Inverno Frio Pítia":
    "https://www.mercadolivre.com.br/kit-fondue-jogo-de-panela-para-fondue-6-pessoas-chocolate-ou-queijo-10-pecas-1l-inox-inverno-frio-pitia/p/MLB68454939?pdp_filters=item_id%3AMLB7183796930",
  "Gabinete Armário Banheiro Estilo Industrial Cuba Balcão Pia Pia Branco Móvel Dourado/branco Quantidade De Furos Para Torneira Um Furo":
    "https://www.mercadolivre.com.br/gabinete-armario-banheiro-estilo-industrial-cuba-balcao-pia-pia-branco-movel-douradobranco-quantidade-de-furos-para-torneira-um-furo/p/MLB62928376?pdp_filters=item_id%3AMLB6181728878",
  "Câmera Dupla Segurança Ip Wifi Externa Lente 6mp App Yoosee Câmera Dupla Segurança":
    "https://www.mercadolivre.com.br/camera-dupla-seguranca-ip-wifi-externa-lente-6mp-app-yoosee/up/MLBU3296553220?pdp_filters=deal%3AMLB1578289-1",
  "Kit Cobre Leito Colcha Casal 3 Peças Boutis Dupla Face Porta Travesseiro Aba Americana Sofia Rosé":
    "https://www.mercadolivre.com.br/kit-cobre-leito-colcha-casal-3-pecas-boutis-dupla-face-porta-travesseiro-aba-americana-sofia-rose/p/MLB65809370?pdp_filters=item_id%3AMLB6288688794",
  "Conjunto Assadeiras 6 Peças de Vidro com Tampa Cinza - Marinex":
    "https://www.mercadolivre.com.br/conjunto-assadeiras-6-pecas-de-vidro-com-tampa-cinza-marinex/p/MLB28025230?pdp_filters=deal%3AMLB1578289-1",
  "Jogo De Panelas Alumínio Puro Fundido Batido Grosso 5 Peças Prateado":
    "https://www.mercadolivre.com.br/jogo-de-panelas-aluminio-puro-fundido-batido-grosso-5-pecas/up/MLBU669998622?pdp_filters=deal%3AMLB1578289-1",
  "Frigideira Cerâmica Antiaderente Grande 24cm Para Fogão A Gás Indução Cooktop Panela Frita Sem Óleo Não Gruda Profissional Moderna Mix":
    "https://www.mercadolivre.com.br/frigideira-ceramica-antiaderente-grande-24cm-para-fogao-a-gas-inducao-cooktop-panela-frita-sem-oleo-nao-gruda-profissional-moderna-mix/p/MLB50194606?pdp_filters=item_id%3AMLB5829760278",
  "Sapateira Caixa De Sapato Empilhável Vertical 6 Andares Branco":
    "https://www.mercadolivre.com.br/sapateira-caixa-de-sapato-empilhavel-vertical-6-andares/up/MLBU3242363751?pdp_filters=item_id%3AMLB5443349604",
  "Refletor Solar Led 3 Cabeças Ajustavel Sensor Movimento 50w Branco 1pcs":
    "https://www.mercadolivre.com.br/refletor-solar-led-3-cabecas-ajustavel-sensor-movimento-50w/up/MLBU3720925824?pdp_filters=item_id%3AMLB6151240428",
  "Câmera Ip A8 App Icsee Infravermelho Prova D'água Externa Wifi Hd Cor Branco":
    "https://www.mercadolivre.com.br/camera-ip-a8-app-icsee-infravermelho-prova-dagua-externa-wifi-hd-cor-branco/p/MLB25474028?pdp_filters=deal%3AMLB1578289-1",
  "Conjunto 5 Potes Herméticos 2l Multiuso Dispenser De Armazenamento De Grãos Cereais Ração Sabão Com Copo Medidor E Bico Dosador Com Travas":
    "https://www.mercadolivre.com.br/conjunto-5-potes-hermeticos-2l-multiuso-dispenser-de-armazenamento-de-graos-cereais-racao-sabao-com-copo-medidor-e-bico-dosador-com-travas/p/MLB63209038?pdp_filters=item_id%3AMLB4368761901",
  "Sombrite 50 % Horta Plantas Orquidea - (4x10m) Preto":
    "https://www.mercadolivre.com.br/sombrite-50--horta-plantas-orquidea--4x10m-preto/up/MLBU3832688301?pdp_filters=item_id%3AMLB4521832111",
  "Kit 10 Potes Vidro Hermético Aristus 640ml Marmita Anti Vazamento Forno Micro-ondas Freezer Tampa 4 Travas - Branco":
    "https://www.mercadolivre.com.br/kit-10-potes-vidro-hermetico-aristus-640ml-marmita-anti-vazamento-forno-micro-ondas-freezer-tampa-4-travas-branco/p/MLB63315912?pdp_filters=deal%3AMLB1578289-1",
  "Finish Pastilhas para Lava-louças Quantum Tabs X 60 Unidades":
    "https://www.mercadolivre.com.br/finish-pastilhas-para-lava-loucas-quantum-tabs-x-60-unidades/p/MLB54437482?pdp_filters=item_id%3AMLB7655869664",
  "Panela Frigideira Antiaderente Cerâmica Dinda Home Indução Gás Elétrico Linha Premium":
    "https://www.mercadolivre.com.br/panela-frigideira-antiaderente-ceramica-dinda-home-inducao-gas-eletrico-linha-premium/p/MLB53761906?pdp_filters=item_id%3AMLB6185133414",
  "Armário banheiro com espelheira 1 porta selene flexy color 60x50 Casa JD":
    "https://www.mercadolivre.com.br/armario-banheiro-com-espelheira-1-porta-selene-flexy-color-60x50-casa-jd/p/MLB36868461?pdp_filters=item_id%3AMLB6229133742",
  "Capa De Colchão Impermeável Hospitalar Antialérgico Solteiro":
    "https://www.mercadolivre.com.br/capa-de-colchao-impermeavel-hospitalar-antialergico-solteiro/p/MLB25175860?pdp_filters=item_id%3AMLB3861255986",
  "Cookware Set with 4.5L Pressure Cooker and 10 Pieces of Spatulas, Preto Color":
    "https://www.mercadolivre.com.br/cookware-set-with-45l-pressure-cooker-and-10-pieces-of-spatulas-preto-color/p/MLB44219587?pdp_filters=deal%3AMLB1578289-1",
  "Kit com 3 Câmeras Lâmpada Wi-Fi HW Full HD para Vigilância Noturna e Detecção de Movimento":
    "https://www.mercadolivre.com.br/kit-com-3-cameras-lampada-wi-fi-hw-full-hd-para-vigilancia-noturna-e-deteccao-de-movimento/p/MLB65304751?pdp_filters=deal%3AMLB1578289-1",
  "Kit 9 Potes Mantimentos Vidro Herméticos Com Tampa Bambu Alta Resistência Epsilon EPS-709":
    "https://www.mercadolivre.com.br/kit-9-potes-mantimentos-vidro-hermeticos-com-tampa-bambu-alta-resistencia-epsilon-eps-709/p/MLB28533641?pdp_filters=deal%3AMLB1578289-1",
  "Panela De Pressão Mta Com Visor Grande Antiaderente 4,5 Litr Cereja":
    "https://www.mercadolivre.com.br/panela-de-pressao-mta-com-visor-grande-antiaderente-45-litr/up/MLBU3820993796?pdp_filters=item_id%3AMLB4498567217",
  "Cadeira De Praia Dobrável Em Alumínio - Suporta 150kg Cor Bege":
    "https://www.mercadolivre.com.br/cadeira-de-praia-dobravel-em-aluminio-suporta-150kg-cor-bege/p/MLB66767405?pdp_filters=item_id%3AMLB6848645640",
  "Kit 10 Pote De Vidro Marmita Hermético 370ml Freezer Fitness Rishon":
    "https://www.mercadolivre.com.br/kit-10-pote-de-vidro-marmita-hermetico-370ml-freezer-fitness-rishon/p/MLB66060206?pdp_filters=deal%3AMLB1578289-1",
  "Espelho Jateado Lapidado Com Led 70x50 Retangular Com Touch Moldura led neutro,quent e frio":
    "https://www.mercadolivre.com.br/espelho-jateado-lapidado-com-led-70x50-retangular-com-touch-moldura-led-neutroquent-e-frio/p/MLB36783126?pdp_filters=item_id%3AMLB3693676473",
  "Kit 10 Potes Herméticos Vidro 640ml Mantimentos Marmita Forno Micro-ondas Airfryer Cozinha com 4 Travas Super Vedação LuvinCo":
    "https://www.mercadolivre.com.br/kit-10-potes-hermeticos-vidro-640ml-mantimentos-marmita-forno-micro-ondas-airfryer-cozinha-com-4-travas-super-vedacao-luvinco/p/MLB74983465?pdp_filters=deal%3AMLB1578289-1",
  "Conjunto 6 Xic Pires Ryo Maresia Off White Marrom 220ml Oxford":
    "https://www.mercadolivre.com.br/conjunto-6-xic-pires-ryo-maresia-off-white-marrom-220ml-oxford/p/MLB24813309?pdp_filters=deal%3AMLB1578289-1",
  "Torneira Com Filtro 3 Jatos Para Cozinha Gourmet de Parede Preta Silicone Flexível Bica Móvel 3 Jatos Modelo Moderno para Pia Água Fria":
    "https://www.mercadolivre.com.br/torneira-com-filtro-3-jatos-para-cozinha-gourmet-de-parede-preta-silicone-flexivel-bica-movel-3-jatos-modelo-moderno-para-pia-agua-fria/p/MLB22745582?pdp_filters=item_id%3AMLB4795058995",
  "Quadro Sala Abstrato Dourado Luxo Decorativo Grande 130x70 Armação Impresso Nas Laterais 3cm":
    "https://www.mercadolivre.com.br/quadro-sala-abstrato-dourado-luxo-decorativo-grande-130x70-armacao-impresso-nas-laterais-3cm/p/MLB37361458?pdp_filters=item_id%3AMLB5229465648",
  "Kit 10 Pote De Vidro Marmita Hermético 640ml Freezer Fitness Borossilicato 4 Travas Micro-ondas Azul-Escuro":
    "https://www.mercadolivre.com.br/kit-10-pote-de-vidro-marmita-hermetico-640ml-freezer-fitness-borossilicato-4-travas-micro-ondas-azul-escuro/p/MLB55829716?pdp_filters=deal%3AMLB1578289-1",
  "Torneira Dazie Metais Com Filtro Cozinha Para Parede Flexível Móvel Em Abs Filtro Carbon Block Purificador De Agua Com Refil Instalado 2 Modos de Jatos Bica Chuveirinho Registro 1/4 Volta Gourmet Luxo":
    "https://www.mercadolivre.com.br/torneira-dazie-metais-com-filtro-cozinha-para-parede-flexivel-movel-em-abs-filtro-carbon-block-purificador-de-agua-com-refil-instalado-2-modos-de-jatos-bica-chuveirinho-registro-14-volta-gourmet-luxo/p/MLB25869456?pdp_filters=item_id%3AMLB5086605949",
  "Electrolux Kit 3 Bowls Tigelas de Aço Inox com Tampa Plástica, 1,4L, 2L e 2,6L":
    "https://www.mercadolivre.com.br/electrolux-kit-3-bowls-tigelas-de-aco-inox-com-tampa-plastica-14l-2l-e-26l/p/MLB25125996?pdp_filters=deal%3AMLB1578289-1",
  "Kit 10 Toalhas De Rosto Profissional Salão Hotel Barbearia Branca Lisa":
    "https://www.mercadolivre.com.br/kit-10-toalhas-de-rosto-profissional-salao-hotel-barbearia-branca-lisa/p/MLB75872856?pdp_filters=item_id%3AMLB5048999679",
  "Kit 12 Toalhas De Rosto Salão De Beleza Simples - Branco":
    "https://www.mercadolivre.com.br/kit-12-toalhas-de-rosto-salao-de-beleza-simples-branco/p/MLB22640846?pdp_filters=item_id%3AMLB3403196907",
  "Escorredor De Louça Secador De Pratos Cozinha Aço Inox Preto 2 Andar Porta Talher Tigela E Copos Praticilar":
    "https://www.mercadolivre.com.br/escorredor-de-louca-secador-de-pratos-cozinha-aco-inox-preto-2-andar-porta-talher-tigela-e-copos-praticilar/p/MLB75830101?pdp_filters=item_id%3AMLB4958313681",
  "Yab - Kit 5 Potes De Vidro Marmita C/ Tampa Hermético 640ml Retangular 4 Travas Borossilicato Alimentos Micro-ondas Freezer Geladeira":
    "https://www.mercadolivre.com.br/yab-kit-5-potes-de-vidro-marmita-c-tampa-hermetico-640ml-retangular-4-travas-borossilicato-alimentos-micro-ondas-freezer-geladeira/p/MLB47853797?pdp_filters=item_id%3AMLB4071998331",
  "Edredom Cobertor Coberdrom Sherpa Casal Queen Grosso Macio Cor Cinza LuckBaby":
    "https://www.mercadolivre.com.br/edredom-cobertor-coberdrom-sherpa-casal-queen-grosso-macio-cor-cinza-luckbaby/p/MLB22359715?pdp_filters=deal%3AMLB1578289-1",
  "Papa Bolinha Elétrico Profissional Bivolt THYPE TH-208 com Lâmina Adicional":
    "https://www.mercadolivre.com.br/papa-bolinha-eletrico-profissional-bivolt-thype-th-208-com-lamina-adicional/p/MLB58089094?pdp_filters=deal%3AMLB1578289-1",
  "Suqueira Dispenser De Cristal Diamond Sucos Coquetéis 5 Lt Cor Transparente":
    "https://www.mercadolivre.com.br/suqueira-dispenser-de-cristal-diamond-sucos-coqueteis-5-lt-cor-transparente/p/MLB34200581?pdp_filters=item_id%3AMLB6884361726",
  "Tapete Redondo 1,2m Para Sala 100% Algodão Lavável A Máquina":
    "https://produto.mercadolivre.com.br/MLB-3980007211-tapete-redondo-12m-para-sala-100-algodo-lavavel-a-maquina-_JM?pdp_filters=item_id%3AMLB3980007211",
  "Espelho Jateado Quadrado Luxo Com Led 80x80 Cm Com Fonte Moldura Branco":
    "https://www.mercadolivre.com.br/espelho-jateado-quadrado-luxo-com-led-80x80-cm-com-fonte-moldura-branco/p/MLB39108298?pdp_filters=deal%3AMLB1578289-1",
  "Garrafa Térmica Inox 900ml Tampa Flip Straw Canudo Com Alça Rosa-claro":
    "https://www.mercadolivre.com.br/garrafa-termica-inox-900ml-tampa-flip-straw-canudo-com-alca/up/MLBU4608076933?pdp_filters=item_id%3AMLB5011896793",
  "Bolsa Termica Porta Vinho 4 Garrafas Taças Wine Bag Praia":
    "https://produto.mercadolivre.com.br/MLB-5517287158-bolsa-termica-porta-vinho-4-garrafas-tacas-wine-bag-praia-_JM?pdp_filters=item_id%3AMLB5517287158",
  "Varal Dobrável De Chão 3 Andares De Roupas Grande com Rodinha Resistente Durável Irsina":
    "https://www.mercadolivre.com.br/varal-dobravel-de-chao-3-andares-de-roupas-grande-com-rodinha-resistente-duravel-irsina/p/MLB51537440?pdp_filters=item_id%3AMLB5455360094",
  "Varal Dobrável De Chão 3 Andares De Roupas Grande Com Rodinha Resistente Durável Irsina":
    "https://www.mercadolivre.com.br/varal-dobravel-de-chao-3-andares-de-roupas-grande-com-rodinha-resistente-duravel-irsina/p/MLB65271601?pdp_filters=item_id%3AMLB6225241880",
  "Garrafa Térmica 800ml Inox Bico Duplo Canudo Alça Esporte Azul":
    "https://www.mercadolivre.com.br/garrafa-termica-800ml-inox-bico-duplo-canudo-alca-esporte/up/MLBU4840001294?pdp_filters=item_id%3AMLB5090897391",
  "Kit Tapete De Cozinha Antiderrapante Absorvente Várias Cores":
    "https://produto.mercadolivre.com.br/MLB-3006036325-kit-tapete-de-cozinha-antiderrapante-absorvente-varias-cores-_JM?pdp_filters=item_id%3AMLB3006036325",
  "Camera Segurança Externa Lente Dupla 4k 6mp Sirene Policial G.Eye":
    "https://www.mercadolivre.com.br/camera-seguranca-externa-lente-dupla-4k-6mp-sirene-policial-geye/p/MLB41738999?pdp_filters=deal%3AMLB1578289-1",
  "Kit Faqueiro Dourado Luxo Jogo Talheres Inox 24pçs + Maleta":
    "https://www.mercadolivre.com.br/kit-faqueiro-dourado-luxo-jogo-talheres-inox-24pcs-maleta/p/MLB34282631?pdp_filters=deal%3AMLB1578289-1",
  "Câmera Segurança Wifi Ip Lente Dupla 2x 3mp Externa 360° A prova Dágua Cor Cinza":
    "https://www.mercadolivre.com.br/camera-seguranca-wifi-ip-lente-dupla-2x-3mp-externa-360-a-prova-dagua-cor-cinza/p/MLB44906664?pdp_filters=deal%3AMLB1578289-1",
  "Copo Térmico Moove Preto 590ml Termolar":
    "https://www.mercadolivre.com.br/copo-termico-moove-preto-590ml-termolar/p/MLB19643302?pdp_filters=deal%3AMLB1578289-1",
  "Frigideira Supreme Aço Inox 24 Cm E 1,7 Litros Fundo Triplo Prateado":
    "https://www.mercadolivre.com.br/frigideira-supreme-aco-inox-24-cm-e-17-litros-fundo-triplo-prateado/p/MLB63046777?pdp_filters=deal%3AMLB1578289-1",
  "Quadros Decorativos Sala Folha Verde Bege Neutro Boho 122x60 Carvalho":
    "https://www.mercadolivre.com.br/quadros-decorativos-sala-folha-verde-bege-neutro-boho-122x60/up/MLBU4030177225?pdp_filters=item_id%3AMLB6882456162",
  "Vittak Kit 50 Cabides Veludo De Roupa Antideslizante Slim Adulto Cor Preto":
    "https://www.mercadolivre.com.br/vittak-kit-50-cabides-veludo-de-roupa-antideslizante-slim-adulto-cor-preto/p/MLB62645533?pdp_filters=deal%3AMLB1578289-1",
  "Chuveiro Ducha Lorenzetti Loren Shower Eletrônico Branco 6800w 220V":
    "https://www.mercadolivre.com.br/chuveiro-ducha-lorenzetti-loren-shower-eletronico-branco-6800w-220v/p/MLB19765518?pdp_filters=deal%3AMLB1578289-1",
  "Kit 30 Panos de Prato Algodão TATI Pé de Galinha Estampado":
    "https://www.mercadolivre.com.br/kit-30-panos-de-prato-algodao-tati-pe-de-galinha-estampado/p/MLB25538873?pdp_filters=item_id%3AMLB4019329951",
  "Churrasqueira Portátil Camping Praia Compacta Galvanizada Prateado":
    "https://www.mercadolivre.com.br/churrasqueira-portatil-camping-praia-compacta-galvanizada/up/MLBU3487389163?pdp_filters=item_id%3AMLB5800224038",
  "Lixeira Inteligente 16l Com Sensor Automático E Tampa Touch Branco":
    "https://www.mercadolivre.com.br/lixeira-inteligente-16l-com-sensor-automatico-e-tampa-touch-branco/p/MLB66154165?pdp_filters=deal%3AMLB1578289-1",
  "Jogo 10 Potes 200ml Herméticos Vidro Tampa De Bambu Temperos Transparente":
    "https://www.mercadolivre.com.br/jogo-10-potes-200ml-hermeticos-vidro-tampa-de-bambu-temperos/up/MLBU1743080268?pdp_filters=item_id%3AMLB3787805565",
  "Aparelho Fondue Pop Antiaderente 7 Pçs Preto Forma + 4 Garfo":
    "https://www.mercadolivre.com.br/aparelho-fondue-pop-antiaderente-7-pcs-preto-forma-4-garfo/p/MLB47629015?pdp_filters=item_id%3AMLB4026985089",
  "Bailarina Giratória Profissional Alumínio 31cm Para Montar Bolo e Torta":
    "https://www.mercadolivre.com.br/bailarina-giratoria-profissional-aluminio-31cm-para-montar-bolo-e-torta/p/MLB41910873?pdp_filters=item_id%3AMLB5408331760",
  "Placa Mármore Autocolante em Rolo 2,70x0,60m Lavável Impermeável Revestimento de Parede Branco":
    "https://www.mercadolivre.com.br/placa-marmore-autocolante-em-rolo-270x060m-lavavel-impermeavel-revestimento-de-parede-branco/p/MLB53430055?pdp_filters=item_id%3AMLB5770910774",
  "Pano de Prato Atoalhado Atacado Laune Gourmet Kit com 5 peças cor Branco Desenho Sortidos Laune Haus":
    "https://www.mercadolivre.com.br/pano-de-prato-atoalhado-atacado-laune-gourmet-kit-com-5-pecas-cor-branco-desenho-sortidos-laune-haus/p/MLB24329681?pdp_filters=item_id%3AMLB3781245308",
  "Percarbonato De Sódio Limpador Clareador Tira Manchas - 3kg":
    "https://www.mercadolivre.com.br/percarbonato-de-sodio-limpador-clareador-tira-manchas--3kg/up/MLBU3381928452?pdp_filters=item_id%3AMLB4172731751",
  "Mesa De Cabeceira Nicho De Mdp Mesinha Quarto Sala Decoração Brovália Marrom":
    "https://www.mercadolivre.com.br/mesa-de-cabeceira-nicho-de-mdp-mesinha-quarto-sala-decoracao-brovalia-marrom/p/MLB22753557?pdp_filters=deal%3AMLB1578289-1",
  "Cortina 3,00x2,80 Metros Blackout Blecaute Cinza Corta Luz Em Tecido Grosso Para Quarto E Sala Casa Laura Enxovais":
    "https://www.mercadolivre.com.br/cortina-300x280-metros-blackout-blecaute-cinza-corta-luz-em-tecido-grosso-para-quarto-e-sala-casa-laura-enxovais/p/MLB56688018?pdp_filters=deal%3AMLB1578289-1",
  "Copo Térmico Gigante 1,2l Inox Com Tampa E Inox Canudo Cor Preto Cor Pura / Material Fosco":
    "https://www.mercadolivre.com.br/copo-termico-gigante-12l-inox-com-tampa-e-inox-canudo-cor-preto-cor-pura-material-fosco/p/MLB61994338?pdp_filters=item_id%3AMLB4587911929",
  "Copo Térmico Gigante 1,2l Inox Com Tampa E Inox Canudo Cor Branco Cor Pura / Material Fosco":
    "https://www.mercadolivre.com.br/copo-termico-gigante-12l-inox-com-tampa-e-inox-canudo-cor-branco-cor-pura-material-fosco/p/MLB61994227?pdp_filters=item_id%3AMLB6609062786",
  "Copo Térmico Gigante 1,2l Inox Com Tampa E Inox Canudo Cor Rosa Cor Pura / Material Fosco":
    "https://www.mercadolivre.com.br/copo-termico-gigante-12l-inox-com-tampa-e-inox-canudo-cor-rosa-cor-pura-material-fosco/p/MLB61994454?pdp_filters=item_id%3AMLB6609099628",
  "Garrafa Térmica Copo Inox 900ml Alça Tampa T Flip Canudo":
    "https://produto.mercadolivre.com.br/MLB-4308562565-garrafa-termica-copo-inox-900ml-alca-tampa-t-flip-canudo-_JM?pdp_filters=item_id%3AMLB4308562565",
  "Kit 2 Capa Travesseiro Impermeavel Fronha Resistente Matelado Travesseiro":
    "https://www.mercadolivre.com.br/kit-2-capa-travesseiro-impermeavel-fronha-resistente-matelado-travesseiro/p/MLB50006920?pdp_filters=item_id%3AMLB5389293388",
  "Kit 6 Potes 640ml Vidro Hermético 4 Travas Marmita Refratario Star House com 4 travas de super vedação":
    "https://www.mercadolivre.com.br/kit-6-potes-640ml-vidro-hermetico-4-travas-marmita-refratario-star-house-com-4-travas-de-super-vedacao/p/MLB54487120?pdp_filters=deal%3AMLB1578289-1",
  "Conjunto Assadeiras 6 Peças com Tampa Cor Rosa - Marinex":
    "https://www.mercadolivre.com.br/conjunto-assadeiras-6-pecas-com-tampa-cor-rosa-marinex/p/MLB27361540?pdp_filters=deal%3AMLB1578289-1",
  "Kit 12 Potes Herméticos Quadrados Haushop Para Alimentos Transparente":
    "https://www.mercadolivre.com.br/kit-12-potes-hermeticos-quadrados-haushop-para-alimentos-transparente/p/MLB68340345?pdp_filters=deal%3AMLB1578289-1",
  "Kit 4un Saco Organizador Edredon Cobertor Multiuso Dobrável Cinza":
    "https://www.mercadolivre.com.br/kit-4un-saco-organizador-edredon-cobertor-multiuso-dobravel/up/MLBU1467508532?pdp_filters=item_id%3AMLB5803579516",
  "Mesa De Cabeceira Roma Criado Moderno Para Quarto 3 Gavetas Brilhante/fosco Off White/freijó":
    "https://www.mercadolivre.com.br/mesa-de-cabeceira-roma-criado-moderno-para-quarto-3-gavetas/up/MLBU3976296532?pdp_filters=deal%3AMLB1578289-1",
  "Copo Térmico Inox 1,2l Com Alça, Tampa, Canudo Inox E Escova Cor Rosa Lisa":
    "https://www.mercadolivre.com.br/copo-termico-inox-12l-com-alca-tampa-canudo-inox-e-escova-cor-rosa-lisa/p/MLB64001849?pdp_filters=item_id%3AMLB6882966972",
  "Kit Porta Sachê Mesa Açúcar + Porta Copos Chá Café 80/200ml Cor Preto":
    "https://www.mercadolivre.com.br/kit-porta-sache-mesa-acucar-porta-copos-cha-cafe-80200ml-cor-preto/p/MLB25335605?pdp_filters=item_id%3AMLB4042163697",
  "Rack Vertical Sapateira 5 Prateleiras 15 Pares Aço Inox Cor Preto-prata":
    "https://www.mercadolivre.com.br/rack-vertical-sapateira-5-prateleiras-15-pares-aco-inox-cor/up/MLBU3376405649?pdp_filters=item_id%3AMLB4173549647",
  "Criado Max Mudo Com Pés Retrô Porta Celular Nichos Compacta Acabamento Brilhante Cor Off White/cinamomo":
    "https://www.mercadolivre.com.br/criado-max-mudo-com-pes-retro-porta-celular-nichos-compacta-acabamento-brilhante-cor-off-whitecinamomo/p/MLB57720106?pdp_filters=item_id%3AMLB4220936057",
  "Suqueira Dispenser 5L com Torneira Dosadora para Água Suco Bebidas Festa Eventos Buffet Residencial Transparente Resistente Fácil Limpeza":
    "https://www.mercadolivre.com.br/suqueira-dispenser-5l-com-torneira-dosadora-para-agua-suco-bebidas-festa-eventos-buffet-residencial-transparente-resistente-facil-limpeza/p/MLB23587644?pdp_filters=item_id%3AMLB6062623160",
  "Dispenser De Alimentos organizador Grãos Arroz Cereais temperos dispensador de cozinha com copo medidor porta cereal organizado 5kg Dispense para armazenamento de alimentos pote de plastico grande 5kg":
    "https://www.mercadolivre.com.br/dispenser-de-alimentos-organizador-graos-arroz-cereais-temperos-dispensador-de-cozinha-com-copo-medidor-porta-cereal-organizado-5kg-dispense-para-armazenamento-de-alimentos-pote-de-plastico-grande-5kg/p/MLB45901468?pdp_filters=deal%3AMLB1578289-1",
  "Lixeira Inteligente 16l Sensor Automático Tampa Touch Casa Cinza":
    "https://www.mercadolivre.com.br/lixeira-inteligente-16l-sensor-automatico-tampa-touch-casa/up/MLBU3746568325?pdp_filters=deal%3AMLB1578289-1",
  "Cabides De Veludo Adulto Fino Antideslizante Roupas 30 Peças Cor Bege":
    "https://www.mercadolivre.com.br/cabides-de-veludo-adulto-fino-antideslizante-roupas-30-pecas-cor-bege/p/MLB24642826?pdp_filters=item_id%3AMLB3387431537",
  "Tabua Queijos E Frios + Kit Espátulas 04 Peças":
    "https://www.mercadolivre.com.br/tabua-queijos-e-frios--kit-espatulas-04-pecas/up/MLBU765324113?pdp_filters=item_id%3AMLB3576453867",
  "Eps-158 Kit Faqueiro Dourado Luxo Jogo Talheres Inox 24pçs + Maleta Sem Estampa":
    "https://www.mercadolivre.com.br/eps-158-kit-faqueiro-dourado-luxo-jogo-talheres-inox-24pcs-maleta-sem-estampa/p/MLB68130482?pdp_filters=deal%3AMLB1578289-1",
  "Electrolux Kit 12 Potes Herméticos de Plástico Retangulares":
    "https://www.mercadolivre.com.br/electrolux-kit-12-potes-hermeticos-de-plastico-retangulares/p/MLB23191928?pdp_filters=deal%3AMLB1578289-1",
  "Kit 6 Pote Vidro Porta Temperos Hermético Cozinha Organiza V Vidro/tampa De Bambu":
    "https://www.mercadolivre.com.br/kit-6-pote-vidro-porta-temperos-hermetico-cozinha-organiza-v/up/MLBU3880729472?pdp_filters=item_id%3AMLB6545636022",
  "Dispenser de Parede Tapu2You Home Plástico ABS e aço inoxidável Saber Shampoo Condicionador 500ml":
    "https://www.mercadolivre.com.br/dispenser-de-parede-tapu2you-home-plastico-abs-e-aco-inoxidavel-saber-shampoo-condicionador-500ml/p/MLB53760094?pdp_filters=deal%3AMLB1578289-1",
  "Churrasqueira Elétrica De Mesa Elgin 42CHU2001000 Cor Preta":
    "https://www.mercadolivre.com.br/churrasqueira-eletrica-de-mesa-elgin-42chu2001000-cor-preta/p/MLB21850274?pdp_filters=item_id%3AMLB5481960562",
  "Cortina 4,00x2,80 Metros Blackout Blecaute Preto Corta Luz Em Tecido Grosso Para Quarto E Sala Texfine":
    "https://www.mercadolivre.com.br/cortina-400x280-metros-blackout-blecaute-preto-corta-luz-em-tecido-grosso-para-quarto-e-sala-texfine/p/MLB29473724?pdp_filters=deal%3AMLB1578289-1",
  "Kit 10 Sacos a Vácuo Reutilizáveis com Bomba para Viagem e Organização":
    "https://www.mercadolivre.com.br/kit-10-sacos-a-vacuo-reutilizaveis-com-bomba-para-viagem-e-organizacao/p/MLB77269587?pdp_filters=item_id%3AMLB7408686724",
  "Chuveiro Elétrico Zagonel Moment Eletrônica 7500W Branco Parede":
    "https://www.mercadolivre.com.br/chuveiro-eletrico-zagonel-moment-eletronica-7500w-branco-parede/p/MLB51986760?pdp_filters=deal%3AMLB1578289-1",
  "Rede Dormir De Descanso Luxo Casal Bucho De Boi Resistente":
    "https://produto.mercadolivre.com.br/MLB-3619071161-rede-dormir-de-descanso-luxo-casal-bucho-de-boi-resistente-_JM",
  "Cadeira De Praia Alumínio Dobrável Suporta 150kg Ergônomica Cor Preto":
    "https://www.mercadolivre.com.br/cadeira-de-praia-aluminio-dobravel-suporta-150kg-ergonomica-cor-preto/p/MLB63582424?pdp_filters=item_id%3AMLB7086874826",
  "Jogo De Talheres Faqueiro Luxo Em Aço Inox 24 Peças Prateado":
    "https://www.mercadolivre.com.br/jogo-de-talheres-faqueiro-luxo-em-aco-inox-24-pecas-prateado/p/MLB64305285?pdp_filters=item_id%3AMLB4421742559",
  "Kit 2 Sensores De Presença Iluminação Lâmpada Soquete E27 Branco":
    "https://www.mercadolivre.com.br/kit-2-sensores-de-presenca-iluminacao-lampada-soquete-e27/up/MLBU3913403366?pdp_filters=item_id%3AMLB6634866698",
  "Corda Extensor Alongador Par Rede De Descanso Dormir 70cm":
    "https://produto.mercadolivre.com.br/MLB-5325163042-corda-extensor-alongador-par-rede-de-descanso-dormir-70cm-_JM?pdp_filters=item_id%3AMLB5325163042",
  "Varal Chão Aço Inox Retrátil 3 Andares S.G Style":
    "https://www.mercadolivre.com.br/varal-chao-aco-inox-retratil-3-andares-sg-style/p/MLB26847923?pdp_filters=deal%3AMLB1578289-1",
  "Kit 2 Refletor Solar Led 3 Cabecas Luminária Sensor Movimento Ajustável Externo Prova D'água Holofote Parede Jardim Branco Frio - Diggicom":
    "https://www.mercadolivre.com.br/kit-2-refletor-solar-led-3-cabecas-luminaria-sensor-movimento-ajustavel-externo-prova-dagua-holofote-parede-jardim-branco-frio-diggicom/p/MLB75661678?pdp_filters=item_id%3AMLB7265981042",
  "Kit Acessórios Banheiro 6 Peças Lixeira Escova Sanitária Dispenser Sabão Líquido Porta Escova Dente Saboneteira Cor Branco":
    "https://www.mercadolivre.com.br/kit-acessorios-banheiro-6-pecas-lixeira-escova-sanitaria-dispenser-sabao-liquido-porta-escova-dente-saboneteira-cor-branco/p/MLB75731973?pdp_filters=deal%3AMLB1578289-1",
  "Tabua De Passar Roupa Resistente Tecido Térmico 3 Alturas Branco":
    "https://www.mercadolivre.com.br/tabua-de-passar-roupa-resistente-tecido-termico-3-alturas/up/MLBU3976370908?pdp_filters=deal%3AMLB1578289-1",
  "Kit 25 Mini Bombonieres de Cristal com Tampa para Lembrancinhas e Decoração - Bravli":
    "https://www.mercadolivre.com.br/kit-25-mini-bombonieres-de-cristal-com-tampa-para-lembrancinhas-e-decoracao-bravli/p/MLB36558957?pdp_filters=deal%3AMLB1578289-1",
  "Luminária Astronauta Projetor Led Infantil Galáxia Estrela Branco Robo Robozinho Luz Colorida Céu Teto Abajur De Mesa Cupula Decorativa Para Quarto Rgb Noturna Bivolt Portatil Lua Art Light":
    "https://www.mercadolivre.com.br/luminaria-astronauta-projetor-led-infantil-galaxia-estrela-branco-robo-robozinho-luz-colorida-ceu-teto-abajur-de-mesa-cupula-decorativa-para-quarto-rgb-noturna-bivolt-portatil-lua-art-light/p/MLB63645890?pdp_filters=item_id%3AMLB6118432286",
  "Tapete Redondo Antiderrapante Apolo 2m Areia Bege Prata Têxtil":
    "https://www.mercadolivre.com.br/tapete-redondo-antiderrapante-apolo-2m-areia-bege-prata-textil/p/MLB29326681?pdp_filters=deal%3AMLB1578289-1",
  "Sapateira Vertical Moderna Preto Aço Cromado 5 Prateleiras 97x54x26cm":
    "https://www.mercadolivre.com.br/sapateira-vertical-moderna-preto-aco-cromado-5-prateleiras-97x54x26cm/p/MLB34958174?pdp_filters=item_id%3AMLB6062283162",
  "Protetor Tapete Forro Armário Gaveta Cozinha 5,00 X 0,50 Transparente Fosco":
    "https://www.mercadolivre.com.br/protetor-tapete-forro-armario-gaveta-cozinha--500-x-050/up/MLBU3283171017?pdp_filters=item_id%3AMLB4121412337",
  "Espelho Redondo 50cm C/ Led Para Parede Quarto Banheiro Sala Moldura Redondo 50cm Led Quente":
    "https://www.mercadolivre.com.br/espelho-redondo-50cm-c-led-para-parede-quarto-banheiro-sala-moldura-redondo-50cm-led-quente/p/MLB62230308?pdp_filters=item_id%3AMLB4391854913",
  "Capa Protetora Para Sofá-cama Sem Braço Lisa 1,80 A 2m Malha":
    "https://produto.mercadolivre.com.br/MLB-4405604297-capa-protetora-para-sofa-cama-sem-braco-lisa-180-a-2m-malha-_JM?pdp_filters=item_id%3AMLB4405604297",
  "Kit 6 Tapete De Banheiro Bolinha Microfibra Antiderrapante Cor sortido Corttex":
    "https://www.mercadolivre.com.br/kit-6-tapete-de-banheiro-bolinha-microfibra-antiderrapante-cor-sortido-corttex/p/MLB24738429?pdp_filters=item_id%3AMLB4298758375",
  "Relógio Digital LED Lelong LE-2111 Mesa Parede Retangular USB Bivolt":
    "https://www.mercadolivre.com.br/relogio-digital-led-lelong-le-2111-mesa-parede-retangular-usb-bivolt/p/MLB37449448?pdp_filters=item_id%3AMLB4219270113",
  "Kit 4 Toalha Rosto Algodão 330g/m2 Luxo Laune Haus Cores Sortidas":
    "https://www.mercadolivre.com.br/kit-4-toalha-rosto-algodao-330gm2-luxo-laune-haus-cores-sortidas/p/MLB63602184?pdp_filters=item_id%3AMLB6102682248",
  "Conjunto Jarra e 6 Copos Âmbar 7 Peças Vidro Acrílico 900ml":
    "https://www.mercadolivre.com.br/conjunto-jarra-e-6-copos-mbar-7-pecas-vidro-acrilico-900ml/p/MLB67492122?pdp_filters=item_id%3AMLB4594905455",
  "Kit 20 Potes 500ml Transparente Marmita Fitness Bpa Free Reutilizável Tampa Hermética Micro E Freezer Mantimentos Ponte Lar Utilidades":
    "https://www.mercadolivre.com.br/kit-20-potes-500ml-transparente-marmita-fitness-bpa-free-reutilizavel-tampa-hermetica-micro-e-freezer-mantimentos-ponte-lar-utilidades/p/MLB32030523?pdp_filters=item_id%3AMLB6573086634",
  "Kit 10 Porta Guardanapos Suportes Sachê Açúcar Organizadores Preto":
    "https://www.mercadolivre.com.br/kit-10-porta-guardanapos-suportes-sache-acucar-organizadores/up/MLBU2958954581?pdp_filters=deal%3AMLB1578289-1",
  "Tapete 2,00x1,50 Peludo Felpudo Para Sala e Quarto Cores Cor Bege-mesclado Desenho Do Tecido Pelo Alto Casa Laura Enxovais Tapete Médio Para Sala 2x1,5m, Antiderrapante e Lavável - Bege Mesclado":
    "https://www.mercadolivre.com.br/tapete-200x150-peludo-felpudo-para-sala-e-quarto-cores-cor-bege-mesclado-desenho-do-tecido-pelo-alto-casa-laura-enxovais-tapete-medio-para-sala-2x15m-antiderrapante-e-lavavel-bege-mesclado/p/MLB39156440?pdp_filters=deal%3AMLB1578289-1",
  "3 Lâmpada De Emergência Led Recarregável Inteligente Bivolt Branco 127/220v":
    "https://www.mercadolivre.com.br/3-lampada-de-emergencia-led-recarregavel-inteligente-bivolt/up/MLBU3527236315?pdp_filters=deal%3AMLB1578289-1",
  "Cesto De Roupa Suja Bambu Dobrável Com Tampa Alças 72 Litros Bambu":
    "https://www.mercadolivre.com.br/cesto-de-roupa-suja-bambu-dobravel-com-tampa-alcas-72-litros/up/MLBU3726935279?pdp_filters=deal%3AMLB1578289-1",
  "Faqueiro Tramontina Búzios Em Aço Inox Com Detalhe 24 Peças":
    "https://www.mercadolivre.com.br/faqueiro-tramontina-buzios-em-aco-inox-com-detalhe-24-pecas/p/MLB36709502?pdp_filters=deal%3AMLB1578289-1",
  "Copo Térmico Com Canudo Mitu 1200ml Inox 304 Antivazamento":
    "https://produto.mercadolivre.com.br/MLB-3999072807-copo-termico-com-canudo-mitu-1200ml-inox-304-antivazamento-_JM?pdp_filters=item_id%3AMLB3999072807",
  "Tapete Antiderrapante Para Banheiro E Box Segurança Real Em Áreas Molhadas Ideal Para Piso Molhado, Crianças E Idoso":
    "https://www.mercadolivre.com.br/tapete-antiderrapante-para-banheiro-e-box-seguranca-real-em-areas-molhadas-ideal-para-piso-molhado-criancas-e-idoso/p/MLB64965395?pdp_filters=item_id%3AMLB6200278480",
  "Escorredor De Louça Pratos Talheres Inox Cozinha Duplo Preto":
    "https://www.mercadolivre.com.br/escorredor-de-louca-pratos-talheres-inox-cozinha-duplo/up/MLBU3730228933?pdp_filters=deal%3AMLB1578289-1",
  "Kit Banheiro Conjunto Acessórios Banheiro Lavabo Bambu 4 Peças Lixeira Escova Sanitária Dispenser Saboneteira Porta Escova Quadrado Preto Shokki":
    "https://www.mercadolivre.com.br/kit-banheiro-conjunto-acessorios-banheiro-lavabo-bambu-4-pecas-lixeira-escova-sanitaria-dispenser-saboneteira-porta-escova-quadrado-preto-shokki/p/MLB60341847?pdp_filters=item_id%3AMLB4456756877",
  "Kit Conjunto Banheiro 6 Peças Lixeira Com Tampa Bambu Plástico Organizador Decoração Lavabo Suporte Sabonete Liquido Escova de Dente Lixo Escova de Vaso Sanitario Shokki Cor Branco":
    "https://www.mercadolivre.com.br/kit-conjunto-banheiro-6-pecas-lixeira-com-tampa-bambu-plastico-organizador-decoracao-lavabo-suporte-sabonete-liquido-escova-de-dente-lixo-escova-de-vaso-sanitario-shokki-cor-branco/p/MLB64208876?pdp_filters=item_id%3AMLB4424124973",
  "Torneira Com Filtro Com Purificador de Agua Gourmet Tubo Flexível e Bica Movel De 1/4 Volta Cromada A Mais Vendida Cromado Brilhante":
    "https://www.mercadolivre.com.br/torneira-com-filtro-com-purificador-de-agua-gourmet-tubo-flexivel-e-bica-movel-de-14-volta-cromada-a-mais-vendida-cromado-brilhante/p/MLB35930173?pdp_filters=item_id%3AMLB5081895948",
  "Cesto Roupa Bambu Retangular Dobrável Eps-3903 Com Tampa Alças 60l Bege":
    "https://www.mercadolivre.com.br/cesto-roupa-bambu-retangular-dobravel-eps-3903-com-tampa-alcas-60l-bege/p/MLB60396629?pdp_filters=deal%3AMLB1578289-1",
  "19 Peças Kit Utensilios Cozinha Tábua Em Silicone Espátula Cinza":
    "https://www.mercadolivre.com.br/19-pecas-kit-utensilios-cozinha-tabua-em-silicone-espatula/up/MLBU4120775883?pdp_filters=deal%3AMLB1578289-1",
  "Kit 4 Capa Cadeira Jantar Tecido Mais Resistente Cor Marrocos":
    "https://www.mercadolivre.com.br/kit-4-capa-cadeira-jantar-tecido-mais-resistente-cor-marrocos/p/MLB58197613?pdp_filters=item_id%3AMLB4226615955",
  "Bloco Luminária De Emergência Led Blumenau Iluminação 2 Faróis 6500k":
    "https://www.mercadolivre.com.br/bloco-luminaria-de-emergencia-led-blumenau-iluminacao-2-farois-6500k/p/MLB20697198?pdp_filters=item_id%3AMLB3567842771",
  "Kit 15 Potes Hermético Cadencia Mantimentos Retangular Cozinha Branco Rishon 22,4 Litros":
    "https://www.mercadolivre.com.br/kit-15-potes-hermetico-cadencia-mantimentos-retangular-cozinha-branco-rishon-224-litros/p/MLB70039210?pdp_filters=deal%3AMLB1578289-1",
  "4 Caixas Organizadora De Guarda Roupa Cesto Gaveta Dobrável Cinza":
    "https://www.mercadolivre.com.br/4-caixas-organizadora-de-guarda-roupa-cesto-gaveta-dobravel/up/MLBU2993936953?pdp_filters=item_id%3AMLB3966659061",
  "Kit 3 Pote Hermético Vidro 1000ml Tampa De Bambu Mantimentos Alimentos Muug":
    "https://www.mercadolivre.com.br/kit-3-pote-hermetico-vidro-1000ml-tampa-de-bambu-mantimentos-alimentos-muug/p/MLB62522297?pdp_filters=item_id%3AMLB5970964796",
  "Jogo De frigideiras 3 peças 14 18 24cm Cereja Nacional":
    "https://www.mercadolivre.com.br/jogo-de-frigideiras-3-pecas-14-18-24cm-cereja-nacional/p/MLB37306256?pdp_filters=item_id%3AMLB6438224252",
  "Jogo De Frigideiras Francesas 3 Peças 14 18 24cm Preto Nacional":
    "https://www.mercadolivre.com.br/jogo-de-frigideiras-francesas-3-pecas-14-18-24cm-preto-nacional/p/MLB27410652?pdp_filters=item_id%3AMLB3463595575",
  "Jogo Xícaras Chá Café Vidro Com Pires Madeira Coração 8 Pçs Rosa 4 Xícaras Chá Coração Rosa E 4 Pires":
    "https://www.mercadolivre.com.br/jogo-xicaras-cha-cafe-vidro-com-pires-madeira-coracao-8-pcs/up/MLBU1459721122?pdp_filters=item_id%3AMLB3764718837",
  "Torneira Com Filtro Com Purificador Agua Bica Flexível Gourmet para Cozinha Parede Bica com Filtro Chuveirinho 2 Modos de Jatos A Mais Vendida":
    "https://www.mercadolivre.com.br/torneira-com-filtro-com-purificador-agua-bica-flexivel-gourmet-para-cozinha-parede-bica-com-filtro-chuveirinho-2-modos-de-jatos-a-mais-vendida/p/MLB44332260?pdp_filters=item_id%3AMLB4947419765",
  "Varal de chão reforçado com abas dobrável retrátil slim Mor branco":
    "https://www.mercadolivre.com.br/varal-de-chao-reforcado-com-abas-dobravel-retratil-slim-mor-branco/p/MLB23938359?pdp_filters=deal%3AMLB1578289-1",
  "Espeto Giratório Elétrico Brothers Grill Linha Eco Churrasco -110V":
    "https://www.mercadolivre.com.br/espeto-giratorio-eletrico-brothers-grill-linha-eco-churrasco-110v/p/MLB65978280?pdp_filters=deal%3AMLB1578289-1",
  "Jogo De Panelas Variadas Antiaderente 10 Peças - Bege Poá. Marfim":
    "https://www.mercadolivre.com.br/jogo-de-panelas-variadas-antiaderente-10-pecas-bege-poa-marfim/p/MLB75506680?pdp_filters=deal%3AMLB1578289-1",
  "Snow Foam Pulverizador Manual Borrifador Alta Pressão 2 Litros Com 2 Bicos Espuma Automotivo Lavagem Carro Moto Limpeza Jardim":
    "https://www.mercadolivre.com.br/snow-foam-pulverizador-manual-borrifador-alta-pressao-2-litros-com-2-bicos-espuma-automotivo-lavagem-carro-moto-limpeza-jardim/p/MLB69969004?pdp_filters=item_id%3AMLB6894169910",
  "Lixeira Cesto De Lixo Basculante 5l Inox Não Enferruja Inox":
    "https://www.mercadolivre.com.br/lixeira-cesto-de-lixo-basculante-5l-inox-nao-enferruja-inox/p/MLB46126693?pdp_filters=item_id%3AMLB3986693069",
  "Kit 12 Potes Herméticos Porta Mantimentos Quadrado Cozinha Cor Transparente":
    "https://www.mercadolivre.com.br/kit-12-potes-hermeticos-porta-mantimentos-quadrado-cozinha-cor-transparente/p/MLB59182671?pdp_filters=deal%3AMLB1578289-1",
  "Vittak Kit 50 Cabides Veludo Adulto Slim Antideslizante Organizador Roupas Cor Bege":
    "https://www.mercadolivre.com.br/vittak-kit-50-cabides-veludo-adulto-slim-antideslizante-organizador-roupas-cor-bege/p/MLB62645535?pdp_filters=deal%3AMLB1578289-1",
  "Kit 5 Caixas Organizadoras Cesto Tampa Multiuso 2l 6l 16l Preto":
    "https://www.mercadolivre.com.br/kit-5-caixas-organizadoras-cesto-tampa-multiuso-2l-6l-16l/up/MLBU3257928724?pdp_filters=item_id%3AMLB5454130932",
  "Cesto de Roupa Bambu Retangular de 72L com Tampa e Forro de Linho":
    "https://www.mercadolivre.com.br/cesto-de-roupa-bambu-retangular-de-72l-com-tampa-e-forro-de-linho/p/MLB66267207?pdp_filters=item_id%3AMLB4510514377",
  "Churrasqueira Elétrica Grande Steak Grill Para Apartamento 220v Sem Fumaça Preto - Aero Home":
    "https://www.mercadolivre.com.br/churrasqueira-eletrica-grande-steak-grill-para-apartamento-220v-sem-fumaca-preto-aero-home/p/MLB67306669?pdp_filters=item_id%3AMLB4570835531",
  "Bandeja Café Da Manha Na Cama Em Bambu Pés Dobraveis 50x30cm Marca Kururuá":
    "https://www.mercadolivre.com.br/bandeja-cafe-da-manha-na-cama-em-bambu-pes-dobraveis-50x30cm-marca-kururua/p/MLB48959791?pdp_filters=item_id%3AMLB4309666286",
  "Escova de limpeza elétrica 12 em 1 giratória recarregável cabo regulável EPS-4112 - PRETO":
    "https://www.mercadolivre.com.br/escova-de-limpeza-eletrica-12-em-1-giratoria-recarregavel-cabo-regulavel-eps-4112-preto/p/MLB69179152?pdp_filters=deal%3AMLB1578289-1",
  "Escorredor de Louça Inox Preto com 2 Andares para Bancada e Porta-Talheres":
    "https://www.mercadolivre.com.br/escorredor-de-louca-inox-preto-com-2-andares-para-bancada-e-porta-talheres/p/MLB68672583?pdp_filters=deal%3AMLB1578289-1",
  "Cobertor Casal Manta Cereja Habitat Poá Bolinha Soft Macia Cereja Cerejas":
    "https://www.mercadolivre.com.br/cobertor-casal-manta-cereja-habitat-poa-bolinha-soft-macia/up/MLBU3650024874?pdp_filters=item_id%3AMLB4339361921",
  "1 Prateleira 120x20 Mdf Branco Com Suporte Invisivel Branco":
    "https://www.mercadolivre.com.br/1-prateleira-120x20-mdf-branco-com-suporte-invisivel/up/MLBU1891721250?pdp_filters=item_id%3AMLB1701113092",
  "Câmera de Segurança IP Wi-Fi Lâmpada E27 HW 360° Full HD com Visão Noturna e Áudio - HW":
    "https://www.mercadolivre.com.br/camera-de-seguranca-ip-wi-fi-lampada-e27-hw-360-full-hd-com-visao-noturna-e-audio-hw/p/MLB50368081?pdp_filters=deal%3AMLB1578289-1",
  "Conjunto de 6 Xícaras Com Pires Dourado Liso Porcelana Wolff":
    "https://www.mercadolivre.com.br/conjunto-de-6-xicaras-com-pires-dourado-liso-porcelana-wolff/p/MLB28111582?pdp_filters=deal%3AMLB1578289-1",
  "Garrafa Térmica De Café Inox 1 Litro 1000ml Chá Leite Bebidas Quentes E Frias Por Mais Tempo Garrafa Térmica Bomba De Pressão Conserva Horas Nany Pink":
    "https://www.mercadolivre.com.br/garrafa-termica-de-cafe-inox-1-litro-1000ml-cha-leite-bebidas-quentes-e-frias-por-mais-tempo-garrafa-termica-bomba-de-pressao-conserva-horas-nany-pink/p/MLB68600946?pdp_filters=deal%3AMLB1578289-1",
  "Carrinho Organizador 3 Prateleiras Multiuso Cesto Auxiliar Com Roda E Alça Irsina":
    "https://www.mercadolivre.com.br/carrinho-organizador-3-prateleiras-multiuso-cesto-auxiliar-com-roda-e-alca-irsina/p/MLB51115132?pdp_filters=deal%3AMLB1578289-1",
  "Chaleira Esmaltada 2.5 Litros Bule Vintage Florida Chá Café Cor Branco":
    "https://www.mercadolivre.com.br/chaleira-esmaltada-25-litros-bule-vintage-florida-cha-cafe-cor-branco/p/MLB47227215?pdp_filters=item_id%3AMLB5321044440",
  "Jogo de 6 Taças Diamond Luxo em Vidro 330 mL para Vinho e Água Gostei!":
    "https://www.mercadolivre.com.br/jogo-de-6-tacas-diamond-luxo-em-vidro-330-ml-para-vinho-e-agua-gostei/p/MLB62741638?pdp_filters=item_id%3AMLB7285842436",
  "Mop Giratório Fit Balde Limpeza Geral 8l Multiuso Flash Limp Cor Cinza":
    "https://www.mercadolivre.com.br/mop-giratorio-fit-balde-limpeza-geral-8l-multiuso-flash-limp-cor-cinza/p/MLB47366087?pdp_filters=deal%3AMLB1578289-1",
  "Disco De Arado 57cm C/alça Arredondada Grande Aço Reforçado":
    "https://www.mercadolivre.com.br/disco-de-arado-57cm-calca-arredondada-grande-aco-reforcado/up/MLBU773151017?pdp_filters=item_id%3AMLB3815565525",
  "Organizador Maquiagem Acrílico Giratório Suporte Cosmético Cor Transparente":
    "https://www.mercadolivre.com.br/organizador-maquiagem-acrilico-giratorio-suporte-cosmetico-cor-transparente/p/MLB59089238?pdp_filters=deal%3AMLB1578289-1",
  "Espelho Para Banheiro Com Suporte Maquiagem Aumento Moldura Transparente":
    "https://www.mercadolivre.com.br/espelho-para-banheiro-com-suporte-maquiagem-aumento-moldura-transparente/p/MLB22640812?pdp_filters=item_id%3AMLB4702594995",
  "Kit 2 Suporte Porta Shampoo Sabonete Banheiro Adesivo Parede Sem Furos Box Luxo Cor Preto Laruno":
    "https://www.mercadolivre.com.br/kit-2-suporte-porta-shampoo-sabonete-banheiro-adesivo-parede-sem-furos-box-luxo-cor-preto-laruno/p/MLB76115422?pdp_filters=item_id%3AMLB5615541408",
  "Percarbonato De Sódio Tira Manchas Alvejante - 2kg":
    "https://www.mercadolivre.com.br/percarbonato-de-sodio-tira-manchas-alvejante-2kg/p/MLB65629738?pdp_filters=item_id%3AMLB7168368498",
  "Edredom Sherpa Cobertor e Coberdrom Casal Queen Grosso Pele De Carneiro Dupla Face Bege Super Quente Casa Laura Enxovais":
    "https://www.mercadolivre.com.br/edredom-sherpa-cobertor-e-coberdrom-casal-queen-grosso-pele-de-carneiro-dupla-face-bege-super-quente-casa-laura-enxovais/p/MLB24048542?pdp_filters=deal%3AMLB1578289-1",
  "Kit 5 Tigelas Bacia Em Aço Inox Multiuso Conjunto De Cozinha Inox":
    "https://www.mercadolivre.com.br/kit-5-tigelas-bacia-em-aco-inox-multiuso-conjunto-de-cozinha/up/MLBU3927097273?pdp_filters=item_id%3AMLB6693407586",
  "Espelho Led Maquiagem Dobravel Dupla Face Aumento 10x Usb Branco":
    "https://www.mercadolivre.com.br/espelho-led-maquiagem-dobravel-dupla-face-aumento-10x-usb-branco/p/MLB65345123?pdp_filters=item_id%3AMLB7177317296",
  "Tapete 2x1,5 Sala Peludo Quarto Cores Variadas Cor Branco Desenho Do Tecido Pelo Alto":
    "https://www.mercadolivre.com.br/tapete-2x15-sala-peludo-quarto-cores-variadas-cor-branco-desenho-do-tecido-pelo-alto/p/MLB32043715?pdp_filters=deal%3AMLB1578289-1",
  "Tapete 2,00x1,50 Peludo Felpudo Sala E Quarto Cores Cor Cinza Mesclado Desenho Do Tecido Pelo Alto Casa Laura Enxovais Tapete Médio Para Sala":
    "https://www.mercadolivre.com.br/tapete-200x150-peludo-felpudo-sala-e-quarto-cores-cor-cinza-mesclado-desenho-do-tecido-pelo-alto-casa-laura-enxovais-tapete-medio-para-sala/p/MLB47437920?pdp_filters=deal%3AMLB1578289-1",
  "Mangueira De Jardim 30m Metros Reforçada Trançada Não Dobra":
    "https://produto.mercadolivre.com.br/MLB-4824436198-mangueira-de-jardim-30m-metros-reforcada-trancada-no-dobra-_JM?pdp_filters=item_id%3AMLB4824436198",
  "Espelho Redondo Grande de 50cm com Led Frio - Espelho com Luz Ideal para Quarto, Banheiro e Sala, Espelho com Led e Moldura Lapidada para Decoração de Parede":
    "https://www.mercadolivre.com.br/espelho-redondo-grande-de-50cm-com-led-frio-espelho-com-luz-ideal-para-quarto-banheiro-e-sala-espelho-com-led-e-moldura-lapidada-para-decoracao-de-parede/p/MLB61442262?pdp_filters=item_id%3AMLB4391906097",
  "Picador Legumes Batata Cortador Tripé Multiuso Tomate Cebola Frios Cabrita Reforçado Marca Cozinha Gourmet + 4 Brindes":
    "https://www.mercadolivre.com.br/picador-legumes-batata-cortador-tripe-multiuso-tomate-cebola-frios-cabrita-reforcado-marca-cozinha-gourmet-4-brindes/p/MLB29374126?pdp_filters=deal%3AMLB1578289-1",
  "Fruteira De Chão Em Aço Cozinha Suporte Bebedouro Amadeirado Cor Preto/amadeirado":
    "https://www.mercadolivre.com.br/fruteira-de-chao-em-aco-cozinha-suporte-bebedouro-amadeirado-cor-pretoamadeirado/p/MLB46826550?pdp_filters=deal%3AMLB1578289-1",
  "Kit6 Saco Organizador Guarda Roupa Dobrável Edredom Cobertor Cinza-escuro":
    "https://www.mercadolivre.com.br/kit6-saco-organizador-guarda-roupa-dobravel-edredom-cobertor/up/MLBU3164966215?pdp_filters=deal%3AMLB1578289-1",
  "Torneira De Pia Gourmet Flexível De Parede Jato Com Aerador Para Cozinha Cor Preto":
    "https://www.mercadolivre.com.br/torneira-de-pia-gourmet-flexivel-de-parede-jato-com-aerador-para-cozinha-cor-preto/p/MLB64207761?pdp_filters=item_id%3AMLB7562302170",
  "Jogo Talheres Faqueiro Tramontina Aço Inox 24 Peças Buzios I":
    "https://www.mercadolivre.com.br/jogo-talheres-faqueiro-tramontina-aco-inox-24-pecas-buzios-i/p/MLB41306127?pdp_filters=deal%3AMLB1578289-1",
  "Cortina Blackout Em Tecido 3,00x2,80 Corta Luz Cor Palha":
    "https://www.mercadolivre.com.br/cortina-blackout-em-tecido-300x280-corta-luz-cor-palha/p/MLB38605973?pdp_filters=deal%3AMLB1578289-1",
  "Kit 4 Prateleiras De Parede Em Madeira Macica E Ferro Preto Preto E Madeira":
    "https://www.mercadolivre.com.br/kit-4-prateleiras-de-parede-em-madeira-macica-e-ferro-preto/up/MLBU3997020860?pdp_filters=item_id%3AMLB6826731990",
  "Garrafa Térmica 1 Litro Com Termômetro Led Para Chás / Café Preto":
    "https://www.mercadolivre.com.br/garrafa-termica-1-litro-com-termometro-led-para-chas--cafe/up/MLBU1755921090?pdp_filters=deal%3AMLB1578289-1",
  "Chaveiro Localizador Smart Tag Kit 4 Rastreador Ios Apple Preto":
    "https://www.mercadolivre.com.br/chaveiro-localizador-smart-tag-kit-4-rastreador-ios-apple/up/MLBU3827016254?pdp_filters=item_id%3AMLB6398856030",
  "Kit C/12 Utensílios De Cozinha Silicone Cabo Madeira":
    "https://produto.mercadolivre.com.br/MLB-3274998198-kit-c12-utensilios-de-cozinha-silicone-cabo-madeira-_JM?pdp_filters=item_id%3AMLB3274998198",
  "Kit 10 Potes 750ml com Tampa Trava Plástico Transparente para Mantimentos e Alimentos Marmita Organizador de Cozinha Geladeira e Freezer Jogo de Potes para Organização Ponte Lar Utilidades":
    "https://www.mercadolivre.com.br/kit-10-potes-750ml-com-tampa-trava-plastico-transparente-para-mantimentos-e-alimentos-marmita-organizador-de-cozinha-geladeira-e-freezer-jogo-de-potes-para-organizacao-ponte-lar-utilidades/p/MLB74912596?pdp_filters=item_id%3AMLB6824640494",
  "Lixeira Inox 5L Com Pedal Balde Removível Banheiro Cozinha Wow World Of Wonders":
    "https://www.mercadolivre.com.br/lixeira-inox-5l-com-pedal-balde-removivel-banheiro-cozinha-wow-world-of-wonders/p/MLB53205727?pdp_filters=item_id%3AMLB4424620371",
  "Pano Prato Pé De Galinha Tati Com Bainha Liso Atacado 30un":
    "https://www.mercadolivre.com.br/pano-prato-pe-de-galinha-tati-com-bainha-liso-atacado-30un/p/MLB29117818?pdp_filters=item_id%3AMLB5360096558",
  "Conjunto 5 Potes Vidro Hermético 640ml Mantimentos Marmita Forno Microondas":
    "https://www.mercadolivre.com.br/conjunto-5-potes-vidro-hermetico-640ml-mantimentos-marmita-forno-microondas/p/MLB63005550?pdp_filters=item_id%3AMLB4254128851",
  "Varal De Roupa Reforçado 80 Kg Dobrável 2 Hastes Retratil":
    "https://www.mercadolivre.com.br/varal-de-roupa-reforcado-80-kg-dobravel-2-hastes-retratil/p/MLB66173130?pdp_filters=item_id%3AMLB7359291162",
  "Tapete Sala Quarto 2 X 1,40 Antiderrapante Moderno Manchado Comprimento 2 M Cor Branco/marrom Desenho Do Tecido Obra Arte Largura 1.4 M":
    "https://www.mercadolivre.com.br/tapete-sala-quarto-2-x-140-antiderrapante-moderno-manchado-comprimento-2-m-cor-brancomarrom-desenho-do-tecido-obra-arte-largura-14-m/p/MLB50122496?pdp_filters=item_id%3AMLB5393403984",
  "Tapete Sala Quarto 2 X 1,40 Antiderrapante Moderno Manchado Comprimento 2 M Cor Branco/cinza Desenho Do Tecido Obra Arte Largura 1.4 M":
    "https://www.mercadolivre.com.br/tapete-sala-quarto-2-x-140-antiderrapante-moderno-manchado-comprimento-2-m-cor-brancocinza-desenho-do-tecido-obra-arte-largura-14-m/p/MLB50123026?pdp_filters=item_id%3AMLB4065608327",
  "Frigideira Cerâmica Antiaderente 24cm Indução Cooktop Fogão a Gás Não Gruda Sem Óleo Cor Cinza Granito":
    "https://www.mercadolivre.com.br/frigideira-ceramica-antiaderente-24cm-inducao-cooktop-fogao-a-gas-nao-gruda-sem-oleo-cor-cinza-granito/p/MLB76151288?pdp_filters=deal%3AMLB1578289-1",
  "Carrinho De Canto Organizador Auxiliar Rodinha Prateleiras Cristal":
    "https://www.mercadolivre.com.br/carrinho-de-canto-organizador-auxiliar-rodinha-prateleiras-cristal/p/MLB75029837?pdp_filters=item_id%3AMLB7111260924",
  "Cobertor Queen Veludo Manta Cerejas Microfibra Toque Macio Cerejas":
    "https://www.mercadolivre.com.br/cobertor-queen-veludo-manta-cerejas-microfibra-toque-macio/up/MLBU3856622922?pdp_filters=item_id%3AMLB6478121856",
  "Kit 3 Potes Dispenser Hermético 2l Multiuso Lavanderia Porta Sabão Em Pó Com Copo Medidor Bico Dosador E Travas":
    "https://www.mercadolivre.com.br/kit-3-potes-dispenser-hermetico-2l-multiuso-lavanderia-porta-sabao-em-po-com-copo-medidor-bico-dosador-e-travas/p/MLB63785228?pdp_filters=item_id%3AMLB6130525690",
  "Mesa De Apoio Redonda Canto Pe Palito Porta Quadro Objetos Cor Off-white":
    "https://www.mercadolivre.com.br/mesa-de-apoio-redonda-canto-pe-palito-porta-quadro-objetos-cor-off-white/p/MLB65418629?pdp_filters=deal%3AMLB1578289-1",
  "Kit 10 Potes 1 Litro Transparente Marmita Fitness Bpa Free Tampa Hermética Reutilizável Micro E Freezer Mantimentos ponte lar utilidades":
    "https://www.mercadolivre.com.br/kit-10-potes-1-litro-transparente-marmita-fitness-bpa-free-tampa-hermetica-reutilizavel-micro-e-freezer-mantimentos-ponte-lar-utilidades/p/MLB27146487?pdp_filters=item_id%3AMLB6824615010",
  "Kit 3 Formas Para Bolo Torta Com Fundo Removível Antiaderente Aço Carbono Redondas Preto":
    "https://www.mercadolivre.com.br/kit-3-formas-para-bolo-torta-com-fundo-removivel-antiaderente-aco-carbono-redondas-preto/p/MLB52421585?pdp_filters=item_id%3AMLB4127412633",
  "Jogo 6 Taças Cristal Titanium Vinho Tinto 580ml":
    "https://www.mercadolivre.com.br/jogo-6-tacas-cristal-titanium-vinho-tinto-580ml/p/MLB46192801?pdp_filters=deal%3AMLB1578289-1",
  "Kit4 Tapetes Para Banheiro Tapete Mágico Ultra Para Absorçã":
    "https://produto.mercadolivre.com.br/MLB-4170062689-kit4-tapetes-para-banheiro-tapete-magico-ultra-para-absorc-_JM?pdp_filters=item_id%3AMLB4170062689",
  "Kit Tapete 3 Peças Passadeira Premium Soft Emborrachada Luxo":
    "https://produto.mercadolivre.com.br/MLB-6038454992-kit-tapete-3-pecas-passadeira-premium-soft-emborrachada-luxo-_JM",
  "10 Esfregao Rodo Abrasivo Lava Piso Azulejo Rejunte Piscina":
    "https://www.mercadolivre.com.br/10-esfregao-rodo-abrasivo-lava-piso-azulejo-rejunte-piscina/p/MLB45619072?pdp_filters=item_id%3AMLB5195209923",
  "Kit 4 Caixas Cesto Organizadora Grande Dobrável Guarda Roupa Gaveta Mesas Banheiro Cor Cinza":
    "https://www.mercadolivre.com.br/kit-4-caixas-cesto-organizadora-grande-dobravel-guarda-roupa-gaveta-mesas-banheiro-cor-cinza/p/MLB63316009?pdp_filters=deal%3AMLB1578289-1",
  "Kit 4 Potes Vidro 1040ml Hermético Marmita Forno Refratário Transparente":
    "https://www.mercadolivre.com.br/kit-4-potes-vidro-1040ml-hermetico-marmita-forno-refratario/up/MLBU3534134664?pdp_filters=deal%3AMLB1578289-1",
  "Kit 4 Organizador De Geladeira 2l Acrílico Frutas E Verduras":
    "https://www.mercadolivre.com.br/kit-4-organizador-de-geladeira-2l-acrilico-frutas-e-verduras/p/MLB67690521?pdp_filters=deal%3AMLB1578289-1",
  "Jogo De Lençol Queen 3 Peças 400 Fios C/ Elástico Hotel":
    "https://produto.mercadolivre.com.br/MLB-4512452222-jogo-de-lencol-queen-3-pecas-400-fios-c-elastico-hotel-_JM?pdp_filters=item_id%3AMLB4512452222",
  "Mop Esfregão Giratório Com Balde 8 Litros Cesto Inox 2 Refil Preto":
    "https://www.mercadolivre.com.br/mop-esfregao-giratorio-com-balde-8-litros-cesto-inox-2-refil/up/MLBU4568109087?pdp_filters=item_id%3AMLB4994029247",
  "Copo Caneca Mixer Elétrica Mistura 400ml Com Tampa":
    "https://www.mercadolivre.com.br/copo-caneca-mixer-eletrica-mistura-400ml-com-tampa/p/MLB31246657?pdp_filters=deal%3AMLB1578289-1",
  "Kit Cobre Leito Colcha King 3 Peças Boutis Dupla Face Porta Travesseiro Aba Americana - Sofia Rose":
    "https://www.mercadolivre.com.br/kit-cobre-leito-colcha-king-3-pecas-boutis-dupla-face-porta-travesseiro-aba-americana-sofia-rose/p/MLB65806827?pdp_filters=deal%3AMLB1578289-1",
  "Jogo 6 Copos De Vidro Canelado Cameratta Agua Suco 420ml Transparente":
    "https://www.mercadolivre.com.br/jogo-6-copos-de-vidro-canelado-cameratta-agua-suco-420ml/up/MLBU3237013764?pdp_filters=item_id%3AMLB5429628480",
  "Kit 3 Impermeabilizante De Tecidos Aerosol 325ml Ultralub":
    "https://www.mercadolivre.com.br/kit-3-impermeabilizante-de-tecidos-aerosol-325ml-ultralub/p/MLB2091586765?pdp_filters=item_id%3AMLB6928097302",
  "Kit Acessórios Banheiro 6 Peças Lixeira Escova Sanitária Dispenser Sabão Líquido Porta Escova Dente Saboneteira Cor Preto":
    "https://www.mercadolivre.com.br/kit-acessorios-banheiro-6-pecas-lixeira-escova-sanitaria-dispenser-sabao-liquido-porta-escova-dente-saboneteira-cor-preto/p/MLB75731970?pdp_filters=deal%3AMLB1578289-1",
  "Varal De Chão Reforçado Grande Aço C Abas Dobrável Retrátil Branco":
    "https://www.mercadolivre.com.br/varal-de-chao-reforcado-grande-aco-c-abas-dobravel-retratil/up/MLBU4354866298?pdp_filters=deal%3AMLB1578289-1",
  "Kit Com 5 Boleiras E Doceiras Para Decorar Festa Aniversário Dourado":
    "https://www.mercadolivre.com.br/kit-com-5-boleiras-e-doceiras-para-decorar-festa-aniversario/up/MLBU4482194429?pdp_filters=item_id%3AMLB4966501477",
  "Kit 6 Organizadores De Geladeira Armário Cozinha Acrílico Caixa Organizadora":
    "https://www.mercadolivre.com.br/kit-6-organizadores-de-geladeira-armario-cozinha-acrilico-caixa-organizadora/p/MLB65126438?pdp_filters=deal%3AMLB1578289-1",
  "Tábua De Corte De Vidro Fácil De Limpar Sem Cheiro":
    "https://www.mercadolivre.com.br/tabua-de-corte-de-vidro-facil-de-limpar-sem-cheiro/up/MLBU3839128069?pdp_filters=item_id%3AMLB4531711697",
  "Copo Térmica 710ml Inox Anti-vazamento Com Tampa E Canudo":
    "https://produto.mercadolivre.com.br/MLB-6633851750-copo-termica-710ml-inox-anti-vazamento-com-tampa-e-canudo-_JM",
  "Copo Térmico Emborrachado Inox Com Tampa 450 Ml Futebol Flamengo":
    "https://www.mercadolivre.com.br/copo-termico-emborrachado-inox-com-tampa-450-ml-futebol/up/MLBU3858101751?pdp_filters=item_id%3AMLB4558710763",
  "Jogo Lençol Casal 3pç 400 Fios Hipercal Conforto Macio Cor Bordô Desenho do tecido Liso":
    "https://www.mercadolivre.com.br/jogo-lencol-casal-3pc-400-fios-hipercal-conforto-macio-cor-bordo-desenho-do-tecido-liso/p/MLB43797034?pdp_filters=item_id%3AMLB3941160813",
  "Panela De Pressão 4,5 Litros Alumínio Polido Panelux Classic Cor Cinza":
    "https://www.mercadolivre.com.br/panela-de-pressao-45-litros-aluminio-polido-panelux-classic-cor-cinza/p/MLB20216926?pdp_filters=item_id%3AMLB6015266298",
  "Percarbonato De Sódio Calisul 2kg Tira manchas Roupas Brancas e Coloridas Tamanho Familia":
    "https://www.mercadolivre.com.br/percarbonato-de-sodio-calisul-2kg-tira-manchas-roupas-brancas-e-coloridas-tamanho-familia/p/MLB45800340?pdp_filters=item_id%3AMLB7226783120",
  "Jardineira Vaso Planta Madeira Ripada 50x21cm Alpe & Aritana":
    "https://www.mercadolivre.com.br/jardineira-vaso-planta-madeira-ripada-50x21cm-alpe-aritana/p/MLB26408511?pdp_filters=item_id%3AMLB3936174722",
  "Mesa Lateral Sofá Cama Portátil Madeira Aço Apoio Canto Decorativa Sala Quarto Minimalista Moderna Multiuso Cor Marrom Revolux":
    "https://www.mercadolivre.com.br/mesa-lateral-sofa-cama-portatil-madeira-aco-apoio-canto-decorativa-sala-quarto-minimalista-moderna-multiuso-cor-marrom-revolux/p/MLB67830100?pdp_filters=deal%3AMLB1578289-1",
  "Jogo De Toalha Banho 4 peças 100 Algodão 400 gr/m Loft Camesa":
    "https://www.mercadolivre.com.br/jogo-de-toalha-banho-4-pecas-100-algodao-400-grm-loft-camesa/p/MLB46100682?pdp_filters=deal%3AMLB1578289-1",
  "Vittak Kit 50 Cabides Adulto Veludo De Roupas Antideslizante Slim Cor Cinza":
    "https://www.mercadolivre.com.br/vittak-kit-50-cabides-adulto-veludo-de-roupas-antideslizante-slim-cor-cinza/p/MLB62645532?pdp_filters=deal%3AMLB1578289-1",
  "Kit 2 Organizador Colmeia De Roupas Gaveta Guarda Roupa 24 Divisórias Ciclo Alternativa Cor Cinza":
    "https://www.mercadolivre.com.br/kit-2-organizador-colmeia-de-roupas-gaveta-guarda-roupa-24-divisorias-ciclo-alternativa-cor-cinza/p/MLB67696540?pdp_filters=item_id%3AMLB6611469390",
  "Kit 6 Jogo Americano Redondo Sousplat Supla Mesa Posta 39cm Verde Liso":
    "https://www.mercadolivre.com.br/kit-6-jogo-americano-redondo-sousplat-supla-mesa-posta-39cm/up/MLBU3197607451?pdp_filters=item_id%3AMLB6290503028",
  "Espelho Redondo Led 60cm Iluminação Moldura Led Frio 6000k Ornamo Decor":
    "https://www.mercadolivre.com.br/espelho-redondo-led-60cm-iluminacao-moldura-led-frio-6000k-ornamo-decor/p/MLB50303766?pdp_filters=item_id%3AMLB6086592872",
  "Kit Jogo Tapete 3 Peças Banheiro Antiderrapante Peluciado 1 Jogo Azul = 3 Peças":
    "https://www.mercadolivre.com.br/kit-jogo-tapete-3-pecas-banheiro-antiderrapante-peluciado/up/MLBU4234411245?pdp_filters=item_id%3AMLB7110470242",
  "Jogo 3 Formas Assadeiras Retangular Alumínio Bolo Forno Alumínio":
    "https://www.mercadolivre.com.br/jogo-3-formas-assadeiras-retangular-aluminio-bolo-forno/up/MLBU1727413419?pdp_filters=item_id%3AMLB3306155373",
  "Chapa Bifeteira Hambúrguer Fogão Churrasqueira 60x30 Grill Preto":
    "https://www.mercadolivre.com.br/chapa-bifeteira-hamburguer-fogao-churrasqueira-60x30-grill/up/MLBU3213191130?pdp_filters=item_id%3AMLB4080455139",
  "Kit 10 Lâmpadas 50w Led Bulbo E27 Alta Potência Branco Frio":
    "https://www.mercadolivre.com.br/kit-10-lampadas-50w-led-bulbo-e27-alta-potencia-branco-frio/p/MLB27713271?pdp_filters=deal%3AMLB1578289-1",
  "Jogo 10 Potes Tigelas Em Inox Alumínio Com Tampa Redondo 10 Prateados":
    "https://www.mercadolivre.com.br/jogo-10-potes-tigelas-em-inox-aluminio-com-tampa-redondo/up/MLBU3454809152?pdp_filters=item_id%3AMLB4227576907",
  "Soprador Turbo Portátil Hardline 48V com 2 Baterias e Maleta":
    "https://www.mercadolivre.com.br/soprador-turbo-portatil-hardline-48v-com-2-baterias-e-maleta/p/MLB76582644?pdp_filters=deal%3AMLB1578289-1",
  "Kit 4 Prateleiras + Nicho Rack Suspenso Tv Sala Quarto Mdf Branco":
    "https://www.mercadolivre.com.br/kit-4-prateleiras--nicho-rack-suspenso-tv-sala-quarto-mdf/up/MLBU3417019250?pdp_filters=deal%3AMLB1578289-1",
  "Cadeira de Praia Alta Alumínio Mor Dobrável Cores Variadas":
    "https://www.mercadolivre.com.br/cadeira-de-praia-alta-aluminio-mor-dobravel-cores-variadas/p/MLB42923303?pdp_filters=deal%3AMLB1578289-1",
  "Cesto De Roupas De Bambu 70 Litros Yikasa":
    "https://www.mercadolivre.com.br/cesto-de-roupas-de-bambu-70-litros-yikasa/p/MLB45423348?pdp_filters=deal%3AMLB1578289-1",
  "Porta Talheres Organizador Gaveta Com Extensor 8 Divisórias Preto":
    "https://www.mercadolivre.com.br/porta-talheres-organizador-gaveta-com-extensor-8-divisorias/up/MLBU3675394059?pdp_filters=item_id%3AMLB6057087548",
  "Câmera Lampada De segurança Casenn Ip Wifi Com Visão Noturna Interna Externa App Yoouse Espiã 360o Cor Branco":
    "https://www.mercadolivre.com.br/camera-lampada-de-seguranca-casenn-ip-wifi-com-visao-noturna-interna-externa-app-yoouse-espia-360o-cor-branco/p/MLB28574077?pdp_filters=deal%3AMLB1578289-1",
  "Tapete Felpudo para Sala e Quarto Rose-Mesclado 2m x 1.5m Antiderrapante":
    "https://www.mercadolivre.com.br/tapete-felpudo-para-sala-e-quarto-rose-mesclado-2m-x-15m-antiderrapante/p/MLB47422783?pdp_filters=deal%3AMLB1578289-1",
  "Papa Bolinhas Philips Walita Preto - Gc026/80":
    "https://www.mercadolivre.com.br/papa-bolinhas-philips-walita-preto-gc02680/p/MLB36206253?pdp_filters=deal%3AMLB1578289-1",
  "Caneca Kit Garrafa Térmica Vacuum Bottle Inox 500ml + 3 Xíca Cinza":
    "https://www.mercadolivre.com.br/caneca-kit-garrafa-termica-vacuum-bottle-inox-500ml--3-xica/up/MLBU2603947014?pdp_filters=item_id%3AMLB7027256506",
  "Organizador De Pia Cozinha Porta Detergente Sabão 3 Em 1 Inox":
    "https://www.mercadolivre.com.br/organizador-de-pia-cozinha-porta-detergente-sabao-3-em-1/up/MLBU3910940185?pdp_filters=item_id%3AMLB6655611818",
  "Total Black Ativador Cor Granito Preto Bellinzoni C/1flanela":
    "https://www.mercadolivre.com.br/total-black-ativador-cor-granito-preto-bellinzoni-c1flanela/up/MLBU4160255950?pdp_filters=item_id%3AMLB7031666526",
  "Escova Elétrica de Limpeza DeckCasa JY-6010 3000mAh 137 cm":
    "https://www.mercadolivre.com.br/escova-eletrica-de-limpeza-deckcasa-jy-6010-3000mah-137-cm/p/MLB44212011?pdp_filters=deal%3AMLB1578289-1",
  "Kit 2 Prendedores De Cortina Magnético Decora Quarto Sala":
    "https://produto.mercadolivre.com.br/MLB-4033919283-kit-2-prendedores-de-cortina-magnetico-decora-quarto-sala-_JM?pdp_filters=item_id%3AMLB4033919283",
  "Estante De Banheiro Canto Prateleira 4 Andares Armário Branco":
    "https://www.mercadolivre.com.br/estante-de-banheiro-canto-prateleira-4-andares-armario/up/MLBU3486273385?pdp_filters=deal%3AMLB1578289-1",
  "Kit 24 Forminhas de Silicone para Cupcake, Muffin e Bolinho – Ponte Lar Utilidades":
    "https://www.mercadolivre.com.br/kit-24-forminhas-de-silicone-para-cupcake-muffin-e-bolinho-ponte-lar-utilidades/p/MLB51764928?pdp_filters=item_id%3AMLB6517335608",
  "Porta Temperos Condimentos 9 Potes De Vidro Base Giratória 360° 9 Etiquetas Adesiva Organizador Cozinha Dosador Suporte Bancada Mesa Orégano Sal Páprica Pimenta Indue Variedades":
    "https://www.mercadolivre.com.br/porta-temperos-condimentos-9-potes-de-vidro-base-giratoria-360-9-etiquetas-adesiva-organizador-cozinha-dosador-suporte-bancada-mesa-oregano-sal-paprica-pimenta-indue-variedades/p/MLB74764864?pdp_filters=item_id%3AMLB4835173117",
  "Kit Para Vinho 4 Peças Aço Inox Abridor Manual Saca Rolhas":
    "https://www.mercadolivre.com.br/kit-para-vinho-4-pecas-aco-inox-abridor-manual-saca-rolhas/p/MLB44557604?pdp_filters=item_id%3AMLB5101490063",
  "Espelho Redondo 60cm Adnet Alça de Couro Caramelo Dupla Costura e Suporte em Alumínio Quarto, Banheiro, Sala MF901":
    "https://www.mercadolivre.com.br/espelho-redondo-60cm-adnet-alca-de-couro-caramelo-dupla-costura-e-suporte-em-aluminio-quarto-banheiro-sala-mf901/p/MLB57833517?pdp_filters=deal%3AMLB1578289-1",
  "Kit 2 Luminárias Led Bastão Recarregáveis Sensor Movimento 127v Marrom-claro":
    "https://www.mercadolivre.com.br/kit-2-luminarias-led-bastao-recarregaveis-sensor-movimento/up/MLBU3639581216?pdp_filters=item_id%3AMLB5980207380",
  "Jarra de Vidro Diamond 1,2L Transparente Água Marinha | Vidro Grosso Resistente para Água, Suco, Vinho e Drinks Mesa Posta Restaurante":
    "https://www.mercadolivre.com.br/jarra-de-vidro-diamond-12l-transparente-agua-marinha-vidro-grosso-resistente-para-agua-suco-vinho-e-drinks-mesa-posta-restaurante/p/MLB67646537?pdp_filters=item_id%3AMLB6582926526",
  "Vaso Trouxinha De Murano - Âmbar Ambar":
    "https://www.mercadolivre.com.br/vaso-trouxinha-de-murano-mbar-ambar/p/MLB58751310?pdp_filters=deal%3AMLB1578289-1",
  "Torneira Cozinha Parede Flexível Preta Metal Gourmet 2 Jatos - Marca Camperluz":
    "https://www.mercadolivre.com.br/torneira-cozinha-parede-flexivel-preta-metal-gourmet-2-jatos-marca-camperluz/p/MLB53598035?pdp_filters=item_id%3AMLB3951969555",
  "Tapete Peludo Redondo Luxo Diâmetro 1,00 X 1,00 Promoção":
    "https://produto.mercadolivre.com.br/MLB-963113805-tapete-peludo-redondo-luxo-dimetro-100-x-100-promoco-_JM?pdp_filters=item_id%3AMLB963113805",
  "Kit 2 Travesseiros Hotel Toque De Pluma Percal 180 Fios Luxo Branco":
    "https://www.mercadolivre.com.br/kit-2-travesseiros-hotel-toque-de-pluma-percal-180-fios-luxo/up/MLBU3760415818?pdp_filters=deal%3AMLB1578289-1",
  "Cabide Cs Cabides De Acrilico Kit De 50 Unidades Cor Transparente Para Roupas Camisas Caças Camisetas Bluzas Vestidos Jaquetas Ternos":
    "https://www.mercadolivre.com.br/cabide-cs-cabides-de-acrilico-kit-de-50-unidades-cor-transparente-para-roupas-camisas-cacas-camisetas-bluzas-vestidos-jaquetas-ternos/p/MLB48660745?pdp_filters=deal%3AMLB1578289-1",
  "Panela De Meia Pressão Luxo 3,5l Faz Pudim Em 15 Min Branco":
    "https://www.mercadolivre.com.br/panela-de-meia-pressao-luxo-35l-faz-pudim-em-15-min-branco/p/MLB61504600?pdp_filters=deal%3AMLB1578289-1",
  "Jogo Com 2 Taças De Cristal 560ml Linha Xtra Bohemia Cor Transparente":
    "https://www.mercadolivre.com.br/jogo-com-2-tacas-de-cristal-560ml-linha-xtra-bohemia-cor-transparente/p/MLB25450744?pdp_filters=item_id%3AMLB4964527515",
  "Panela de pressão 4,5 litros Alumínio Preta Segura Reforçada Cozimento Rápido Econômica Fechamento Interno":
    "https://www.mercadolivre.com.br/panela-de-pressao-45-litros-aluminio-preta-segura-reforcada-cozimento-rapido-economica-fechamento-interno/p/MLB54641718?pdp_filters=deal%3AMLB1578289-1",
  "Suporte Tripé Para Vaso De Planta Em Madeira 40cm Premium Madeira Suportes Prateleira Colocar Plantas":
    "https://www.mercadolivre.com.br/suporte-tripe-para-vaso-de-planta-em-madeira-40cm-premium/up/MLBU3977497669?pdp_filters=item_id%3AMLB4696362543",
  "Kit Com 10 Frigideiras Aluminio Pergaminho Panelinha Nº 18":
    "https://www.mercadolivre.com.br/kit-com-10-frigideiras-aluminio-pergaminho-panelinha-n-18/p/MLB27397166?pdp_filters=deal%3AMLB1578289-1",
  "Cadeira De Praia Camping Dobrável Alta 110kg Aço Portátil Bege":
    "https://www.mercadolivre.com.br/cadeira-de-praia-camping-dobravel-alta--110kg-aco-portatil/up/MLBU5089387308?pdp_filters=item_id%3AMLB7574878606",
  "Kit Porta Correr Até 90cm Trilho Natural 1,8 Com Acabamentos":
    "https://www.mercadolivre.com.br/kit-porta-correr-ate-90cm-trilho-natural-18-com-acabamentos/up/MLBU1433183974?pdp_filters=deal%3AMLB1578289-1",
  "Bandeja Giratória Organizadora de Cozinha em Bambu para Potes e Temperos LicyHome":
    "https://www.mercadolivre.com.br/bandeja-giratoria-organizadora-de-cozinha-em-bambu-para-potes-e-temperos-licyhome/p/MLB66706084?pdp_filters=item_id%3AMLB6471062696",
  "Vittak Cesto De Roupa Bambu 72 Litros Liso Dobrável Retangular Com Tampa E Forro":
    "https://www.mercadolivre.com.br/vittak-cesto-de-roupa-bambu-72-litros-liso-dobravel-retangular-com-tampa-e-forro/p/MLB53429974?pdp_filters=deal%3AMLB1578289-1",
  "Torneira Com Filtro Gourmet Pia Bica Cozinha Parede 2 Refis Flexivel Purificador Com Algodão PP Ativo":
    "https://www.mercadolivre.com.br/torneira-com-filtro-gourmet-pia-bica-cozinha-parede-2-refis-flexivel-purificador-com-algodao-pp-ativo/p/MLB48941977?pdp_filters=item_id%3AMLB4585703037",
  "Kit 2 Vasos 10 Litros Coluna Rattan Reforçado Para Plantas E Marmorizado":
    "https://www.mercadolivre.com.br/kit-2-vasos-10-litros-coluna-rattan-reforcado-para-plantas-e/up/MLBU3906544947?pdp_filters=item_id%3AMLB6646948538",
  "Varal De Roupa Aco Inox Dobravel Vertical Cor Prateado Toaninni":
    "https://www.mercadolivre.com.br/varal-de-roupa-aco-inox-dobravel-vertical-cor-prateado-toaninni/p/MLB23494951?pdp_filters=deal%3AMLB1578289-1",
  "Cobre Leito Queen Matelado Dupla Face Leve Confortável Macio Cinza Matelado":
    "https://www.mercadolivre.com.br/cobre-leito-queen-matelado-dupla-face-leve-confortavel-macio-cinza-matelado/p/MLB69749352?pdp_filters=deal%3AMLB1578289-1",
  "Placa De Captura Vídeo Hdmi 2x1 Externa Gamer Interface Multimídia Full Hd 4k 60fps Usb 3.0 Chrome Technology":
    "https://www.mercadolivre.com.br/placa-de-captura-video-hdmi-2x1-externa-gamer-interface-multimidia-full-hd-4k-60fps-usb-30-chrome-technology/p/MLB65327298?pdp_filters=item_id%3AMLB6655273626",
  "Espelho Lopazzi Orgânico 70 E 90 Polido Design Moderno Luxo Moldura Magnus 90x40cm Suporte":
    "https://www.mercadolivre.com.br/espelho-lopazzi-organico-70-e-90-polido-design-moderno-luxo-moldura-magnus-90x40cm-suporte/p/MLB64654608?pdp_filters=deal%3AMLB1578289-1",
  "Jogo De Xícaras Com Pires 6 Pç Bubly Bolha Perola Cafe Cha Transparente Bolha":
    "https://www.mercadolivre.com.br/jogo-de-xicaras-com-pires-6-pc-bubly-bolha-perola-cafe-cha/up/MLBU3651106117?pdp_filters=item_id%3AMLB6006605420",
  "Porta Detergente Inox Dispenser Sabão Líquido Organizador Pia Cozinha":
    "https://www.mercadolivre.com.br/porta-detergente-inox-dispenser-sabao-liquido-organizador-pia-cozinha/p/MLB74603114?pdp_filters=item_id%3AMLB4846189607",
  "Kit 6 Trava Espetos Churrasco Suporte Para Virar O Espeto":
    "https://www.mercadolivre.com.br/kit-6-trava-espetos-churrasco-suporte-para-virar-o-espeto/p/MLB2078212055?pdp_filters=item_id%3AMLB5649242876",
  "Suporte Vassoura com 7 Acessórios (3 presilhas e 4 ganchos) Aço Inoxidável Não enferruja Vassoureiro Lavanderia Compacta e Moderna Qualidade Tche Amo":
    "https://www.mercadolivre.com.br/suporte-vassoura-com-7-acessorios-3-presilhas-e-4-ganchos-aco-inoxidavel-nao-enferruja-vassoureiro-lavanderia-compacta-e-moderna-qualidade-tche-amo/p/MLB35739017?pdp_filters=item_id%3AMLB5550383264",
  "Jogo De Facas Faqueiro 9 Peças Plenus Aço Inox Tramontina":
    "https://www.mercadolivre.com.br/jogo-de-facas-faqueiro-9-pecas-plenus-aco-inox-tramontina/p/MLB28408264?pdp_filters=deal%3AMLB1578289-1",
  "Kit 5 Lâmpadas Led 50w Bulbo 6500k Branco Frio Alta Potência 110V/220V":
    "https://www.mercadolivre.com.br/kit-5-lampadas-led-50w-bulbo-6500k-branco-frio-alta-potencia-110v220v/p/MLB26200452?pdp_filters=deal%3AMLB1578289-1",
  "1000ml Garrafa Térmica Isolada A Vácuo Squeeze Aço Inox 304 para Água Gelada Esporte Academia com Alça e Bico Preto Sólar":
    "https://www.mercadolivre.com.br/1000ml-garrafa-termica-isolada-a-vacuo-squeeze-aco-inox-304-para-agua-gelada-esporte-academia-com-alca-e-bico-preto-solar/p/MLB37798840?pdp_filters=deal%3AMLB1578289-1",
  "Piscina Fundo do Mar 500L Semirrigida":
    "https://www.mercadolivre.com.br/piscina-fundo-do-mar-500l-semirrigida/p/MLB61226378?pdp_filters=item_id%3AMLB6023809748",
  "Percarbonato De Sodio Calisul 100% Pureza Granulado - 1 Kg":
    "https://www.mercadolivre.com.br/percarbonato-de-sodio-calisul-100-pureza-granulado--1-kg/up/MLBU3865459197?pdp_filters=item_id%3AMLB4568041071",
  "Kit 4 Utensílios Inox Cozinha Colher Concha Escumadeira Prateado":
    "https://www.mercadolivre.com.br/kit-4-utensilios-inox-cozinha-colher-concha-escumadeira/up/MLBU3114963929?pdp_filters=item_id%3AMLB5347502148",
  "Cesto de Roupa Suja de Bambu 60 Litros Dobrável com Tampa e Forro para Lavanderia":
    "https://www.mercadolivre.com.br/cesto-de-roupa-suja-de-bambu-60-litros-dobravel-com-tampa-e-forro-para-lavanderia/p/MLB76322303?pdp_filters=deal%3AMLB1578289-1",
  "Kit 10 Lâmpadas Led 20w Bulbo 6500k Luz Branca Avant Luz Branco-frio":
    "https://www.mercadolivre.com.br/kit-10-lampadas-led-20w-bulbo-6500k-luz-branca-avant-luz-branco-frio/p/MLB25835786?pdp_filters=deal%3AMLB1578289-1",
  "Jogo De Pratos Fundos Cedar Glass Kit 12 Pratos Em Vidro Almoço E Jantar":
    "https://www.mercadolivre.com.br/jogo-de-pratos-fundos-cedar-glass-kit-12-pratos-em-vidro-almoco-e-jantar/p/MLB22512554?pdp_filters=deal%3AMLB1578289-1",
  "Kit Com 12 Velas 7 Dias Branca Embalagem Sem Logo Marca 260g Branco 7 Dias Votiva Branca Embalagem Lisa Sem Marca Sem":
    "https://www.mercadolivre.com.br/kit-com-12-velas-7-dias-branca-embalagem-sem-logo-marca-260g/up/MLBU773343992?pdp_filters=deal%3AMLB1578289-1",
  "Vittak Organizador Maquiagem Cosméticos Batom Acrílico Giratório 360º Ajustável":
    "https://www.mercadolivre.com.br/vittak-organizador-maquiagem-cosmeticos-batom-acrilico-giratorio-360-ajustavel/p/MLB27634376?pdp_filters=deal%3AMLB1578289-1",
  "Jogo 6 Taças De Conhaque Drink Cristal Bohemia Colibri 690ml":
    "https://www.mercadolivre.com.br/jogo-6-tacas-de-conhaque-drink-cristal-bohemia-colibri-690ml/p/MLB35850940?pdp_filters=deal%3AMLB1578289-1",
  "Cesto De Roupa Suja Dobrável Grande Roupa Suja Cor Lisa Creme Capacidade Grande De 52l Lisa 35cm X 25cm X 55cm":
    "https://www.mercadolivre.com.br/cesto-de-roupa-suja-dobravel-grande-roupa-suja-cor-lisa/up/MLBU3830452484?pdp_filters=item_id%3AMLB6412542920",
  "Kit 6 Jarras Nadir Vidro Sucos Bar Restaurante 1,55l Atacado":
    "https://www.mercadolivre.com.br/kit-6-jarras-nadir-vidro-sucos-bar-restaurante-155l-atacado/up/MLBU3323742220?pdp_filters=item_id%3AMLB4135098533",
  "Kit 10 Organizadores Cozinha Gaveta Talheres Divisória Branco":
    "https://www.mercadolivre.com.br/kit-10-organizadores-cozinha-gaveta-talheres-divisoria/up/MLBU2882642720?pdp_filters=item_id%3AMLB5207273770",
  "Carrinho Organizador Rodinhas Multiuso Cozinha Prateleiras Branco":
    "https://www.mercadolivre.com.br/carrinho-organizador-rodinhas-multiuso-cozinha-prateleiras/up/MLBU3769308843?pdp_filters=item_id%3AMLB6224232996",
  "Tapete Sala Quarto Grande 200x150 Algodão Antiderrapante 2 M 1.5 M Cinza":
    "https://www.mercadolivre.com.br/tapete-sala-quarto-grande-200x150-algodao-antiderrapante/up/MLBU3961654113?pdp_filters=item_id%3AMLB6774807326",
  "Espeto Giratorio Churrasco Flex Eletrico Soft Grill Presente":
    "https://produto.mercadolivre.com.br/MLB-2736720089-espeto-giratorio-churrasco-flex-eletrico-soft-grill-presente-_JM",
  "Garrafinha Buba Leao 12115 450 ML":
    "https://www.mercadolivre.com.br/garrafinha-buba-leao-12115-450-ml/p/MLB22189449?pdp_filters=deal%3AMLB1578289-1",
  "Torneira Gourmet Flexível Giratória Cozinha Pia Parede 2 Jatos Cromada - Marca Camperluz":
    "https://www.mercadolivre.com.br/torneira-gourmet-flexivel-giratoria-cozinha-pia-parede-2-jatos-cromada-marca-camperluz/p/MLB43540423?pdp_filters=item_id%3AMLB5366605924",
  "Vittak Kit 30 Cabides Veludo De Roupa Antideslizante Slim Adulto Cor Preto":
    "https://www.mercadolivre.com.br/vittak-kit-30-cabides-veludo-de-roupa-antideslizante-slim-adulto-cor-preto/p/MLB37107370?pdp_filters=deal%3AMLB1578289-1",
  "Kit 6 Caixas Organizadoras Cesto Tampa Multiuso 2l 6l 16l Preto Jutta":
    "https://www.mercadolivre.com.br/kit-6-caixas-organizadoras-cesto-tampa-multiuso-2l-6l-16l/up/MLBU3980460576?pdp_filters=item_id%3AMLB6789158632",
  "Kit 6 Saco De Lixo Perfumado Lavanda 240 Un Banheiro E Pia":
    "https://www.mercadolivre.com.br/kit-6-saco-de-lixo-perfumado-lavanda-240-un-banheiro-e-pia/up/MLBU3519949650?pdp_filters=item_id%3AMLB4273112779",
  "Toalha de Rosto Casa Linda 100% Algodão Kit 10 Para Salão Branco 45x70cm":
    "https://www.mercadolivre.com.br/toalha-de-rosto-casa-linda-100-algodao-kit-10-para-salao-branco-45x70cm/p/MLB28570197?pdp_filters=deal%3AMLB1578289-1",
  "Kit 6 Potes Porta Temperos Vidro Borossilicato Hermético Tampa Bambu Organizador Cozinha 200 ml Seiri":
    "https://www.mercadolivre.com.br/kit-6-potes-porta-temperos-vidro-borossilicato-hermetico-tampa-bambu-organizador-cozinha-200-ml-seiri/p/MLB47907104?pdp_filters=deal%3AMLB1578289-1",
  "Conjunto 2 Garrafas Galheteiro De Porcelana C/ 4 Adesivos":
    "https://www.mercadolivre.com.br/conjunto-2-garrafas-galheteiro-de-porcelana-c-4-adesivos/up/MLBU772906459?pdp_filters=deal%3AMLB1578289-1",
  "Capa Protetora para Colchão Casal com Zíper Malha Cinza Matex":
    "https://www.mercadolivre.com.br/capa-protetora-para-colchao-casal-com-ziper-malha-cinza-matex/p/MLB24740242?pdp_filters=item_id%3AMLB3891613748",
  "Ibitex Capa para Sofá de 2 e 3 Lugares marrom-escuro":
    "https://www.mercadolivre.com.br/ibitex-capa-para-sofa-de-2-e-3-lugares-marrom-escuro/p/MLB27585423?pdp_filters=deal%3AMLB1578289-1",
  "Jogo 6 Taças De Champagne Bohemia Cristal Titanium 220ml":
    "https://www.mercadolivre.com.br/jogo-6-tacas-de-champagne-bohemia-cristal-titanium-220ml/p/MLB24440801?pdp_filters=deal%3AMLB1578289-1",
  "Penteadeira Kelan Suspensa Gaveta Multifuncional Prática Cor Branco":
    "https://www.mercadolivre.com.br/penteadeira-kelan-suspensa-gaveta-multifuncional-pratica-cor-branco/p/MLB54875919?pdp_filters=deal%3AMLB1578289-1",
  "Lixeira Com Sensor Automático 16 Litros Branco Inteligente Abre Fácil Toque Cesto Quarto Banheiro Cozinha":
    "https://www.mercadolivre.com.br/lixeira-com-sensor-automatico-16-litros-branco-inteligente-abre-facil-toque-cesto-quarto-banheiro-cozinha/p/MLB66205392?pdp_filters=deal%3AMLB1578289-1",
  "Kit Colcha Solteiro Virginia 2 Peças Macia Estampa Elegante":
    "https://produto.mercadolivre.com.br/MLB-5456876250-kit-colcha-solteiro-virginia-2-pecas-macia-estampa-elegante-_JM?pdp_filters=item_id%3AMLB5456876250",
  "Luminária Barra Led 60cm Sensor Movimento Recarregável Usb 1.5v Branco":
    "https://www.mercadolivre.com.br/luminaria-barra-led-60cm-sensor-movimento-recarregavel-usb/up/MLBU3480307386?pdp_filters=item_id%3AMLB4242358727",
  "Muda De Jabuticabeira Híbrida Precoce":
    "https://www.mercadolivre.com.br/muda-de-jabuticabeira-hibrida-precoce/up/MLBU1953421833?pdp_filters=item_id%3AMLB3869093741",
  "Limitador Separador Divisor De Grama 11cm x 50 metros Com Borda Gold Plant cor Verde Gold Plant":
    "https://www.mercadolivre.com.br/limitador-separador-divisor-de-grama-11cm-x-50-metros-com-borda-gold-plant-cor-verde-gold-plant/p/MLB37755759?pdp_filters=deal%3AMLB1578289-1",
  "Biol 2000 - Limpeza Fossa, Gordura E Ralos 100g":
    "https://www.mercadolivre.com.br/biol-2000-limpeza-fossa-gordura-e-ralos-100g/p/MLB2063534747?pdp_filters=item_id%3AMLB4628830348",
  "Garrafa Térmica 1000ml Aço Inox 304 Squeeze Isolada Vácuo com Alça e Bico para Água Gelada Esporte Academia Sólar Preto":
    "https://www.mercadolivre.com.br/garrafa-termica-1000ml-aco-inox-304-squeeze-isolada-vacuo-com-alca-e-bico-para-agua-gelada-esporte-academia-solar-preto/p/MLB50891692?pdp_filters=deal%3AMLB1578289-1",
  "Jogo de Lençol Casal 3 Peças 400 Fios Micropercal Azul-marinho Elástico":
    "https://www.mercadolivre.com.br/jogo-de-lencol-casal-3-pecas-400-fios-micropercal-azul-marinho-elastico/p/MLB47268018?pdp_filters=item_id%3AMLB6519092970",
  "Kit 2 Sensor De Presença E Movimento Iluminação Lâmpada Soquete E27 Fotocélula Infravermelho Bivolt Acende E Desliga Automático Thop Tech Importados":
    "https://www.mercadolivre.com.br/kit-2-sensor-de-presenca-e-movimento-iluminacao-lampada-soquete-e27-fotocelula-infravermelho-bivolt-acende-e-desliga-automatico-thop-tech-importados/p/MLB32340341?pdp_filters=item_id%3AMLB6231864960",
  "Projetor Astronauta de Galáxia e Estrelas LED Com Controle Remoto USB":
    "https://www.mercadolivre.com.br/projetor-astronauta-de-galaxia-e-estrelas-led-com-controle-remoto-usb/p/MLB29037232?pdp_filters=item_id%3AMLB4411250505",
  "Suqueira Transparente P/ Bebidas 4,5 Lt Super Transparente":
    "https://www.mercadolivre.com.br/suqueira-transparente-p-bebidas-45-lt-super-transparente/p/MLB68000047?pdp_filters=item_id%3AMLB4709154605",
  "Garrafa Térmica Café 1 Litro Nórdica Cabo Madeira Mesa Posta Preto":
    "https://www.mercadolivre.com.br/garrafa-termica-cafe-1-litro-nordica-cabo-madeira-mesa-posta/up/MLBU3706407543?pdp_filters=deal%3AMLB1578289-1",
  "Sulfato De Cobre 1kg Puro 99,0%":
    "https://www.mercadolivre.com.br/sulfato-de-cobre-1kg-puro-990/up/MLBU3531948091?pdp_filters=item_id%3AMLB4287000821",
  "Mini Mixer Misturador De Bebidas Elétrico 2 Em 1 Portátil Recarregável Mexedor De Ovos Whey Leite Café Espuma Shake Drinks Capuccino Suco Comica":
    "https://www.mercadolivre.com.br/mini-mixer-misturador-de-bebidas-eletrico-2-em-1-portatil-recarregavel-mexedor-de-ovos-whey-leite-cafe-espuma-shake-drinks-capuccino-suco-comica/p/MLB67146264?pdp_filters=item_id%3AMLB6519291232",
  "Kit 10 Potes 500ml Bpa Free Freezer Microondas Reutilizável Transparente":
    "https://www.mercadolivre.com.br/kit-10-potes-500ml-bpa-free-freezer-microondas-reutilizavel/up/MLBU3381781547?pdp_filters=item_id%3AMLB5642934704",
  "Centro De Mesa Fruteira Diamond Âmbar Vidro Grosso 33cm Cor Dourado":
    "https://www.mercadolivre.com.br/centro-de-mesa-fruteira-diamond-mbar-vidro-grosso-33cm-cor-dourado/p/MLB28900260?pdp_filters=deal%3AMLB1578289-1",
  "Tábua De Cozinha Para Descongelar Mais Rápido Alimentos E Cortar Mágica Multifuncional Premium Moderna Mix":
    "https://www.mercadolivre.com.br/tabua-de-cozinha-para-descongelar-mais-rapido-alimentos-e-cortar-magica-multifuncional-premium-moderna-mix/p/MLB51869125?pdp_filters=item_id%3AMLB5466408978",
  "10 Cabide Calça Resistente Cabide 1 Calça Cromado Promoção Aço Cromado":
    "https://www.mercadolivre.com.br/10-cabide-calca-resistente-cabide-1-calca-cromado-promocao/up/MLBU2093886386?pdp_filters=deal%3AMLB1578289-1",
  "Marinex Conjunto de Assadeiras Oval Opaline 3 Peças Branco":
    "https://www.mercadolivre.com.br/marinex-conjunto-de-assadeiras-oval-opaline-3-pecas-branco/p/MLB27410145?pdp_filters=deal%3AMLB1578289-1",
  "Tapete Para Quarto Felpudo 1,40x2,00 Sala Peludo Pelinho Die Cor Fúcsia Desenho Do Tecido Pelo Alto":
    "https://www.mercadolivre.com.br/tapete-para-quarto-felpudo-140x200-sala-peludo-pelinho-die-cor-fucsia-desenho-do-tecido-pelo-alto/p/MLB33444952?pdp_filters=deal%3AMLB1578289-1",
  "Garrafão Térmico 5 Litros Pro Velvet Invicta Vermelho Com Tampa":
    "https://www.mercadolivre.com.br/garrafao-termico-5-litros-pro-velvet-invicta-vermelho-com-tampa/p/MLB21882834?pdp_filters=deal%3AMLB1578289-1",
  "Kit C/ 10 Organizadores Cozinha Gaveta Divisória Multiuso":
    "https://www.mercadolivre.com.br/kit-c-10-organizadores-cozinha-gaveta-divisoria-multiuso/p/MLB27855689?pdp_filters=deal%3AMLB1578289-1",
  "Kit 4 Cestos Organizadores Armário Gaveta Lavanderia 2l":
    "https://produto.mercadolivre.com.br/MLB-3208803782-kit-4-cestos-organizadores-armario-gaveta-lavanderia-2l-_JM?pdp_filters=item_id%3AMLB3208803782",
  "Kit 2 Saco Para Lavar Sapatos Na Máquina De Lavar Prático Kit 2 Aleatoria":
    "https://www.mercadolivre.com.br/kit-2-saco-para-lavar-sapatos-na-maquina-de-lavar-pratico/up/MLBU3869115439?pdp_filters=item_id%3AMLB6544298816",
  "Jogo 6 Copos Diamond Egipcio 300ml Vidro Grosso Diamante Luxo Transparente Vitrex":
    "https://www.mercadolivre.com.br/jogo-6-copos-diamond-egipcio-300ml-vidro-grosso-diamante-luxo-transparente-vitrex/p/MLB65966191?pdp_filters=deal%3AMLB1578289-1",
  "3un Caixa Organizadora Multiuso Plástica 30 Litros Com Tampa Preto":
    "https://www.mercadolivre.com.br/3un-caixa-organizadora-multiuso-plastica-30-litros-com-tampa/up/MLBU1160926008?pdp_filters=deal%3AMLB1578289-1",
  "Kit 3 Potes Vidro 640ml Divisória Hermético Marmita Forno Transparente":
    "https://www.mercadolivre.com.br/kit-3-potes-vidro-640ml-divisoria-hermetico-marmita-forno/up/MLBU3945398566?pdp_filters=deal%3AMLB1578289-1",
  "Kit 10 Saco À Vácuo Grande 50x60cm Mala Viagem Roupa Edredom":
    "https://www.mercadolivre.com.br/kit-10-saco-vacuo-grande-50x60cm-mala-viagem-roupa-edredom/p/MLB2085857534?pdp_filters=deal%3AMLB1578289-1",
  "Kit 20 Anel Para Guardanapo Argola Madeira Prendedor Luxo":
    "https://www.mercadolivre.com.br/kit-20-anel-para-guardanapo-argola-madeira-prendedor-luxo/p/MLB27639706?pdp_filters=item_id%3AMLB5189996148",
  "Chapa para Fogão Hambúrguer Fantinato Aço 42x22cm Com Cabo de Madeira":
    "https://www.mercadolivre.com.br/chapa-para-fogao-hamburguer-fantinato-aco-42x22cm-com-cabo-de-madeira/p/MLB27431017?pdp_filters=item_id%3AMLB4092911712",
  "Kit 4 Sacos Organizador Multiuso Dobrável Para Armazenamento Anti-poeira E Umidade Cor Cinza":
    "https://www.mercadolivre.com.br/kit-4-sacos-organizador-multiuso-dobravel-para-armazenamento-anti-poeira-e-umidade-cor-cinza/p/MLB64970847?pdp_filters=item_id%3AMLB7435635608",
  "Jogo de Facas Tramontina Plenus 7 peças Preto 23498/066":
    "https://www.mercadolivre.com.br/jogo-de-facas-tramontina-plenus-7-pecas-preto-23498066/p/MLB27410772?pdp_filters=deal%3AMLB1578289-1",
  "Tapete Peludo Para Sala Quarto 2,00 X 1,40 Grande Pelo Alto":
    "https://produto.mercadolivre.com.br/MLB-3265076717-tapete-peludo-para-sala-quarto-200-x-140-grande-pelo-alto-_JM",
  "Bomba Para Galão De Água 5 10l 20l Recarregável Usb Garrafão Branco":
    "https://www.mercadolivre.com.br/bomba-para-galao-de-agua-5-10l-20l-recarregavel-usb-garrafao/up/MLBU3228998718?pdp_filters=item_id%3AMLB6189289904",
  "Estátua Águia Decorativa Resina Dourada 22cm":
    "https://www.mercadolivre.com.br/estatua-aguia-decorativa-resina-dourada-22cm/p/MLB39698353?pdp_filters=deal%3AMLB1578289-1",
  "Broca 80x10 Perfurador Solo 800x100 C/ Pino Trava Carbon Fak":
    "https://www.mercadolivre.com.br/broca-80x10-perfurador-solo-800x100-c-pino-trava-carbon-fak/p/MLB54177345?pdp_filters=deal%3AMLB1578289-1",
  "Kit 20 Pote 800ml Transparente Marmita Fitnees Bpa Free Transparente":
    "https://www.mercadolivre.com.br/kit-20-pote-800ml-transparente-marmita-fitnees-bpa-free/up/MLBU3539328969?pdp_filters=item_id%3AMLB5909072422",
  "Jogo De Lençol Queen Micropercal 400 Fios Sofisticado 3pç Cor Rosa Desenho do tecido Liso":
    "https://www.mercadolivre.com.br/jogo-de-lencol-queen-micropercal-400-fios-sofisticado-3pc-cor-rosa-desenho-do-tecido-liso/p/MLB44395652?pdp_filters=item_id%3AMLB5208207746",
  "Kit 6 Copos Shots Dose Vidro 40 Ml Com Tábua Régua Madeira Kit Tábua Madeira Regua Com 6 Copos Shots Dose Vidro 40 Ml Tequila Drinks":
    "https://www.mercadolivre.com.br/kit-6-copos-shots-dose-vidro-40-ml-com-tabua-regua-madeira/up/MLBU2920756902?pdp_filters=item_id%3AMLB5236118842",
  "Forma Bolo Brinox Ceramic Life Bakeware 19,5cm 2,2l Vanilla":
    "https://www.mercadolivre.com.br/forma-bolo-brinox-ceramic-life-bakeware-195cm-22l-vanilla/p/MLB66665071?pdp_filters=deal%3AMLB1578289-1",
  "Manta Para Sofá 300 X 180 Super Grande Decorativa Luxuosa Cru Liso":
    "https://www.mercadolivre.com.br/manta-para-sofa--300-x-180-super-grande-decorativa-luxuosa/up/MLBU4777244099?pdp_filters=deal%3AMLB1578289-1",
  "Rede De Dormir Descanso Nylon Impermeável Amazonas Colorida":
    "https://produto.mercadolivre.com.br/MLB-3705086444-rede-de-dormir-descanso-nylon-impermeavel-amazonas-colorida-_JM",
  "Tapete Felpudo Quarto Sala 1,00 X 1,40 Mt Peludo":
    "https://produto.mercadolivre.com.br/MLB-3383650729-tapete-felpudo-quarto-sala-100-x-140-mt-peludo-_JM",
  "Mini Mixer Elétrico Portátil Misturador De Bebidas Café Leite Cappuccino Whey Protein Shake Ovos Espumador Batedor Fouet Inox Compacto Cozinha Drinks Mackie Ferramentas":
    "https://www.mercadolivre.com.br/mini-mixer-eletrico-portatil-misturador-de-bebidas-cafe-leite-cappuccino-whey-protein-shake-ovos-espumador-batedor-fouet-inox-compacto-cozinha-drinks-mackie-ferramentas/p/MLB25295297?pdp_filters=item_id%3AMLB5849687808",
  "Tapete saggy, felpudo. Dhalishop Shaggy cor Cinza-escuro liso - de 2m x 1.4m":
    "https://www.mercadolivre.com.br/tapete-saggy-felpudo-dhalishop-shaggy-cor-cinza-escuro-liso-de-2m-x-14m/p/MLB59797464?pdp_filters=deal%3AMLB1578289-1",
  "Dispenser De Detergente Para Pia De Cozinha Com Porta Esponja Bucha Em Aço Inox E Dosador De Detergente Para Pia Com Porta Talheres Marca Open Zee Cor Prateado":
    "https://www.mercadolivre.com.br/dispenser-de-detergente-para-pia-de-cozinha-com-porta-esponja-bucha-em-aco-inox-e-dosador-de-detergente-para-pia-com-porta-talheres-marca-open-zee-cor-prateado/p/MLB69230637?pdp_filters=item_id%3AMLB6756720574",
  "Torneira Gourmet Luxo Flexível Cozinha Parede 2 Jatos Pia Metal Cor Aço Inox e Preto- Marca Camperluz":
    "https://www.mercadolivre.com.br/torneira-gourmet-luxo-flexivel-cozinha-parede-2-jatos-pia-metal-cor-aco-inox-e-preto-marca-camperluz/p/MLB45553868?pdp_filters=deal%3AMLB1578289-1",
  "Escorredor Louca Secador Porta Talheres Não Enferruja Preto Arthi WoW":
    "https://www.mercadolivre.com.br/escorredor-louca-secador-porta-talheres-nao-enferruja-preto-arthi-wow/p/MLB53804183?pdp_filters=item_id%3AMLB4131975751",
  "Rede Dormir Descanso Casal Balanço Grande Basica Resistente Verde":
    "https://www.mercadolivre.com.br/rede-dormir-descanso-casal-balanco-grande-basica-resistente/up/MLBU2824081765?pdp_filters=deal%3AMLB1578289-1",
  "Kit 4 Pote Para Alimentos Seiri Transparente 800 Ml Cozinha Flat Transparente":
    "https://www.mercadolivre.com.br/kit-4-pote-para-alimentos-seiri-transparente-800-ml-cozinha-flat-transparente/p/MLB67407595?pdp_filters=deal%3AMLB1578289-1",
  "Kit 10 Panos De Prato Felpudo Atoalhado Premium Luxo 40x60 Multicolorido Quadriculado":
    "https://www.mercadolivre.com.br/kit-10-panos-de-prato-felpudo-atoalhado-premium-luxo-40x60/up/MLBU3869318331?pdp_filters=deal%3AMLB1578289-1",
  "Jogo Sobremesa/salada Bowls - 7 peças":
    "https://www.mercadolivre.com.br/jogo-sobremesasalada-bowls-7-pecas/p/MLB65548633?pdp_filters=item_id%3AMLB4930140797",
  "Câmera Lâmpada Segurança Inteligente Visão Noturna Hd Wifi Cor Branco":
    "https://www.mercadolivre.com.br/camera-lampada-seguranca-inteligente-visao-noturna-hd-wifi-cor-branco/p/MLB61494390?pdp_filters=item_id%3AMLB7111116818",
  "Forma Torta Suíça Coração Decorada 17x8 Alumínio Roldan Cinza":
    "https://www.mercadolivre.com.br/forma-torta-suica-coracao-decorada-17x8-aluminio-roldan/up/MLBU3102528060?pdp_filters=item_id%3AMLB4019445215",
  "Kit Boleira Suporte Mesa 5 Peças Ferro e Madeira Dourado Festa Bolos":
    "https://www.mercadolivre.com.br/kit-boleira-suporte-mesa-5-pecas-ferro-e-madeira-dourado-festa-bolos/p/MLB63134897?pdp_filters=deal%3AMLB1578289-1",
  "Fuê Fouet Batedor De Ovos Profissional 30cm Inox Cabo Branco Branco":
    "https://www.mercadolivre.com.br/fue-fouet-batedor-de-ovos-profissional-30cm-inox-cabo-branco/up/MLBU3938724230?pdp_filters=deal%3AMLB1578289-1",
  "Jogo 6 Copos Vidro Canelado 423ml Moderno Elegante Premium Vinho Água Suco Drinks Gin Whisky Jogo Copos Taça Copo Conjunto Design Luxo Texturizado Cozinha Restaurante Decoração Hold On":
    "https://www.mercadolivre.com.br/jogo-6-copos-vidro-canelado-423ml-moderno-elegante-premium-vinho-agua-suco-drinks-gin-whisky-jogo-copos-taca-copo-conjunto-design-luxo-texturizado-cozinha-restaurante-decoracao-hold-on/p/MLB75215049?pdp_filters=deal%3AMLB1578289-1",
  "Panela De Pressao 7 Litros Polida Fortlar":
    "https://www.mercadolivre.com.br/panela-de-pressao-7-litros-polida-fortlar/up/MLBU3114516484?pdp_filters=deal%3AMLB1578289-1",
  "Garrafão Agua Gelada Café Galão Térmico 5 Litros Invicta Cor Azul":
    "https://www.mercadolivre.com.br/garrafao-agua-gelada-cafe-galao-termico-5-litros-invicta-cor-azul/p/MLB19743761?pdp_filters=deal%3AMLB1578289-1",
  "Cuscuzeira Inox Nordestina 16cm Fratelli 2.5l Prateada":
    "https://www.mercadolivre.com.br/cuscuzeira-inox-nordestina-16cm-fratelli-25l-prateada/p/MLB19951179?pdp_filters=deal%3AMLB1578289-1",
  "Kit 3 Toucas Toalha Mágica Microfibra Antifrizz Cor Sortida Banho Pos Lisos Crespos":
    "https://www.mercadolivre.com.br/kit-3-toucas-toalha-magica-microfibra-antifrizz-cor-sortida/up/MLBU4195286710?pdp_filters=item_id%3AMLB4831735549",
  "Jogo 6 Pratos Sobremesa Raso Vidro Branco Redondo 18cm Restaurante Hotel Mesa Posta Cozinha Resistente Elegante 6 Peças":
    "https://www.mercadolivre.com.br/jogo-6-pratos-sobremesa-raso-vidro-branco-redondo-18cm-restaurante-hotel-mesa-posta-cozinha-resistente-elegante-6-pecas/p/MLB76274156?pdp_filters=item_id%3AMLB4987978883",
  "Escova Elétrica Limpeza Multiuso 9 em 1 Sem Fio Recarregável Portátil para Cozinha Banheiro Piso Azulejo":
    "https://www.mercadolivre.com.br/escova-eletrica-limpeza-multiuso-9-em-1-sem-fio-recarregavel-portatil-para-cozinha-banheiro-piso-azulejo/p/MLB56092313?pdp_filters=deal%3AMLB1578289-1",
  "Boleira Vidro Ruvolo, Boleira com Tampa Acrílica e Pé":
    "https://www.mercadolivre.com.br/boleira-vidro-ruvolo-boleira-com-tampa-acrilica-e-pe/p/MLB34852629?pdp_filters=deal%3AMLB1578289-1",
  "Porta Frios Base Bambu / Tampa Vidro Premium Organizador Transparente":
    "https://www.mercadolivre.com.br/porta-frios-base-bambu--tampa-vidro-premium-organizador/up/MLBU3910617055?pdp_filters=deal%3AMLB1578289-1",
  "Kit 10 Cestas Madeira 5 Oval E 5 Redonda Com Alça P Presente Natural":
    "https://www.mercadolivre.com.br/kit-10-cestas-madeira-5-oval-e-5-redonda-com-alca-p-presente/up/MLBU1857842981?pdp_filters=deal%3AMLB1578289-1",
  "Espelho Veneza 100x50cm Corpo Inteiro Grande Moderno Luxo Suporte":
    "https://www.mercadolivre.com.br/espelho-veneza-100x50cm-corpo-inteiro-grande-moderno-luxo/up/MLBU3889159698?pdp_filters=deal%3AMLB1578289-1",
  "Conjunto 6 Pote Vidro Hermético Marmita Tampa Plástico 640ml":
    "https://www.mercadolivre.com.br/conjunto-6-pote-vidro-hermetico-marmita-tampa-plastico-640ml/p/MLB29764199?pdp_filters=deal%3AMLB1578289-1",
  "Ducha Higiênica Chuveirinho de Banheiro 1.20m Bidê Forte Lar 1/4 Volta":
    "https://www.mercadolivre.com.br/ducha-higienica-chuveirinho-de-banheiro-120m-bide-forte-lar-14-volta/p/MLB39294072?pdp_filters=item_id%3AMLB4103575051",
  "Rede De Descanso Casal Reforçada Life - Várias Cores Bege Liso":
    "https://www.mercadolivre.com.br/rede-de-descanso-casal-reforcada-life--varias-cores/up/MLBU2832156615?pdp_filters=deal%3AMLB1578289-1",
  "3 Manta Microfibra Coberta Casal Solf 2,00 X 1,80 Macia Lisa Liso Variadas":
    "https://www.mercadolivre.com.br/3-manta-microfibra-coberta-casal-solf-200-x-180-macia-lisa/up/MLBU785823496?pdp_filters=deal%3AMLB1578289-1",
  "Kit Jogo De Facas Inox Corte Afiado Antiaderente Presente Cor Marrom-escuro":
    "https://www.mercadolivre.com.br/kit-jogo-de-facas-inox-corte-afiado-antiaderente-presente-cor-marrom-escuro/p/MLB28884304?pdp_filters=deal%3AMLB1578289-1",
  "Kit 4 Capas De Almofada 45x45cm Efeito Linho Toque Suave Bege":
    "https://www.mercadolivre.com.br/kit-4-capas-de-almofada-45x45cm-efeito-linho-toque-suave/up/MLBU3525180566?pdp_filters=item_id%3AMLB4277346133",
  "Tapete Felpudo Para Sala e Quarto de Poliéster 2m x 1.5m Antiderrapante":
    "https://www.mercadolivre.com.br/tapete-felpudo-para-sala-e-quarto-de-poliester-2m-x-15m-antiderrapante/p/MLB47437516?pdp_filters=deal%3AMLB1578289-1",
  "Kit 10 Vasos Decorativos 12,5 Cm Vidro Flores Solitário Branco Lisa":
    "https://www.mercadolivre.com.br/kit-10-vasos-decorativos-125-cm-vidro-flores-solitario/up/MLBU3688286379?pdp_filters=item_id%3AMLB6088025722",
  "Jogo Lençol Casal 3pç 400 Fios Hipercal Conforto Macio Cor Thiffany Desenho do tecido Liso":
    "https://www.mercadolivre.com.br/jogo-lencol-casal-3pc-400-fios-hipercal-conforto-macio-cor-thiffany-desenho-do-tecido-liso/p/MLB43830439?pdp_filters=item_id%3AMLB3941150079",
  "Comedouro Tratador Pássaros Livres Silvestres Porta Ração Betume Egípcio":
    "https://www.mercadolivre.com.br/comedouro-tratador-passaros-livres-silvestres-porta-racao-betume-egipcio/p/MLB54357720?pdp_filters=item_id%3AMLB4758698771",
  "Colcha Elegante Cobre Leito Súper Queen 3 Peças Luxo":
    "https://produto.mercadolivre.com.br/MLB-4007496435-colcha-elegante-cobre-leito-super-queen-3-pecas-luxo-_JM?pdp_filters=item_id%3AMLB4007496435",
  "Apoio Pés Ergonômico Escritório Massageador Descanso Nr17":
    "https://www.mercadolivre.com.br/apoio-pes-ergonomico-escritorio-massageador-descanso-nr17/up/MLBU3846651234?pdp_filters=item_id%3AMLB6448678082",
  "Kit 20 Metros Festão Natalino Verde Natal Árvore Decoração Verde":
    "https://www.mercadolivre.com.br/kit-20-metros-festao-natalino-verde-natal-arvore-decoracao/up/MLBU3463296106?pdp_filters=item_id%3AMLB4232442237",
  "Vittak Sapateira Organizador Vertical Cabideiro Roupa Prateleiras Sapatos Bolsa Multiuso Cor Preto":
    "https://www.mercadolivre.com.br/vittak-sapateira-organizador-vertical-cabideiro-roupa-prateleiras-sapatos-bolsa-multiuso-cor-preto/p/MLB40868653?pdp_filters=deal%3AMLB1578289-1",
  "Jogo 4pcs Frigideiras Antiaderentes 14cm 18cm 22cm Espatula Creme":
    "https://www.mercadolivre.com.br/jogo-4pcs-frigideiras-antiaderentes-14cm-18cm-22cm-espatula/up/MLBU3923891290?pdp_filters=deal%3AMLB1578289-1",
  "Tramontina Paris fervedor antiaderente 1,9 l com tampa vidro cor vermelho":
    "https://www.mercadolivre.com.br/tramontina-paris-fervedor-antiaderente-19-l-com-tampa-vidro-cor-vermelho/p/MLB28145178?pdp_filters=deal%3AMLB1578289-1",
  "Organizador De Geladeira Grande Com 3 Cestos de Drenagem 6,8 L":
    "https://www.mercadolivre.com.br/organizador-de-geladeira-grande-com-3-cestos-de-drenagem-68-l/p/MLB47649271?pdp_filters=deal%3AMLB1578289-1",
  "Kit Tapete Cozinha 3 Peças Mônaco Moderno Antiderrapante":
    "https://produto.mercadolivre.com.br/MLB-6516741126-kit-tapete-cozinha-3-pecas-mnaco-moderno-antiderrapante-_JM?pdp_filters=item_id%3AMLB6516741126",
  "Jogo Kit 8 Peças Medidor Culinário Em Aço Inox Colher Copo Xícara Sopa Cozinha Cor: Preto - Smart Tools®":
    "https://www.mercadolivre.com.br/jogo-kit-8-pecas-medidor-culinario-em-aco-inox-colher-copo-xicara-sopa-cozinha-cor-preto-smart-tools/p/MLB54099733?pdp_filters=item_id%3AMLB4181266827",
  "Fervedor Canecão Leiteira No 12 Antiaderente Tampa De Vidro Marfim":
    "https://www.mercadolivre.com.br/fervedor-canecao-leiteira-no-12-antiaderente-tampa-de-vidro/up/MLBU3931787175?pdp_filters=deal%3AMLB1578289-1",
  "Jogo De Lençol Casal Padrão 3 Pçs 400 Fios C/ Elástico Hotel Cinza Liso":
    "https://www.mercadolivre.com.br/jogo-de-lencol-casal-padrao-3-pcs-400-fios-c-elastico-hotel/up/MLBU3419246078?pdp_filters=deal%3AMLB1578289-1",
  "Rolo Adesivo Scotch-Brite 3M Roupa Sofa Kit 3 Peças Com 2 Refis":
    "https://www.mercadolivre.com.br/rolo-adesivo-scotch-brite-3m-roupa-sofa-kit-3-pecas-com-2-refis/p/MLB25561894?pdp_filters=deal%3AMLB1578289-1",
  "Kit 4 Pçs Colcha Cobre Leito Solteiro + Jogo De Lençol Cores":
    "https://produto.mercadolivre.com.br/MLB-3363333135-kit-4-pcs-colcha-cobre-leito-solteiro-jogo-de-lencol-cores-_JM",
  "Kit com 6 Potes Organizadores de Vidro de 200ml 4Fitness, Tampa em Bambu, Vedação Hermética, Porta Temperos, Acompanha Etiquetas e Caneta":
    "https://www.mercadolivre.com.br/kit-com-6-potes-organizadores-de-vidro-de-200ml-4fitness-tampa-em-bambu-vedacao-hermetica-porta-temperos-acompanha-etiquetas-e-caneta/p/MLB29152579?pdp_filters=item_id%3AMLB5124518239",
  "Sapateira Vertical Quarto Inox Luxo 18 Pares 6 Prateleiras 1 Box":
    "https://www.mercadolivre.com.br/sapateira-vertical-quarto-inox-luxo-18-pares-6-prateleiras/up/MLBU3278127583?pdp_filters=deal%3AMLB1578289-1",
  "Mesa Cabeceira Cama Criado 1 Gaveta Retro Prateleira Sleep":
    "https://produto.mercadolivre.com.br/MLB-5151164046-mesa-cabeceira-cama-criado-1-gaveta-retro-prateleira-sleep-_JM",
  "Kit 3 Porta Algodão E Cotonete Organizador Banheiro Quarto T Tranparente Liso":
    "https://www.mercadolivre.com.br/kit-3-porta-algodao-e-cotonete-organizador-banheiro-quarto-t/up/MLBU3811545113?pdp_filters=item_id%3AMLB6312487998",
  "Disco De Arado Grande 50cm Tacho Arredondada Aço Reforçado":
    "https://www.mercadolivre.com.br/disco-de-arado-grande-50cm-tacho-arredondada-aco-reforcado/p/MLB24669462?pdp_filters=deal%3AMLB1578289-1",
  "Tapete Felpudo Para Sala de 2,00 x 1,50 m Antiderrapante Cinza-Escuro":
    "https://www.mercadolivre.com.br/tapete-felpudo-para-sala-de-200-x-150-m-antiderrapante-cinza-escuro/p/MLB51862557?pdp_filters=deal%3AMLB1578289-1",
  "Mop Giratório Pro Com Centrífuga em Aço Inox Powermaid Cinza e Vermelho":
    "https://www.mercadolivre.com.br/mop-giratorio-pro-com-centrifuga-em-aco-inox-powermaid-cinza-e-vermelho/p/MLB23682432?pdp_filters=deal%3AMLB1578289-1",
  "Kit 15 Marmitas Potes 500ml Livre De Bpa Freezer Microondas Transparente":
    "https://www.mercadolivre.com.br/kit-15-marmitas-potes-500ml-livre-de-bpa-freezer-microondas/up/MLBU3381742005?pdp_filters=item_id%3AMLB5642984390",
  "Jogo Facas Tramontina Kit Conjunto Faca Cozinha Churrasco 4p":
    "https://www.mercadolivre.com.br/jogo-facas-tramontina-kit-conjunto-faca-cozinha-churrasco-4p/p/MLB27393392?pdp_filters=item_id%3AMLB4456788858",
  "Kit Jogo Potes Vidro Nadir Figueiredo Conserva Hermético 600ml com Tampa":
    "https://www.mercadolivre.com.br/kit-jogo-potes-vidro-nadir-figueiredo-conserva-hermetico-600ml-com-tampa/p/MLB44174941?pdp_filters=deal%3AMLB1578289-1",
  "Escova Elétrica Recarregável Azulejo Banheiro 9 em 1 Potente Rotativa Branco":
    "https://www.mercadolivre.com.br/escova-eletrica-recarregavel-azulejo-banheiro-9-em-1-potente-rotativa-branco/p/MLB44791930?pdp_filters=deal%3AMLB1578289-1",
  "Cortador Fatiador Ralador De Legumes Frutas Vegetais Triturador Picador Manual 16 Peças para Cozinha Mandolin Inox Sólar":
    "https://www.mercadolivre.com.br/cortador-fatiador-ralador-de-legumes-frutas-vegetais-triturador-picador-manual-16-pecas-para-cozinha-mandolin-inox-solar/p/MLB63233122?pdp_filters=deal%3AMLB1578289-1",
  "Jarra Vidro Borossilicato 1,8 Litros Tampa Inox Hermética Agua Suco Transparente":
    "https://www.mercadolivre.com.br/jarra-vidro-borossilicato-18-litros-tampa-inox-hermetica-agua-suco-transparente/p/MLB67721503?pdp_filters=deal%3AMLB1578289-1",
  "Kit 4 Potes Hermético 1 Litro - Bpa Free Organizador Com Tampa Para Alimentos, Empilhável, Organizadores Para Armário E Cozinha, Mantimentos":
    "https://www.mercadolivre.com.br/kit-4-potes-hermetico-1-litro-bpa-free-organizador-com-tampa-para-alimentos-empilhavel-organizadores-para-armario-e-cozinha-mantimentos/p/MLB67682246?pdp_filters=item_id%3AMLB6607278406",
  "Caixinha De Música Piano Com Bailarina Dançarina Branco":
    "https://www.mercadolivre.com.br/caixinha-de-musica-piano-com-bailarina-dancarina/up/MLBU1442667337?pdp_filters=item_id%3AMLB3412018355",
  "Copo Térmica 600ml Inox Anti-vazamento Para Café/chá/bebidas Branco Liso":
    "https://www.mercadolivre.com.br/copo-termica-600ml-inox-antivazamento-para-cafechabebidas/up/MLBU3657742148?pdp_filters=item_id%3AMLB6507568824",
  "Saleiro Porcelana Premium Mesa Colher Tampa Bambu 300gr":
    "https://www.mercadolivre.com.br/saleiro-porcelana-premium-mesa-colher-tampa-bambu-300gr/p/MLB24299590?pdp_filters=item_id%3AMLB5257448385",
  "Faqueiro Inox 24 Peças Essenciale Haushop Jogo De Talheres Conjunto Mesa Posta Premium Resistente":
    "https://www.mercadolivre.com.br/faqueiro-inox-24-pecas-essenciale-haushop-jogo-de-talheres-conjunto-mesa-posta-premium-resistente/p/MLB74580964?pdp_filters=deal%3AMLB1578289-1",
  "Raquete Elétrica Mata Mosquito Mosca Pernilongo Dengue Insetos Bateria Recarregavel Bivolt - Crowley":
    "https://www.mercadolivre.com.br/raquete-eletrica-mata-mosquito-mosca-pernilongo-dengue-insetos-bateria-recarregavel-bivolt-crowley/p/MLB57484425?pdp_filters=item_id%3AMLB4655539667",
  "Penteadeira Suspensa Br60 Gaveta Flutuante Maquiagem Camarim Mdf Preto":
    "https://www.mercadolivre.com.br/penteadeira-suspensa-br60-gaveta-flutuante-maquiagem-camarim/up/MLBU3891040770?pdp_filters=deal%3AMLB1578289-1",
  "Varal Portátil Para Apartamento Secador De Roupas Para Janela Wow World Of Wonders":
    "https://www.mercadolivre.com.br/varal-portatil-para-apartamento-secador-de-roupas-para-janela-wow-world-of-wonders/p/MLB54025684?pdp_filters=item_id%3AMLB3556456647",
  "Kit 2 Cobertor Mantinha Microfibra Casal Manta Macia Diversas Cores Lisa Sortida":
    "https://www.mercadolivre.com.br/kit-2-cobertor-mantinha-microfibra-casal-manta-macia-diversas-cores-lisa-sortida/p/MLB38618868?pdp_filters=deal%3AMLB1578289-1",
  "Quadros Familia Frase Abençoados Por Deus Cabeceira Vazado Preto":
    "https://www.mercadolivre.com.br/quadros-familia-frase-abencoados-por-deus-cabeceira-vazado/up/MLBU2543944663?pdp_filters=item_id%3AMLB5715960300",
  "Tapete Passadeira De Cozinha Corredor Sisal Antiderrapante Casacom Arte Cor Marrom-claro":
    "https://www.mercadolivre.com.br/tapete-passadeira-de-cozinha-corredor-sisal-antiderrapante-casacom-arte-cor-marrom-claro/p/MLB44565253?pdp_filters=deal%3AMLB1578289-1",
  "Kit de 6 Taças de Vidro Diamond 315ml para Água, Vinho e Drinks":
    "https://www.mercadolivre.com.br/kit-de-6-tacas-de-vidro-diamond-315ml-para-agua-vinho-e-drinks/p/MLB64249142?pdp_filters=deal%3AMLB1578289-1",
  "Mop Spray Esfregão Vassoura Mágica WOW WORLD OF WONDERS Mop Spray":
    "https://www.mercadolivre.com.br/mop-spray-esfregao-vassoura-magica-wow-world-of-wonders-mop-spray/p/MLB53196598?pdp_filters=deal%3AMLB1578289-1",
  "Kit 2 Tapete De Banheiro Antiderrapante Super Suave 60x40cm":
    "https://produto.mercadolivre.com.br/MLB-4266838277-kit-2-tapete-de-banheiro-antiderrapante-super-suave-60x40cm-_JM",
  "Batedor Globo De Claras Batedeira Planetária Philco PHP500":
    "https://www.mercadolivre.com.br/batedor-globo-de-claras-batedeira-planetaria-philco-php500/p/MLB25909122?pdp_filters=item_id%3AMLB5813136722",
  "Coador De Café Inox 103 Com Filtro Permanente Reutilizável Aço Inox Premium Durável Fácil De Lavar":
    "https://www.mercadolivre.com.br/coador-de-cafe-inox-103-com-filtro-permanente-reutilizavel-aco-inox-premium-duravel-facil-de-lavar/p/MLB62782082?pdp_filters=item_id%3AMLB6002326948",
  "Chaleira Brinox 2,7 L Com Apito Linha Roma Preto Marble":
    "https://www.mercadolivre.com.br/chaleira-brinox-27-l-com-apito-linha-roma-preto-marble/p/MLB62269837?pdp_filters=deal%3AMLB1578289-1",
  "Triturador de Alimentos Manual 900ml com 5 Lâminas Inox – Picador de Cebola Alho Legumes e Temperos Pétalas Douradas Fatiador Cortador":
    "https://www.mercadolivre.com.br/triturador-de-alimentos-manual-900ml-com-5-laminas-inox-picador-de-cebola-alho-legumes-e-temperos-petalas-douradas-fatiador-cortador/p/MLB66124542?pdp_filters=deal%3AMLB1578289-1",
  "Amassador De Lata 475ml Parede Reforçado Metal Reciclagem":
    "https://www.mercadolivre.com.br/amassador-de-lata-475ml-parede-reforcado-metal-reciclagem/p/MLB26451083?pdp_filters=deal%3AMLB1578289-1",
  "Cortador Fatiador Ralador De Legumes E Frutas 16 Peças Com Recipiente Coletor Lâminas Inox Mandoline Manual Multiuso Solar":
    "https://www.mercadolivre.com.br/cortador-fatiador-ralador-de-legumes-e-frutas-16-pecas-com-recipiente-coletor-laminas-inox-mandoline-manual-multiuso-solar/p/MLB75639524?pdp_filters=item_id%3AMLB4925522609",
  "Gancho De Rede De Descanso Aliança Aço Cromado Inox Suporta 120kg Par":
    "https://www.mercadolivre.com.br/gancho-de-rede-de-descanso-alianca-aco-cromado-inox-suporta-120kg-par/p/MLB29038820?pdp_filters=deal%3AMLB1578289-1",
  "Heemli Ducha Chuveiro Alta Autolimpante Articulável Quadrada Prateado Cromado":
    "https://www.mercadolivre.com.br/heemli-ducha-chuveiro-alta-autolimpante-articulavel-quadrada/up/MLBU3849003389?pdp_filters=deal%3AMLB1578289-1",
  "Espelho Redondo 40cm com Iluminação LED Fria para Parede - Ideal para Quarto, Banheiro e Sala, Moldura Lapidada de 40cm, Perfeito para Decoração":
    "https://www.mercadolivre.com.br/espelho-redondo-40cm-com-iluminacao-led-fria-para-parede-ideal-para-quarto-banheiro-e-sala-moldura-lapidada-de-40cm-perfeito-para-decoracao/p/MLB61587055?pdp_filters=item_id%3AMLB4614625323",
  "Kit Garrafa Térmica Inox 500ml Com 3 Xícara Garrafas De Café Azul":
    "https://www.mercadolivre.com.br/kit-garrafa-termica-inox-500ml-com-3-xicara-garrafas-de-cafe/up/MLBU3788808624?pdp_filters=deal%3AMLB1578289-1",
  "Kit 100 Formas De Papel Para Airfryer Descartável Antiaderente Bandeja Quadrada Ciclo Alternativa":
    "https://www.mercadolivre.com.br/kit-100-formas-de-papel-para-airfryer-descartavel-antiaderente-bandeja-quadrada-ciclo-alternativa/p/MLB63337660?pdp_filters=item_id%3AMLB4390228583",
  "Jogo de Lençol King C/ Elástico E Fronhas Ponto Palito 3 Peças 400 Fios Hotel Premium Cor Branco":
    "https://www.mercadolivre.com.br/jogo-de-lencol-king-c-elastico-e-fronhas-ponto-palito-3-pecas-400-fios-hotel-premium-cor-branco/p/MLB46476088?pdp_filters=deal%3AMLB1578289-1",
  "Suporte Lt Cabo Extensor Alumínio 3metros + 2 Fibras Geral":
    "https://www.mercadolivre.com.br/suporte-lt-cabo-extensor-aluminio-3metros--2-fibras-geral/up/MLBU3607382709?pdp_filters=item_id%3AMLB4321885219",
  "Cobre Leito Queen Matelado Dupla Face Leve Confortável Macio Preto Matelado":
    "https://www.mercadolivre.com.br/cobre-leito-queen-matelado-dupla-face-leve-confortavel-macio-preto-matelado/p/MLB67991124?pdp_filters=deal%3AMLB1578289-1",
  "Garrafa Térmica 500ml Com Kit 3 Xícara Café Chá Cor Prata/Bege":
    "https://www.mercadolivre.com.br/garrafa-termica-500ml-com-kit-3-xicara-cafe-cha-cor-pratabege/p/MLB25816502?pdp_filters=deal%3AMLB1578289-1",
  "Kit 10 Potes De Vidro Hermético Com Tampa Tigela Redondo Freezer Micro-ondas Marmita Ideal para Alimentos e Refeições VYROX":
    "https://www.mercadolivre.com.br/kit-10-potes-de-vidro-hermetico-com-tampa-tigela-redondo-freezer-micro-ondas-marmita-ideal-para-alimentos-e-refeicoes-vyrox/p/MLB67144613?pdp_filters=deal%3AMLB1578289-1",
  "Ventilador De Teto Lâmpada 80w Led E27 Ajustável Bivolt":
    "https://www.mercadolivre.com.br/ventilador-de-teto-lampada-80w-led-e27-ajustavel-bivolt/p/MLB69984321?pdp_filters=deal%3AMLB1578289-1",
  "Jogo Lençol Casal 3pç 400 Fios Hipercal Conforto Macio Pétalas Rosa Com Verde Estampado":
    "https://www.mercadolivre.com.br/jogo-lencol-casal-3pc-400-fios-hipercal-conforto-macio-petalas-rosa-com-verde-estampado/p/MLB66305818?pdp_filters=item_id%3AMLB6665777416",
  "Jogo Lençol Casal 3pç 400 Fios Hipercal Conforto Macio Rosas Dourado Estampado":
    "https://www.mercadolivre.com.br/jogo-lencol-casal-3pc-400-fios-hipercal-conforto-macio-rosas-dourado-estampado/p/MLB68104618?pdp_filters=item_id%3AMLB4612722343",
  "Jogo Lençol Casal 3pç 400 Fios Hipercal Conforto Macio Florido Rosa Com Verde Estampado":
    "https://www.mercadolivre.com.br/jogo-lencol-casal-3pc-400-fios-hipercal-conforto-macio-florido-rosa-com-verde-estampado/p/MLB68104715?pdp_filters=item_id%3AMLB4612722751",
  "Sapateira Vertical Moderna Aço Cromado 5 Prateleiras Preto/prata":
    "https://www.mercadolivre.com.br/sapateira-vertical-moderna-aco-cromado-5-prateleiras/up/MLBU3822623439?pdp_filters=deal%3AMLB1578289-1",
  "Cesto De Roupa Suja 49L Telado Com Tampa Adesivada Estampa Madeira Arqplast - Organizador Banheiro Lavanderia Grande Resistente":
    "https://www.mercadolivre.com.br/cesto-de-roupa-suja-49l-telado-com-tampa-adesivada-estampa-madeira-arqplast-organizador-banheiro-lavanderia-grande-resistente/p/MLB65604590?pdp_filters=deal%3AMLB1578289-1",
  "Escorredor De Óleo Industrial Fritura Pastéis Salgados Inox":
    "https://www.mercadolivre.com.br/escorredor-de-oleo-industrial-fritura-pasteis-salgados-inox/p/MLB47602953?pdp_filters=deal%3AMLB1578289-1",
  "Kit 3 Peças Escorredor De Arroz Em Inox + Escorredor De Macarrão Inox Grande + Escorredor De Alimentos Mariazinha":
    "https://www.mercadolivre.com.br/kit-3-pecas-escorredor-de-arroz-em-inox-escorredor-de-macarrao-inox-grande-escorredor-de-alimentos-mariazinha/p/MLB67424667?pdp_filters=deal%3AMLB1578289-1",
  "Kit 12 Tigelas De Vidro Potes Americano Congelar Tampa 150ml":
    "https://www.mercadolivre.com.br/kit-12-tigelas-de-vidro-potes-americano-congelar-tampa-150ml/p/MLB26510907?pdp_filters=deal%3AMLB1578289-1",
  "Suporte Inox Pendurar Vassoura Pá Rodo Mop Organizador 7 Acessórios Parede Porta Organização Guardar Área De Serviço Cozinha Garagem Aço Inoxidável Armazenar Interno Externo Hiper Casa Megastore":
    "https://www.mercadolivre.com.br/suporte-inox-pendurar-vassoura-pa-rodo-mop-organizador-7-acessorios-parede-porta-organizacao-guardar-area-de-servico-cozinha-garagem-aco-inoxidavel-armazenar-interno-externo-hiper-casa-megastore/p/MLB51339648?pdp_filters=deal%3AMLB1578289-1",
  "Porta Temperos Condimentos 9 Unidades Potes Vidro Base Giratória Preto Organizador Cozinha Dosador Sólar":
    "https://www.mercadolivre.com.br/porta-temperos-condimentos-9-unidades-potes-vidro-base-giratoria-preto-organizador-cozinha-dosador-solar/p/MLB66067381?pdp_filters=deal%3AMLB1578289-1",
  "Kit 12 Bicos Dosador Garrafa Inox Bartender Biqueira Tequila":
    "https://www.mercadolivre.com.br/kit-12-bicos-dosador-garrafa-inox-bartender-biqueira-tequila/p/MLB65201312?pdp_filters=deal%3AMLB1578289-1",
  "Rack Nicho Suspenso Para Quarto E Sala Com 4 Prateleiras Branco":
    "https://www.mercadolivre.com.br/rack-nicho-suspenso-para-quarto-e-sala-com-4-prateleiras/up/MLBU3121662455?pdp_filters=deal%3AMLB1578289-1",
  "Passadeira Felpuda Bege Corredor 2m Texfine Poliéster Sala Quarto Cozinha":
    "https://www.mercadolivre.com.br/passadeira-felpuda-bege-corredor-2m-texfine-poliester-sala-quarto-cozinha/p/MLB34506386?pdp_filters=deal%3AMLB1578289-1",
  "Tapete 2.00x1.50 Casa Laura Enxovais Shaggy Felpudo Para Quarto Sala Luxo Cinza Mesclado":
    "https://www.mercadolivre.com.br/tapete-200x150-casa-laura-enxovais-shaggy-felpudo-para-quarto-sala-luxo-cinza-mesclado/p/MLB29342309?pdp_filters=deal%3AMLB1578289-1",
  "Copos Café Vidro Kit 6 Unidades Parede Dupla 90ml Borossilicato Transparente para Expresso Chá Bebidas Quentes Luxo":
    "https://www.mercadolivre.com.br/copos-cafe-vidro-kit-6-unidades-parede-dupla-90ml-borossilicato-transparente-para-expresso-cha-bebidas-quentes-luxo/p/MLB67691448?pdp_filters=deal%3AMLB1578289-1",
  "Forma Para Assar Bolo Pudim 24CM Redonda Com Furo Central Reforçada Em Aço Carbono Revestido Com Teflon Antiaderente Cozinha Confeitaria Premium Gourmet Sayonara":
    "https://www.mercadolivre.com.br/forma-para-assar-bolo-pudim-24cm-redonda-com-furo-central-reforcada-em-aco-carbono-revestido-com-teflon-antiaderente-cozinha-confeitaria-premium-gourmet-sayonara/p/MLB27389412?pdp_filters=item_id%3AMLB4432847635",
  "Kit 4 Caixas Organizadoras Com Tampa 6l 2l Cesto Multiuso Preto Juta":
    "https://www.mercadolivre.com.br/kit-4-caixas-organizadoras-com-tampa-6l-2l-cesto-multiuso/up/MLBU3820989955?pdp_filters=item_id%3AMLB4508330823",
  "Tapete Carpete Flannel 2x1,50 Veludo Estampas Modernas Preto Circulos":
    "https://www.mercadolivre.com.br/tapete-carpete-flannel-2x150-veludo-estampas-modernas-preto-circulos/p/MLB42440235?pdp_filters=deal%3AMLB1578289-1",
  "Saia cama Box King Protetora Size Percal 200 Fios Com Ponto Palito Cor Palha Realize Enxovais":
    "https://www.mercadolivre.com.br/saia-cama-box-king-protetora-size-percal-200-fios-com-ponto-palito-cor-palha-realize-enxovais/p/MLB27240015?pdp_filters=deal%3AMLB1578289-1",
  "Kit 6 Potes Vidro 640ml Hermético Marmita Forno Refratário Transparente":
    "https://www.mercadolivre.com.br/kit-6-potes-vidro-640ml-hermetico-marmita-forno-refratario/up/MLBU3807187409?pdp_filters=deal%3AMLB1578289-1",
  "Organizador Geladeira Maquiagem Giratório Armário Multiuso Incolor":
    "https://www.mercadolivre.com.br/organizador-geladeira-maquiagem-giratorio-armario-multiuso/up/MLBU1465620352?pdp_filters=deal%3AMLB1578289-1",
  "Muda De Goiaba Gigante Tailandesa Clonada Produzindo Vermelho":
    "https://www.mercadolivre.com.br/muda-de-goiaba-gigante-tailandesa-clonada-produzindo/up/MLBU3456652966?pdp_filters=item_id%3AMLB5751998014",
  "Muda De Amora Gigante Portuguesa Produzindo Bordô":
    "https://www.mercadolivre.com.br/muda-de-amora-gigante-portuguesa-produzindo/up/MLBU3388499527?pdp_filters=item_id%3AMLB5652444262",
  "Armário Banheiro Espelharia Parede C/ Porta Prateleira Luxos Preto":
    "https://www.mercadolivre.com.br/armario-banheiro-espelharia-parede-c-porta-prateleira-luxos/up/MLBU4554583004?pdp_filters=deal%3AMLB1578289-1",
  "Panela De Pressão 4,5 Litros Alumínio Polido Panelux Classic Cinza":
    "https://www.mercadolivre.com.br/panela-de-pressao-45-litros-aluminio-polido-panelux-classic-cinza/p/MLB78019848?pdp_filters=deal%3AMLB1578289-1",
  "Base Plástica 18kg Belfix Branco p/ Guarda-Sol ou Ombrellone Ø19-36mm":
    "https://www.mercadolivre.com.br/base-plastica-18kg-belfix-branco-p-guarda-sol-ou-ombrellone-19-36mm/p/MLB22554571?pdp_filters=deal%3AMLB1578289-1",
  "Sapateira Bambu Articulada Frigopro 6 Prateleiras 100x50x24cm Bege":
    "https://www.mercadolivre.com.br/sapateira-bambu-articulada-frigopro-6-prateleiras-100x50x24cm-bege/p/MLB61858604?pdp_filters=deal%3AMLB1578289-1",
  "Porta-tempero giratório inox Futuro Casa com 12 potes vidro de 80ml":
    "https://www.mercadolivre.com.br/porta-tempero-giratorio-inox-futuro-casa-com-12-potes-vidro-de-80ml/p/MLB22873725?pdp_filters=deal%3AMLB1578289-1",
  "Porta Condimentos Temperos Giratório 9 Potes De Vidro Preto Preto":
    "https://www.mercadolivre.com.br/porta-condimentos-temperos-giratorio-9-potes-de-vidro--preto/up/MLBU3766403562?pdp_filters=deal%3AMLB1578289-1",
  "Kit 6 Potes De Vidro Herméticos Com Tampa De Bambu De 200ml Para Mantimentos Alimentos Grãos Café Massas Cereais Cozinha Com Vedação Hermética Vidro Borossilicato Livre Bpa Transparente":
    "https://www.mercadolivre.com.br/kit-6-potes-de-vidro-hermeticos-com-tampa-de-bambu-de-200ml-para-mantimentos-alimentos-graos-cafe-massas-cereais-cozinha-com-vedacao-hermetica-vidro-borossilicato-livre-bpa-transparente/p/MLB66893120?pdp_filters=deal%3AMLB1578289-1",
  "Gancho Inox Polido Aliança P/ Rede Embutir Capacidade 120kg":
    "https://www.mercadolivre.com.br/gancho-inox-polido-alianca-p-rede-embutir-capacidade-120kg/p/MLB27313704?pdp_filters=deal%3AMLB1578289-1",
  "Suporte De Madeira Redondo Para Vaso 30 Cm Com Roda Cristal Marrom":
    "https://www.mercadolivre.com.br/suporte-de-madeira-redondo-para-vaso-30-cm-com-roda-cristal/up/MLBU2456585803?pdp_filters=deal%3AMLB1578289-1",
  "Escova Limpeza Elétrica Janela Banheiro E Cozinha 9 Em 1 Cor":
    "https://www.mercadolivre.com.br/escova-limpeza-eletrica-janela-banheiro-e-cozinha-9-em-1-cor/p/MLB61748341?pdp_filters=deal%3AMLB1578289-1",
  "Rodo Twister Articulado 180º - Com Cabo Extensor 1,60 Mts":
    "https://www.mercadolivre.com.br/rodo-twister-articulado-180-com-cabo-extensor-160-mts/p/MLB37040177?pdp_filters=deal%3AMLB1578289-1",
  "Grelha Dupla Abaulada Aço 70cm X 20cm Churrasco Peixe Frango":
    "https://www.mercadolivre.com.br/grelha-dupla-abaulada-aco-70cm-x-20cm-churrasco-peixe-frango/up/MLBU3340233106?pdp_filters=item_id%3AMLB4145148503",
  "Jogo De Facas E Afiador Inox Profissional De Cozinha 7 Peças Preto":
    "https://www.mercadolivre.com.br/jogo-de-facas-e-afiador-inox-profissional-de-cozinha-7-pecas/up/MLBU3876516748?pdp_filters=item_id%3AMLB6534466208",
  "Armário para Banheiro Cinza com Espelho com Divisórias de Embutir ou Sobrepor":
    "https://www.mercadolivre.com.br/armario-para-banheiro-cinza-com-espelho-com-divisorias-de-embutir-ou-sobrepor/p/MLB26282767?pdp_filters=deal%3AMLB1578289-1",
  "Kit Capa Protetora Scooter Elétrica Contra Chuva Oxidação Kit Bronze":
    "https://www.mercadolivre.com.br/kit-capa-protetora-scooter-eletrica-contra-chuva-oxidacao/up/MLBU3470914188?pdp_filters=item_id%3AMLB4237160511",
  "Jogo de 6 Taças De Vidro Diamond Cristal 330ml 6 Peças Wow World Of Wonders":
    "https://www.mercadolivre.com.br/jogo-de-6-tacas-de-vidro-diamond-cristal-330ml-6-pecas-wow-world-of-wonders/p/MLB62801621?pdp_filters=item_id%3AMLB7652906210",
  "Suporte De Parede Para Vassoura E Rodo Em Aço Inoxidável Cinza":
    "https://www.mercadolivre.com.br/suporte-de-parede-para-vassoura-e-rodo-em-aco-inoxidavel/up/MLBU3914423627?pdp_filters=item_id%3AMLB6664767054",
  "Kit 12 Utensílios De Cozinha Em Silicone Premium Com Cabo De Madeira Marca Aristus Resistentes Ao Calor Até 220°c, Antiaderentes, Duráveis E Modernos Cor Preto":
    "https://www.mercadolivre.com.br/kit-12-utensilios-de-cozinha-em-silicone-premium-com-cabo-de-madeira-marca-aristus-resistentes-ao-calor-ate-220c-antiaderentes-duraveis-e-modernos-cor-preto/p/MLB57714103?pdp_filters=deal%3AMLB1578289-1",
  "Kit 12 Utensílios De Silicone Com Cabo De Madeira - Marca Aristus Com Alta Resistência, Durável E Com Design Moderno, Perfeito Para Sua Cozinha Cor Cinza":
    "https://www.mercadolivre.com.br/kit-12-utensilios-de-silicone-com-cabo-de-madeira-marca-aristus-com-alta-resistencia-duravel-e-com-design-moderno-perfeito-para-sua-cozinha-cor-cinza/p/MLB57662272?pdp_filters=deal%3AMLB1578289-1",
  "Kit 12 Utensílios De Cozinha Em Silicone Premium Com Cabo De Madeira Aristus Resistentes Ao Calor Até 220°c, Antiaderentes, Duráveis E Modernos Cor Vermelho":
    "https://www.mercadolivre.com.br/kit-12-utensilios-de-cozinha-em-silicone-premium-com-cabo-de-madeira-aristus-resistentes-ao-calor-ate-220c-antiaderentes-duraveis-e-modernos-cor-vermelho/p/MLB57714098?pdp_filters=deal%3AMLB1578289-1",
  "Kit Vinho 5 Peças: Abridor, Dosador, Saca Rolhas E Tampa":
    "https://www.mercadolivre.com.br/kit-vinho-5-pecas-abridor-dosador-saca-rolhas-e-tampa/p/MLB46983881?pdp_filters=item_id%3AMLB6078973764",
  "Rede Dormir Descanso Casal Tecido Algodão Resistente Jeans Cor Azul B&G":
    "https://www.mercadolivre.com.br/rede-dormir-descanso-casal-tecido-algodao-resistente-jeans-cor-azul-bg/p/MLB24062813?pdp_filters=deal%3AMLB1578289-1",
  "Kit 3 Vasos Modelo Espiral Decoração Moderna Sala Cozinha Verde-escuro Espiral":
    "https://www.mercadolivre.com.br/kit-3-vasos-modelo-espiral-decoracao-moderna-sala-cozinha/up/MLBU3988275669?pdp_filters=item_id%3AMLB4704978265",
  "Capa Protetora Maca Smart Gr":
    "https://produto.mercadolivre.com.br/MLB-5890520454-capa-protetora-maca-smart-gr-_JM",
  "Vaso Vidro Planta 23cm Flores Decoração Sala Plantas Festas":
    "https://www.mercadolivre.com.br/vaso-vidro-planta-23cm-flores-decoracao-sala-plantas-festas/p/MLB61644733?pdp_filters=deal%3AMLB1578289-1",
  "Kit 4 Protetor Silicone Fogão Indução Cooktop Antiderrapante":
    "https://www.mercadolivre.com.br/kit-4-protetor-silicone-fogao-inducao-cooktop-antiderrapante/p/MLB75418027?pdp_filters=deal%3AMLB1578289-1",
  "Conjunto De Facas Chef Profissional 8 Peças Churrasco Inox Marrom":
    "https://www.mercadolivre.com.br/conjunto-de-facas-chef-profissional-8-pecas-churrasco-inox/up/MLBU3940882864?pdp_filters=deal%3AMLB1578289-1",
  "Jogo 6 Copos Diamond 300ml Vidro Grosso Diamante Luxo Transparente":
    "https://www.mercadolivre.com.br/jogo-6-copos-diamond-300ml-vidro-grosso-diamante-luxo/up/MLBU3936438553?pdp_filters=deal%3AMLB1578289-1",
  "Kit 4 Trava Espetos Churrasco - Suporte Para Virar O Espeto":
    "https://www.mercadolivre.com.br/kit-4-trava-espetos-churrasco--suporte-para-virar-o-espeto/up/MLBU3537646515?pdp_filters=item_id%3AMLB4290399127",
  "Kit 10 Potes Marmita Fitness 300ml Bpa Free Microondas Transparente":
    "https://www.mercadolivre.com.br/kit-10-potes-marmita-fitness-300ml-bpa-free-microondas/up/MLBU3318135368?pdp_filters=item_id%3AMLB4132808857",
  "Suporte Base Geladeira Fogão Ajustável Rodinhas Carrinho Par":
    "https://www.mercadolivre.com.br/suporte-base-geladeira-fogao-ajustavel-rodinhas-carrinho-par/up/MLBU3995007362?pdp_filters=item_id%3AMLB4701882873",
  "Jogo De 6 Xicara De Café Chá 250 Ml Caneca Vidro Vidro Liso":
    "https://www.mercadolivre.com.br/jogo-de-6-xicara-de-cafe-cha-250-ml-caneca-vidro/up/MLBU3863347091?pdp_filters=item_id%3AMLB4564960843",
  "Kit Com 3 Formas De Pao Antiaderente Assadeira Bolo Ingles Teflon Marca Pítia":
    "https://www.mercadolivre.com.br/kit-com-3-formas-de-pao-antiaderente-assadeira-bolo-ingles-teflon-marca-pitia/p/MLB68667949?pdp_filters=item_id%3AMLB6674808640",
  "Frigideira Antiaderente com 3 Cavidades para Ovo e Panqueca de Alumínio":
    "https://www.mercadolivre.com.br/frigideira-antiaderente-com-3-cavidades-para-ovo-e-panqueca-de-aluminio/p/MLB66363173?pdp_filters=deal%3AMLB1578289-1",
  "Sanol Evita Mofo Lv4 Pague 3 Antimofo Perfumado Anti-umidade":
    "https://www.mercadolivre.com.br/sanol-evita-mofo-lv4-pague-3-antimofo-perfumado-antiumidade/up/MLBU3261808698?pdp_filters=item_id%3AMLB5458204324",
  "Toalha Descartável Medix Para Banho Leito Branco 100 Unidades":
    "https://www.mercadolivre.com.br/toalha-descartavel-medix-para-banho-leito-branco-100-unidades/p/MLB24077645?pdp_filters=deal%3AMLB1578289-1",
  "Faca De Pão Tramontina Para Cortar Pão Bolo Serrilhada Cor Preto":
    "https://www.mercadolivre.com.br/faca-de-pao-tramontina-para-cortar-pao-bolo-serrilhada-cor-preto/p/MLB27395452?pdp_filters=item_id%3AMLB5314953808",
  "Festão Arvore de Natal Cheio Grosso Flexível Decoração De Natal 10 Metros Verde Varal Natalino 5 Peças 2m x 9cm - ENFANCE":
    "https://www.mercadolivre.com.br/festao-arvore-de-natal-cheio-grosso-flexivel-decoracao-de-natal-10-metros-verde-varal-natalino-5-pecas-2m-x-9cm-enfance/p/MLB79377383?pdp_filters=item_id%3AMLB5812848700",
  "Varal Suspenso Retangular de Aço Inoxidável Tche Amo com 40 Prendedores para Roupas Íntimas Roupas de Bebê Design Compacto e Moderno Não Enferruja":
    "https://www.mercadolivre.com.br/varal-suspenso-retangular-de-aco-inoxidavel-tche-amo-com-40-prendedores-para-roupas-intimas-roupas-de-bebe-design-compacto-e-moderno-nao-enferruja/p/MLB67391946?pdp_filters=deal%3AMLB1578289-1",
  "Kit 3 Formas Fundo Removível Antiaderente Para Bolo Torta Assadeira Vapt Vupt Cor Preto":
    "https://www.mercadolivre.com.br/kit-3-formas-fundo-removivel-antiaderente-para-bolo-torta-assadeira-vapt-vupt-cor-preto/p/MLB62886160?pdp_filters=item_id%3AMLB6012331426",
  "Sapateira Vertical 9 Andares Organizador Prático Desmontável Cor Cinza-escuro":
    "https://www.mercadolivre.com.br/sapateira-vertical-9-andares-organizador-pratico-desmontavel-cor-cinza-escuro/p/MLB37938850?pdp_filters=deal%3AMLB1578289-1",
  "Toalha De Banho Praia Piscina Gigante 76 X 150 Verão":
    "https://produto.mercadolivre.com.br/MLB-5788212716-toalha-de-banho-praia-piscina-gigante-76-x-150-vero-_JM",
  "Kit 2 Formas De Pão Bolo Inglês Antiaderente Teflon Assadeira Para Pão Caseiro Cuca Lasanha Torta Brownie Profissional Resistente Forno Air Fryer Aço Carbono Pítia":
    "https://www.mercadolivre.com.br/kit-2-formas-de-pao-bolo-ingles-antiaderente-teflon-assadeira-para-pao-caseiro-cuca-lasanha-torta-brownie-profissional-resistente-forno-air-fryer-aco-carbono-pitia/p/MLB68667944?pdp_filters=item_id%3AMLB6674808600",
  "Kit 2 Porta Cotonetes E Algodão Acrílico Compacto Redondo Transparente Redondo":
    "https://www.mercadolivre.com.br/kit-2-porta-cotonetes-e-algodao-acrilico-compacto-redondo/up/MLBU3713072181?pdp_filters=item_id%3AMLB6153041062",
  "Copo Térmico Dia Dos Pais Inox 473ml Tampa Abridor Presente Azul Dia Dos Pais Bigode":
    "https://www.mercadolivre.com.br/copo-termico-dia-dos-pais-inox-473ml-tampa-abridor-presente/up/MLBU4127023074?pdp_filters=deal%3AMLB1578289-1",
  "Jogo Potes De Vidro 5 Peças Claro Mantimentos Marmita":
    "https://produto.mercadolivre.com.br/MLB-3288536143-jogo-potes-de-vidro-5-pecas-claro-mantimentos-marmita-_JM",
  "Porta Toalha De Rosto Adesivo Autocolante Preto Df Preto":
    "https://www.mercadolivre.com.br/porta-toalha-de-rosto-adesivo-autocolante-preto-df-preto/p/MLB22566053?pdp_filters=deal%3AMLB1578289-1",
  "Suporte E Organizador Inox Pendurar Vassoura Pá Rodo Mop Organizador 7 Acessórios Parede Porta Organização Guardar Área De Serviço Cozinha Garagem Aço Inoxidável Armazenar Interno Externo - Diggicom":
    "https://www.mercadolivre.com.br/suporte-e-organizador-inox-pendurar-vassoura-pa-rodo-mop-organizador-7-acessorios-parede-porta-organizacao-guardar-area-de-servico-cozinha-garagem-aco-inoxidavel-armazenar-interno-externo-diggicom/p/MLB69981400?pdp_filters=item_id%3AMLB6809323328",
  "Trem Enfeite Decoração Mesa Arvore De Natal Trenzinho Festa Aleatoria Liso":
    "https://www.mercadolivre.com.br/trem-enfeite-decoracao-mesa-arvore-de-natal-trenzinho-festa/up/MLBU3407181305?pdp_filters=item_id%3AMLB5677905708",
  "Porta-Temperos Giratório de Inox para 16 Potes de Vidro":
    "https://www.mercadolivre.com.br/porta-temperos-giratorio-de-inox-para-16-potes-de-vidro/p/MLB25817241?pdp_filters=deal%3AMLB1578289-1",
  "Porolux Bellinzoni Proteção Elimina Fissuras 500ml":
    "https://produto.mercadolivre.com.br/MLB-5098594420-porolux-bellinzoni-proteco-elimina-fissuras-500ml-_JM",
  "Embalagem Bp 32 Média Bolo Torta 0,75 Kg Bipack Bp32m Com 50 Cristal":
    "https://www.mercadolivre.com.br/embalagem-bp-32-media-bolo-torta-075-kg-bipack-bp32m-com-50/up/MLBU1457000839?pdp_filters=deal%3AMLB1578289-1",
  "1000 Unidades Mexedor Café Chá Descartável 8,5 Cm Cristal Transparente":
    "https://www.mercadolivre.com.br/1000-unidades-mexedor-cafe-cha-descartavel-85-cm-cristal/up/MLBU4137428940?pdp_filters=item_id%3AMLB4797346609",
  "Jogo De Lençol 2 Peças Solteiro Padrão 400 Fios Macio C/ Elástico Hotel Premium Cinza":
    "https://www.mercadolivre.com.br/jogo-de-lencol-2-pecas-solteiro-padrao-400-fios-macio-c-elastico-hotel-premium-cinza/p/MLB46497402?pdp_filters=deal%3AMLB1578289-1",
  "Cabideiro Mancebo 10 Gancho Madeira Envernizado De Chão":
    "https://produto.mercadolivre.com.br/MLB-5220936932-cabideiro-mancebo-10-gancho-madeira-envernizado-de-cho-_JM",
  "Tapete 2,00x1,50 Peludo Felpudo Sala E Quarto Cores Cor Bordo Círculos Desenho Do Tecido Pelo Alto Casa Laura Enxovais Tapete Médio Para Sala":
    "https://www.mercadolivre.com.br/tapete-200x150-peludo-felpudo-sala-e-quarto-cores-cor-bordo-circulos-desenho-do-tecido-pelo-alto-casa-laura-enxovais-tapete-medio-para-sala/p/MLB67608208?pdp_filters=deal%3AMLB1578289-1",
  "Jogo 6 Taças Vidro Domus Diamond 340ml Transparente Vinho Água":
    "https://www.mercadolivre.com.br/jogo-6-tacas-vidro-domus-diamond-340ml-transparente-vinho-agua/p/MLB54252614?pdp_filters=deal%3AMLB1578289-1",
  "Copo Térmico 890ml Tampa Flip Antivazamento Parede Dupla":
    "https://produto.mercadolivre.com.br/MLB-6193357738-copo-termico-890ml-tampa-flip-antivazamento-parede-dupla-_JM",
  "Luz De Leitura Recarregável De Livro Luminária Usb Com Clipe":
    "https://produto.mercadolivre.com.br/MLB-5458195620-luz-de-leitura-recarregavel-de-livro-luminaria-usb-com-clipe-_JM",
  "Potes Herméticos e Organizadores de Geladeira - Electrolux - Kit 6":
    "https://www.mercadolivre.com.br/potes-hermeticos-e-organizadores-de-geladeira-electrolux-kit-6/p/MLB43924100?pdp_filters=deal%3AMLB1578289-1",
  "Kit 12 Marmitas 800ml Potes Trava Lateral Freezer Microondas Transparente":
    "https://www.mercadolivre.com.br/kit-12-marmitas-800ml-potes-trava-lateral-freezer-microondas/up/MLBU3670156579?pdp_filters=deal%3AMLB1578289-1",
  "Grelha Canelada 28cm Rochedo Elegance Limited Preto":
    "https://www.mercadolivre.com.br/grelha-canelada-28cm-rochedo-elegance-limited-preto/p/MLB39998155?pdp_filters=deal%3AMLB1578289-1",
  "Rolo De Massa Giratório Inox SQ4164 37,5 cm":
    "https://www.mercadolivre.com.br/rolo-de-massa-giratorio-inox-sq4164-375-cm/p/MLB28501934?pdp_filters=item_id%3AMLB4573730163",
  "Jogo Porta Mantimento 5 Peças Com Tampa ( Pote Arroz 4,5kg) Preto":
    "https://www.mercadolivre.com.br/jogo-porta-mantimento-5-pecas-com-tampa--pote-arroz-45kg/up/MLBU3566050662?pdp_filters=deal%3AMLB1578289-1",
  "Caneco Antiaderente Fervedor No14 C/ Tampa De Vidro 1,5 L":
    "https://produto.mercadolivre.com.br/MLB-4134320039-caneco-antiaderente-fervedor-no14-c-tampa-de-vidro-15-l-_JM",
  "Kit 100 Forma Quadrada Fritadeira Airfryer Papel Descartável":
    "https://www.mercadolivre.com.br/kit-100-forma-quadrada-fritadeira-airfryer-papel-descartavel/p/MLB32259846?pdp_filters=item_id%3AMLB4115486227",
  "Fruteira De Chao Estante Com 4 Prateleira Organizadora De Plástico Modular Multiuso Para Cozinha Quarto Sapateira":
    "https://www.mercadolivre.com.br/fruteira-de-chao-estante-com-4-prateleira-organizadora-de-plastico-modular-multiuso-para-cozinha-quarto-sapateira/p/MLB63008887?pdp_filters=deal%3AMLB1578289-1",
  "Jogo 6 Copos Diamond 300ml Vidro Grosso Diamante Egipcio Luxo Moderno Resistente Buffet Casual Baixos Transparente - Nany Pink":
    "https://www.mercadolivre.com.br/jogo-6-copos-diamond-300ml-vidro-grosso-diamante-egipcio-luxo-moderno-resistente-buffet-casual-baixos-transparente-nany-pink/p/MLB68602755?pdp_filters=deal%3AMLB1578289-1",
  "Limitador de Grama Jardim 25m Polietileno Verde Flexível":
    "https://www.mercadolivre.com.br/limitador-de-grama-jardim-25m-polietileno-verde-flexivel/p/MLB25644575?pdp_filters=deal%3AMLB1578289-1",
  "Fatiador Cortador Legumes Utimix Multiuso 16 em 1 com Lâminas Intercambiáveis":
    "https://www.mercadolivre.com.br/fatiador-cortador-legumes-utimix-multiuso-16-em-1-com-laminas-intercambiaveis/p/MLB41742598?pdp_filters=deal%3AMLB1578289-1",
  "Kit 10 Pratos Quadrado Fibra Bambu Ecológico Com Base Kehome Colorido Liso":
    "https://www.mercadolivre.com.br/kit-10-pratos-quadrado-fibra-bambu-ecologico-com-base-kehome/up/MLBU3376009674?pdp_filters=deal%3AMLB1578289-1",
  "Kit 10 Sacos à Vácuo 50x60cm + Bomba manual Inclusa Organização Roupas Edredons Cobertores Mala Viagem":
    "https://www.mercadolivre.com.br/kit-10-sacos-vacuo-50x60cm-bomba-manual-inclusa-organizacao-roupas-edredons-cobertores-mala-viagem/p/MLB74944152?pdp_filters=deal%3AMLB1578289-1",
  "Resistência Para Ducha Intense 127v 5400w - Fame":
    "https://www.mercadolivre.com.br/resistencia-para-ducha-intense-127v-5400w--fame/up/MLBU3209971480?pdp_filters=deal%3AMLB1578289-1",
  "Coador De Café Inox 103 Com Filtro Permanente Reutilizável Aço Inox Premium Durável Fácil De Lavar Passador De Café Grande Sem Papel Para Café Tradicional Gourmet Pétalas Douradas":
    "https://www.mercadolivre.com.br/coador-de-cafe-inox-103-com-filtro-permanente-reutilizavel-aco-inox-premium-duravel-facil-de-lavar-passador-de-cafe-grande-sem-papel-para-cafe-tradicional-gourmet-petalas-douradas/p/MLB76320149?pdp_filters=deal%3AMLB1578289-1",
  "Jarra Vidro Borossilicato 1,5 Litros Tampa Inox Hermética Agua Suco Transparente":
    "https://www.mercadolivre.com.br/jarra-vidro-borossilicato-15-litros-tampa-inox-hermetica-agua-suco-transparente/p/MLB67721707?pdp_filters=deal%3AMLB1578289-1",
  "Kit 3 Potes Herméticos Vidro Com Tampa Bambu E Colher Transparente":
    "https://www.mercadolivre.com.br/kit-3-potes-hermeticos-vidro-com-tampa-bambu-e-colher/up/MLBU3706817454?pdp_filters=deal%3AMLB1578289-1",
  "Cortador Picador Fatiador De Legumes E Vegetais 14 Em 1":
    "https://www.mercadolivre.com.br/cortador-picador-fatiador-de-legumes-e-vegetais-14-em-1/p/MLB28480679?pdp_filters=deal%3AMLB1578289-1",
  "Kit de Sobremesas Bowls 7 Peças - 1 Saladeira + 6 Tigelas 250ml em Vidro":
    "https://www.mercadolivre.com.br/kit-de-sobremesas-bowls-7-pecas-1-saladeira-6-tigelas-250ml-em-vidro/p/MLB65443753?pdp_filters=deal%3AMLB1578289-1",
  "Casinha Comedouro Para Pássaros Madeira Pinus Aves 33x30cm Cru":
    "https://www.mercadolivre.com.br/casinha-comedouro-para-passaros-madeira-pinus-aves-33x30cm-cru/p/MLB75881535?pdp_filters=item_id%3AMLB7277437588",
  "Porta Talher Extensível Organizador Bambu 7 Divisórias Facas":
    "https://www.mercadolivre.com.br/porta-talher-extensivel-organizador-bambu-7-divisorias-facas/p/MLB29286456?pdp_filters=deal%3AMLB1578289-1",
  "Frigideira Antiaderente Nhame de Granito 24 cm com Espátula, para Indução e Cabo de Madeira":
    "https://www.mercadolivre.com.br/frigideira-antiaderente-nhame-de-granito-24-cm-com-espatula-para-inducao-e-cabo-de-madeira/p/MLB75502181?pdp_filters=deal%3AMLB1578289-1",
  "Kit 50 Cabide Adulto Preto Reforçado Organizador Combate":
    "https://www.mercadolivre.com.br/kit-50-cabide-adulto-preto-reforcado-organizador-combate/p/MLB47770588?pdp_filters=deal%3AMLB1578289-1",
  "Jogo 6 Copos Baixos Diamond 300ml Vidro Resistente Diamante Transparente":
    "https://www.mercadolivre.com.br/jogo-6-copos-baixos-diamond-300ml-vidro-resistente-diamante/up/MLBU4009610143?pdp_filters=deal%3AMLB1578289-1",
  "Kit 2 Luminária Led Recarregável Sensor Presença Magnética 127/220v Madeira Clara":
    "https://www.mercadolivre.com.br/kit-2-luminaria-led-recarregavel-sensor-presenca-magnetica/up/MLBU3704245066?pdp_filters=deal%3AMLB1578289-1",
  "Kit Porta Mantimentos 5 Peças Redondo Com Decoração 1,5 Lt Preto":
    "https://www.mercadolivre.com.br/kit-porta-mantimentos-5-pecas--redondo-com-decoracao-15-lt/up/MLBU3188480338?pdp_filters=deal%3AMLB1578289-1",
  "Cuscuzeiro Individual Mini Polido Nº 10 Cor Alumínio":
    "https://www.mercadolivre.com.br/cuscuzeiro-individual-mini-polido-n-10-cor-aluminio/p/MLB19976921?pdp_filters=item_id%3AMLB5186967657",
  "Kit 06 Potes De Mantimentos Herméticos 300ml Pote Redondo De Vidro Tampa De Bambu":
    "https://www.mercadolivre.com.br/kit-06-potes-de-mantimentos-hermeticos-300ml-pote-redondo-de-vidro-tampa-de-bambu/p/MLB63130873?pdp_filters=deal%3AMLB1578289-1",
  "Atratex 400ml Spray Haxea Mata Cupim Protege Madeira":
    "https://www.mercadolivre.com.br/mata-cupim-atratex-cupinicida-formicida-400-ml-haxea/p/MLB2070428515?pdp_filters=deal%3AMLB1578289-1",
  "Mop Spray Quality House com Reservatório Rotação 360 Microfibra Cabo Inox Ecommerce":
    "https://www.mercadolivre.com.br/mop-spray-quality-house-com-reservatorio-rotacao-360-microfibra-cabo-inox-ecommerce/p/MLB28260202?pdp_filters=deal%3AMLB1578289-1",
  "Kit 4 Pç P/ Panela Pressão Tramontina Vancouver Reparo Azul":
    "https://www.mercadolivre.com.br/kit-4-pc-p-panela-pressao-tramontina-vancouver-reparo-azul/p/MLB28756988?pdp_filters=deal%3AMLB1578289-1",
  "Porta Temperos Giratório 360° 12 Potes Vidro 85ml Tampa Inox Organizador Condimentos Cozinha Suporte Temperos Bancada Mesa Porta Condimento Premium":
    "https://www.mercadolivre.com.br/porta-temperos-giratorio-360-12-potes-vidro-85ml-tampa-inox-organizador-condimentos-cozinha-suporte-temperos-bancada-mesa-porta-condimento-premium/p/MLB66874628?pdp_filters=deal%3AMLB1578289-1",
  "Percarbonato De Sódio 100% Puro Tira Manchas Alvejante - 1kg Calisul":
    "https://www.mercadolivre.com.br/percarbonato-de-sodio-100-puro-tira-manchas-alvejante-1kg-calisul/p/MLB75542419?pdp_filters=deal%3AMLB1578289-1",
  "Jogo Sobremesa/salada Bowls Konia- 7 peças":
    "https://www.mercadolivre.com.br/jogo-sobremesasalada-bowls-konia-7-pecas/p/MLB64396851?pdp_filters=deal%3AMLB1578289-1",
  "Porta Espeto De Parede Aço Inox 304 Churrasco Suporte Ecosul":
    "https://www.mercadolivre.com.br/porta-espeto-de-parede-aco-inox-304-churrasco-suporte-ecosul/up/MLBU3915257067?pdp_filters=deal%3AMLB1578289-1",
  "Kit De Utensílios Bambu 5 Peças Pau Colher Garfo Espátulas Bambu":
    "https://www.mercadolivre.com.br/kit-de-utensilios-bambu-5-pecas-pau-colher-garfo-espatulas/up/MLBU1463061778?pdp_filters=deal%3AMLB1578289-1",
  "Muda Jabuticaba Híbrida Para Produzir Rapido":
    "https://www.mercadolivre.com.br/muda-jabuticaba-hibrida-para-produzir-rapido/up/MLBU1988405128?pdp_filters=item_id%3AMLB4374017018",
  "Kit 6 Copos Oca Nadir 300ml Vidro para Água e Suco":
    "https://www.mercadolivre.com.br/kit-6-copos-oca-nadir-300ml-vidro-para-agua-e-suco/p/MLB32105423?pdp_filters=deal%3AMLB1578289-1",
  "Placa Adesiva De Parede Autocolante Linha Premium KEYPAPER 60x30 Revestimento 3d Mármore Kit 10und 1.80m2 Cor Mármore Dourado 01":
    "https://www.mercadolivre.com.br/placa-adesiva-de-parede-autocolante-linha-premium-keypaper-60x30-revestimento-3d-marmore-kit-10und-180m2-cor-marmore-dourado-01/p/MLB48941974?pdp_filters=item_id%3AMLB4150258649",
  "Rede paraguaia azul casal, equilíbrio, descanso, cama, 3,8 m de comprimento x 1,5 m de largura":
    "https://www.mercadolivre.com.br/rede-paraguaia-azul-casal-equilibrio-descanso-cama-38-m-de-comprimento-x-15-m-de-largura/p/MLB46057069?pdp_filters=deal%3AMLB1578289-1",
  "Jarra de Vidro Borossilicato 1,5 Litros Tampa Inox Hermética Transparente para Água, Suco, Chá e Bebidas Quentes e Geladas":
    "https://www.mercadolivre.com.br/jarra-de-vidro-borossilicato-15-litros-tampa-inox-hermetica-transparente-para-agua-suco-cha-e-bebidas-quentes-e-geladas/p/MLB75548261?pdp_filters=deal%3AMLB1578289-1",
  "Caixa Organizadora Dobrável Helsim 45L Amarela Plástico":
    "https://www.mercadolivre.com.br/caixa-organizadora-dobravel-helsim-45l-amarela-plastico/p/MLB32392026?pdp_filters=deal%3AMLB1578289-1",
  "Rede De Dormir Casal Descanso Jeans Cor Rosa":
    "https://www.mercadolivre.com.br/rede-de-dormir-casal-descanso-jeans-cor-rosa/p/MLB24062739?pdp_filters=deal%3AMLB1578289-1",
  "Forma Assadeira Redonda Pizza Grande 35cm Cor Prateado":
    "https://www.mercadolivre.com.br/forma-assadeira-redonda-pizza-grande-35cm-cor-prateado/p/MLB29261692?pdp_filters=deal%3AMLB1578289-1",
  "Conjunto 6 Taças Diamond Diamante Gamma 340ml Transparente":
    "https://www.mercadolivre.com.br/conjunto-6-tacas-diamond-diamante-gamma-340ml-transparente/p/MLB43961317?pdp_filters=deal%3AMLB1578289-1",
  "Sapateira Organizadora Vertical Entrada 4 Prateleiras":
    "https://produto.mercadolivre.com.br/MLB-3307669729-sapateira-organizadora-vertical-entrada-4-prateleiras-_JM",
  "Luminária Lustre Teto Moderno Pendente Para Sala Sputnik":
    "https://produto.mercadolivre.com.br/MLB-5283860816-luminaria-lustre-teto-moderno-pendente-para-sala-sputnik-_JM",
  "Kit 3 Refletor Led 50w Holofote Bivolt Aprova Dágua Luz Frio 110v/220v Preto Branco-frio":
    "https://www.mercadolivre.com.br/kit-3-refletor-led-50w-holofote-bivolt-aprova-dagua-luz-frio/up/MLBU3401574100?pdp_filters=deal%3AMLB1578289-1",
  "Suporte Prateleira Porta Shampoo Sabonete Organizador De Parede Metal Sem Furos Cor Preta":
    "https://www.mercadolivre.com.br/suporte-prateleira-porta-shampoo-sabonete-organizador-de-parede-metal-sem-furos-cor-preta/p/MLB68827248?pdp_filters=deal%3AMLB1578289-1",
  "Tampa Vidro 28cm para Panela Frigideira Caçarola":
    "https://www.mercadolivre.com.br/tampa-vidro-28cm-para-panela-frigideira-cacarola/p/MLB58096212?pdp_filters=item_id%3AMLB6666652264",
  "Jogo de Copos de Vidro Long Drink para Água e Suco 255ml 6pcs Ruvolo":
    "https://www.mercadolivre.com.br/jogo-de-copos-de-vidro-long-drink-para-agua-e-suco-255ml-6pcs-ruvolo/p/MLB24916371?pdp_filters=deal%3AMLB1578289-1",
  "Rodo Para Pia Bambu Dobrável Limpeza Vidro Janela Rodinho":
    "https://www.mercadolivre.com.br/rodo-para-pia-bambu-dobravel-limpeza-vidro-janela-rodinho/p/MLB64859874?pdp_filters=deal%3AMLB1578289-1",
  "Borracha De Silicone Para Panela Pressão Brinox 4,2 Litros":
    "https://www.mercadolivre.com.br/borracha-de-silicone-para-panela-pressao-brinox-42-litros/up/MLBU3756586355?pdp_filters=deal%3AMLB1578289-1",
  "CÂMERA SEGURANÇA ANALÓGICA BULLET WEG WCAM AN-P012-B11":
    "https://www.mercadolivre.com.br/cmera-seguranca-analogica-bullet-weg-wcam-an-p012-b11/p/MLB29943871?pdp_filters=deal%3AMLB1578289-1",
  "Cadeira Poltrona Plastica Duramax Bistrô Reforçada Branco":
    "https://www.mercadolivre.com.br/cadeira-poltrona-plastica-duramax-bistro-reforcada/up/MLBU3662627948?pdp_filters=deal%3AMLB1578289-1",
  "Kit Café Gourmet Mini Bule Alumínio 400ml Suporte E Coador":
    "https://produto.mercadolivre.com.br/MLB-5476881674-kit-cafe-gourmet-mini-bule-aluminio-400ml-suporte-e-coador-_JM",
  "Sino De Mão Rio Master Campainha Sem Fio Metal Plástico 6m Idoso":
    "https://www.mercadolivre.com.br/sino-de-mao-rio-master-campainha-sem-fio-metal-plastico-6m-idoso/p/MLB23508710?pdp_filters=item_id%3AMLB4345311876",
  "Kit 6 Copos Diamond 300ml Vidro Grosso Resistente Premium Transparente":
    "https://www.mercadolivre.com.br/kit-6-copos-diamond-300ml-vidro-grosso-resistente-premium/up/MLBU4009272073?pdp_filters=deal%3AMLB1578289-1",
  "Copo Termico Cafe Espresso Isopor Descartavel 70ml 100 Un Cor Branco Liso":
    "https://www.mercadolivre.com.br/copo-termico-cafe-espresso-isopor-descartavel-70ml-100-un-cor-branco-liso/p/MLB39258282?pdp_filters=deal%3AMLB1578289-1",
  "Tesoura Cozinha Multifuncional Para Cortar Frango Carne Peixe Legumes Aço Inoxidável Resistente Tesoura Para Churrasco - Efigen":
    "https://www.mercadolivre.com.br/tesoura-cozinha-multifuncional-para-cortar-frango-carne-peixe-legumes-aco-inoxidavel-resistente-tesoura-para-churrasco-efigen/p/MLB56448991?pdp_filters=deal%3AMLB1578289-1",
  "Acendedor De Fogão Bic Multiuso Mega Lighter":
    "https://www.mercadolivre.com.br/acendedor-de-fogao-bic-multiuso-mega-lighter/up/MLBU1723126852?pdp_filters=deal%3AMLB1578289-1",
  "Luminária De Chão Ana Maria Mdf 60cm":
    "https://produto.mercadolivre.com.br/MLB-3474630271-luminaria-de-cho-ana-maria-mdf-60cm-_JM",
  "Tábua De Corte Antibacteriana Para Carnes Legumes Anti-mofo Cor Verde Retangular Decorales":
    "https://www.mercadolivre.com.br/tabua-de-corte-antibacteriana-para-carnes-legumes-anti-mofo-cor-verde-retangular-decorales/p/MLB63569308?pdp_filters=deal%3AMLB1578289-1",
  "Suporte para Mangueira Meia Lua Parede Moveraço Preto 30m aço carbono":
    "https://www.mercadolivre.com.br/suporte-para-mangueira-meia-lua-parede-moveraco-preto-30m-aco-carbono/p/MLB32018520?pdp_filters=deal%3AMLB1578289-1",
  "Puff Redondo Estofado Banqueta Apoio Dos Pés Decorativa":
    "https://produto.mercadolivre.com.br/MLB-4422245509-puff-redondo-estofado-banqueta-apoio-dos-pes-decorativa-_JM",
  "Balança Digital Cozinha 10kg Touch Alta Precisão Portátil Balança de Cozinha Profissional Para Pesar Alimentos Confeitaria Dieta Fitness Nutricional Eletrônica Display LCD Aço Inox Função Tara Davely":
    "https://www.mercadolivre.com.br/balanca-digital-cozinha-10kg-touch-alta-precisao-portatil-balanca-de-cozinha-profissional-para-pesar-alimentos-confeitaria-dieta-fitness-nutricional-eletronica-display-lcd-aco-inox-funcao-tara-davely/p/MLB61373269?pdp_filters=deal%3AMLB1578289-1",
  "Escova Sanitária Para Vaso Com Suporte Branco Cabo Anatômico Branco":
    "https://www.mercadolivre.com.br/escova-sanitaria-para-vaso-com-suporte-branco-cabo-anatomico/up/MLBU3831906202?pdp_filters=deal%3AMLB1578289-1",
  "Utensílios Cozinha Preto 12 Peças Silicone Cabo Madeira Nybc":
    "https://www.mercadolivre.com.br/utensilios-cozinha-preto-12-pecas-silicone-cabo-madeira-nybc/p/MLB51841769?pdp_filters=deal%3AMLB1578289-1",
  "Abridor De Lata 3 Em Garrafa Manivela Aço Inox Sem Rebarba Prata E Preto":
    "https://www.mercadolivre.com.br/abridor-de-lata-3-em-garrafa-manivela-aco-inox-sem-rebarba/up/MLBU3823641603?pdp_filters=item_id%3AMLB4510945707",
  "Kit 10 Panos de Chão Neves 100% Algodão Xadrez Alvejado 70x40cm":
    "https://www.mercadolivre.com.br/kit-10-panos-de-chao-neves-100-algodao-xadrez-alvejado-70x40cm/p/MLB46936633?pdp_filters=deal%3AMLB1578289-1",
  "Kit 6 Filtro Saco Descartável Asp Electrolux Gt12i Gt20i 6 Unidades":
    "https://www.mercadolivre.com.br/kit-6-filtro-saco-descartavel-asp-electrolux-gt12i-gt20i/up/MLBU1973716200?pdp_filters=deal%3AMLB1578289-1",
  "Suporte Prateleira Ventosa Para Shampoo Banheiro Brl Branco":
    "https://www.mercadolivre.com.br/suporte-prateleira-ventosa-para-shampoo-banheiro-brl-branco/p/MLB62432734?pdp_filters=deal%3AMLB1578289-1",
  "Escumadeira Nipo Center Fritura Ferro Arame 14cm Prateado":
    "https://www.mercadolivre.com.br/escumadeira-nipo-center-fritura-ferro-arame-14cm-prateado/p/MLB26149001?pdp_filters=item_id%3AMLB4073332021",
  "Escova Sanitária Banheiro Inox Com Suporte Plástico Pp":
    "https://produto.mercadolivre.com.br/MLB-3768806669-escova-sanitaria-banheiro-inox-com-suporte-plastico-pp-_JM",
  "Capa Para Air Fryer Fritadeira Elétrica Cores Lisas Cozinha":
    "https://produto.mercadolivre.com.br/MLB-5351507558-capa-para-air-fryer-fritadeira-eletrica-cores-lisas-cozinha-_JM?pdp_filters=item_id%3AMLB5351507558",
  "Dispenser Detergente E Organizador Trium 650ml Chumbo - Ou":
    "https://www.mercadolivre.com.br/dispenser-detergente-e-organizador-trium-650ml-chumbo-ou/p/MLB25844324?pdp_filters=deal%3AMLB1578289-1",
  "Balança Digital De Precisão Davely Cook Cozinha Para Uso Domestico E Profissional":
    "https://www.mercadolivre.com.br/balanca-digital-de-precisao-davely-cook-cozinha-para-uso-domestico-e-profissional/p/MLB65131882?pdp_filters=deal%3AMLB1578289-1",
  "Kit 10 Bicos Dosador Plástico Montanha Com Tampa Para Azeite E Vinagre":
    "https://www.mercadolivre.com.br/kit-10-bicos-dosador-plastico-montanha-com-tampa-para-azeite-e-vinagre/p/MLB41739131?pdp_filters=deal%3AMLB1578289-1",
  "Vela Palito Kit 10 Unidades 100% Parafina Pura 18cm Branco Liso 32 Ml":
    "https://www.mercadolivre.com.br/vela-palito-kit-10-unidades-100-parafina-pura-18cm/up/MLBU3226363691?pdp_filters=deal%3AMLB1578289-1",
  "Dispenser Sabão Porta Grãos Hermético Amaciante Lavanderia Branco":
    "https://www.mercadolivre.com.br/dispenser-sabao-porta-graos-hermetico-amaciante-lavanderia/up/MLBU3121255291?pdp_filters=deal%3AMLB1578289-1",
  "Kit 100 Gotejador Para Mangueira Aspersor Para Irrigação":
    "https://www.mercadolivre.com.br/kit-100-gotejador-para-mangueira-aspersor-para-irrigacao/p/MLB2043183547?pdp_filters=deal%3AMLB1578289-1",
  "Termitrine 30ml Mata Baratas Formigas Moscas Pernilongos":
    "https://www.mercadolivre.com.br/termitrine-30ml-mata-baratas-formigas-moscas-pernilongos/up/MLBU1150329887?pdp_filters=deal%3AMLB1578289-1",
  "Suporte Para Botijão De Gás Vasos Galão Base Com Rodinha":
    "https://www.mercadolivre.com.br/suporte-para-botijao-de-gas-vasos-galao-base-com-rodinha/up/MLBU3189827731?pdp_filters=deal%3AMLB1578289-1",
  "Rolo Furador De Massa Anti-bolhas Pizza Confeitaria Em Geral Cores Sortidas Tons Leves":
    "https://www.mercadolivre.com.br/rolo-furador-de-massa-antibolhas-pizza-confeitaria-em-geral/up/MLBU3914386362?pdp_filters=deal%3AMLB1578289-1",
  "Kit 10 Petisqueira Canoa Barquinha Plástica Para Festas Branco":
    "https://www.mercadolivre.com.br/kit-10-petisqueira-canoa-barquinha-plastica-para-festas-branco/p/MLB74593509?pdp_filters=deal%3AMLB1578289-1",
  "Abridor ampolas Botox Abridor De Toxina Botulínica Abridor Peptideos Ampola Botox Bujão Garrafa Gurumania":
    "https://www.mercadolivre.com.br/abridor-ampolas-botox-abridor-de-toxina-botulinica-abridor-peptideos-ampola-botox-bujao-garrafa-gurumania/p/MLB74580820?pdp_filters=deal%3AMLB1578289-1",
  "Sofá Orgânico Curvo Confortável Savana 02 Metros Boucle":
    "https://produto.mercadolivre.com.br/MLB-4453864183-sofa-orgnico-curvo-confortavel-savana-02-metros-boucle-_JM?pdp_filters=item_id%3AMLB4453864183",
  "Sofá Evo. 2,70m Molas Ensacadas Com Chaise Dir. Cama Inbox Marrom Liso":
    "https://www.mercadolivre.com.br/sofa-evo-270m-molas-ensacadas-com-chaise-dir-cama-inbox/up/MLBU3877304862?pdp_filters=deal%3AMLB1578289-1",
  "Conjunto Mesa De Jantar 4 Cadeiras Tampo Vidro Pizza Cinza":
    "https://www.mercadolivre.com.br/conjunto-mesa-de-jantar-4-cadeiras-tampo-vidro-pizza-cinza/p/MLB75793821?pdp_filters=item_id%3AMLB7273957460",
  "Cadeira Escritório Confortável Ergonômica Giratória Legacy Branco E Preto Algodão":
    "https://www.mercadolivre.com.br/cadeira-escritorio-confortavel-ergonomica-giratoria-legacy/up/MLBU3925177951?pdp_filters=item_id%3AMLB4643118341",
  "Sofá Retrátil 3,00m Molas Ensacadas Max Spring. Cama Inbox Cinza Liso":
    "https://www.mercadolivre.com.br/sofa-retratil-300m-molas-ensacadas-max-spring-cama-inbox/up/MLBU3411959374?pdp_filters=deal%3AMLB1578289-1",
  "Sofá De Canto Canto Leona Plus Bom Pastor":
    "https://produto.mercadolivre.com.br/MLB-5398340574-sofa-de-canto-canto-leona-plus-bom-pastor-_JM?pdp_filters=item_id%3AMLB5398340574",
  "Sofá Living 2 Lugares Suede Resistente Madeira + Almofadas":
    "https://produto.mercadolivre.com.br/MLB-5366043510-sofa-living-2-lugares-suede-resistente-madeira-almofadas-_JM?pdp_filters=item_id%3AMLB5366043510",
  "Sofá Retrátil E Reclinável Com Molas 1,80m Vegas Suede Cinza Cinza Suede":
    "https://www.mercadolivre.com.br/sofa-retratil-e-reclinavel-com-molas-180m-vegas-suede-cinza/up/MLBU599914179?pdp_filters=item_id%3AMLB2674591317",
  "Kit 6 Cadeiras De Jantar Marcela Design Moderno Com Assento Em Couro Pu Confortável Estrutura Em Polipropileno Resistente Base Firme Estilo Elegante Para Sala E Escritório Suporta Até 150kg Cor Nude":
    "https://www.mercadolivre.com.br/kit-6-cadeiras-de-jantar-marcela-design-moderno-com-assento-em-couro-pu-confortavel-estrutura-em-polipropileno-resistente-base-firme-estilo-elegante-para-sala-e-escritorio-suporta-ate-150kg-cor-nude/p/MLB67987805?pdp_filters=item_id%3AMLB4620426759",
  "Cadeira Xtreme Gamers Ergonômica 130o Escritório Reclinável Preto":
    "https://www.mercadolivre.com.br/cadeira-xtreme-gamers-ergonomica-130o-escritorio-reclinavel/up/MLBU3894359514?pdp_filters=item_id%3AMLB6589154650",
  "Guarda Roupas C/ Espelho 6p 6 Gavetas San Francisco Mad/off Madeir/off":
    "https://www.mercadolivre.com.br/guarda-roupas-c-espelho-6p-6-gavetas-san-francisco-madoff-madeiroff/p/MLB65324632?pdp_filters=item_id%3AMLB4506715545",
  "Árvore De Natal 3 Metros Shopping Tradicional Pinheiro Verde Cheia Grande":
    "https://www.mercadolivre.com.br/arvore-de-natal-3-metros-shopping-tradicional-pinheiro-verde-cheia-grande/p/MLB55271109?pdp_filters=item_id%3AMLB5687299186",
  "Sofá Cama Orbe. 1,90m Xpand Tech Tecido Boucle Cama Inbox Cinza-escuro Liso":
    "https://www.mercadolivre.com.br/sofa-cama-orbe-190m-xpand-tech-tecido-boucle-cama-inbox/up/MLBU4046789936?pdp_filters=deal%3AMLB1578289-1",
  "Cadeira Escritório Ergonômica Heads Top Bestchair Cor Preto Material do estofamento Tecido":
    "https://www.mercadolivre.com.br/cadeira-escritorio-ergonomica-heads-top-bestchair-cor-preto-material-do-estofamento-tecido/p/MLB45854865?pdp_filters=item_id%3AMLB4331601583",
  "Conjunto Mesa de Jantar 4 Lugares com Cadeiras Estofadas Tampo Retangular Semelhante Vidro Base V Mel Off":
    "https://www.mercadolivre.com.br/conjunto-mesa-de-jantar-4-lugares-com-cadeiras-estofadas-tampo-retangular-semelhante-vidro-base-v-mel-off/p/MLB60709058?pdp_filters=deal%3AMLB1578289-1",
  "Sofa De Canto 5 Lugares Suede Qatar Estofados Marrom Capitonê":
    "https://www.mercadolivre.com.br/sofa-de-canto-5-lugares-suede-qatar-estofados/up/MLBU4083286108?pdp_filters=item_id%3AMLB6937663064",
  "Guarda Roupa Solteiro 6 Portas 2 Gavetas Sidney Doripel Cor Branco":
    "https://www.mercadolivre.com.br/guarda-roupa-solteiro-6-portas-2-gavetas-sidney-doripel-cor-branco/p/MLB29814371?pdp_filters=deal%3AMLB1578289-1",
  "Guarda Roupa Solteiro 6 Portas 2 Gavetas Sidney Doripel Cor Off White/nogueira":
    "https://www.mercadolivre.com.br/guarda-roupa-solteiro-6-portas-2-gavetas-sidney-doripel-cor-off-whitenogueira/p/MLB29815082?pdp_filters=deal%3AMLB1578289-1",
  "Guarda Roupa Solteiro 6 Portas 2 Gavetas Sidney Doripel Cor Preto":
    "https://www.mercadolivre.com.br/guarda-roupa-solteiro-6-portas-2-gavetas-sidney-doripel-cor-preto/p/MLB28639025?pdp_filters=deal%3AMLB1578289-1",
  "Sofá Cama Bangkok 1.90m Retrátil E Reclinável P/ Quarto Sala":
    "https://produto.mercadolivre.com.br/MLB-4133993025-sofa-cama-bangkok-190m-retratil-e-reclinavel-p-quarto-sala-_JM?pdp_filters=item_id%3AMLB4133993025",
  "Armário De Cozinha Completo 5 Portas 1 Gaveta Com Nichos Cinamomo/grafite":
    "https://www.mercadolivre.com.br/armario-de-cozinha-completo-5-portas-1-gaveta-com-nichos/up/MLBU4397561655?pdp_filters=deal%3AMLB1578289-1",
  "Cabeceira Para Cama Box Casal 140cm Estofada Moderna Boucle":
    "https://produto.mercadolivre.com.br/MLB-4329533121-cabeceira-para-cama-box-casal-140cm-estofada-moderna-boucle-_JM",
  "Cadeira de Escritório Giratória Or Design 3310 Preta Ergonomica":
    "https://www.mercadolivre.com.br/cadeira-de-escritorio-giratoria-or-design-3310-preta-ergonomica/p/MLB28453045?pdp_filters=deal%3AMLB1578289-1",
  "Capa Sofá Retrátil 2 Módulos Braço Completo - Cores/estampas":
    "https://produto.mercadolivre.com.br/MLB-4293674477-capa-sofa-retratil-2-modulos-braco-completo-coresestampas-_JM?pdp_filters=item_id%3AMLB4293674477",
  "Kit Mesa Ferro 120x80cm Em Mdp Com 4 Cadeiras Allegra P Mel/preto":
    "https://www.mercadolivre.com.br/kit-mesa-ferro-120x80cm-em-mdp-com-4-cadeiras-allegra-p/up/MLBU4404187560?pdp_filters=item_id%3AMLB4930402165",
  "Conjunto De Panelas 11 Peças Antiaderente Com Panela de Pressão E Utensílios Fogão A Gás Marrom":
    "https://www.mercadolivre.com.br/conjunto-de-panelas-11-pecas-antiaderente-com-panela-de-pressao-e-utensilios-fogao-a-gas-marrom/p/MLB75544711?pdp_filters=item_id%3AMLB7192865492",
  "Conjunto Sala Estar Sierra Ripado 1.8 X 2.2 Tv 72 Polegadas Fendi":
    "https://www.mercadolivre.com.br/conjunto-sala-estar-sierra-ripado-18-x-22-tv-72-polegadas/up/MLBU4398906613?pdp_filters=item_id%3AMLB4937265991",
  "Olafvi Cortina LED Pisca Pisca Fada 2x2m 400 Leds RGB Bluetooth App Controle USB Enfeite Natal DS400":
    "https://www.mercadolivre.com.br/olafvi-cortina-led-pisca-pisca-fada-2x2m-400-leds-rgb-bluetooth-app-controle-usb-enfeite-natal-ds400/p/MLB78180309?pdp_filters=item_id%3AMLB5171676805",
  "Soprador 2 Bateria Sem Fio Potente Profissional Aspirador Preto Com Amarelo 2 Baterias 21v":
    "https://www.mercadolivre.com.br/soprador-2-bateria-sem-fio-potente-profissional-aspirador/up/MLBU3127401565?pdp_filters=deal%3AMLB1578289-1",
  "Cômoda Grande Para Quarto Organização de Roupas Casal ou Solteiro 6 Porta E 2 Gavetas Com Cabideiro Multiuso - Jamaica Cor Nature Off White":
    "https://www.mercadolivre.com.br/comoda-grande-para-quarto-organizacao-de-roupas-casal-ou-solteiro-6-porta-e-2-gavetas-com-cabideiro-multiuso-jamaica-cor-nature-off-white/p/MLB70465149?pdp_filters=item_id%3AMLB6886566724",
  "Kit 05 Cadeira Secretaria Corino Preta Base Palito Fixa. Cor Preto Material Do Estofamento Couro Sintético":
    "https://www.mercadolivre.com.br/kit-05-cadeira-secretaria-corino-preta-base-palito-fixa-cor-preto-material-do-estofamento-couro-sintetico/p/MLB58681013?pdp_filters=deal%3AMLB1578289-1",
  "Cortina Rolo Blackout 180x140 cm Com Bandô Cor Linho Natural Com Acabamento Preto Alfaplex":
    "https://www.mercadolivre.com.br/cortina-rolo-blackout-180x140-cm-com-bando-cor-linho-natural-com-acabamento-preto-alfaplex/p/MLB37472192?pdp_filters=item_id%3AMLB5327304794",
  "Jogo de Panelas LUCKSSY 13 Peças Antiaderente - 3 Sopeiras, 2 Leiteiras e Frigideira, p/ Indução - Espessura 2,3mm":
    "https://www.mercadolivre.com.br/jogo-de-panelas-luckssy-13-pecas-antiaderente-3-sopeiras-2-leiteiras-e-frigideira-p-inducao-espessura-23mm/p/MLB76397864?pdp_filters=item_id%3AMLB5036443549",
  "20 Cadeiras Plástica Bistrô Suportam Até 150 Kg Premium Branco":
    "https://www.mercadolivre.com.br/20-cadeiras-plastica-bistro-suportam-ate-150-kg-premium/up/MLBU3006724191?pdp_filters=deal%3AMLB1578289-1",
  "Rack Sala Estante Tv 58 Polegadas Home Bancada Helena Off White/nature":
    "https://www.mercadolivre.com.br/rack-sala-estante-tv-58-polegadas-home-bancada-helena/up/MLBU3861103283?pdp_filters=item_id%3AMLB4562170927",
  "Kit 10 Luminária Slim Linear Sobrepor Led 36/40w 120cm 4000k 127/220v Branco Neutro 4000k":
    "https://www.mercadolivre.com.br/kit-10-luminaria-slim-linear-sobrepor-led-3640w-120cm-4000k/up/MLBU3755754163?pdp_filters=item_id%3AMLB6205275102",
  "Armário Para Lavanderia Multiuso 2 Portas Com Rodinhas Ksa Branco":
    "https://www.mercadolivre.com.br/armario-para-lavanderia-multiuso-2-portas-com-rodinhas-ksa/up/MLBU4097854516?pdp_filters=item_id%3AMLB4771798709",
  "Tapete Persa Vermelho Poliéster Indiano 2,5m x 2m Sala Design Clássico":
    "https://www.mercadolivre.com.br/tapete-persa-vermelho-poliester-indiano-25m-x-2m-sala-design-classico/p/MLB32969148?pdp_filters=deal%3AMLB1578289-1",
  "Mangueira De Jardim 50m Metros Com Esguicho Trançada Reforçada Flexível 7/16 Anti Dobra Irrigação Quintal Poço Lavagem Durável Marqs Home":
    "https://www.mercadolivre.com.br/mangueira-de-jardim-50m-metros-com-esguicho-trancada-reforcada-flexivel-716-anti-dobra-irrigacao-quintal-poco-lavagem-duravel-marqs-home/p/MLB34506613?pdp_filters=item_id%3AMLB3728863885",
  "Armário de Cozinha Completa Aerea com Balcão 4 Portas e Gaveta Resistente Compacta E Nicho Suspenso Ripado 3D Cinza Grafite":
    "https://www.mercadolivre.com.br/armario-de-cozinha-completa-aerea-com-balcao-4-portas-e-gaveta-resistente-compacta-e-nicho-suspenso-ripado-3d-cinza-grafite/p/MLB78419728?pdp_filters=item_id%3AMLB5142594323",
  "Balcão De Cozinha Para Cooktop 4 ou 5 Bocas Com 2 Portas E 1 Nicho Trio Casa Cor Nature/Off White":
    "https://www.mercadolivre.com.br/balcao-de-cozinha-para-cooktop-4-ou-5-bocas-com-2-portas-e-1-nicho-trio-casa-cor-natureoff-white/p/MLB77608784?pdp_filters=item_id%3AMLB5088313093",
  "Mesa de Jantar Redonda 90cm Mel Viero Flipp Slim Tampo MDF Base Robusta Moderna 2 a 4 Pessoas Cozinha Sala Refeição Design Amadeirado":
    "https://www.mercadolivre.com.br/mesa-de-jantar-redonda-90cm-mel-viero-flipp-slim-tampo-mdf-base-robusta-moderna-2-a-4-pessoas-cozinha-sala-refeicao-design-amadeirado/p/MLB61988153?pdp_filters=deal%3AMLB1578289-1",
  "Sofanete 3 Em 1 Sofá, Cama De Solteiro E Cama De Casal Cinza":
    "https://www.mercadolivre.com.br/sofanete-3-em-1--sofa-cama-de-solteiro-e-cama-de-casal/up/MLBU5190759768?pdp_filters=item_id%3AMLB7633924602",
  "Jogo 6 Toalhas Banho - 3 Banho, 3 Rosto Grande Macia Atacado":
    "https://www.mercadolivre.com.br/jogo-6-toalhas-banho-3-banho-3-rosto-grande-macia-atacado/p/MLB50237657?pdp_filters=item_id%3AMLB5399540704",
  "Penteadeira Luna Com Kit Luz Espelho Camarim 7 Gavetas Branco":
    "https://www.mercadolivre.com.br/penteadeira-luna-com-kit-luz-espelho-camarim-7-gavetas/up/MLBU4010122200?pdp_filters=deal%3AMLB1578289-1",
  "Triboshop Espelho Retangular Chão Suporte Corpo Inteiro Luxo Cor da moldura Preto":
    "https://www.mercadolivre.com.br/triboshop-espelho-retangular-chao-suporte-corpo-inteiro-luxo-cor-da-moldura-preto/p/MLB26002388?pdp_filters=item_id%3AMLB4656570187",
  "Kit 10 Terminal Dedicado Tdmi 300 Para Central Portaria":
    "https://www.mercadolivre.com.br/kit-10-terminal-dedicado-tdmi-300-para-central-portaria/p/MLB46422654?pdp_filters=item_id%3AMLB6254933668",
  "Guarda Roupa Casal 6 Portas 2 Gavetas Malta Yescasa Cinamomo":
    "https://www.mercadolivre.com.br/guarda-roupa-casal-6-portas-2-gavetas-malta-yescasa-cinamomo/p/MLB78844700?pdp_filters=deal%3AMLB1578289-1",
  "Larissa Kit 8 Cadeiras Jantar Preto Área Interna Externa Clássico":
    "https://www.mercadolivre.com.br/larissa-kit-8-cadeiras-jantar-preto-area-interna-externa/up/MLBU3787770664?pdp_filters=item_id%3AMLB4468582751",
  "Arvore De Natal 180cm Verde Com 700 Galhos Pé De Metal Luxo":
    "https://www.mercadolivre.com.br/arvore-de-natal-180cm-verde-com-700-galhos-pe-de-metal-luxo/p/MLB28099821?pdp_filters=deal%3AMLB1578289-1",
  "Varal De Chão Com Abas Secalux De piso Dobravel Aço Pratico E Econômico 11kg Cor Preto":
    "https://www.mercadolivre.com.br/varal-de-chao-com-abas-secalux-de-piso-dobravel-aco-pratico-e-economico-11kg-cor-preto/p/MLB23447729?pdp_filters=item_id%3AMLB3844410524",
  "2 Coberta Manta Soft Casal Microfibra Veludo 2,00x1,80 Mts":
    "https://produto.mercadolivre.com.br/MLB-3227161176-2-coberta-manta-soft-casal-microfibra-veludo-200x180-mts-_JM?pdp_filters=item_id%3AMLB3227161176",
  "Cabeceira Modulada Estofada Arredondada Placa 30x120 Adesiva":
    "https://produto.mercadolivre.com.br/MLB-4752885937-cabeceira-modulada-estofada-arredondada-placa-30x120-adesiva-_JM?pdp_filters=item_id%3AMLB4752885937",
  "Toalha De Banho Kit 5 Pçs 70x140cm 100% Algodão Sortido Estampa Difiori":
    "https://www.mercadolivre.com.br/toalha-de-banho-kit-5-pcs-70x140cm-100-algodao/up/MLBU803163838?pdp_filters=item_id%3AMLB4125874714",
  "Aparelho De Jantar 18 Peças Flat Málaga Azul Cerâmica Oxford":
    "https://www.mercadolivre.com.br/aparelho-de-jantar-18-pecas-flat-malaga-azul-ceramica-oxford/p/MLB68485761?pdp_filters=deal%3AMLB1578289-1",
  "Protetor De Colchão Solteiro Impermeável Matelado Resistente A Líquidos Antiácaro Antialérgico Preto":
    "https://www.mercadolivre.com.br/protetor-de-colchao-solteiro-impermeavel-matelado-resistente-a-liquidos-antiacaro-antialergico-preto/p/MLB48478015?pdp_filters=item_id%3AMLB4035251791",
  "Mesa De Jantar Industrial 1,20 X 0,45 Tampa Off White Pés Cobre":
    "https://www.mercadolivre.com.br/mesa-de-jantar-industrial-120-x-045-tampa-off-white-pes-cobre/p/MLB56613400?pdp_filters=item_id%3AMLB4654715713",
  "Conjunto 5 Tigelas Aço Inox Com Tampa 18-26 Cm Cinza":
    "https://www.mercadolivre.com.br/conjunto-5-tigelas-aco-inox-com-tampa-1826-cm/up/MLBU4093630185?pdp_filters=item_id%3AMLB6968142592",
  "Namoradeira Sofá 2 Lugares Clinica Recepção Sala De Espera":
    "https://produto.mercadolivre.com.br/MLB-3626212845-namoradeira-sofa-2-lugares-clinica-recepco-sala-de-espera-_JM?pdp_filters=item_id%3AMLB3626212845",
  "Aparelho De Jantar Oxford 20 Peças Ryo Areia":
    "https://www.mercadolivre.com.br/aparelho-de-jantar-oxford-20-pecas-ryo-areia/p/MLB70042169?pdp_filters=deal%3AMLB1578289-1",
  "Armário Cozinha Aéreo 2pts 120cm Florença Multimóveis Mp2425 Preto":
    "https://www.mercadolivre.com.br/armario-cozinha-aereo-2pts-120cm-florenca-multimoveis-mp2425/up/MLBU4578799833?pdp_filters=deal%3AMLB1578289-1",
  "Balcão de Cozinha de Aço com Tampo 3 Portas e 3 Gavetas 105cm Multimóveis CR20360 Branco":
    "https://www.mercadolivre.com.br/balcao-de-cozinha-de-aco-com-tampo-3-portas-e-3-gavetas-105cm-multimoveis-cr20360-branco/p/MLB48875377?pdp_filters=deal%3AMLB1578289-1",
  "Capa De Sofá Retro 4 Lugares Elásticado Retrátil King":
    "https://produto.mercadolivre.com.br/MLB-5085150406-capa-de-sofa-retro-4-lugares-elasticado-retratil-king-_JM?pdp_filters=item_id%3AMLB5085150406",
  "Sapateira Organizador De Sapatos Com 7 Prateleiras Multiuso":
    "https://produto.mercadolivre.com.br/MLB-4678191885-sapateira-organizador-de-sapatos-com-7-prateleiras-multiuso-_JM?pdp_filters=item_id%3AMLB4678191885",
  "Kit C/ 4 Toalha De Banho Gigante 80 X 1,50 Atacado + Brinde Sortidas Lisa":
    "https://www.mercadolivre.com.br/kit-c-4-toalha-de-banho-gigante-80-x-150-atacado-brinde-sortidas-lisa/p/MLB69680124?pdp_filters=item_id%3AMLB6780030278",
  "Kit 100 Placas Ripada Autocolante Painel 45x10cm Decorativa Ripado Embuia":
    "https://www.mercadolivre.com.br/kit-100-placas-ripada-autocolante-painel-45x10cm-decorativa/up/MLBU4613173120?pdp_filters=item_id%3AMLB7339997828",
  "Espelho Orgânico Led Quente Com Touch 60x40cm Premium Lavabo Led Quente 3000k Botão Touch":
    "https://www.mercadolivre.com.br/espelho-organico-led-quente-com-touch-60x40cm-premium-lavabo/up/MLBU3970950019?pdp_filters=item_id%3AMLB4690236583",
  "Kit 100 Bolas + Estrela Pendentes P/ Decoração Árvore De Natal Bolinhas Dekasa Premium Lisas/foscas/glitter - Mesclado Vermelho E Dourado":
    "https://www.mercadolivre.com.br/kit-100-bolas-estrela-pendentes-p-decoracao-arvore-de-natal-bolinhas-dekasa-premium-lisasfoscasglitter-mesclado-vermelho-e-dourado/p/MLB61057561?pdp_filters=item_id%3AMLB4290233229",
  "Cadeira De Balanço Suspensa Rede Teto Sacada Varanda Luxo":
    "https://produto.mercadolivre.com.br/MLB-5048857730-cadeira-de-balanco-suspensa-rede-teto-sacada-varanda-luxo-_JM",
  "Aparelho De Jantar 30 Peças Copos Diamond Pratos E Talheres Transparente Diamond":
    "https://www.mercadolivre.com.br/aparelho-de-jantar-30-pecas-copos-diamond-pratos-e-talheres/up/MLBU3953061463?pdp_filters=item_id%3AMLB4671541793",
  "Armário 1 Porta Área De Serviço Porta Vassouras Cozinha Branco":
    "https://www.mercadolivre.com.br/armario-1-porta-area-de-servico-porta-vassouras-cozinha-branco/p/MLB62566490?pdp_filters=item_id%3AMLB6259010290",
  "Airtag 2 Geração Apple 1 Und Rastreador Original Localizador":
    "https://produto.mercadolivre.com.br/MLB-7573346796-airtag-2-geraco-apple-1-und-rastreador-original-localizador-_JM?pdp_filters=item_id%3AMLB7573346796",
  "Gaveteiro Mesa De Cabeceira 3 Gavetas Organizador Multiuso Branco":
    "https://www.mercadolivre.com.br/gaveteiro-mesa-de-cabeceira-3-gavetas-organizador-multiuso/up/MLBU4021415624?pdp_filters=deal%3AMLB1578289-1",
  "Cortina Rolo Blackout 0,90 (l) X 1,40 (a) Pronta P/ Instalar Cor Tóquio 001":
    "https://www.mercadolivre.com.br/cortina-rolo-blackout-090-l-x-140-a-pronta-p-instalar-cor-toquio-001/p/MLB35825044?pdp_filters=item_id%3AMLB5328803242",
  "Vaso Sanitário Monobloco Caixa Acoplada Barcelona Cor Branco Branco":
    "https://www.mercadolivre.com.br/vaso-sanitario-monobloco-caixa-acoplada-barcelona-cor-branco/up/MLBU5162445679?pdp_filters=deal%3AMLB1578289-1",
  "Mangueira Jardim 30 Metros Com Esguicho Trançada Mangueira Jardim 30m Metros Reforçada Flexível 7/16 Anti Mangueira De Jardim 30 Metros Dobra Irrigação Quintal Poço Lavagem Durável Lemont Web Verde":
    "https://www.mercadolivre.com.br/mangueira-jardim-30-metros-com-esguicho-trancada-mangueira-jardim-30m-metros-reforcada-flexivel-716-anti-mangueira-de-jardim-30-metros-dobra-irrigacao-quintal-poco-lavagem-duravel-lemont-web-verde/p/MLB28989259?pdp_filters=item_id%3AMLB5408824104",
  "Sapateira Organizadora De Calçados Com 9 Andares Tecido Tnt":
    "https://produto.mercadolivre.com.br/MLB-5513842076-sapateira-organizadora-de-calcados-com-9-andares-tecido-tnt-_JM?pdp_filters=item_id%3AMLB5513842076",
  "Prateleira Organizadora Ajustável Para Pia Cozinha Preta":
    "https://produto.mercadolivre.com.br/MLB-4962019841-prateleira-organizadora-ajustavel-para-pia-cozinha-preta-_JM?pdp_filters=item_id%3AMLB4962019841",
  "Mangueira Jardim 20m Metros Com Esguicho Trançada Reforçada Flexível 7/16 Anti Dobra Irrigação Quintal Poço Lavagem Durável Marqs Home":
    "https://www.mercadolivre.com.br/mangueira-jardim-20m-metros-com-esguicho-trancada-reforcada-flexivel-716-anti-dobra-irrigacao-quintal-poco-lavagem-duravel-marqs-home/p/MLB38207832?pdp_filters=item_id%3AMLB4888474966",
  "Edredom Casal Queen 400 Fios Dupla Face Grosso Hotel Oferta":
    "https://produto.mercadolivre.com.br/MLB-3609126319-edredom-casal-queen-400-fios-dupla-face-grosso-hotel-oferta-_JM?pdp_filters=item_id%3AMLB3609126319",
  "Mini Motosserra Elétrica Nakasaki 48v 2 Baterias Haste 3,3m Amarelo 48":
    "https://www.mercadolivre.com.br/mini-motosserra-eletrica-nakasaki-48v-2-baterias-haste-33m/up/MLBU4913555190?pdp_filters=deal%3AMLB1578289-1",
  "Aparelho De Jantar E Chá 20 Peças Unni Oceânica":
    "https://www.mercadolivre.com.br/aparelho-de-jantar-e-cha-20-pecas-unni-oceanica/p/MLB46520461?pdp_filters=deal%3AMLB1578289-1",
  "Coberta Manta Soft Casal Microfibra Anti-alérgica Dupla Face":
    "https://produto.mercadolivre.com.br/MLB-4598385660-coberta-manta-soft-casal-microfibra-anti-alergica-dupla-face-_JM?pdp_filters=item_id%3AMLB4598385660",
  "Chuveiro Zagonel Eletrônico 127/220v Grande Econômico Ducha Preto 127v 5.5 Kw":
    "https://www.mercadolivre.com.br/chuveiro-zagonel-eletronico-127220v-grande-economico-ducha/up/MLBU5041360815?pdp_filters=deal%3AMLB1578289-1",
  "Mini Motosserra Nakasaki 25v 800w Profissional 2 Baterias Amarelo 127/220v":
    "https://www.mercadolivre.com.br/mini-motosserra-nakasaki-25v-800w-profissional-2-baterias/up/MLBU5121909521?pdp_filters=item_id%3AMLB5210168601",
  "Kit Panela Feijoada Caldo De Alumínio 3 Peças Industrial Prateado":
    "https://www.mercadolivre.com.br/kit-panela-feijoada-caldo-de-aluminio-3-pecas-industrial-prateado/p/MLB38808321?pdp_filters=deal%3AMLB1578289-1",
  "Toldo Tela Sombrite 95% Lona UV 4x5m Marrom para Garagem, Piscina e Jardim, com 4 Ilhós Metálicos Reforçados e Corda 10m, Proteção Solar, Resistente, Durável e Fácil de Instalar":
    "https://www.mercadolivre.com.br/toldo-tela-sombrite-95-lona-uv-4x5m-marrom-para-garagem-piscina-e-jardim-com-4-ilhos-metalicos-reforcados-e-corda-10m-protecao-solar-resistente-duravel-e-facil-de-instalar/p/MLB77697719?pdp_filters=item_id%3AMLB5175683949",
  "Kit Chimarrão Couro Mate Ecológico Desenhos 5 Peças Marrom-escuro":
    "https://www.mercadolivre.com.br/kit-chimarrao-couro-mate-ecologico-desenhos-5-pecas-marrom-escuro/p/MLB74722398?pdp_filters=item_id%3AMLB7071395002",
  "Armário Sapateira Multiuso Com 2 Portas 5 Prateleiras Branco":
    "https://www.mercadolivre.com.br/armario-sapateira-multiuso-com-2-portas--5-prateleiras/up/MLBU3371306951?pdp_filters=item_id%3AMLB4169843717",
  "Escrivaninha Industrial 120cm Mesa Estudo Aparador Pés Aço Preto-preto":
    "https://www.mercadolivre.com.br/escrivaninha-industrial-120cm--mesa-estudo-aparador-pes-aco/up/MLBU4021226627?pdp_filters=item_id%3AMLB4721802327",
  "Kit PanelaFeijoada Caldo De Alumínio 3 Peças Prateado":
    "https://www.mercadolivre.com.br/kit-panelafeijoada-caldo-de-aluminio-3-pecas-prateado/p/MLB65050542?pdp_filters=deal%3AMLB1578289-1",
  "Big Cofres Papelão 6x20cm Para Personalizar - 200 Unidades Cor Monte seu Kit Liso":
    "https://www.mercadolivre.com.br/big-cofres-papelao-6x20cm-para-personalizar-200-unidades-cor-monte-seu-kit-liso/p/MLB50161185?pdp_filters=deal%3AMLB1578289-1",
  "Refletor Solar Led Holofote Placa Bateria Prova Dágua 6500k Preto Branco-frio":
    "https://www.mercadolivre.com.br/refletor-solar-led-holofote-placa-bateria-prova-dagua-6500k/up/MLBU4139944125?pdp_filters=item_id%3AMLB4808956443",
  "Jogo 10 Toalha Piso Pezinho Chão Tapete Atacado - Confort Cor Sortidos":
    "https://www.mercadolivre.com.br/jogo-10-toalha-piso-pezinho-chao-tapete-atacado-confort-cor-sortidos/p/MLB36540550?pdp_filters=item_id%3AMLB4654767124",
  "Colchão De Solteiro Violeta D20 088x188x12 Cinza Estampado":
    "https://www.mercadolivre.com.br/colchao-de-solteiro-violeta-d20-088x188x12-cinza-estampado/p/MLB52069531?pdp_filters=item_id%3AMLB5965713040",
  "Porta Temperos Giratório Relâmpago Imperial 16 Potes Vidro Bambu":
    "https://www.mercadolivre.com.br/porta-temperos-giratorio-relampago-imperial-16-potes-vidro-bambu/p/MLB52525885?pdp_filters=item_id%3AMLB5503582984",
  "Kit 5 Potes Herméticos 2,5l Bico Dosador Copo Medidor Transparente":
    "https://www.mercadolivre.com.br/kit-5-potes-hermeticos-25l-bico-dosador-copo-medidor/up/MLBU3611328663?pdp_filters=item_id%3AMLB5960383004",
  "Aparelho de Jantar 20 peças Branco Poppy de Cerâmica - Scalla Cerâmica":
    "https://www.mercadolivre.com.br/aparelho-de-jantar-20-pecas-branco-poppy-de-ceramica-scalla-ceramica/p/MLB47423348?pdp_filters=deal%3AMLB1578289-1",
  "Broca Para Perfurador De Solo 200mmx800mm The Black Tools":
    "https://www.mercadolivre.com.br/broca-para-perfurador-de-solo-200mmx800mm-the-black-tools/p/MLB51986881?pdp_filters=deal%3AMLB1578289-1",
  "Painel Cabeceira Casal 140cm Luna Veludo Cappucino":
    "https://www.mercadolivre.com.br/painel-cabeceira-casal-140cm-luna-veludo/up/MLBU4436654824?pdp_filters=deal%3AMLB1578289-1",
  "Vaso Sanitário Monobloco Privada Com Caixa Acoplada Grande B Branco":
    "https://www.mercadolivre.com.br/vaso-sanitario-monobloco-privada-com-caixa-acoplada-grande-b/up/MLBU5162450257?pdp_filters=deal%3AMLB1578289-1",
  "Kit 4 Travesseiro De Pluma De Ganso Sintética Super Macio Premium Antialérgico Conforto Extra Hotel Luxo - Cor Branco":
    "https://www.mercadolivre.com.br/kit-4-travesseiro-de-pluma-de-ganso-sintetica-super-macio-premium-antialergico-conforto-extra-hotel-luxo-cor-branco/p/MLB51172938?pdp_filters=item_id%3AMLB4096634873",
  "Kit 22 Peças Potes Herméticos Para Mantimentos Clear":
    "https://www.mercadolivre.com.br/kit-22-pecas-potes-hermeticos-para-mantimentos/up/MLBU4009260974?pdp_filters=deal%3AMLB1578289-1",
  "Mangueira Jardim 30 Metros Com Esguicho Trançada Reforçada Flexível 7/16 Anti Dobra Irrigação Quintal Poço Lavagem Durável Marqs Home":
    "https://www.mercadolivre.com.br/mangueira-jardim-30-metros-com-esguicho-trancada-reforcada-flexivel-716-anti-dobra-irrigacao-quintal-poco-lavagem-duravel-marqs-home/p/MLB38284182?pdp_filters=deal%3AMLB1578289-1",
  "Cama Box Solteiro Conjugada Semi Ortopédica Cinza Cinza":
    "https://www.mercadolivre.com.br/cama-box-solteiro-conjugada-semi-ortopedica-cinza/up/MLBU4880463246?pdp_filters=item_id%3AMLB5101462843",
  "Grelha Para Pão De Alho/milho Churrasco Grelha Churrasqueira":
    "https://www.mercadolivre.com.br/grelha-para-pao-de-alhomilho-churrasco-grelha-churrasqueira/up/MLBU4593934250?pdp_filters=item_id%3AMLB4993985363",
  "Kit 20 Toalhas Rosto P/ Salão De Beleza - By Laune Haus Cor Preta Liso":
    "https://www.mercadolivre.com.br/kit-20-toalhas-rosto-p-salao-de-beleza-by-laune-haus-cor-preta-liso/p/MLB35971960?pdp_filters=deal%3AMLB1578289-1",
  "Kit 3 Toalha De Banho 100% Algodão 70x1,30 Sortidas Liso":
    "https://www.mercadolivre.com.br/kit-3-toalha-de-banho-100-algodao-70x130-sortidas-liso/p/MLB50928515?pdp_filters=item_id%3AMLB4085891543",
  "Kit 04 Toalhas Rosto Premium - Macia Confortável Laune Haus Cor Sortidas Lisa":
    "https://www.mercadolivre.com.br/kit-04-toalhas-rosto-premium-macia-confortavel-laune-haus-cor-sortidas-lisa/p/MLB50475942?pdp_filters=item_id%3AMLB5404283306",
  "Penteadeira Suspensa Camarim Maquiagem Para Quarto 120cm Nature / Off White":
    "https://www.mercadolivre.com.br/penteadeira-suspensa-camarim-maquiagem-para-quarto-120cm/up/MLBU4962389879?pdp_filters=deal%3AMLB1578289-1",
  "Poltrona Pufe Redonda Decorar Sala De Estar E Dormitório Cinza":
    "https://www.mercadolivre.com.br/poltrona-pufe-redonda-decorar-sala-de-estar-e-dormitorio/up/MLBU4097636053?pdp_filters=item_id%3AMLB6973580060",
  "Jogo De Lençol Casal Queen 4 Peças Bordado Primavera Novo Branco Bordado Salmão Bordado":
    "https://www.mercadolivre.com.br/jogo-de-lencol-casal-queen-4-pecas-bordado-primavera-novo/up/MLBU4865606931?pdp_filters=item_id%3AMLB5107173051",
  "Kit 04 Toalhas De Banho Luxo Gigante 70 x 1,40 Atacado Lisa Listras Algodão Conjunto Luxo De Linha Alta Qualidade Super Macias":
    "https://www.mercadolivre.com.br/kit-04-toalhas-de-banho-luxo-gigante-70-x-140-atacado-lisa-listras-algodao-conjunto-luxo-de-linha-alta-qualidade-super-macias/p/MLB62733463?pdp_filters=deal%3AMLB1578289-1",
  "Fatiador Cortador Manual P/ Carnes Frios Legumes Verduras Cor Prateado":
    "https://www.mercadolivre.com.br/fatiador-cortador-manual-p-carnes-frios-legumes-verduras-cor-prateado/p/MLB62725239?pdp_filters=item_id%3AMLB5993991200",
  "Torneira Pia De Gourmet Flexivel Cozinha Parede 2 Jatos 304 Acabamento Escovado Cor Prateado":
    "https://www.mercadolivre.com.br/torneira-pia-de-gourmet-flexivel-cozinha-parede-2-jatos-304-acabamento-escovado-cor-prateado/p/MLB53591995?pdp_filters=deal%3AMLB1578289-1",
  "Kit Bacia Sanitária Celite Like Branco Com Caixa Acoplada Branco":
    "https://www.mercadolivre.com.br/kit-bacia-sanitaria-celite-like-branco-com-caixa-acoplada/up/MLBU5198311812?pdp_filters=deal%3AMLB1578289-1",
  "Capa De Sofá 2 E 3 Lugares 21 Elásticos Várias Cores":
    "https://produto.mercadolivre.com.br/MLB-984980560-capa-de-sofa-2-e-3-lugares-21-elasticos-varias-cores-_JM",
  "Kit 05 Toalhas De Banho Popular 100%algodão Alta Absorção Sortido":
    "https://www.mercadolivre.com.br/kit-05-toalhas-de-banho-popular-100algodao-alta-absorcao/up/MLBU3671971572?pdp_filters=item_id%3AMLB6031470016",
  "Vaso Sanitário Tubrax Monobloco Vab0002 Caixa Acoplada Compl Branco":
    "https://www.mercadolivre.com.br/vaso-sanitario-tubrax-monobloco-vab0002-caixa-acoplada-compl/up/MLBU5198313260?pdp_filters=deal%3AMLB1578289-1",
  "Vaso Sanitário Monobloco Caixa Acoplada Completo Privada C Branco":
    "https://www.mercadolivre.com.br/vaso-sanitario-monobloco-caixa-acoplada-completo-privada-c/up/MLBU5198311612?pdp_filters=deal%3AMLB1578289-1",
  "Vaso Sanitário Monobloco Caixa Acoplada Privada Completo Cor Branco":
    "https://www.mercadolivre.com.br/vaso-sanitario-monobloco-caixa-acoplada-privada-completo-cor/up/MLBU5198313896?pdp_filters=deal%3AMLB1578289-1",
  "Carrinho Quadrado Para Vaso 40 Cm Com Rodízios Madeira Liso":
    "https://www.mercadolivre.com.br/carrinho-quadrado-para-vaso-40-cm-com-rodizios/up/MLBU1727860676?pdp_filters=item_id%3AMLB3032624001",
  "Kit 5 Terminal Dedicado Para Condomínio Tdmi 300 Intelbras":
    "https://www.mercadolivre.com.br/kit-5-terminal-dedicado-para-condominio-tdmi-300-intelbras/p/MLB46440113?pdp_filters=deal%3AMLB1578289-1",
  "Sapateira Organizadora 2 Portas 4 Prateleiras RP1206 Marrom - Decibal":
    "https://www.mercadolivre.com.br/sapateira-organizadora-2-portas-4-prateleiras-rp1206-marrom-decibal/p/MLB37850252?pdp_filters=deal%3AMLB1578289-1",
  "Sapateira com Banco Madeira Natural em Tom Bege Real Seda":
    "https://www.mercadolivre.com.br/sapateira-com-banco-madeira-natural-em-tom-bege-real-seda/p/MLB23604427?pdp_filters=deal%3AMLB1578289-1",
  "Mangueira De Jardim 10m Metros Com Esguicho Trançada Reforçada Flexível 7/16 Anti Dobra Irrigação Quintal Poço Lavagem Durável Marqs Home":
    "https://www.mercadolivre.com.br/mangueira-de-jardim-10m-metros-com-esguicho-trancada-reforcada-flexivel-716-anti-dobra-irrigacao-quintal-poco-lavagem-duravel-marqs-home/p/MLB40655338?pdp_filters=item_id%3AMLB5158616810",
  "Kit Toalhas Banhão Karsten Unika - 2 Cor Branco":
    "https://www.mercadolivre.com.br/kit-toalhas-banhao-karsten-unika-2-cor-branco/p/MLB58093978?pdp_filters=deal%3AMLB1578289-1",
  "Ralador Queijo Fatiador Legumes Cortador Vegetais 3 Em 1":
    "https://www.mercadolivre.com.br/ralador-queijo-fatiador-legumes-cortador-vegetais-3-em-1/up/MLBU3405585190?pdp_filters=item_id%3AMLB4190581425",
  "Estante Para Vasos De Plantas, Floreira De Madeira, Dobrável Madeira":
    "https://www.mercadolivre.com.br/estante-para-vasos-de-plantas-floreira-de-madeira-dobravel/up/MLBU1142236245?pdp_filters=item_id%3AMLB3611782410",
  "Kit com 10 Panos de Prato Copa Atoalhados Camesa de Algodão":
    "https://www.mercadolivre.com.br/kit-com-10-panos-de-prato-copa-atoalhados-camesa-de-algodao/p/MLB26685448?pdp_filters=item_id%3AMLB3792661639",
  "Kit 02 Travesseiro Antialérgico Pluma De Ganso 70cm X 50cm Cor Branco":
    "https://www.mercadolivre.com.br/kit-02-travesseiro-antialergico-pluma-de-ganso-70cm-x-50cm-cor-branco/p/MLB67515886?pdp_filters=deal%3AMLB1578289-1",
  "Pano De Copa Prato Cozinha Atoalhado Atacado Felpudo Kit Com 10 Pecas":
    "https://www.mercadolivre.com.br/pano-de-copa-prato-cozinha-atoalhado-atacado-felpudo-kit-com-10-pecas/p/MLB24812762?pdp_filters=item_id%3AMLB4964737066",
  "Kit 3 Terminal Dedicado Para Central De Portaria Intelbras":
    "https://www.mercadolivre.com.br/kit-3-terminal-dedicado-para-central-de-portaria-intelbras/p/MLB38532932?pdp_filters=deal%3AMLB1578289-1",
  "Panos De Prato Com Barrado 100% Algodão 5 Unidades Cor Limoeiro Limoeiro":
    "https://www.mercadolivre.com.br/panos-de-prato-com-barrado-100-algodao-5-unidades-cor-limoeiro-limoeiro/p/MLB75748030?pdp_filters=item_id%3AMLB7247626266",
  "Cobertor Microfibra Life Tex II Casal Cinza 200cm x 180cm":
    "https://www.mercadolivre.com.br/cobertor-microfibra-life-tex-ii-casal-cinza-200cm-x-180cm/p/MLB29115461?pdp_filters=item_id%3AMLB4676109287",
  "Árvore Natal Pinheiro Luxo 150cm 380 Galhos Cheia Realista Verde":
    "https://www.mercadolivre.com.br/arvore-natal-pinheiro-luxo-150cm-380-galhos-cheia-realista/up/MLBU4326200204?pdp_filters=deal%3AMLB1578289-1",
  "Disco De Arado Chapa De Aço Côncavo 40 Cm Com Tampa De Vidro Com Tampa De Vidro":
    "https://www.mercadolivre.com.br/disco-de-arado-chapa-de-aco-concavo-40-cm-com-tampa-de-vidro/up/MLBU4399117495?pdp_filters=deal%3AMLB1578289-1",
  "Kit Colcha Cobre Leito Queen Matelado Liso Estampado 3 Peças":
    "https://produto.mercadolivre.com.br/MLB-4008244865-kit-colcha-cobre-leito-queen-matelado-liso-estampado-3-pecas-_JM?pdp_filters=item_id%3AMLB4008244865",
  "Pano De Prato Atacado Com 10 Peças":
    "https://www.mercadolivre.com.br/pano-de-prato-atacado-com-10-pecas/p/MLB24304535?pdp_filters=item_id%3AMLB5031532914",
  "Kit 5 Pano Prato Atoalhado Xadrez Copa 100% Algodão Colorido Sortido":
    "https://www.mercadolivre.com.br/kit-5-pano-prato-atoalhado-xadrez-copa-100-algodao-colorido/up/MLBU3879049941?pdp_filters=deal%3AMLB1578289-1",
  "Mesa De Cabeceira Classic Quarto Escritório 4 Gavetas Brilhante Branco":
    "https://www.mercadolivre.com.br/mesa-de-cabeceira-classic-quarto-escritorio--4-gavetas/up/MLBU4141018263?pdp_filters=deal%3AMLB1578289-1",
  "Kit Cobre Leito Solteiro 2 Peças Bordado Unique":
    "https://produto.mercadolivre.com.br/MLB-3650793429-kit-cobre-leito-solteiro-2-pecas-bordado-unique-_JM",
  "Rolo De Massa Em Aço Inox Ajustável E Tapete Culinário Prateado":
    "https://www.mercadolivre.com.br/rolo-de-massa-em-aco-inox-ajustavel-e-tapete-culinario/up/MLBU4254947820?pdp_filters=item_id%3AMLB7118122592",
  "Estante Para Tv Gkmoveis 32 Industrial 90cm Mdf/mdp Cor Preto":
    "https://www.mercadolivre.com.br/estante-para-tv-gkmoveis-32-industrial-90cm-mdfmdp-cor-preto/p/MLB43848240?pdp_filters=deal%3AMLB1578289-1",
  "Kit Com 3 Omo Branco Absoluto Pó 720g Caixa Expert":
    "https://www.mercadolivre.com.br/kit-com-3-omo-branco-absoluto-po-720g-caixa-expert/p/MLB63201107?pdp_filters=item_id%3AMLB4513572843",
  "Conjunto De 5 Tigelas De Cozinha Tigela De Inox Bowl Vasilha Inox":
    "https://www.mercadolivre.com.br/conjunto-de-5-tigelas-de-cozinha-tigela-de-inox-bowl-vasilha/up/MLBU3913496574?pdp_filters=item_id%3AMLB6635050882",
  "Kit 200 Tampa Descartável Para Alimentos Elástica Vedação Transparente":
    "https://www.mercadolivre.com.br/kit-200-tampa-descartavel-para-alimentos-elastica-vedacao/up/MLBU4054251229?pdp_filters=item_id%3AMLB6921225976",
  "Kit Jogo De Panelas 6 Peças Alumínio Reforçado":
    "https://produto.mercadolivre.com.br/MLB-7318437510-kit-jogo-de-panelas-6-pecas-aluminio-reforcado-_JM",
  "Espelheira Armarinho Banheiro Armário Suspenso Prateleira Preto":
    "https://www.mercadolivre.com.br/espelheira-armarinho-banheiro-armario-suspenso-prateleira/up/MLBU4529412219?pdp_filters=deal%3AMLB1578289-1",
  "Escorredor De Macarrão Inox Lavador De Arroz Wow World Of Wonders":
    "https://www.mercadolivre.com.br/escorredor-de-macarrao-inox-lavador-de-arroz-wow-world-of-wonders/p/MLB59544757?pdp_filters=item_id%3AMLB5791797094",
  "Repelente Líquido Óleo De Citronela Puro Natural 1 Litro":
    "https://www.mercadolivre.com.br/repelente-liquido-oleo-de-citronela-puro-natural-1-litro/p/MLB53322947?pdp_filters=item_id%3AMLB4145747849",
  "Armário P/ Bebedouro Forno Balcão Armário Organizador Mel / Branco":
    "https://www.mercadolivre.com.br/armario-p-bebedouro-forno-balcao-armario-organizador/up/MLBU5071772721?pdp_filters=deal%3AMLB1578289-1",
  "Kit 3 Soldadinho Quebra Nozes Infeito Natalino Natal":
    "https://www.mercadolivre.com.br/kit-3-soldadinho-quebra-nozes-infeito-natalino-natal/p/MLB75984863?pdp_filters=item_id%3AMLB5014739963",
  "Aparador Sala Minimalista Industrial Madeira E Ferro Tubular Marrom":
    "https://www.mercadolivre.com.br/aparador-sala-minimalista-industrial-madeira-e-ferro-tubular/up/MLBU3832199557?pdp_filters=deal%3AMLB1578289-1",
  "Esfregao Mop Giratorio 8 Litros Cesto Inox 2 Refil Pro Unica":
    "https://www.mercadolivre.com.br/esfregao-mop-giratorio-8-litros-cesto-inox-2-refil-pro-unica/p/MLB68603936?pdp_filters=deal%3AMLB1578289-1",
  "Tapete Grande 300x200 Sala Pelo Alto Lindo E Cor Tabaco Mesclado":
    "https://www.mercadolivre.com.br/tapete-grande-300x200-sala-pelo-alto-lindo-e-cor-tabaco-mesclado/p/MLB50316083?pdp_filters=deal%3AMLB1578289-1",
  "Cestos Caixa Organizadora De Bambu Natural 29 X 23 C/ Tampa Bambu Lisa":
    "https://www.mercadolivre.com.br/cestos-caixa-organizadora-de-bambu-natural-29-x-23-c-tampa-bambu-lisa/p/MLB75029429?pdp_filters=item_id%3AMLB7120011644",
  "Kit 2 Travesseiro Pena Pluma de Ganso Sintetica Siliconada Lavavel Toque Macio 70x50cm":
    "https://www.mercadolivre.com.br/kit-2-travesseiro-pena-pluma-de-ganso-sintetica-siliconada-lavavel-toque-macio-70x50cm/p/MLB42976203?pdp_filters=deal%3AMLB1578289-1",
  "Campainha Inteligente Wi-Fi Câmera 480P Áudio 2 Vias Visão Noturna":
    "https://www.mercadolivre.com.br/campainha-inteligente-wi-fi-camera-480p-audio-2-vias-visao-noturna/p/MLB29380307?pdp_filters=deal%3AMLB1578289-1",
  "Tapete Sala 2,00x2,40 Peludo Felpudo Macio Fofinho Cor Tabaco Mesclado":
    "https://www.mercadolivre.com.br/tapete-sala-200x240-peludo-felpudo-macio-fofinho-cor-tabaco-mesclado/p/MLB50314078?pdp_filters=deal%3AMLB1578289-1",
  "Cortina Pisca-pisca Led Decorativa Para Eventos E Natal 3m*3m 400led":
    "https://www.mercadolivre.com.br/cortina-piscapisca-led-decorativa-para-eventos-e-natal/up/MLBU4169603655?pdp_filters=deal%3AMLB1578289-1",
  "Vaso Sanitário + Caixa Acoplada Hervy Louças Cor Branco Branco":
    "https://www.mercadolivre.com.br/vaso-sanitario--caixa-acoplada-hervy-loucas-cor-branco/up/MLBU5198311684?pdp_filters=deal%3AMLB1578289-1",
  "Panela De Pressão Alegrete 4,05 L Aluminio Polido Alumínio Polido":
    "https://www.mercadolivre.com.br/panela-de-pressao--alegrete-405-l-aluminio-polido/up/MLBU3934170065?pdp_filters=item_id%3AMLB6713104508",
  "Tapete Banheiro Antiderrapante Macio Absorvente 60x40 Cinza":
    "https://www.mercadolivre.com.br/tapete-banheiro-antiderrapante-macio-absorvente-60x40/up/MLBU3975710668?pdp_filters=deal%3AMLB1578289-1",
  "Jogo De Banheiro 3 Peças Peludo Antialérgico Antiderrapante":
    "https://produto.mercadolivre.com.br/MLB-2774607872-jogo-de-banheiro-3-pecas-peludo-antialergico-antiderrapante-_JM",
  "Kit 10 Sacos A Vacuo 50x60 Com Bomba Eletrica Para Roupas":
    "https://www.mercadolivre.com.br/kit-10-sacos-a-vacuo-50x60-com-bomba-eletrica-para-roupas/up/MLBU5068871589?pdp_filters=item_id%3AMLB7582710114",
  "Painel Kelly Boxestofada Cabeceira 1,40 Suspensa Almofadada Cinza":
    "https://www.mercadolivre.com.br/painel-kelly-boxestofada-cabeceira-140-suspensa-almofadada/up/MLBU4554743928?pdp_filters=item_id%3AMLB7310400166",
  "Kit 6 Taças De Vidro Diamond Âmbar 330ml Bico De Jaca Transparente Para Água Vinho Suco Drinks Mesa Posta Cozinha Bar Festa":
    "https://www.mercadolivre.com.br/kit-6-tacas-de-vidro-diamond-mbar-330ml-bico-de-jaca-transparente-para-agua-vinho-suco-drinks-mesa-posta-cozinha-bar-festa/p/MLB77591722?pdp_filters=item_id%3AMLB5095297907",
  "Copo Térmico Caneca Garrafa 1,2L 1200ml Inox Com Alça Tampa Anti-vazamento Canudo Inox Parede Dupla Quente Fria Carro Academia Viagem Sólar":
    "https://www.mercadolivre.com.br/copo-termico-caneca-garrafa-12l-1200ml-inox-com-alca-tampa-anti-vazamento-canudo-inox-parede-dupla-quente-fria-carro-academia-viagem-solar/p/MLB78958752?pdp_filters=deal%3AMLB1578289-1",
  "Base De Guarda Sol Com Suporte Central Preto":
    "https://produto.mercadolivre.com.br/MLB-7109987906-base-de-guarda-sol-com-suporte-central-preto-_JM?pdp_filters=item_id%3AMLB7109987906",
  "Conjunto de 36 peças com garfos facas e colheres de aço inoxidável":
    "https://www.mercadolivre.com.br/conjunto-de-36-pecas-com-garfos-facas-e-colheres-de-aco-inoxidavel/p/MLB40568154?pdp_filters=item_id%3AMLB4902486459",
  "Dosador De Detergente Para Embutir Quadrado Escovado":
    "https://www.mercadolivre.com.br/dosador-de-detergente-para-embutir-quadrado-escovado/p/MLB51129548?pdp_filters=deal%3AMLB1578289-1",
  "Pano Prato Atacado Estampado Colorido Premium Kit 10 Peças":
    "https://www.mercadolivre.com.br/pano-prato-atacado-estampado-colorido-premium-kit-10-pecas/p/MLB24329684?pdp_filters=deal%3AMLB1578289-1",
  "Dispenser Pasta De Dente Com Porta Escova Suporte De Parede":
    "https://www.mercadolivre.com.br/dispenser-pasta-de-dente-com-porta-escova-suporte-de-parede/p/MLB64188929?pdp_filters=deal%3AMLB1578289-1",
  "Kit21 Peças Potes Herméticos C/tampas Premium Alta Qualidade Rosa-chiclete":
    "https://www.mercadolivre.com.br/kit21-pecas-potes-hermeticos-ctampas-premium-alta-qualidade/up/MLBU3922574688?pdp_filters=item_id%3AMLB4626559733",
  "Kit Jarra 1l Com 6 Copos 200ml Vidro Âmbar 7 Peças Bebidas Âmbar":
    "https://www.mercadolivre.com.br/kit-jarra-1l-com-6-copos-200ml-vidro-ambar-7-pecas-bebidas/up/MLBU4699695942?pdp_filters=deal%3AMLB1578289-1",
  "Escova De Silicone Para Vaso Sanitário 2em1 Para Banheiro Sortidos":
    "https://www.mercadolivre.com.br/escova-de-silicone-para-vaso-sanitario-2em1-para-banheiro/up/MLBU5093653703?pdp_filters=item_id%3AMLB7597316620",
  "Kit 10 Pano De Prato Estampado 100% Algodão - 35cm X 60cm":
    "https://www.mercadolivre.com.br/kit-10-pano-de-prato-estampado-100-algodao-35cm-x-60cm/p/MLB23942853?pdp_filters=deal%3AMLB1578289-1",
  "Chaleira De Vidro 750ml Com Infusor Tampa Inox Chá Incolor":
    "https://www.mercadolivre.com.br/chaleira-de-vidro-750ml-com-infusor-tampa-inox-cha-incolor/up/MLBU2975538490?pdp_filters=item_id%3AMLB3957282839",
  "Cesto De Roupa Rattan 50 Litros Com Tampa Basculada Cinza Cinza-escuro Calado":
    "https://www.mercadolivre.com.br/cesto-de-roupa-rattan-50-litros-com-tampa-basculada-cinza/up/MLBU4615085655?pdp_filters=deal%3AMLB1578289-1",
  "Mop Elétrico 9 Em 1 Escova Esfregão Limpeza Giratório 360 Br Branco":
    "https://www.mercadolivre.com.br/mop-eletrico-9-em-1-escova-esfregao-limpeza-giratorio-360-br/up/MLBU5125964497?pdp_filters=deal%3AMLB1578289-1",
  "Varal De Roupa Retratil Dobravel De Parede + 20m De Corda Preto":
    "https://www.mercadolivre.com.br/varal-de-roupa-retratil-dobravel-de-parede--20m-de-corda/up/MLBU3477369909?pdp_filters=deal%3AMLB1578289-1",
  "Capa Protetora Colchão Box Casal Padrão Matelado Impermeável Cor Pink":
    "https://www.mercadolivre.com.br/capa-protetora-colchao-box-casal-padrao-matelado-impermeavel-cor-pink/p/MLB54792480?pdp_filters=deal%3AMLB1578289-1",
  "Papa Bolinha Smart Removedor Pelos Fiapos Roupas Elétrico Sem Fio":
    "https://www.mercadolivre.com.br/papa-bolinha-smart-removedor-pelos-fiapos-roupas-eletrico-sem-fio/p/MLB26454163?pdp_filters=deal%3AMLB1578289-1",
  "Escova De Limpeza Descartável Do Toalete Com Cabeça Da Escov Branco":
    "https://www.mercadolivre.com.br/escova-de-limpeza-descartavel-do-toalete-com-cabeca-da-escov/up/MLBU4223729897?pdp_filters=deal%3AMLB1578289-1",
  "Kit Jogo 12 Pratos Liso Fundo Unidades Restaurante Buffet Transparente Liso":
    "https://www.mercadolivre.com.br/kit-jogo-12-pratos-liso-fundo-unidades-restaurante-buffet/up/MLBU5055639313?pdp_filters=deal%3AMLB1578289-1",
  "Fechamento Fita Portão Divisor Preto 25m X 10cm + Arrebites":
    "https://www.mercadolivre.com.br/fechamento-fita-portao-divisor-preto-25m-x-10cm--arrebites/up/MLBU1481097652?pdp_filters=deal%3AMLB1578289-1",
  "Prensa Francesa Cafeteira Vidro Borossilicato 350 ML Inox Café Chá Filtro Reutilizável Manual Resistente Premium Para Casa Cozinha Sólar":
    "https://www.mercadolivre.com.br/prensa-francesa-cafeteira-vidro-borossilicato-350-ml-inox-cafe-cha-filtro-reutilizavel-manual-resistente-premium-para-casa-cozinha-solar/p/MLB77741356?pdp_filters=deal%3AMLB1578289-1",
  "Enchimento Baguete Refil Almofada Silicone 30x50 Fibra Macia Branco Liso":
    "https://www.mercadolivre.com.br/enchimento-baguete-refil-almofada-silicone-30x50-fibra-macia/up/MLBU3332770518?pdp_filters=item_id%3AMLB5528479780",
  "Tira Pelo Roupa Maquina De Lavar Kit 4 Removedor Pelo Pet Colorido":
    "https://www.mercadolivre.com.br/tira-pelo-roupa-maquina-de-lavar-kit-4-removedor-pelo-pet/up/MLBU3944376628?pdp_filters=item_id%3AMLB6709773660",
  "Forma Assadeira Cupcake Faz Pão De Queijo Empada 12 Cavidade Preto RWS IMPORTS":
    "https://www.mercadolivre.com.br/forma-assadeira-cupcake-faz-pao-de-queijo-empada-12-cavidade-preto-rws-imports/p/MLB78182583?pdp_filters=item_id%3AMLB7501191186",
  "Descascador De Legumes E Frutas Inox 3 Em 1 Cabo 3pcs) Inox":
    "https://www.mercadolivre.com.br/descascador-de-legumes-e-frutas-inox-3-em-1-cabo-3pcs/up/MLBU4981815179?pdp_filters=deal%3AMLB1578289-1",
  "Válvula Reposição Para Dispenser Ração Plast Penser Mec Pet":
    "https://www.mercadolivre.com.br/valvula-reposicao-para-dispenser-racao-plast-penser-mec-pet/up/MLBU4021595717?pdp_filters=deal%3AMLB1578289-1",
  "Kit 12 Forminhas N°10de Bolo Vulcao Formas De Aluminio":
    "https://www.mercadolivre.com.br/kit-12-forminhas-n10de-bolo-vulcao-formas-de-aluminio/p/MLB2101390480?pdp_filters=item_id%3AMLB5049609553",
  "Par De Encurtador Anjo Redutor De Rede De Descanso Dormir":
    "https://www.mercadolivre.com.br/par-de-encurtador-anjo-redutor-de-rede-de-descanso-dormir/up/MLBU3783389462?pdp_filters=deal%3AMLB1578289-1",
  "Assento Sanitário Almofadado Oval Com Tampa De Vaso Banheiro Branco":
    "https://www.mercadolivre.com.br/assento-sanitario-almofadado-oval-com-tampa-de-vaso-banheiro/up/MLBU5107406134?pdp_filters=deal%3AMLB1578289-1",
  "Kit 02 Forma Pão E Bolo Ingles Silicone Assadeira Retangular":
    "https://www.mercadolivre.com.br/kit-02-forma-pao-e-bolo-ingles-silicone-assadeira-retangular/up/MLBU3453184066?pdp_filters=item_id%3AMLB4225925005",
  "Mini Localizador Rastreador GPS Bluetooth para Android IOS Smart Tag Rastreador Antiperda Chaveiro Localizador Objetos rastreador para Chaves Mochila Mala Pet CarroCamera Remota Tire Fotos FORESTORY":
    "https://www.mercadolivre.com.br/mini-localizador-rastreador-gps-bluetooth-para-android-ios-smart-tag-rastreador-antiperda-chaveiro-localizador-objetos-rastreador-para-chaves-mochila-mala-pet-carrocamera-remota-tire-fotos-forestory/p/MLB78863295?pdp_filters=deal%3AMLB1578289-1",
  "Bolsa Porta Vinho Couro Wine Bag Brinde Presente Transportar":
    "https://produto.mercadolivre.com.br/MLB-4111157741-bolsa-porta-vinho-couro-wine-bag-brinde-presente-transportar-_JM?pdp_filters=item_id%3AMLB4111157741",
  "Cabeceira Adesiva De Cama Nuvem Infantil 45x20cm Kit C/7un":
    "https://produto.mercadolivre.com.br/MLB-6487303564-cabeceira-adesiva-de-cama-nuvem-infantil-45x20cm-kit-c7un-_JM",
  "Luzes De Tira Led De 5,5 M, Luzes De Tabela De Basquete Led, Impermeável Com 8 Modos Multicor Para Jogar À Noite Ao Ar Livre, Quarto, Sala Interna":
    "https://www.mercadolivre.com.br/luzes-de-tira-led-de-55-m-luzes-de-tabela-de-basquete-led-impermeavel-com-8-modos-multicor-para-jogar-noite-ao-ar-livre-quarto-sala-interna/p/MLB68197057?pdp_filters=item_id%3AMLB4619531491",
  "Projetor Holográfico 5d Luz Noturna Inteligente .. Unknown":
    "https://www.mercadolivre.com.br/projetor-holografico-5d-luz-noturna-inteligente-unknown/p/MLB2099182752?pdp_filters=deal%3AMLB1578289-1",
  "Kit Com 10 Panos De Prato De Algodão Estampado Grande Para Cozinha E Limpeza":
    "https://www.mercadolivre.com.br/kit-com-10-panos-de-prato-de-algodao-estampado-grande-para-cozinha-e-limpeza/p/MLB68825184?pdp_filters=deal%3AMLB1578289-1",
  "Vassoura Magica 2 Em 1: Escova E Rodo Para Esfregar O Chao":
    "https://www.mercadolivre.com.br/vassoura-magica-2-em-1-escova-e-rodo-para-esfregar-o-chao/p/MLB39391160?pdp_filters=item_id%3AMLB6594148750",
  "Tapete Felpudo Texfine Sala 1,00x1,50 Antiderrapante Bege Mesclado":
    "https://www.mercadolivre.com.br/tapete-felpudo-texfine-sala-100x150-antiderrapante-bege-mesclado/p/MLB52132963?pdp_filters=deal%3AMLB1578289-1",
  "Porta Guardanapos Bambu Guardanapeira Organizador Suporte Guardanapo Papel Mesa Posta Cozinha Jantar Churrasco Mesa Posta Café da Manhã Decoração Anti Vento Natural Sustentável 18cm Presente":
    "https://www.mercadolivre.com.br/porta-guardanapos-bambu-guardanapeira-organizador-suporte-guardanapo-papel-mesa-posta-cozinha-jantar-churrasco-mesa-posta-cafe-da-manha-decoracao-anti-vento-natural-sustentavel-18cm-presente/p/MLB79093253?pdp_filters=item_id%3AMLB5209302975",
  "Projetor Natalino Imagens 3d Refletor Holográfico Natal 110/220v 1 Preto Branco-neutro":
    "https://www.mercadolivre.com.br/projetor-natalino-imagens-3d-refletor-holografico-natal/up/MLBU5190455240?pdp_filters=deal%3AMLB1578289-1",
  "Espelho De Banheiro Para Barbear/depilar Com Suporte Acrilic Espelhado Prata":
    "https://www.mercadolivre.com.br/espelho-de-banheiro-para-barbeardepilar-com-suporte-acrilic/up/MLBU3719309243?pdp_filters=deal%3AMLB1578289-1",
  "Tigela De Cerâmica Redonda Para Refeições E Saladas":
    "https://www.mercadolivre.com.br/para-tigela-de-ceramica-redonda-para-refeicoes-e-saladas-3331477764681/p/MLB2089289731?pdp_filters=deal%3AMLB1578289-1",
  "Kit Escova Sanitária 24 Refis, Suporte Parede Banheiro Azul":
    "https://www.mercadolivre.com.br/kit-escova-sanitaria-24-refis-suporte-parede-banheiro/up/MLBU4477269112?pdp_filters=deal%3AMLB1578289-1",
  "Jogo De 6 Tigelas De Vidro Transparente Para Sobremesa 250ml Transparente":
    "https://www.mercadolivre.com.br/jogo-de-6-tigelas-de-vidro-transparente-para-sobremesa-250ml/up/MLBU4881026680?pdp_filters=deal%3AMLB1578289-1",
  "Jogo 5 Tigelas Inox Bowls Potes Tampa Plástica Cozinha Inox":
    "https://www.mercadolivre.com.br/jogo-5-tigelas-inox--bowls-potes-tampa-plastica-cozinha/up/MLBU4328263414?pdp_filters=deal%3AMLB1578289-1",
  "2 Peças Descascador Aço Inoxidável Multifuncional Madeira":
    "https://www.mercadolivre.com.br/2-pecas-descascador-aco-inoxidavel-multifuncional/up/MLBU5013956286?pdp_filters=deal%3AMLB1578289-1",
  "Fervedor Tramontina Em Alumínio Antiaderente Vermelho":
    "https://www.mercadolivre.com.br/fervedor-tramontina-em-aluminio-antiaderente/up/MLBU3418529281?pdp_filters=deal%3AMLB1578289-1",
  "10x Caixa Prática Para Bolo / Torta / Confeitaria - 30x30x12 Branco":
    "https://www.mercadolivre.com.br/10x-caixa-pratica-para-bolo--torta--confeitaria--30x30x12/up/MLBU3170863218?pdp_filters=deal%3AMLB1578289-1",
  "Travessa Retangular Refratária 2l Porcelana Branco Cozinha Branco":
    "https://www.mercadolivre.com.br/travessa-retangular-refrataria-2l-porcelana-branco-cozinha/up/MLBU2648818219?pdp_filters=deal%3AMLB1578289-1",
  "Taça Para Sobremesa Paris Redonda Acrílico Com Pé 1,100 L Transparente":
    "https://www.mercadolivre.com.br/taca-para-sobremesa-paris-redonda-acrilico-com-pe-1100-l/up/MLBU3819524513?pdp_filters=item_id%3AMLB4506508647",
  "40 Cofrinhos Papelão 6x9,5cm - Cor Vermelho Ninavi Liso":
    "https://www.mercadolivre.com.br/40-cofrinhos-papelao-6x95cm-cor-vermelho-ninavi-liso/p/MLB46754127?pdp_filters=deal%3AMLB1578289-1",
  "Organizador De Ovos 30 Ovos Rolante Geladeira Branco":
    "https://www.mercadolivre.com.br/organizador-de-ovos-30-ovos-rolante-geladeira-branco/up/MLBU4035618666?pdp_filters=item_id%3AMLB6863303148",
  "Tapete 1,50 X 1,00 Pelos Altos Felpo Felpudo Pra Sala Quarto Cor Tabaco Mesclado":
    "https://www.mercadolivre.com.br/tapete-150-x-100-pelos-altos-felpo-felpudo-pra-sala-quarto-cor-tabaco-mesclado/p/MLB47119336?pdp_filters=deal%3AMLB1578289-1",
  "Kit 4 Vassoura Condor Multiuso Sem Cabo Prática E Resistente":
    "https://www.mercadolivre.com.br/kit-4-vassoura-condor-multiuso-sem-cabo-pratica-e-resistente/up/MLBU3756551846?pdp_filters=deal%3AMLB1578289-1",
  "80 Pano Umedecido Desengordura New Citrus 3 Em 1 Flash Limp":
    "https://www.mercadolivre.com.br/80-pano-umedecido-desengordura-new-citrus-3-em-1-flash-limp/p/MLB2085170737?pdp_filters=deal%3AMLB1578289-1",
  "Organizador Bone Suporte Chapeu Gancho Parede Porta Armario Preto":
    "https://www.mercadolivre.com.br/organizador-bone-suporte-chapeu-gancho-parede-porta-armario/up/MLBU4136118228?pdp_filters=deal%3AMLB1578289-1",
  "Cortador Em Aço Inox Para Frutas Legumes Banana Salsicha Amarelo":
    "https://www.mercadolivre.com.br/cortador-em-aco-inox-para-frutas-legumes-banana-salsicha-amarelo/p/MLB78831903?pdp_filters=deal%3AMLB1578289-1",
  "Kit 10 Panos De Prato Liso Nova Era Resistente 100% Algodão Branco Liso Artesanato":
    "https://www.mercadolivre.com.br/kit-10-panos-de-prato-liso-nova-era-resistente-100-algodao/up/MLBU4721852474?pdp_filters=deal%3AMLB1578289-1",
  "Organizador De Ovos Para Geladeira Porta Ovos Duplo 32 Ovos Branco":
    "https://www.mercadolivre.com.br/organizador-de-ovos-para-geladeira-porta-ovos-duplo-32-ovos/up/MLBU5120580155?pdp_filters=deal%3AMLB1578289-1",
  "Dispenser Detergente Pia Cozinha Balcão Trium 600 Ml Cor Vermelho":
    "https://www.mercadolivre.com.br/dispenser-detergente-pia-cozinha-balcao-trium-600-ml-cor-vermelho/p/MLB26262523?pdp_filters=deal%3AMLB1578289-1",
  "Kit Porta Cotonetes E Algodão Para Viagem - Bolsa - Bebê":
    "https://produto.mercadolivre.com.br/MLB-7203270388-kit-porta-cotonetes-e-algodo-para-viagem-bolsa-beb-_JM",
  "Resistencia Chuveiro Tipo Lorenz 127v 5500w 4 Temp Acabamento 127v Cor Creme":
    "https://www.mercadolivre.com.br/resistencia-chuveiro-tipo-lorenz-127v-5500w-4-temp-acabamento-127v-cor-creme/p/MLB51006039?pdp_filters=deal%3AMLB1578289-1",
  "Kit Preparo Para Chimarrão 4 Peças | Estampas Variadas":
    "https://produto.mercadolivre.com.br/MLB-4630779743-kit-preparo-para-chimarro-4-pecas-estampas-variadas-_JM",
  "Balança Digital Tomate Para Cozinha 15kg Azul com Display Iluminado":
    "https://www.mercadolivre.com.br/balanca-digital-tomate-para-cozinha-15kg-azul-com-display-iluminado/p/MLB70083356?pdp_filters=deal%3AMLB1578289-1",
  "Descascador De Legumes Batatas E Frutas Lâmina Em Inox Cortador Multifuncional Giratório Riel":
    "https://www.mercadolivre.com.br/descascador-de-legumes-batatas-e-frutas-lamina-em-inox-cortador-multifuncional-giratorio-riel/p/MLB76519929?pdp_filters=deal%3AMLB1578289-1",
  "Kit 3 Potes De Vidro Nadir 600ml C/ Tampa Tigelas Microondas Água":
    "https://www.mercadolivre.com.br/kit-3-potes-de-vidro-nadir-600ml-c-tampa-tigelas-microondas/up/MLBU4998641043?pdp_filters=deal%3AMLB1578289-1",
  "Rodinho De Pia Sem Cabo Limpeza Bancada Cozinha Compacto":
    "https://www.mercadolivre.com.br/rodinho-de-pia-sem-cabo-limpeza-bancada-cozinha-compacto/p/MLB2091035192?pdp_filters=deal%3AMLB1578289-1",
};
