# Taxonomiars

Construtor visual de mapas de taxonomia (Drivers → Micros → Artigos) usado em TRM/UFRJ. A aplicação roda direto em `index.html` (sem build ou backend) e funciona em desktop e dispositivos touch.

## Como usar (passo a passo rápido)
1. Abra `index.html` no navegador (ou hospede em qualquer servidor estático).
2. Escolha um modelo em **Configurar → Modelos** (Membranas CO₂, Biogás ou Mapa em Branco).
3. No painel **Adicionar**, preencha os campos e clique em:
   - **Atualizar Central** para o tema principal.
   - **Adicionar Driver Meso** para criar grupos.
   - **Adicionar Micro** para subitens dentro de um Meso.
   - **Adicionar Artigo** para referências ligadas a um Meso.
4. Clique ou toque em qualquer nó no mapa para editar; use o painel **Nós** para listar/abrir rapidamente e excluir.
5. Exporte via botões do topo (SVG, HTML, JSON) ou importe um JSON salvo para continuar a edição.

## Painel lateral
- **Adicionar**: cria o nó central, mesos (com cor, nome, descrição), micros (nome + pai) e artigos (ref, periódico, DOI + pai).
- **Nós**: lista hierárquica com contadores; clique/toque abre a edição. O “X” remove o nó e descendentes.
- **Configurar**:
  - Texto: Título, Subtítulo e Query (aparecem na barra superior do mapa).
  - Espaçamento: Gap entre grupos (vertical) e entre micros.
  - Mostrar artigos: alterna a coluna de referências.
  - Modelos: carrega exemplos pré-prontos ou um mapa vazio.

## Edição de nós
- Clique com o mouse **ou toque rápido** sobre qualquer bloco do SVG (central, meso, micro ou artigo) para abrir o modal de edição.
- No modal:
  - Central: nome e subtítulo.
  - Meso: nome, descrição, cor.
  - Micro: nome, escolha do pai.
  - Artigo: referência, periódico, DOI/URL, escolha do pai.
- Botão **Deletar** remove o nó (e filhos no caso de mesos).

## Navegação e zoom
- **Desktop**: arraste com botão esquerdo para mover o mapa; use a roda do mouse para zoom (centrado no cursor). Botões flutuantes: + / − (zoom), ⊡ (reset), ⤢ (ajustar ao quadro).
- **Touch**: arraste com um dedo para mover, faça pinça para zoom. Toque rápido em um nó abre a edição (com o mesmo efeito do clique).

## Importar e exportar
- **Exportar SVG**: baixa a arte vetorial limpa.
- **Exportar HTML**: gera um HTML autossuficiente com o SVG embutido.
- **Exportar JSON**: salva o estado completo (central, mesos, micros, artigos).
- **Importar JSON**: recarrega um arquivo salvo anteriormente (o mapa atual é substituído).

## Novo mapa
- Botão **Novo Mapa** abre o modal de confirmação; em seguida o estado é resetado para o padrão (“Tema Central” vazio).

## Notas rápidas
- O SVG é recalculado a cada alteração; o zoom não muda a geometria, só a visualização.
- A coluna de artigos pode ser ocultada em **Configurar → Mostrar artigos**.
- O aplicativo é 100% client-side; basta o arquivo HTML e um navegador moderno.
