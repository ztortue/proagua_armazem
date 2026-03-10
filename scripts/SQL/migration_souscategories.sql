-- ============================================================
-- MIGRATION SOUSCATEGORIES MANKAN + ASIYASYON MATERYEL
-- ProAgua ERP - SUEZ International
-- ============================================================
-- LÒD EKZEKISYON:
--   1. INSERT souscategories nouvo yo
--   2. UPDATE api_materiel ak souscategorie_id korrèk
--   3. SELECT verifye final
-- ============================================================


-- ============================================================
-- ETAP 1: INSERT SOUSCATEGORIES NOUVO YO
-- ============================================================

-- ---- TUBOS_PVC (categorie_id = 4) ----
INSERT INTO api_souscategorie (nom, description, categorie_id) VALUES
    ('TUBO_PVC_GERAL',       'Tubos PVC gerais (silicone, polyurethane, ar)',  4),
    ('ACESSORIO_PVC',        'Acessórios PVC: flanges, braçadeiras, barras',   4),
    ('COLA_FIXADOR_PVC',     'Colas, fixadores e produtos químicos PVC',       4)
ON CONFLICT DO NOTHING;

-- ---- TUBOS_METAL (categorie_id = 7) ----
INSERT INTO api_souscategorie (nom, description, categorie_id) VALUES
    ('TUBO_GALVANIZADO',     'Tubos galvanizados de vários diâmetros',         7),
    ('VARÃO_ROSCADO',        'Varões e hastes roscadas galvanizadas',          7)
ON CONFLICT DO NOTHING;

-- ---- COTOVELOS / CONEXÕES (categorie_id = 13) ----
INSERT INTO api_souscategorie (nom, description, categorie_id) VALUES
    ('JOELHO_CONEXAO',       'Joelhos e cotovelos de ligação (PVC, galv, inox)', 13),
    ('TE_CONEXAO',           'Tês de ligação simples e de redução',              13),
    ('UNIAO_REDUCAO',        'Uniões, reduções e niples de ligação',             13),
    ('COLARINHO',            'Colarinhos com oring PVC e PE',                    13),
    ('BUCHA_CASQUILHO',      'Buchas metálicas/plásticas e casquilhos',          13),
    ('FERRAMENTA_CONSUMIVEL','Ferramentas, consumíveis e produtos químicos',      13)
ON CONFLICT DO NOTHING;

-- ---- BOMBAS_SUPERFICIE (categorie_id = 43) ----
INSERT INTO api_souscategorie (nom, description, categorie_id) VALUES
    ('BOMBA_SUPERFICIE',     'Bombas de superfície: rotor, vácuo, booster',    43),
    ('COMPRESSOR',           'Compressores de ar e parafuso',                  43),
    ('VENTILADOR_MOTOR',     'Ventiladores axiais e motores associados',       43),
    ('GERADOR',              'Geradores diesel e grupos electrogéneos',        43),
    ('EQUIPAMENTO_ELEVACAO', 'Empilhadeiras, gruas, guinchos',                 43)
ON CONFLICT DO NOTHING;


-- ============================================================
-- ETAP 2: UPDATE api_materiel — ASIYE souscategorie_id
-- ============================================================
-- NB: Kouri SELECT ki anba a avan pou jwenn IDs reèl yo,
--     paske IDs yo depann de sekans baz ou a.
-- ============================================================

-- Jwenn IDs souscategories yo (kouri sa pou konfime avan UPDATE)
SELECT id, nom, categorie_id
FROM api_souscategorie
WHERE categorie_id IN (1, 4, 7, 13, 23, 27, 40, 43, 59)
ORDER BY categorie_id, id;


-- ============================================================
-- TUBOS PEHD (categorie_id = 1)
-- ============================================================
UPDATE api_materiel SET souscategorie_id = (
    SELECT id FROM api_souscategorie WHERE nom = 'PEAD PE100' AND categorie_id = 1
)
WHERE categorie_id = 1 AND UPPER(description) LIKE '%PE100%';

UPDATE api_materiel SET souscategorie_id = (
    SELECT id FROM api_souscategorie WHERE nom = 'PEAD PE80' AND categorie_id = 1
)
WHERE categorie_id = 1 AND UPPER(description) LIKE '%PE80%';


-- ============================================================
-- TUBOS PVC (categorie_id = 4)
-- ============================================================
-- Tubos PVC dirèk
UPDATE api_materiel SET souscategorie_id = (
    SELECT id FROM api_souscategorie WHERE nom = 'TUBO_PVC_PRESSAO' AND categorie_id = 4
)
WHERE categorie_id = 4
  AND UPPER(description) LIKE '%TUBO PVC%'
  AND (UPPER(description) LIKE '%PRESS%' OR UPPER(description) LIKE '%PN%');

UPDATE api_materiel SET souscategorie_id = (
    SELECT id FROM api_souscategorie WHERE nom = 'TUBO_PVC_GERAL' AND categorie_id = 4
)
WHERE categorie_id = 4
  AND souscategorie_id IS NULL
  AND (UPPER(description) LIKE '%TUBO%' OR UPPER(code) LIKE '%-TUB-%');

-- Acessórios PVC (flanges, braçadeiras, barras, rodas, sinais)
UPDATE api_materiel SET souscategorie_id = (
    SELECT id FROM api_souscategorie WHERE nom = 'ACESSORIO_PVC' AND categorie_id = 4
)
WHERE categorie_id = 4
  AND souscategorie_id IS NULL
  AND (
    UPPER(code) LIKE '%-BRA-%'
    OR UPPER(code) LIKE '%-FAL-%'
    OR UPPER(code) LIKE '%-BAR-%'
    OR UPPER(code) LIKE '%-ROD-%'
    OR UPPER(code) LIKE '%-SIN-%'
    OR UPPER(code) LIKE '%-COM-%'
  );

-- Colas e fixadores
UPDATE api_materiel SET souscategorie_id = (
    SELECT id FROM api_souscategorie WHERE nom = 'COLA_FIXADOR_PVC' AND categorie_id = 4
)
WHERE categorie_id = 4
  AND souscategorie_id IS NULL
  AND UPPER(code) LIKE '%-COL-%';


-- ============================================================
-- TUBOS METAL (categorie_id = 7)
-- ============================================================
UPDATE api_materiel SET souscategorie_id = (
    SELECT id FROM api_souscategorie WHERE nom = 'VARÃO_ROSCADO' AND categorie_id = 7
)
WHERE categorie_id = 7 AND UPPER(code) LIKE '%-VAR-%';

UPDATE api_materiel SET souscategorie_id = (
    SELECT id FROM api_souscategorie WHERE nom = 'TUBO_GALVANIZADO' AND categorie_id = 7
)
WHERE categorie_id = 7 AND souscategorie_id IS NULL;


-- ============================================================
-- COTOVELOS / CONEXÕES (categorie_id = 13)
-- ============================================================
-- Joelhos
UPDATE api_materiel SET souscategorie_id = (
    SELECT id FROM api_souscategorie WHERE nom = 'JOELHO_CONEXAO' AND categorie_id = 13
)
WHERE categorie_id = 13
  AND (UPPER(code) LIKE '%-JOE-%' OR UPPER(code) LIKE '%-COT-%');

-- Tês
UPDATE api_materiel SET souscategorie_id = (
    SELECT id FROM api_souscategorie WHERE nom = 'TE_CONEXAO' AND categorie_id = 13
)
WHERE categorie_id = 13
  AND (UPPER(code) LIKE '%-TEP-%' OR UPPER(code) LIKE '%-TEI-%');

-- Uniões e reduções
UPDATE api_materiel SET souscategorie_id = (
    SELECT id FROM api_souscategorie WHERE nom = 'UNIAO_REDUCAO' AND categorie_id = 13
)
WHERE categorie_id = 13
  AND (UPPER(code) LIKE '%-UNI-%' OR UPPER(code) LIKE '%-RED-%' OR UPPER(code) LIKE '%-NIP-%');

-- Colarinhos
UPDATE api_materiel SET souscategorie_id = (
    SELECT id FROM api_souscategorie WHERE nom = 'COLARINHO' AND categorie_id = 13
)
WHERE categorie_id = 13 AND UPPER(code) LIKE '%-CLR-%';

-- Buchas e casquilhos
UPDATE api_materiel SET souscategorie_id = (
    SELECT id FROM api_souscategorie WHERE nom = 'BUCHA_CASQUILHO' AND categorie_id = 13
)
WHERE categorie_id = 13
  AND (UPPER(code) LIKE '%-BUC-%' OR UPPER(code) LIKE '%-CAS-%');

-- Tudo resto (ferramentas, consumíveis, produtos químicos)
UPDATE api_materiel SET souscategorie_id = (
    SELECT id FROM api_souscategorie WHERE nom = 'FERRAMENTA_CONSUMIVEL' AND categorie_id = 13
)
WHERE categorie_id = 13 AND souscategorie_id IS NULL;


-- ============================================================
-- JUNTAS (categorie_id = 23)
-- ============================================================
UPDATE api_materiel SET souscategorie_id = (
    SELECT id FROM api_souscategorie WHERE nom = 'JUNTA_BORRACHA' AND categorie_id = 23
)
WHERE categorie_id = 23
  AND (UPPER(description) LIKE '%NITRILA%'
    OR UPPER(description) LIKE '%BORRACHA%'
    OR UPPER(code) LIKE '%-COR-%');

UPDATE api_materiel SET souscategorie_id = (
    SELECT id FROM api_souscategorie WHERE nom = 'JUNTA_MECANICA' AND categorie_id = 23
)
WHERE categorie_id = 23 AND souscategorie_id IS NULL;


-- ============================================================
-- VÁLVULAS (categorie_id = 27)
-- ============================================================
UPDATE api_materiel SET souscategorie_id = (
    SELECT id FROM api_souscategorie WHERE nom = 'VALVULA_BORBOLETA' AND categorie_id = 27
)
WHERE categorie_id = 27
  AND (UPPER(description) LIKE '%BORBOL%' OR UPPER(description) LIKE '%BORBUL%');

UPDATE api_materiel SET souscategorie_id = (
    SELECT id FROM api_souscategorie WHERE nom = 'VALVULA_GAVETA' AND categorie_id = 27
)
WHERE categorie_id = 27 AND UPPER(description) LIKE '%GAVETA%';

-- Tout lòt válvulas → VALVULA_GAVETA pa default (ou ka kreye VALVULA_AUTRE)
UPDATE api_materiel SET souscategorie_id = (
    SELECT id FROM api_souscategorie WHERE nom = 'VALVULA_GAVETA' AND categorie_id = 27
)
WHERE categorie_id = 27 AND souscategorie_id IS NULL;


-- ============================================================
-- BOMBAS SUBMERSÍVEIS (categorie_id = 40)
-- ============================================================
UPDATE api_materiel SET souscategorie_id = (
    SELECT id FROM api_souscategorie WHERE nom = 'BOMBA_FURO' AND categorie_id = 40
)
WHERE categorie_id = 40;


-- ============================================================
-- BOMBAS SUPERFICIE (categorie_id = 43)
-- ============================================================
UPDATE api_materiel SET souscategorie_id = (
    SELECT id FROM api_souscategorie WHERE nom = 'BOMBA_SUPERFICIE' AND categorie_id = 43
)
WHERE categorie_id = 43 AND UPPER(code) LIKE '%-BOM-%';

UPDATE api_materiel SET souscategorie_id = (
    SELECT id FROM api_souscategorie WHERE nom = 'COMPRESSOR' AND categorie_id = 43
)
WHERE categorie_id = 43 AND UPPER(code) LIKE '%-COM-%';

UPDATE api_materiel SET souscategorie_id = (
    SELECT id FROM api_souscategorie WHERE nom = 'VENTILADOR_MOTOR' AND categorie_id = 43
)
WHERE categorie_id = 43
  AND (UPPER(code) LIKE '%-VEN-%' OR UPPER(code) LIKE '%-MOT-%');

UPDATE api_materiel SET souscategorie_id = (
    SELECT id FROM api_souscategorie WHERE nom = 'GERADOR' AND categorie_id = 43
)
WHERE categorie_id = 43 AND UPPER(code) LIKE '%-GER-%';

UPDATE api_materiel SET souscategorie_id = (
    SELECT id FROM api_souscategorie WHERE nom = 'EQUIPAMENTO_ELEVACAO' AND categorie_id = 43
)
WHERE categorie_id = 43
  AND (UPPER(code) LIKE '%-EMP-%'
    OR UPPER(code) LIKE '%-GRU-%'
    OR UPPER(code) LIKE '%-GUI-%'
    OR UPPER(code) LIKE '%-ENG-%');


-- ============================================================
-- ANALISADORES (categorie_id = 59)
-- ============================================================
UPDATE api_materiel SET souscategorie_id = (
    SELECT id FROM api_souscategorie WHERE nom = 'ANALISADOR_CLORO' AND categorie_id = 59
)
WHERE categorie_id = 59 AND UPPER(description) LIKE '%CLORO%';


-- ============================================================
-- ETAP 3: VERIFYE FINAL
-- ============================================================

-- Konbyen ki toujou NULL pa categorie
SELECT
    m.categorie_id,
    c.nom AS categorie_nom,
    COUNT(*) AS total_null
FROM api_materiel m
JOIN api_categorie c ON m.categorie_id = c.id
WHERE m.souscategorie_id IS NULL
  AND m.categorie_id IN (1, 4, 7, 13, 23, 27, 40, 43, 59)
GROUP BY m.categorie_id, c.nom
ORDER BY m.categorie_id;

-- Distribisyon final souscategorie pa categorie
SELECT
    sc.categorie_id,
    c.nom  AS categorie_nom,
    sc.nom AS souscategorie_nom,
    COUNT(m.id) AS nb_materiels
FROM api_souscategorie sc
JOIN api_categorie c ON sc.categorie_id = c.id
LEFT JOIN api_materiel m ON m.souscategorie_id = sc.id
WHERE sc.categorie_id IN (1, 4, 7, 13, 23, 27, 40, 43, 59)
GROUP BY sc.categorie_id, c.nom, sc.nom
ORDER BY sc.categorie_id, sc.nom;
