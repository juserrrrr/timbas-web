# Padrão de modelagem 3D do Dedução

Este documento registra o padrão visual, técnico e de validação dos modelos 3D do escritório. O objetivo é manter boa leitura visual sem transformar um jogo de navegador em uma cena pesada.

## O que deu errado na primeira tentativa

A primeira versão do SUV foi construída diretamente com caixas e cilindros no Three.js. Isso foi rápido para criar volume e colisão, mas não serviu para um objeto de destaque. Os principais erros foram:

- aceitar a categoria geral do carro sem validar a silhueta de frente, lateral e traseira;
- confundir quantidade de detalhes com qualidade de modelagem;
- usar peças sobrepostas onde a carroceria precisava de uma superfície contínua;
- validar o arquivo apenas por tamanho e número de polígonos, sem um render de revisão;
- prometer uma qualidade visual antes de comparar o resultado com a referência mostrada pelo usuário;
- deixar o gerador simples capaz de sobrescrever a versão melhor em uma execução futura.

O custo maior não foi refazer o código. Foi ter criado uma direção visual errada antes de produzir imagens de controle.

Uma segunda falha foi tratar arquitetura e mobiliário como duas cenas. O navegador montava pisos, paredes, forros e escadas enquanto carregava os móveis do Blender. Isso provocou quatro problemas visíveis:

- troca de pavimento com aparência de carregamento de outro mapa;
- emendas quadradas criadas por texturas e por um shader de grade repetida;
- escadas sem vão arquitetônico coerente;
- objetos apoiados na altura errada, porque o modelo visual e a planta não eram revisados juntos.

As revisões seguintes revelaram mais sete regras importantes:

- transparência ordenada em dezenas de portas de vidro pode piscar, atravessar outra folha e mudar de ordem conforme a câmera; vidro arquitetônico de gameplay deve usar material sólido, escuro e reflexivo, com o vão de circulação realmente livre;
- uma luz real transferida entre luminárias denuncia o pool, mas prendê-la à câmera cria uma lanterna invisível que acompanha o jogador e chega a iluminar o vão da escada; toda fonte dinâmica do escritório deve permanecer fixa na coordenada de uma luminária física;
- reduzir o prédio escalando também carros e móveis deixa tudo com aparência de miniatura; a planta, as portas e as posições podem ser compactadas, enquanto medidas físicas, colisões e alturas dos objetos permanecem reais;
- um corpo feito no React e escondido por distância não parece parte do mundo e pode sumir antes do report; personagem vivo e corpo agora têm fontes Blender próprias, e só a laje decide em qual pavimento o corpo aparece.
- recortar a parede por toda a altura para inserir uma porta deixa um vazio sobre o marco; o vão termina na altura da porta e recebe parede contínua até o teto;
- representar cada lance de uma escada como uma escada independente duplica acessos e quebra altura, colisão e recorte da laje; a escada em L é uma única polilinha com início, curva e desembarque compartilhada pelo servidor, cliente e Blender;
- construir cada degrau como uma coluna até o térreo transforma o segundo lance em um bloco parecido com uma parede; degraus finos, patamar e longarinas precisam ser revisados também por baixo.

A regra atual é uma fonte Blender para o edifício completo. `timbas-office-building.blend` contém os dois pavimentos, arquitetura, acabamentos, móveis, equipamentos, luminárias e decoração. O navegador carrega um GLB único e conserva apenas interações, luzes fixas sem sombra sob luminárias reais e as luzes vermelhas do blackout.

O escritório não possui garagem, veículos, cones ou vagas de estacionamento. O espaço sob a sala do conselho é uma sala de apoio, com estantes e posto de trabalho. A tarefa de recarga foi removida e o duto pertence à sala de apoio. Modelos autorais e créditos dos veículos permanecem preservados separadamente, sem integrar o prédio ou seu carregamento no jogo.

## Padrão visual

Todo objeto importante precisa ser reconhecível apenas pela silhueta. Detalhes pequenos entram depois que proporção, perfil e volumes principais estiverem corretos.

Para veículos:

- validar vistas frontal, lateral, traseira e três quartos;
- carroceria principal contínua, com modificadores de suavização aplicados;
- rodas completas, caixa de roda definida, vidros separados e interior visível;
- frente e traseira com assinaturas distintas;
- inspiração por categoria, sem copiar logotipos ou identidade protegida de fabricante.

Para móveis e equipamentos:

- cantos com bevel suficiente para responder à iluminação;
- escala baseada em medidas reais;
- separação visual entre estrutura, superfície de contato, acabamento e peças funcionais;
- materiais PBR simples e coerentes, como metal, madeira, tecido, plástico, vidro e emissão;
- pequenos detalhes somente quando permanecem legíveis na câmera normal do jogo.

Para personagens repetidos:

- malha original criada no Blender, inclusive a versão deitada usada pelo corpo;
- pivôs nomeados para braços e pernas, sem esqueleto complexo quando quatro rotações resolvem a animação;
- peças estáticas unidas por material e por pivô, nunca entre pivôs diferentes;
- cor do jogador aplicada em cópias dos materiais, mantendo geometria compartilhada;
- corpo morto permanece renderizado até a reunião, sem culling por distância.

## Fluxo obrigatório

1. Definir medidas, orientação e ponto de origem compatíveis com o mapa.
2. Modelar no Blender em coleções separadas por objeto.
3. Produzir render frontal e traseiro, ou uma prancha equivalente para móveis.
4. Corrigir a silhueta antes de adicionar detalhes finos.
5. Salvar o `.blend` editável antes da otimização destrutiva.
6. Aplicar modificadores, converter curvas e unir geometrias por material para exportação.
7. Exportar GLB sem câmeras ou luzes de apresentação.
8. Inspecionar dimensões, triângulos, materiais, draw calls e texturas.
9. Abrir o GLB no Three.js e comparar com os renders do Blender.
10. Testar no mapa em qualidade alta, média e baixa, com luz normal e blackout.
11. Medir GPU, memória, tempo de quadro e quantidade de draw calls antes de aprovar.

Para cenários completos, a revisão também precisa confirmar:

1. Todos os andares existem simultaneamente no mesmo arquivo.
2. A escada termina em um vão real da laje superior.
3. Cada equipamento de tarefa está na mesma coordenada usada pelo servidor.
4. Objetos apoiados usam a altura da bancada, mesa ou piso correta.
5. Salas grandes possuem zonas de uso e circulação, não móveis isolados em um vazio.
6. Paredes lisas não recebem grade artificial nem textura curta repetida.
7. Todo portal possui parede ou verga entre o marco e o teto, sem abertura acidental.
8. Escadas com curva usam a mesma polilinha para degraus, altura contínua, colisão, guarda-corpo, luzes e recorte da laje.
9. O patamar é um quadrado plano de 2,42 m de lado. Cliente e servidor reconhecem toda a superfície, inclusive os cantos fora do eixo dos lances.
10. O recorte da laje inclui o quadrado do patamar no canto da escada, com corrimãos interno e externo contínuos entre os dois lances.
11. O friso preto continua sobre todos os portais. O gerador testa o vão livre, a parede superior e o friso com raycasts antes de salvar.
12. Luminárias, perfis de LED e seus suportes encostam no teto ou na parede. Sensores sem apoio e placas soltas no forro não fazem parte da arquitetura.
13. Janelas são recortes reais apenas em paredes externas, com peitoril, caixilho e vidro fixo. Divisórias, portas, quadros, painéis e a faixa dos guarda-corpos da escada devem ser preservados. Raycasts nos dois sentidos verificam cada abertura.
14. O embasamento do escritório chega ao terreno. A paisagem externa usa volumes baixos apoiados no solo, sem torres suspensas junto ao terraço.
15. Molduras de gesso são volumes presos ao forro. Preservam a fixação das luminárias e o vão da escada, sem placas suspensas ou tetos falsos atravessando o caminho.
16. Os nove sofás formam grupos de conversa, TV, recepção e contemplação. A frente de cada assento aponta para seu uso e mantém passagem entre sofá e mesa; os dutos continuam acessíveis.
17. A base clara é quente, complementada por lambris sálvia, terracota ou azul-escuro e frisos de carvalho. As galerias variam entre paisagens, botânicos, órbitas, dípticos e linhas. Lounge e mezanino possuem TVs fixas 16:9 de baixa emissão.
18. A copa usa uma mesa de jantar de 2,8 × 1,2 m e seis cadeiras fixas de madeira, sem rodas. A máquina de café tem corpo próprio de 0,85 × 0,82 × 1,95 m, apoiado no piso e separado da bancada, do fogão e da máquina de venda. Sua tarefa fica diante do dispensador.
19. O depósito tem acesso pelo corredor de serviço, nunca pelo banheiro. As duas cabines têm portas opacas fechadas, frentes preenchidas e divisórias conectadas à parede dos fundos; as quatro barreiras equivalentes pertencem a `obstacles`. As cabines são cenográficas, sem nova mecânica de abrir portas; a tarefa de higiene permanece na área livre dos lavatórios.
20. Os corredores recebem galerias nas paredes, sem móveis no percurso. O corredor de serviço possui luminária normal e duas de emergência próprias, usando o mesmo perfil de iluminação das outras áreas.
21. Armários superiores, bancada e espelho precisam de contato real com a parede, não apenas de estarem dentro do cômodo. O peitoril do banheiro fica em 2,50 m, acima do espelho de 2,36 m e das cabines de 2,34 m.
22. Compactar a planta não pode comprimir a distância funcional dentro dos conjuntos: mesas, assentos e monitores acompanham uma âncora comum com offsets físicos preservados. Armários mantêm sua distância da face da parede; a escada preserva largura e patamar, com seu vão inteiramente dentro do átrio.
23. A frente real da cadeira de escritório é +Z no GLB com rotação zero. O encosto deve ficar do lado oposto à mesa. Cadeiras com rodízios pertencem a postos de trabalho ou mesas de reunião, não a grupos soltos no átrio, mezanino ou terraço.

No Three.js, a frente funcional do objeto aponta para `+Z`, a largura usa `X` e a altura usa `Y`. A fonte Blender permanece com `Z` para cima e `+Y` para a frente. O exportador aplica a compensação de 180 graus na cópia otimizada para conservar o padrão do mapa.

## Orçamento para navegador

Os valores são metas, não uma desculpa para deformar a silhueta.

| Classe | Triângulos por modelo | Materiais | Texturas | Estratégia |
| --- | ---: | ---: | ---: | --- |
| Objeto pequeno repetido | até 8 mil | 1 a 3 | preferir atlas | instanciado |
| Móvel de destaque | até 25 mil | até 6 | no máximo 1 conjunto PBR | instanciado |
| Veículo de destaque | até 90 mil | até 12 | evitar quando cor sólida resolve | instanciado |
| Luminária repetida | até 2 mil | até 3 | nenhuma | instanciada |
| Personagem repetido | até 35 mil | até 12 draw calls | nenhuma | geometria compartilhada e pivôs simples |

O orçamento decisivo da cena é a combinação de draw calls, luzes com sombra, pixels processados e objetos visíveis. Polígonos isoladamente não explicam o uso da GPU.

Os GLBs usam compressão Draco. O carregamento usa `useGLTF(path, true, false)`, com Draco ativo e Meshopt desativado para evitar inicializar um decodificador desnecessário.

Janelas externas fixas usam um único plano de vidro claro, com baixa opacidade, para permitir a vista da paisagem. Essa exceção não se aplica às portas de circulação. O peitoril e a colisão da parede permanecem, sem permitir sair do mapa pela janela.

## Iluminação

- A peça emissiva deve existir dentro de uma luminária física.
- Emissão dá aparência de luz; a fonte que ilumina o ambiente fica fixa logo abaixo da mesma luminária, nunca na câmera ou no jogador.
- Cada luminária de teto tem sua própria fonte fixa, com a mesma intensidade em todas as qualidades. Mudar a qualidade nunca elimina a luz de uma luminária acesa.
- `lighting-profile.ts` centraliza exposição e intensidades para luz normal, blackout e visão noturna. Leve, médio e alto compartilham a mesma claridade base.
- A qualidade altera resolução, sombras, definição dos reflexos e brilho localizado. O ambiente PBR mantém a mesma energia, com mapas de 64, 128 e 256 pixels para leve, médio e alto.
- Os ajustes de visão e o céu passam pelo tone mapping em espaço linear, tanto na renderização direta quanto no pós-processamento do alto. O bloom destaca apenas emissões fortes, sem clarear o ambiente inteiro.
- No alto, os buffers de pós-processamento usam MSAA de até duas amostras, limitado pelo dispositivo. O bloom trabalha com metade da largura/altura, sem reduzir a imagem principal nem alterar a exposição.
- As fontes normais não projetam sombras adicionais e permanecem acesas nos dois pavimentos. O alcance é limitado; subir a escada nunca altera quais luzes existem no mundo.
- As 57 fontes fixas são indexadas em uma grade mundial de células de 2 m. Cada fragmento consulta somente as fontes cujo alcance cruza sua célula, sem desligar pisos ou transferir fontes para a câmera. As listas normal/emergência estão nas mesmas três texturas; o apagão troca um uniforme, sem reconstruir a grade ou recompilar materiais. A lanterna continua independente.
- Das fontes fixas, 56 são segmentos finitos e uma é pontual, no botão de emergência. O shader aproxima a irradiância da linha e conserva a resposta PBR, sem simular dezenas de pontos por barra. Não é uma integração fotométrica exata nem produz sombras de área. Cores RGB são aceitas, inclusive verde; os LEDs existentes continuam azuis e amarelos.
- Antes de liberar a cena, `scene-warmup.ts` antecipa compilação, texturas e buffers dos dois pisos. Um render temporário de 1 pixel inclui malhas fora da câmera sem revelar objetos ocultos. No alto, a compilação usa o destino de pós-processamento; o mapa de sombras usa `PCFShadowMap` estável inclusive nos rerenders do Canvas. Subida e apagão não reiniciam essa preparação. Cancelamento ou erro restauram o destino/culling e descartam o temporário.
- As seis fitas verticais dos átrios iluminam suas paredes ao longo de 2,18 m, em azul ou amarelo, diante do difusor e com alcance curto. Essas luzes decorativas acompanham o apagão global.
- Emergências de corredor ficam a 1,30 m da parede, fora da sanca de gesso. O corpo continua preso ao teto e o ponto luminoso fica imediatamente abaixo do difusor. A auditoria deve testar visibilidade por baixo, não apenas contato com o forro.
- Nenhuma luminária pode ser criada dentro do recorte da laje sobre uma escada.
- Apenas uma luz principal pode projetar sombra dinâmica quando necessário.
- No blackout, as luzes normais apagam e as luminárias de emergência do corredor acendem em vermelho. Os equipamentos de emergência permanecem presos ao teto mesmo quando apagados, separados das luminárias normais.
- O assassino recebe leitura noturna reduzida no blackout, sem reacender as luminárias normais para os demais jogadores.
- A qualidade baixa preserva todas as fontes fixas e a leitura espacial, mas desativa sombras dinâmicas e pós-processamento.
- O `NightSky` procedural mantém o céu azul-escuro, com laranja localizado no horizonte. Sua esfera tem raio de 100 m e as estrelas ficam entre 94 e 98 m, dentro do alcance mínimo de 130 m da câmera.
- O terraço recebe duas fontes lineares quentes de aproximadamente 7,19 m, acompanhando os LEDs laterais do pergolado, sem um ponto luminoso concentrado no meio.
- As janelas das casas vizinhas mantêm a emissão durante o blackout do escritório.

Os pavimentos são camadas de colisão e da planta, não cenas independentes. Não existe aviso ou carregamento ao subir a escada. Jogadores, cadáveres e nomes usam o depth buffer da geometria 3D para a oclusão, sem sumir pelo andar do observador; fantasmas e dutos conservam as regras de jogo.

`render-budget.tsx` ajusta a resolução com meta de 60 FPS, sem mudar as fontes, cores ou claridade. Os limites de DPR são 0,70 a 1 no leve, 0,80 a 1,15 no médio e 0,85 a 1,25 no alto, respeitando a densidade do dispositivo. Sobrecarga sustentada reduz 0,10; quatro janelas saudáveis permitem recuperar 0,05. Há aquecimento, histerese e descarte de pausas da aba. O Canvas e o compositor recebem o mesmo DPR. A meta não garante 60 FPS em qualquer hardware.

`movement-geometry.ts` mantém a rota da escada e os colisores em cache por planta imutável. A altura ainda determina colisão e apoio, sem ocultar jogadores ou luzes. O HUD usa fundos translúcidos sem `backdrop-filter`, evitando refiltrar a cena atrás de cada painel.

## Controles e áudio

- `prepareGameAudio()` cria o contexto silenciosamente durante a preparação inicial, antes de liberar os controles. O primeiro passo não inicializa o dispositivo de áudio; os gestos continuam responsáveis por retomá-lo. Falhas de áudio não bloqueiam a cena.
- O HUD mantém ajuda de teclado legível, com teclas destacadas. WASD e setas compartilham os eixos, sem somar duas vezes a mesma direção, e as diagonais são normalizadas.
- Tarefas, mapa expandido, apresentação do papel e fases sem jogo bloqueiam movimento e ações. Controles HTML focados recebem suas teclas sem interferência do jogo.
- Perder foco, ocultar a aba ou liberar o ponteiro zera as teclas pressionadas; repetição automática não retoma movimento nem repete ações.
- O canvas usa `touch-action: none`, e somente os dois controles ativos cancelam seus respectivos gestos.
- O manche guarda origem e identificador em refs; reinstalar listeners a cada movimento causa saltos e dedos perdidos.
- Gestos de jogo liberam o foco anterior de botões e seletores. Cancelar o toque, abrir um overlay ou sair da aba limpa o estado do manche.
- A tela de jogo bloqueia zoom, gesto de pinça e overscroll durante a partida, restaurando o documento ao sair.
- Voz usa WebRTC ponto a ponto; o Colyseus transporta somente oferta, resposta e ICE, nunca o áudio.
- No mapa, o volume cai suavemente entre 3 e 15 metros e zera em outro pavimento ou dentro do duto.
- Na reunião, todos do mesmo estado de vida se ouvem por igual. Mortos continuam isolados dos vivos.
- O microfone só é solicitado depois de um clique explícito no botão do HUD.

## Organização dos arquivos

- `scripts/run-deducao-blender-builds.mjs`: localiza o Blender e executa os geradores oficiais.
- `scripts/build-coupe-suv-blender.py`: fonte paramétrica do SUV cupê.
- `scripts/build-office-kit-blender.py`: fonte paramétrica dos objetos do escritório.
- `scripts/build-office-building-blender.py`: monta o prédio completo a partir da planta exportada pelo servidor.
- `scripts/build-crew-character-blender.py`: gera personagem, pivôs animáveis e corpo reportável.
- `assets/models/deducao/office-map.json`: fotografia da planta usada pelo Blender na geração.
- `assets/models/deducao/timbas-office-building.blend`: fonte editável da cena completa.
- `assets/models/deducao/`: arquivos `.blend` editáveis.
- `public/models/games/deducao/`: arquivos GLB otimizados usados pelo jogo.
- `public/models/games/deducao/ATTRIBUTION.md`: autoria, licença e origem de cada modelo.

Os geradores legados de materiais e texturas não podem exportar modelos que já possuem uma fonte Blender. Isso evita regressões silenciosas.

Para reconstruir todos os modelos e materiais, execute `npm run assets:deducao`. Em uma instalação fora dos caminhos comuns, defina `BLENDER_BIN` com o caminho do executável do Blender. Para validar os GLBs sem reconstruí-los, execute `npm run assets:deducao:check`.

Execute `node scripts/check-deducao-lighting.mjs` para verificar as fontes reais, a montagem das luminárias, o blackout, a paridade entre qualidades e a ordem dos shaders de visão e céu. Erros nos validadores Blender encerram a geração com status de falha, sem exportar o prédio incompleto.

Após reconstruir o kit e o prédio, execute também a auditoria independente do arquivo salvo:

```powershell
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background --factory-startup --python-exit-code 1 --python scripts/check-office-architecture-blender.py
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background --factory-startup --python-exit-code 1 --python scripts/check-office-seating-blender.py
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background --factory-startup --python-exit-code 1 --python scripts/check-office-emergency-blender.py
node scripts/check-deducao-controls.mjs
node scripts/check-deducao-scene.mjs
node scripts/check-deducao-actors.mjs
node scripts/check-deducao-minimap.mjs
node scripts/check-deducao-light-grid.mjs
node scripts/check-deducao-render-budget.mjs
node scripts/check-deducao-movement-geometry.mjs
node scripts/check-deducao-audio.mjs
```

A auditoria Blender verifica portas e molduras, degraus/patamar, pés e duplicação dos postes, conectividade das luminárias, janelas, contato do pergolado e paisagem com seus apoios. Reimporta o GLB para comparar geometria com o `.blend` e confirma por hash que as entradas não foram alteradas. Os testes da cena exercitam os handlers reais de movimento, câmera e luz com transporte local. Nenhum desses testes substitui uma partida multiplayer nem a medição de desempenho em dispositivo físico.

Na API, `src/games/deducao/seating.spec.ts` testa a orientação dos sofás, alinhamento com mesas/TVs e circulação dos grupos. `map.spec.ts` cobre o acesso a todas as tarefas e dutos, inclusive após uma mudança de mobiliário.

`scripts/check-office-seating-blender.py` confere o arquivo Blender salvo, relacionando cadeiras às mesas e verificando a frente real dos assentos. O teste evita aceitar uma rotação visual invertida apenas porque a posição da cadeira pertence ao cômodo correto.

`src/games/deducao/pantry.spec.ts` verifica mesa/cadeiras/café, circulação do jantar, entrada e saída do depósito sem passar pelo banheiro e colisão/visão bloqueadas pelas cabines. A auditoria Blender complementa esses testes com medidas reais dos modelos, apoio no piso, material opaco e raios através das frentes e laterais das cabines.

## Checklist de aprovação

- [ ] A silhueta funciona em quatro ângulos.
- [ ] O objeto encosta corretamente no chão ou na superfície de apoio.
- [ ] Escala e orientação conferem com a colisão do servidor.
- [ ] Não existem peças flutuando ou faces abertas visíveis.
- [ ] Portas terminam em parede contínua e escadas foram revisadas por cima e por baixo.
- [ ] Materiais continuam legíveis com e sem iluminação direta.
- [ ] Emissão não clareia a tela inteira.
- [ ] O GLB não contém câmera, luz de estúdio ou objeto oculto.
- [ ] Objetos repetidos usam instancing.
- [ ] O objeto foi testado dentro do jogo, não apenas no Blender.
- [ ] O modo baixo mantém a jogabilidade e a identificação dos ambientes.
- [ ] O render de revisão foi mostrado antes de declarar o modelo concluído.
