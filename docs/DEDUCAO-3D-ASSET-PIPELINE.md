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

A regra atual é uma fonte Blender para o edifício completo. `timbas-office-building.blend` contém os dois pavimentos, arquitetura, acabamentos, móveis, equipamentos, luminárias, carros e decoração. O navegador carrega um GLB único e conserva apenas interações, luzes fixas sem sombra sob luminárias reais e as luzes vermelhas do blackout.

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

## Iluminação

- A peça emissiva deve existir dentro de uma luminária física.
- Emissão dá aparência de luz; a fonte que ilumina o ambiente fica fixa logo abaixo da mesma luminária, nunca na câmera ou no jogador.
- Nem toda peça emissiva precisa de uma PointLight. Em qualidade alta há no máximo uma por ambiente; média e baixa preservam primeiro os corredores, halls e salas maiores.
- Nenhuma luminária pode ser criada dentro do recorte da laje sobre uma escada.
- Apenas uma luz principal pode projetar sombra dinâmica quando necessário.
- No blackout, as luzes normais apagam e as luminárias de emergência do corredor acendem em vermelho.
- O assassino recebe leitura noturna reduzida no blackout, sem reacender as luminárias normais para os demais jogadores.
- A qualidade baixa preserva emissão e leitura espacial, mas reduz luzes dinâmicas caras.

## Controles móveis e áudio

- O canvas usa `touch-action: none`, e somente os dois controles ativos cancelam seus respectivos gestos.
- O manche guarda origem e identificador em refs; reinstalar listeners a cada movimento causa saltos e dedos perdidos.
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
