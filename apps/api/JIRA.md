# Critérios de Aceitação da POC

## Cenário 1 — Visualização dos entregáveis no mapa
**Dado** que os 90 entregáveis estão cadastrados com suas coordenadas  
**Quando** o usuário acessa o mapa  
**Então** todos os entregáveis são renderizados como pontos georreferenciados com distinção visual por status

---

## Cenário 2 — Seleção de entregável individual
**Dado** que os entregáveis estão visíveis no mapa  
**Quando** o usuário clica sobre um ponto específico  
**Então** o sistema exibe as informações detalhadas daquele entregável

---

## Cenário 3 — Filtro por estado e status
**Dado** que o usuário aplica um ou mais filtros disponíveis  
**Quando** o filtro é aplicado  
**Então** o mapa atualiza em tempo real exibindo apenas os entregáveis que atendem aos critérios selecionados

---

## Cenário 4 — Exibição da área de cobertura
**Dado** que um entregável possui polígono de área de cobertura cadastrado  
**Quando** o usuário seleciona aquele entregável  
**Então** o polígono de cobertura é exibido no mapa delimitando a área que aquele entregável abrange

---

## Cenário 5 — Cruzamento de dados com área de cobertura
**Dado** que um polígono de cobertura está definido para um entregável  
**Quando** o usuário solicita o cruzamento de dados daquela área  
**Então** o sistema retorna as informações externas, como dados de renda, referentes à população contida dentro do polígono via consulta PostGIS

---

## Cenário 6 — Inserção de modelo 3D no mapa
**Dado** que um modelo 3D foi configurado para um entregável ou área específica  
**Quando** o usuário visualiza aquela região no mapa  
**Então** o modelo 3D é renderizado corretamente e o impacto de performance é registrado para análise  