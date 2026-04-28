# POC - Ativos de Meteorologia (Repositorio Independente)

## 1) Objetivo

Documentar uma POC em **repo independente** para validar:

- Mapbox para visualizacao interativa dos ativos;
- PostGIS para armazenamento e consultas geoespaciais;
- importacao de KML (QGIS);
- desenho de poligonos via Mapbox Draw;
- cenario com ponto do ativo + area de cobertura do ativo.

## 2) Premissas Tecnicas

1. SRID padrao da POC: **4326** (WGS84) em todas as geometrias.
2. Nao usar `4674` nesta POC.
3. Cada ativo de meteorologia tera:
- localizacao do ativo como ponto (`POINT`);
- status do entregavel;
- area de cobertura como `POLYGON`/`MULTIPOLYGON` (quando houver).
4. O municipio do ponto sera obrigatorio para permitir filtro por UF sem redundancia.
5. O ID do ativo especializado sera o mesmo ID da tabela base:
- `meteorology_asset.infrastructure_point_id = infrastructure_point.id`.

## 3) Modelo de Dados da POC

### 3.1 Enum de status

```sql
CREATE TYPE meteorology_status_enum AS ENUM (
    'NOT_STARTED',
    'STARTED',
    'COMPLETED'
);
```

Mapeamento:

- `NOT_STARTED` = Nao Iniciado
- `STARTED` = Iniciado
- `COMPLETED` = Concluido

### 3.2 Municipio (base territorial opcional para filtro/consulta)

```sql
CREATE TABLE IF NOT EXISTS municipality
(
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ibge_code  VARCHAR(7) UNIQUE NOT NULL,
    name       VARCHAR(120) NOT NULL,
    state_code CHAR(2) NOT NULL,
    geometry   geometry(MultiPolygon, 4326) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_municipality_geom
    ON municipality USING GIST (geometry);

CREATE INDEX IF NOT EXISTS idx_municipality_state
    ON municipality (state_code);
```

### 3.3 Tabela base geoespacial: `infrastructure_point`

```sql
CREATE TABLE IF NOT EXISTS infrastructure_point
(
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    municipality_id  UUID NOT NULL,
    name             VARCHAR(255) NULL,
    description      TEXT NULL,
    geometry         geometry(Point, 4326) NOT NULL,
    inserted_at      TIMESTAMP(6) NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMP(6) NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_infrastructure_point_municipality
        FOREIGN KEY (municipality_id)
        REFERENCES municipality (id)
);

CREATE INDEX IF NOT EXISTS idx_infrastructure_point_geom
    ON infrastructure_point USING GIST (geometry);

CREATE INDEX IF NOT EXISTS idx_infrastructure_point_municipality
    ON infrastructure_point (municipality_id);
```

### 3.4 Tabela especializada: `meteorology_asset`

```sql
CREATE TABLE IF NOT EXISTS meteorology_asset
(
    infrastructure_point_id UUID PRIMARY KEY,
    station_code            VARCHAR(100) NOT NULL UNIQUE,
    status                  meteorology_status_enum NOT NULL DEFAULT 'NOT_STARTED',

    -- cobertura do ativo (o que aquele ponto cobre)
    coverage_geometry       geometry(Geometry, 4326) NULL,
    coverage_source         VARCHAR(20) NOT NULL DEFAULT 'DRAW', -- DRAW | KML

    -- opcional para validacao de modelo 3D
    model_3d_url            TEXT NULL,

    inserted_at             TIMESTAMP(6) NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP(6) NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_meteorology_asset_infrastructure_point
        FOREIGN KEY (infrastructure_point_id)
        REFERENCES infrastructure_point (id)
        ON DELETE CASCADE,

    CONSTRAINT chk_meteorology_asset_coverage_srid
        CHECK (
            coverage_geometry IS NULL
            OR (
                ST_SRID(coverage_geometry) = 4326
                AND GeometryType(coverage_geometry) IN ('POLYGON', 'MULTIPOLYGON')
            )
        )
);

CREATE INDEX IF NOT EXISTS idx_meteorology_asset_status
    ON meteorology_asset (status);

CREATE INDEX IF NOT EXISTS idx_meteorology_asset_coverage_geom
    ON meteorology_asset USING GIST (coverage_geometry);
```

## 4) Estrategia para cobertura entre municipios

Nesta POC, a cobertura **nao e rateio por municipio**. Ela serve apenas para representar no mapa a area atendida/impactada pelo ativo.

Regra simples:

1. O ativo continua sendo um ponto em `infrastructure_point.geometry`.
2. A cobertura fica em `meteorology_asset.coverage_geometry`.
3. Se a cobertura cruzar 1, 2 ou 3 municipios, isso e natural e permitido.
4. Quando precisar saber municipios afetados, faz consulta espacial sob demanda (`ST_Intersects`), sem persistir area de interseccao.

Exemplo de consulta sob demanda:

```sql
SELECT DISTINCT
    m.id,
    m.name,
    m.state_code
FROM meteorology_asset ma
JOIN municipality m
    ON ma.coverage_geometry IS NOT NULL
   AND ST_Intersects(ma.coverage_geometry, m.geometry)
WHERE ma.infrastructure_point_id = :asset_id;
```

## 5) Exemplo de entidade JPA (padrao `@MapsId`)

```java
@Entity
@Table(name = "meteorology_asset")
@AttributeOverride(
    name = "id",
    column = @Column(name = "infrastructure_point_id", nullable = false, updatable = false)
)
public class MeteorologyAssetEntity extends AuditableJpaEntity<UUID> {

    @Column(name = "station_code", nullable = false, length = 100)
    private String stationCode;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "status", nullable = false, columnDefinition = "meteorology_status_enum")
    private MeteorologyStatus status;

    @JdbcTypeCode(SqlTypes.GEOMETRY)
    @Column(name = "coverage_geometry", columnDefinition = "geometry(Geometry,4326)")
    private org.locationtech.jts.geom.Geometry coverageGeometry;

    @Column(name = "coverage_source", nullable = false)
    private String coverageSource;

    @Column(name = "model_3d_url")
    private String model3dUrl;

    @MapsId
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "infrastructure_point_id")
    private InfrastructurePointEntity infrastructurePoint;
}
```

### Relacao de IDs

- Cria primeiro em `infrastructure_point` -> gera `id`.
- Usa esse mesmo `id` em `meteorology_asset.infrastructure_point_id`.
- `infrastructure_point_id` e PK + FK da tabela especializada.

## 6) Fluxo funcional da POC

1. Importacao KML (QGIS):
- endpoint recebe `.kml`;
- parser converte para WKT/GeoJSON;
- grava ponto em `infrastructure_point.geometry`;
- grava cobertura (quando existir) em `meteorology_asset.coverage_geometry`.

2. Draw no Mapbox:
- usuario desenha poligono;
- frontend envia GeoJSON;
- backend converte para `geometry(4326)` e atualiza `coverage_geometry`.

3. Filtros de tela:
- por UF (via `municipality.state_code`) e `status`;
- mapa atualiza em tempo real.

4. Clique no ponto:
- retorna detalhes do ativo + geometria de cobertura.

## 7) Exemplos de inserts

```sql
-- 1) ponto do ativo
INSERT INTO infrastructure_point (
    id, municipality_id, name, description, geometry
) VALUES (
    '8fca390a-e775-4ea9-a0ac-0534f248d3ea',
    '34d598b5-8712-4d2d-a47d-031ce04efe22',
    'Estacao Meteo - PA 001',
    'Ativo de referencia da POC',
    ST_GeomFromText('POINT(-48.4902 -1.4558)', 4326)
);

-- 2) especializacao meteorologica com o MESMO id
INSERT INTO meteorology_asset (
    infrastructure_point_id, station_code, status, coverage_source, coverage_geometry
) VALUES (
    '8fca390a-e775-4ea9-a0ac-0534f248d3ea',
    'PA-001',
    'STARTED',
    'KML',
    ST_GeomFromText(
        'POLYGON((-48.52 -1.47, -48.46 -1.47, -48.46 -1.43, -48.52 -1.43, -48.52 -1.47))',
        4326
    )
);
```

## 8) Exemplo de cruzamento com dado externo + filtro por UF

```sql
SELECT
    ma.infrastructure_point_id,
    ma.station_code,
    SUM(r.monthly_income) AS total_income
FROM meteorology_asset ma
JOIN infrastructure_point ip
    ON ip.id = ma.infrastructure_point_id
JOIN municipality m
    ON m.id = ip.municipality_id
JOIN census_income r
    ON ma.coverage_geometry IS NOT NULL
   AND ST_Intersects(ma.coverage_geometry, r.geometry)
WHERE m.state_code = :state_code
  AND ma.status = 'STARTED'
GROUP BY ma.infrastructure_point_id, ma.station_code;
```

## 9) Checklist objetivo da POC

- [ ] Cadastrar 90 ativos meteorologicos com ponto (4326)
- [ ] Garantir filtro por estado e status
- [ ] Importar pelo menos 1 KML com sucesso
- [ ] Desenhar e persistir cobertura via Mapbox Draw
- [ ] Exibir cobertura mesmo cruzando mais de um municipio
- [ ] Executar 1 consulta de intersecao PostGIS com dado externo
- [ ] Validar renderizacao de 1 modelo 3D

---

Resumo: POC independente, simples, com `POINT` para localizacao do ativo e `POLYGON/MULTIPOLYGON` para representar cobertura, ambos em SRID 4326.
