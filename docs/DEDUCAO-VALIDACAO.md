# Validação de Dedução, 04/09/2026

## Resultado desta revisão

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

O navegador de revisão não usou servidor multiplayer, banco, WebSocket ou microfone. A mudança de andar foi exercitada nos testes de movimento e na câmera real com transporte local, não em uma partida Colyseus real. Foram observadas contagens de recursos e amostras de CPU do renderizador local, mas não FPS, memória em bytes, tempo de GPU ou gestos em tablet físico, nem leitor de tela real. Os testes geométricos são amostrados e não representam prova de ausência absoluta de defeitos.

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
