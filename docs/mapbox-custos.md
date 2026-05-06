# Custos da integração com Mapbox

Preços de referência: **tabela oficial da Mapbox consultada em maio de 2026**. Os valores abaixo estão em dólar americano, no modelo pay-as-you-go público da Mapbox, sem impostos, câmbio, descontos de contrato anual ou negociação enterprise.

Fontes oficiais:

- Pricing geral: https://www.mapbox.com/pricing
- Mapbox GL JS pricing: https://docs.mapbox.com/mapbox-gl-js/guides/pricing/
- Geocoding API pricing: https://docs.mapbox.com/api/search/geocoding/
- Isochrone API pricing: https://docs.mapbox.com/api/navigation/isochrone/

## O que o projeto usa hoje

No frontend, a integração Mapbox está em `apps/web/src/App.tsx`, `apps/web/src/lib/mapbox.ts`, `apps/web/src/lib/mapbox-3d.ts` e `apps/web/src/lib/api.ts`.

Uso atual:

- **Mapbox GL JS v3** (`mapbox-gl`): renderiza o mapa interativo.
- **Estilo Mapbox Standard**: `mapbox://styles/mapbox/standard`.
- **Terreno Mapbox DEM**: `mapbox://mapbox.mapbox-terrain-dem-v1`, usado para relevo e consulta de elevação do ativo.
- **Mapbox Standard buildings featureset**: interação com prédios urbanos próximos ao ativo selecionado.
- **Mapbox Draw** (`@mapbox/mapbox-gl-draw`): permite desenhar e editar polígonos de cobertura no mapa.
- **Temporary Geocoding API v6 reverse**: chamada para `https://api.mapbox.com/search/geocode/v6/reverse` quando o usuário clica em uma área vazia para criar um novo ativo e o app tenta identificar município/UF.
- **Temporary Geocoding API v6 forward**: chamada para `https://api.mapbox.com/search/geocode/v6/forward` quando o usuário usa a aba `Pesquisa` para buscar município, endereço ou coordenada.
- **Isochrone API**: chamada para `https://api.mapbox.com/isochrone/v1/mapbox/driving/{lng},{lat}` ao calcular `Alcance 15/30 min de carro`.
- **Camada 3D de modelo**: usa `tower.glb` local em `/models/tower.glb`; isso não é um recurso hospedado pela Mapbox.

Não usamos hoje:

- Navigation SDK.
- Directions, Matrix, Map Matching ou Optimization API.
- Static Images API.
- Tilesets customizados hospedados na Mapbox.
- Search Box API/autocomplete por sessão.
- Permanent Geocoding API.

## Quando a Mapbox cobra

### 1. Ao abrir o mapa

Produto cobrado: **Mapbox GL JS - Map Loads for Web**.

A Mapbox conta um **map load** quando um objeto `new mapboxgl.Map(...)` é inicializado em uma página/app web. No nosso app isso acontece quando a tela principal carrega o mapa.

Segundo a documentação oficial, dentro do mesmo map load o usuário pode interagir sem cobranças adicionais:

- mover o mapa;
- aproximar/afastar zoom;
- alternar camadas;
- clicar em ativos;
- visualizar polígonos;
- usar as fontes/layers GeoJSON locais da aplicação;
- renderizar o modelo 3D local no mapa.

A sessão máxima de um map load é de 12 horas. Se o usuário mantiver a página aberta por mais de 12 horas, a Mapbox passa a contar uma nova sessão/map load.

Tabela oficial de Mapbox GL JS em maio de 2026:

| Map loads mensais | Preço por 1.000 map loads |
| --- | ---: |
| Até 50.000 | Grátis |
| 50.001 - 100.000 | US$ 5,00 |
| 100.001 - 200.000 | US$ 4,00 |
| 200.001 - 1.000.000 | US$ 3,00 |
| 1.000.001 - 5.000.000 | US$ 2,50 |
| 5.000.000+ | Consultar vendas |

Observação: um map load inclui requisições ilimitadas de Vector Tiles API e Raster Tiles API necessárias para esse mapa. Na prática, isso cobre o uso do Mapbox Standard e dos tiles de terreno DEM carregados pelo renderer do Mapbox GL JS.

### 2. Ao usar geocoding temporário

Produto cobrado: **Temporary Geocoding API**.

No nosso app existem dois usos:

1. **Reverse geocoding** ao clicar em área vazia para criar novo ativo:

```txt
GET https://api.mapbox.com/search/geocode/v6/reverse
```

Parâmetros principais:

- `longitude`
- `latitude`
- `country=br`
- `types=place,region`
- `language=pt`
- `access_token`

2. **Forward geocoding** na aba `Pesquisa`:

```txt
GET https://api.mapbox.com/search/geocode/v6/forward
```

Parâmetros principais:

- `q`
- `country=br`
- `language=pt`
- `limit=1`
- `access_token`

Ambos são cobrados por request. Como não enviamos `permanent=true`, o uso é temporário. Resultados temporários não devem ser armazenados como base permanente; eles são usados apenas para preencher a interação atual ou navegar no mapa.

Tabela oficial de Temporary Geocoding API em maio de 2026:

| Requests mensais | Preço por 1.000 requests |
| --- | ---: |
| Até 100.000 | Grátis |
| 100.001 - 500.000 | US$ 0,75 |
| 500.001 - 1.000.000 | US$ 0,60 |
| 1.000.001+ | US$ 0,45 |
| 5.000.000+ | Consultar vendas |

### 3. Ao calcular alcance de carro

Produto cobrado: **Isochrone API**.

No nosso app, quando o usuário clica em `Alcance 15/30 min de carro`, chamamos:

```txt
GET https://api.mapbox.com/isochrone/v1/mapbox/driving/{longitude},{latitude}
```

Parâmetros principais:

- `contours_minutes=15,30`
- `polygons=true`
- `denoise=1`
- `generalize=120`
- `access_token`

Observações:

- O perfil atual é **carro**, por causa de `mapbox/driving`.
- As duas faixas, 15 e 30 minutos, são retornadas em **uma request**.
- Não estamos usando perfil a pé, bicicleta ou moto.

Tabela oficial de Isochrone API em maio de 2026:

| Requests mensais | Preço por 1.000 requests |
| --- | ---: |
| Até 100.000 | Grátis |
| 100.001 - 500.000 | US$ 2,00 |
| 500.001 - 1.000.000 | US$ 1,60 |
| 1.000.001+ | US$ 1,20 |
| 5.000.000+ | Consultar vendas |

### 4. O que não gera cobrança adicional da Mapbox no desenho atual

Não ha cobrança Mapbox adicional para:

- clicar em ativos já existentes;
- abrir o painel de detalhes;
- filtrar por estado/status, porque os dados vem da nossa API;
- carregar ativos meteorologicos via backend;
- carregar municípios via backend;
- cruzar cobertura com dados socioeconômicos via PostGIS;
- desenhar ou editar polígono com Mapbox Draw;
- destacar prédios urbanos via Mapbox Standard `buildings` featureset;
- mover, dar zoom e rotacionar o mapa dentro da mesma sessão;
- exibir `tower.glb`, porque o arquivo está no `public/` do frontend e não é hospedado pela Mapbox.

Essas acoes podem gerar custo de infraestrutura própria, mas não entram como produto Mapbox separado.

## Simulação: 1.000 usuários bem ativos

Premissas do cenário:

- 1.000 usuários ativos no mes.
- 20 dias uteis de uso no mes.
- Cada usuário abre/recarrega o mapa **5 vezes por dia**.
- Cada usuário cria ou tenta criar **10 novos pontos por dia**, gerando reverse geocoding.
- Cada usuário faz **5 pesquisas por dia** na aba `Pesquisa`, gerando forward geocoding.
- Cada usuário calcula **5 alcances de carro por dia**, gerando Isochrone API.
- Cliques em ativos existentes, zoom, pan, filtros, visualização de cobertura, interação com prédios e modelo 3D local não geram cobranças extras de Mapbox além do map load.

### Volume estimado

| Métrica | Cálculo | Total mensal |
| --- | ---: | ---: |
| Map loads | 1.000 usuários x 20 dias x 5 aberturas/dia | 100.000 |
| Reverse geocoding requests | 1.000 usuários x 20 dias x 10 pontos/dia | 200.000 |
| Forward geocoding requests | 1.000 usuários x 20 dias x 5 pesquisas/dia | 100.000 |
| Total Temporary Geocoding | 200.000 + 100.000 | 300.000 |
| Isochrone requests | 1.000 usuários x 20 dias x 5 alcances/dia | 100.000 |

### Custo de Mapbox GL JS

| Faixa | Volume cobrado | Preço | Subtotal |
| --- | ---: | ---: | ---: |
| Até 50.000 | 50.000 | Grátis | US$ 0 |
| 50.001 - 100.000 | 50.000 | US$ 5,00 / 1.000 | US$ 250 |
| Total | 100.000 |  | **US$ 250** |

### Custo de Temporary Geocoding API

| Faixa | Volume cobrado | Preço | Subtotal |
| --- | ---: | ---: | ---: |
| Até 100.000 | 100.000 | Grátis | US$ 0 |
| 100.001 - 300.000 | 200.000 | US$ 0,75 / 1.000 | US$ 150 |
| Total | 300.000 |  | **US$ 150** |

### Custo de Isochrone API

| Faixa | Volume cobrado | Preço | Subtotal |
| --- | ---: | ---: | ---: |
| Até 100.000 | 100.000 | Grátis | US$ 0 |
| Total | 100.000 |  | **US$ 0** |

### Total estimado

| Item | Custo mensal |
| --- | ---: |
| Mapbox GL JS | US$ 250 |
| Temporary Geocoding API | US$ 150 |
| Isochrone API | US$ 0 |
| Predios urbanos no Mapbox Standard | US$ 0 adicional |
| Terreno/DEM no renderer Mapbox GL JS | US$ 0 adicional ao map load |
| Modelo 3D local (`tower.glb`) | US$ 0 na Mapbox |
| Dados/PostGIS/backend próprio | US$ 0 na Mapbox |
| **Total Mapbox estimado** | **US$ 400/mês** |

### Sensibilidade: uso mais intenso de alcance de carro

Se cada usuário calcular **10 alcances de carro por dia** em vez de 5:

| Item | Volume mensal | Custo estimado |
| --- | ---: | ---: |
| Isochrone API | 200.000 requests | US$ 200 |
| Total Mapbox estimado |  | **US$ 600/mês** |

## Observações importantes

- O maior driver de custo continua sendo a quantidade de vezes que o mapa é inicializado. Se o usuário passa horas trabalhando na mesma aba, isso é barato; se recarrega a página muitas vezes, aumenta o número de map loads.
- Busca na aba `Pesquisa` gera uma request de Temporary Geocoding por envio do formulário. Hoje não há autocomplete por caractere, então o custo é controlado.
- Selecionar ativos existentes não deveria chamar Geocoding API. O geocoding so deve acontecer para criacao de novo ponto em área vazia ou pesquisa explicita do usuário.
- O alcance 15/30 min de carro gera uma request de Isochrone API por clique. As duas faixas de tempo saem na mesma request.
- Interação com prédios do Mapbox Standard usa recursos do próprio mapa carregado; não é cobrada como uma API separada.
- Se adicionarmos autocomplete, Search Box API, Directions, Matrix, Navigation SDK ou tilesets customizados, o custo deve ser reavaliado.
- Se passarmos a armazenar resultados de geocoding permanentemente, será necessário usar Permanent Geocoding API e reavaliar preço/termos.
- O token público do frontend deve ter restrição de domínio/origin no console da Mapbox para reduzir risco de uso indevido.
- O orçamento real deve ser acompanhado no painel de estatísticas/billing da Mapbox, porque cobranças são consolidadas por conta e token.
