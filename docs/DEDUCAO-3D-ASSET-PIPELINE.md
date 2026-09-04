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

No Three.js, a frente funcional do objeto aponta para `+Z`, a largura usa `X` e a altura usa `Y`. A fonte Blender permanece com `Z` para cima e `+Y` para a frente. O exportador aplica a compensação de 180 graus na cópia otimizada para conservar o padrão do mapa.

## Orçamento para navegador

Os valores são metas, não uma desculpa para deformar a silhueta.

| Classe | Triângulos por modelo | Materiais | Texturas | Estratégia |
| --- | ---: | ---: | ---: | --- |
| Objeto pequeno repetido | até 8 mil | 1 a 3 | preferir atlas | instanciado |
| Móvel de destaque | até 25 mil | até 6 | no máximo 1 conjunto PBR | instanciado |
| Veículo de destaque | até 90 mil | até 12 | evitar quando cor sólida resolve | instanciado |
| Luminária repetida | até 2 mil | até 3 | nenhuma | instanciada |

O orçamento decisivo da cena é a combinação de draw calls, luzes com sombra, pixels processados e objetos visíveis. Polígonos isoladamente não explicam o uso da GPU.

## Iluminação

- A peça emissiva deve existir dentro de uma luminária física.
- Emissão dá aparência de luz, mas somente um conjunto pequeno de luzes reais próximas ao jogador ilumina o ambiente.
- O pool de luzes acompanha a área ativa. Não deve haver uma PointLight para cada luminária do prédio.
- Apenas uma luz principal pode projetar sombra dinâmica quando necessário.
- No blackout, as luzes normais apagam e as luminárias de emergência do corredor acendem em vermelho.
- A qualidade baixa preserva emissão e leitura espacial, mas remove luzes dinâmicas caras.

## Organização dos arquivos

- `scripts/run-deducao-blender-builds.mjs`: localiza o Blender e executa os geradores oficiais.
- `scripts/build-coupe-suv-blender.py`: fonte paramétrica do SUV cupê.
- `scripts/build-office-kit-blender.py`: fonte paramétrica dos objetos do escritório.
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
- [ ] Materiais continuam legíveis com e sem iluminação direta.
- [ ] Emissão não clareia a tela inteira.
- [ ] O GLB não contém câmera, luz de estúdio ou objeto oculto.
- [ ] Objetos repetidos usam instancing.
- [ ] O objeto foi testado dentro do jogo, não apenas no Blender.
- [ ] O modo baixo mantém a jogabilidade e a identificação dos ambientes.
- [ ] O render de revisão foi mostrado antes de declarar o modelo concluído.
