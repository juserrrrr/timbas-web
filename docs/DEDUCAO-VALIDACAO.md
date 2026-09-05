# Validação de Dedução, 4 e 5/09/2026

## Cadência, parada e sabotagem manual, 05/09/2026

O relato posterior ao commit `9a6c8f7` inclui engasgos também em PC potente. A revisão separa custo gráfico, cadência de apresentação e correção de rede: a média de FPS isolada não prova fluidez.

- Removido o limitador manual de 60 FPS; o Canvas acompanha o RAF nativo. Isso permite aproveitar a atualização de telas mais rápidas sem o padrão artificial de quadros descartados. Não foi medida uma tela física de 120/144 Hz.
- A câmera não trata ecos antigos como posição final quando o jogador solta a tecla. Pacotes recebem `sequence`, confirmada pela API em `moveSequence`; o histórico local é limitado a 128 entradas. Rejeições reais, colisões e teleporte continuam corrigidos. Testes com atrasos de 50/150/300 ms em 30/60/120 FPS não apresentaram recuo na parada; posição final, sequência crescente e teleporte autoritativo foram conferidos.
- A animação continua a fase da passada enquanto desacelera, com envelope criticamente amortecido. Quatro testes novos com 48 fases de parada e 2.400 alternâncias verificam continuidade, idle e mesma pose em 30/60/120 FPS. Os oito grupos de atores também passaram; sentar converge sem sobrescrever a postura das pernas a cada quadro.
- O servidor tinha apagão automático a cada 150 s além do poder do assassino. Esse agendamento e a opção `blackoutEverySeconds` foram removidos. Somente a ação explícita de um assassino vivo/conectado em partida inicia o apagão. Recarga inicial e entre ativações: 40 s; duração padrão: 25 s. Tentativas durante apagão ou recarga não consomem outra carga. Tempo de recarga é privado, sincronizado com relógio monotônico e compartilhado pela regra do botão/F.
- Otimizações adicionais: céu após a geometria opaca para aproveitar rejeição por profundidade, matrizes locais estáticas, atualização de alvos em 10 Hz, heartbeat parado em até 4 Hz e SVG da planta atualizado somente quando muda. Sobrecarga gráfica forte reduz o DPR mais rapidamente, preservando os valores de iluminação e mantendo resolução máxima quando há folga.

API: 59 suítes e 595 testes passaram, assim como TypeScript e build. Incluem 29 testes novos da sala real para ausência de apagão automático mesmo após um dia, autorização, recarga, duas tentativas simultâneas, reunião/fim, reconexão e sequência de movimento. Frontend: controles 19/19, sabotagem 6/6, atores 8/8, animação 4/4, cena 9/9, planta 17/17 e todos os 12 scripts `check-deducao-*.mjs` passaram. TypeScript dedicado à entrada da Dedução e suas dependências passou. O TypeScript global mantém os mesmos 14 erros preexistentes fora do jogo.

No primeiro trecho da sessão de navegador, o RAF foi entregue a 30 Hz mesmo com o Canvas completamente desmontado, página visível e focada. O contador independente de DOM manteve p95 de 33,4 ms sem a cena. Mais tarde o próprio navegador passou a entregar RAF a 180 Hz, sem alteração de configurações por nós. As amostras de 30 Hz e 180 Hz são separadas e não representam ganho causado pelo jogo. Não foram controlados Edge/Opera nem medidos os computadores das pessoas que relataram travamentos.

No A/B do céu em alta, com o mesmo enquadramento e DPR fixo 1 (1279 × 912), GPU p95 foi 15,34 ms antes e 15,30 ms depois, sem ganho mensurável relevante nesta amostra. A ordem posterior conserva o depth test e foi inspecionada visualmente. No corredor em alta, caminhada/parada com eco local de 300 ms e ativação da sabotagem registraram p95 de CPU do quadro de 2,5 ms, sem quadro acima de 80 ms, long task ou programa gráfico novo. A câmera parou na mesma posição confirmada pelo transporte. O botão real ficou desabilitado com contagem regressiva após ativar, voltou a disponível depois da recarga e permaneceu bloqueado ao trocar para funcionário. Esses controles usam transporte de QA local, não um servidor multiplayer no navegador.

Foi reproduzida uma pausa específica do Leve ao visitar o terraço pela primeira vez: long task de 361 ms, intervalo máximo de 371,4 ms e quatro programas gráficos novos. A prop booleana `shadows={false}` fazia o R3F reconfigurar o tipo para PCFSoft após o aquecimento feito com PCF. Mesmo com sombras desligadas, o tipo participa da chave de compilação do Three. O Leve agora usa um objeto estável `{ enabled: false, type: PCFShadowMap }`. Um teste executa a configuração real do R3F instalado em oito trocas de qualidade e compara as chaves reais de `WebGLPrograms`.

Após a correção, a mesma sequência em sessão limpa (Leve, primeira visita ao terraço, DPR 1, 1279 × 912) manteve 30 programas, zero compilações novas, zero long tasks e intervalo máximo de 11,4 ms em 2.296 quadros. Média local de 179,3 FPS, GPU p95 de 4,23 ms. Isso confirma a remoção da pausa reproduzida, não garante essa taxa em outros dispositivos.

As alterações exigem publicar frontend e API juntos para a confirmação de movimento e o status privado de recarga. Os testes de rede usam atraso simulado e os handlers reais em verificações separadas, não substituem uma partida multiplayer no PC do usuário.

A conferência final encontrou um bloqueio adicional no botão: o React Compiler memorizava `canSabotage` sem perceber a passagem do tempo. O contador chegava a zero, mas o botão permanecia desabilitado. O relógio monotônico agora é estado explícito e o quinto argumento da autorização visual. O teste com o compilador real reproduz a falha retirando esse argumento e confirma liberação exatamente em 40.000 ms, sem nova prop. No navegador, o ciclo completo passou de recarga para disponível e aceitou uma segunda ativação, sem recarregar a página. Console final sem erros de execução, com aviso preexistente de descontinuação de `THREE.Clock`.

O build final do frontend passou após remover a página, o servidor e o cache temporários de QA. A rota de revisão não aparece na saída de produção; `next-env.d.ts` voltou a apontar para os tipos de `dist`. Os testes permanentes, o `.blend` editável e os dois GLBs revisados permanecem no projeto. Nenhuma alteração desta revisão foi publicada automaticamente.

### Personagem e validação final de apresentação

O personagem recebeu torso contínuo, visor panorâmico integrado ao capacete, uniforme fosco, luvas e botas grafite e identificação discreta. A cor de jogador muda somente o traje; o visor e os acessórios permanecem neutros. As etiquetas ficaram 25% menores em altura. O modelo vivo mantém 12 chamadas de desenho e passa de seis para quatro materiais; usa 1.880 triângulos, contra 1.640 antes. O aumento de 240 triângulos foi destinado à silhueta, não é uma redução de geometria.

Com Draco, o GLB vivo passou de 88.732 para 23.780 bytes (menos 73,2%) e o corpo de 67.924 para 20.656 bytes (menos 69,6%). Isso mede download, não ganho de FPS. O cadáver mantém cinco chamadas e 2.112 triângulos. O `.blend` editável é preservado antes da união destrutiva para exportação. A auditoria `check-crew-character-blender.py` conferiu pivôs, limites, materiais, malha fechada do capacete/visor, orçamento e reimportação. Botas e luvas do corpo ficaram a aproximadamente 3 mm do piso, dentro do limite de -1 a +8 mm, sem penetração.

Agachar/levantar usa compressão suave das pernas a partir dos quadris, sem afundar as botas inteiras. O teste decodifica o GLB real e mede as solas: menos de 0,2 mm de diferença do piso nas transições paradas em 30/60/120 FPS. Sentar restaura a escala das pernas. Limitação do rig simples: durante a passada, a ponta da bota ainda pode penetrar aproximadamente 2,04 cm andando em pé e 4,32 cm agachado; não há IK ou ajuste individual ao terreno nesta revisão.

Renders frontal, traseiro e conjunto foram gerados e inspecionados. Na cena real foram conferidos o personagem novo em alto/médio/leve, movimento/parada e postura agachada. Em sessão limpa no corredor, alta, 1.279 × 912, DPR 1, a janela de 4.223 quadros registrou 175,3 FPS, intervalo p95 de 6,9 ms, máximo de 16,4 ms, CPU do quadro p95 de 2,6 ms e GPU p95 de 5,49 ms, sem long tasks ou compilações novas. São medidas locais da fixture de QA, sem outros computadores ou partida multiplayer real.

## Luzes lineares e desempenho, 05/09/2026

Esta revisão substitui o sistema de pontos descrito no histórico abaixo. As 57 fontes fixas agora usam uma grade espacial: 56 segmentos luminosos e o ponto do botão de emergência. As barras verticais iluminam ao longo de 2,18 m; as duas barras do pergolado acompanham aproximadamente 7,19 m. A fonte admite RGB, inclusive verde, sem trocar as cores azuis/amarelas dos modelos existentes. O cálculo é uma aproximação de luz linear com resposta PBR, não uma simulação fotométrica exata nem sombra de área.

A grade tem 9.600 células de 2 m, máximo de 17 fontes por lista/célula e média de 3,70 nas células ocupadas pelas luzes normais. Esse último número não é uma média ponderada pelos pixels visíveis. As três texturas ocupam 278.528 bytes de dados. Células são calculadas pelo alcance da fonte no mundo, nunca pelo andar ou câmera do observador. A seleção normal/emergência muda apenas um uniforme.

O alto usa duas amostras MSAA e bloom em meia largura/altura. A resolução adaptativa observa janelas de tempo para perseguir 60 FPS com histerese, preservando a iluminação entre qualidades. Também foram removidos filtros de desfoque do HUD e adicionados caches da rota da escada, colisores e apoio. A preparação inicial passou a enviar buffers fora da câmera em um alvo de 1 pixel, restaurando culling e destino mesmo em caso de erro.

### Medição local antes/depois

Cena real, planta e GLB reais, transporte local, navegador integrado desktop e renderização de 1.279 × 912 pixels, DPR 1 nos dois sistemas. Tempo de GPU obtido com `EXT_disjoint_timer_query_webgl2`, consultado somente após disponibilidade, sem `gl.finish`. Cada p95 estável abaixo usa 360 amostras válidas, com zero eventos disjoint. Os intervalos de carregamento e troca de qualidade não fazem parte dessas janelas.

| Enquadramento | GPU p95 anterior | GPU p95 atual | Redução local | FPS atual |
| --- | ---: | ---: | ---: | ---: |
| LED azul, alto | 11,79 ms | 7,34 ms | 37,7% | 60 |
| Terraço, alto | 8,68 ms | 6,73 ms | 22,5% | 60 |
| LED azul, leve | 9,55 ms | 5,47 ms | 42,7% | 60 |
| LED azul, médio | não comparável | 7,31 ms | não calculada | 60 |

A amostra anterior do médio foi descartada porque apresentou geometria incorreta durante a troca de qualidade. O médio atual foi inspecionado visualmente. As três qualidades mantêm claridade e cor semelhantes, com diferenças de suavização, sombras e bloom. Foram conferidos o banho contínuo azul na parede e as barras da cobertura. No apagão em leve, o corredor manteve 60 FPS, GPU p95 de 4,77 ms, sem quadro acima de 80 ms nem novas compilações após a troca.

A pausa isolada de aproximadamente 0,6 s na primeira caminhada foi rastreada ao primeiro `AudioContext`: a chamada isolada de preparação levou 526,2 ms. Preparando o áudio antes do movimento, a primeira subida registrou 60 FPS, intervalo máximo de 18,4 ms, CPU de render máxima de 2,7 ms e nenhum long task. Não houve aumento dos 22 programas gráficos. Essa medição diferencia a inicialização de áudio do custo contínuo da iluminação.

`prepareGameAudio()` agora faz essa inicialização silenciosa antes de `sceneReady`. Uma sessão nova, sem usar o botão de diagnóstico de áudio, confirmou a primeira subida em 60 FPS, sem quadros acima de 80 ms ou long tasks. Os 22 programas e as 86 geometrias permaneceram estáveis. Sete verificações novas de áudio passaram, incluindo contexto único, ausência de som/resume no preparo, retomada por gesto, SSR e falhas seguras. Console da sessão final sem erros; permanece o aviso preexistente de descontinuação de `THREE.Clock`.

Os testes permanentes novos cobrem a cobertura espacial completa das fontes, eixos X/Y/Z, RGB verde em espaço linear, separação normal/emergência, descarte das texturas, rejeição de densidade acima da capacidade, adaptação em 60/50/30 FPS e recuperação sem oscilação. Foram comparadas 10.243 amostras de movimento com as fórmulas anteriores, sem mudança de colisão, apoio ou escada. O teste de warmup inclui erro no render com/sem pós-processamento, culling/visibilidade originais e descarte único do alvo. A auditoria Blender de emergência foi repetida: dez luminárias, 60 amostras e seis LEDs aprovados, sem alterar modelos.

Controles (16), cena (6), atores (5), planta (17), modelos (34) e ciclo de iluminação (240 alternâncias) também foram repetidos e passaram. A checagem TypeScript dedicada à cena e o build de produção do frontend passaram. A descida em alta com apagão ativo manteve 60 FPS na janela final, sem long tasks ou novos programas. Página, servidor e cache temporários foram removidos antes do build; os validadores permanentes foram preservados.

Os resultados são locais, não uma garantia de 60 FPS em qualquer tablet. A partida multiplayer e o dispositivo físico do usuário não foram medidos. Carregamento inicial e troca manual de qualidade ainda têm custo de preparação. A API e os assets não foram alterados nesta revisão; os testes e builds da API relatados abaixo pertencem à revisão anterior.

## Histórico de arquitetura e interiores, 04/09/2026

As correções estão no código, na planta exportada e no modelo Blender/GLB. A verificação cobriu os pedidos acumulados de arquitetura, iluminação, ambiente noturno, controles, remoção da garagem e renovação dos interiores, incluindo cozinha, banheiro e a compactação adicional do escritório.

A escala horizontal passou de 0,84 para 0,74, mantendo 77,61% da área anterior, uma redução de 22,39%. As alturas e dimensões dos móveis foram preservadas. A planta mantém 21 ambientes, 15 tarefas, cinco dutos e 12 lugares na reunião. O total de objetos caiu de 177 para 133 e o de cadeiras de 53 para 38, sendo 32 de escritório e seis de jantar. Foram removidos grupos de café redundantes, visitantes soltos, quatro estações, um arcade duplicado e uma caixa extra. Cada estação agora tem um único monitor central, sem telas sobrepostas.

| Pedido | Correção e evidência |
| --- | --- |
| Escada, teto e corrimãos | 18 degraus, patamar de 2,42 m a 2,10 m de altura, 26 postes únicos apoiados. Retiradas faixas de tapete que invadiam o vão. Raycasts, render Blender e movimento de câmera nos dois sentidos passaram. |
| Molduras e peças flutuantes | 19 portais verificados. Molduras contínuas; luminárias ligadas fisicamente do teto ao corpo; LEDs de parede e pergolado apoiados. |
| Duas lâmpadas iluminando | 38 luminárias internas e duas fontes do pergolado após compactar os ambientes. Cada luminária mantém sua própria fonte. O corredor de serviço tem iluminação normal e de emergência. |
| Qualidades equilibradas | Mesmo perfil de energia/exposição em leve, médio e alto. O alto acrescenta resolução, antialiasing e brilho localizado. Normal, apagão e visão noturna exercitados. |
| Terraço, paisagem e janelas | 49 janelas livres após compactar as paredes, pergolado alinhado, edifício e elementos externos apoiados. Céu noturno azul-escuro com horizonte quente localizado. Peitoril do banheiro a 2,50 m, acima do espelho e das cabines. |
| Garagem removida | Sala de apoio ocupa a antiga área, sem carros, cones, vagas ou tarefa de recarga. Porta e duto preservam a circulação. Planta e geometria confirmam a ausência da garagem. |
| Teclado e toque | Movimento, atalhos, foco, modais e limpeza dos controles testados. Corrigida a sobreposição entre joystick e olhar na metade direita. Lanterna acompanha agachamento e salto. |
| Planta legível | Cada andar mostra apenas suas salas, portas e marcadores. Escada indica subir/descer. Nomes não se sobrepõem entre andares; painel permite rolagem em telas baixas. |
| Teto e paredes menos vazios | Base clara quente, 144 segmentos de moldura de gesso e painéis baixos em sálvia, terracota ou azul-escuro, com frisos de carvalho. Gesso ancorado na laje, recortado para escada e luminárias. Painéis ficam abaixo das janelas e respeitam os vãos reais das portas. |
| Decoração variada | 17 composições, com 19 quadros em seis estilos, incluindo nove novas galerias nos corredores. Ripados de madeira e duas TVs 16:9 fixas com painéis próprios no lounge e mezanino. Telas não clareiam o apagão. |
| Sofás orientados para o uso | Redução de 16 para nove sofás em grupos de conversa, recepção, TV e contemplação do terraço. Mesas, cadeiras e cores acompanham cada grupo; tarefas, dutos e circulação preservados. |
| Cozinha organizada | Cafeteira independente de piso, com 1,95 m de altura, fora da bancada. Uma mesa de jantar de 2,80 × 1,20 m com seis cadeiras próprias, sem rodízios, substitui mesas pequenas e cadeiras de escritório. Distâncias entre mesa e assentos preservadas na compactação. Tarefa do café reposicionada à frente da máquina. |
| Armários, bancada e espelho | Reposicionados junto à parede real. 54 raios independentes confirmam o contato dos seis componentes, sem folga flutuante e sem a janela atravessar o espelho. |
| Banheiro e depósito separados | Duas cabines com painéis e portas opacas fechadas, batentes, dobradiças e colisão. Eliminada a passagem atrás das cabines. O depósito passa a ter acesso pelo corredor de serviço, sem atravessar o banheiro. |

## Continuidade entre pavimentos e apagão

A revisão após o push `94c2a4b`/`b994c29` remove o aviso de andar e a ativação de luzes baseada no pavimento do observador. Os dois pisos mantêm 46 fontes normais/decorativas acesas, incluindo seis novas fontes azuis/amarelas diante das fitas dos átrios. Durante o apagão global, 11 fontes de emergência as substituem visualmente, mas todas as 57 fontes pontuais e a lanterna permanecem montadas, sem alterar a quantidade de luzes compiladas pelo shader.

Prédio, personagens, cadáveres e luminárias preservam clones, geometrias e materiais ao alternar o apagão. A emissão, cor e intensidade mudam nos objetos existentes. Cadáveres não são ocultados pelo andar; nomes usam sprites 3D com oclusão real pelas paredes e lajes, sem elementos HTML por jogador nem raycasts por etiqueta. Colisão, tarefas, dutos e regras de fantasmas continuam respeitando a planta.

A preparação inicial antecipa compilação e texturas dos dois pisos. Foi substituído `PCFSoftShadowMap`, que a versão instalada do Three converte para `PCFShadowMap` durante o primeiro render, para evitar preparar uma variante diferente da usada na partida. A preparação não depende do andar ou apagão, restaura o destino de renderização e não envia texturas após cancelamento.

As dez luminárias de emergência estavam no interior da sanca, a 0,70 m da parede. Foram reposicionadas a 1,30 m, mantendo apoio no teto e ponto de luz sob o difusor. A auditoria independente do Blender passou em 60 amostras de corpo/difusor, conferiu as seis fontes coloridas a 0,08 m dos respectivos difusores e reproduziu o defeito ao devolver as dez emergências à posição antiga. Não foi necessário reconstruir os modelos.

## Testes executados

- API: 58 suítes e 565 testes passaram. Incluem área compacta, retirada dos objetos extras, orientação de todas as cadeiras, estações completas, 12 lugares de reunião, circulação do mobiliário, seis assentos da cozinha, cafeteira de piso, montagem dos armários, privacidade das cabines e acesso independente ao depósito. O handler real de movimento atravessou a escada nos dois sentidos sem mensagem ou teleporte, preservando limites de velocidade e validação de entrada. A planta JSON exportada foi comparada com a serialização de `OFFICE_MAP`.
- Controles: 16 verificações passaram em `scripts/check-deducao-controls.mjs`.
- Cena integrada: 6 grupos passaram em `scripts/check-deducao-scene.mjs`, incluindo subida/descida, câmera, lanterna e bloqueio de interação no patamar.
- Personagens: cinco grupos passaram em `scripts/check-deducao-actors.mjs`, incluindo corpos nos dois pisos, nomes com depth test, subida contínua e alternâncias do apagão sem novos clones ou materiais.
- Ciclo de iluminação: 240 alternâncias passaram em `scripts/check-deducao-lighting.mjs`, mantendo geometrias, materiais e matrizes das luminárias. As fontes permanecem nas mesmas coordenadas e em quantidade constante nos dois estados.
- Preparação da cena: texturas compartilhadas são enviadas uma única vez, sem revelar etiquetas ocultas. Cancelamento e erro síncrono restauram o destino anterior e descartam o temporário. A checagem TypeScript dedicada à cena também passou.
- Planta: 17 verificações passaram em `scripts/check-deducao-minimap.mjs`.
- Iluminação: `scripts/check-deducao-lighting.mjs` passou nos três níveis de qualidade, dois andares e estados normal/apagão/visão noturna.
- Modelos: 34 arquivos passaram em `scripts/check-deducao-models.mjs`, incluindo os novos modelos próprios de mesa e cadeira de jantar.
- Auditoria arquitetônica independente: `scripts/check-office-architecture-blender.py` passou no GLB compacto exportado às 22:22:46. O arquivo tem 2.899.060 bytes, 66 materiais e 66 draw calls, abaixo do orçamento de 72. A reimportação encontrou os mesmos 491.366 triângulos do `.blend`, 49 vidros e diferença máxima de extensão de 0,015 mm pela compressão. Hashes de entrada não mudaram durante a auditoria. Comparado à revisão anterior, são 14,06% menos triângulos e 12,85% menos bytes; isso não é uma medição de ganho de FPS.
- Auditoria adicional dos interiores: 144 segmentos de gesso ancorados e sem interseção com luminárias, 19 quadros e duas TVs montados. Foram conferidos 1.176 raios pelas janelas, 171 nas aproximações das portas, 57 de altura livre na escada e 55 nos corredores. A cozinha passou nos testes de apoio no piso, orientação dos seis assentos e ausência de interseções indevidas. O banheiro passou em 344 raios de privacidade, 160 raios na parede que substituiu a antiga porta do depósito e 54 raios de montagem dos armários e espelho.
- Assentos: `scripts/check-office-seating-blender.py` passou nas 32 cadeiras de escritório do `.blend` compacto, medindo a direção pela malha real do encosto, não apenas pela rotação declarada. Cada uma atende a uma mesa do mesmo cômodo. Antes da correção, o teste reproduziu 28 orientações invertidas; controles positivos e negativos foram exercitados sem salvar os modelos.
- Builds de produção da API e do frontend passaram.
- Navegador: Match/HUD/OfficeScene reais com transporte local, troca de qualidade, apagão, visão noturna, movimento por teclado, salto, M/Escape, planta, mezanino, terraço e sala de apoio. Nenhum erro de execução foi registrado. Houve avisos de APIs obsoletas do Three.js.
- Após a renovação, o GLB foi recarregado na `OfficeScene` real: comparação do mesmo átrio em leve/médio/alto, TVs do lounge e mezanino, recepção, corredores, abertura da escada e apagão do lounge. Nenhum erro de execução foi registrado. Os renders Blender do mezanino, lounge e escada também foram inspecionados, sem substituir a revisão no jogo.
- Após reorganizar cozinha e banheiro, a exportação final foi novamente recarregada na `OfficeScene` real. Conferidos cozinha, cafeteira, mesa com seis cadeiras, portas fechadas das cabines, pia/espelho e novo acesso ao depósito. O mesmo corredor foi comparado em leve/médio/alto, mantendo a luminosidade geral, e o acesso de serviço foi conferido com luz normal e apagão. Console final sem erros de execução. Renders Blender da cozinha, cafeteira e banheiro também foram inspecionados.
- Após a compactação adicional, o GLB final foi recarregado na `OfficeScene` real. Conferidos estações com um monitor cada, conselho com seis cadeiras, reunião com 12 lugares, cozinha, banheiro, sala do chefe, mezanino, terraço e escada por cima e por baixo. O mesmo mezanino foi comparado em leve/médio/alto e o corredor em apagão. Console final sem erros de execução. O render Blender final da escada também foi inspecionado e comparado com a cena no navegador.
- Após as correções de continuidade, a cena real foi instrumentada temporariamente no navegador local. A primeira subida, a descida e o apagão em alta mantiveram 22 programas gráficos, 20 texturas, 89 materiais, 107 malhas monitoradas e 57 fontes pontuais; houve envio inicial de geometrias antes não vistas, mas nenhuma recriação de materiais/malhas. As 24 fontes normais do térreo e 22 superiores permaneceram acesas durante a travessia. Foi visto um jogador do térreo pelo vão da escada a partir do piso superior. Emergências físicas e luzes azuis/amarelas foram inspecionadas; as três qualidades mantiveram a claridade geral. No apagão em leve, a quantidade de programas permaneceu em 45 após as trocas de qualidade, com zero mudanças de identidade e console sem erros.
- Nas janelas locais amostradas após o carregamento, o p95 do tempo de CPU dentro de `renderer.render` ficou em 4,3 ms na subida em alta e 1,4 ms no apagão em leve. Isso não mede tempo total de quadro, GPU ou FPS. A primeira preparação/carregamento e a troca de qualidade ainda podem custar mais; esses números não são uma promessa de desempenho no tablet.

## Limites e pendências de validação

O navegador de revisão não usou servidor multiplayer, banco, WebSocket ou microfone. A mudança de andar foi exercitada nos testes de movimento e na câmera real com transporte local, não em uma partida Colyseus real. A revisão de 05/09 acrescenta FPS e tempo de GPU locais, mas não mede memória total, gestos em tablet físico nem leitor de tela real. Os testes geométricos são amostrados e não representam prova de ausência absoluta de defeitos.

As portas das cabines são cenográficas e permanecem fechadas, com colisão correspondente. Esta revisão não adiciona um sistema interativo para abrir ou fechar portas.

O TypeScript global ainda falha em arquivos preexistentes fora de Dedução: `app/(dashboard)/match/[matchId]/match-view.tsx`, `components/ui/chart.tsx` e `components/ui/resizable.tsx`. Nenhum erro foi apontado nos arquivos do jogo. O build do frontend mantém a configuração existente `ignoreBuildErrors: true`; a aprovação do build não significa que a checagem global de tipos passou.

A página, servidor e cache temporários de revisão foram removidos. Os testes permanentes foram mantidos.

## Repetir as verificações locais

No frontend:

```powershell
node scripts/check-deducao-controls.mjs
node scripts/check-deducao-scene.mjs
node scripts/check-deducao-actors.mjs
node scripts/check-deducao-lighting.mjs
node scripts/check-deducao-light-grid.mjs
node scripts/check-deducao-render-budget.mjs
node scripts/check-deducao-movement-geometry.mjs
node scripts/check-deducao-audio.mjs
node scripts/check-deducao-actor-motion.mjs
node scripts/check-deducao-sabotage.mjs
node scripts/check-deducao-minimap.mjs
node scripts/check-deducao-models.mjs
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background --factory-startup --python-exit-code 1 --python scripts/check-office-architecture-blender.py
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background --factory-startup --python-exit-code 1 --python scripts/check-office-seating-blender.py
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background --factory-startup --python-exit-code 1 --python scripts/check-office-emergency-blender.py
npm run build
```

Na API:

```powershell
npm test -- --runInBand
npm run build
```
