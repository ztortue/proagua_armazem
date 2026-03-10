-- ============================================================
-- MIGRATION SOUSCATEGORIES - ProAgua ERP
-- FORMAT: Yon sèl blòk DO $$ pou pgAdmin4
-- Kouri tout fichye a yon sèl fwa: F5 oswa bouton Execute
-- ============================================================

DO $$
DECLARE
    sc_id INTEGER;
BEGIN

    -- ============================================================
    -- ETAP 1: INSERT SOUSCATEGORIES NOUVO YO
    -- ============================================================

    -- TUBOS_PVC (categorie_id=4)
    INSERT INTO api_souscategorie (nom, description, categorie_id)
    VALUES ('TUBO_PVC_GERAL', 'Tubos PVC gerais (silicone, polyurethane, ar)', 4)
    ON CONFLICT DO NOTHING;

    INSERT INTO api_souscategorie (nom, description, categorie_id)
    VALUES ('ACESSORIO_PVC', 'Acessórios PVC: flanges, braçadeiras, barras', 4)
    ON CONFLICT DO NOTHING;

    INSERT INTO api_souscategorie (nom, description, categorie_id)
    VALUES ('COLA_FIXADOR_PVC', 'Colas, fixadores e produtos químicos PVC', 4)
    ON CONFLICT DO NOTHING;

    -- TUBOS_METAL (categorie_id=7)
    INSERT INTO api_souscategorie (nom, description, categorie_id)
    VALUES ('TUBO_GALVANIZADO', 'Tubos galvanizados de vários diâmetros', 7)
    ON CONFLICT DO NOTHING;

    INSERT INTO api_souscategorie (nom, description, categorie_id)
    VALUES ('VARAO_ROSCADO', 'Varões e hastes roscadas galvanizadas', 7)
    ON CONFLICT DO NOTHING;

    -- COTOVELOS / CONEXOES (categorie_id=13)
    INSERT INTO api_souscategorie (nom, description, categorie_id)
    VALUES ('JOELHO_CONEXAO', 'Joelhos e cotovelos de ligação (PVC, galv, inox)', 13)
    ON CONFLICT DO NOTHING;

    INSERT INTO api_souscategorie (nom, description, categorie_id)
    VALUES ('TE_CONEXAO', 'Tês de ligação simples e de redução', 13)
    ON CONFLICT DO NOTHING;

    INSERT INTO api_souscategorie (nom, description, categorie_id)
    VALUES ('UNIAO_REDUCAO', 'Uniões, reduções e niples de ligação', 13)
    ON CONFLICT DO NOTHING;

    INSERT INTO api_souscategorie (nom, description, categorie_id)
    VALUES ('COLARINHO', 'Colarinhos com oring PVC e PE', 13)
    ON CONFLICT DO NOTHING;

    INSERT INTO api_souscategorie (nom, description, categorie_id)
    VALUES ('BUCHA_CASQUILHO', 'Buchas metálicas/plásticas e casquilhos', 13)
    ON CONFLICT DO NOTHING;

    INSERT INTO api_souscategorie (nom, description, categorie_id)
    VALUES ('FERRAMENTA_CONSUMIVEL', 'Ferramentas, consumíveis e produtos químicos', 13)
    ON CONFLICT DO NOTHING;

    -- BOMBAS SUPERFICIE (categorie_id=43)
    INSERT INTO api_souscategorie (nom, description, categorie_id)
    VALUES ('BOMBA_SUPERFICIE', 'Bombas de superfície: rotor, vácuo, booster', 43)
    ON CONFLICT DO NOTHING;

    INSERT INTO api_souscategorie (nom, description, categorie_id)
    VALUES ('COMPRESSOR', 'Compressores de ar e parafuso', 43)
    ON CONFLICT DO NOTHING;

    INSERT INTO api_souscategorie (nom, description, categorie_id)
    VALUES ('VENTILADOR_MOTOR', 'Ventiladores axiais e motores associados', 43)
    ON CONFLICT DO NOTHING;

    INSERT INTO api_souscategorie (nom, description, categorie_id)
    VALUES ('GERADOR', 'Geradores diesel e grupos electrogéneos', 43)
    ON CONFLICT DO NOTHING;

    INSERT INTO api_souscategorie (nom, description, categorie_id)
    VALUES ('EQUIPAMENTO_ELEVACAO', 'Empilhadeiras, gruas, guinchos', 43)
    ON CONFLICT DO NOTHING;

    -- MATERIEL DIVERS (categorie_id=57)
    INSERT INTO api_souscategorie (nom, description, categorie_id)
    VALUES ('FIXACAO_PARAFUSO', 'Parafusos, porcas, anilhas e fixadores', 57)
    ON CONFLICT DO NOTHING;

    INSERT INTO api_souscategorie (nom, description, categorie_id)
    VALUES ('CONSUMIVEL_MANUTENCAO', 'Óleos, graxas, adesivos, fitas, lixas', 57)
    ON CONFLICT DO NOTHING;

    INSERT INTO api_souscategorie (nom, description, categorie_id)
    VALUES ('EQUIPAMENTO_PROTECAO', 'Cintas, estropos, equipamentos de elevação e segurança', 57)
    ON CONFLICT DO NOTHING;

    INSERT INTO api_souscategorie (nom, description, categorie_id)
    VALUES ('MATERIAL_ELETRICO_DIVERS', 'Disjuntores, tomadas, cabos e material eléctrico diverso', 57)
    ON CONFLICT DO NOTHING;

    INSERT INTO api_souscategorie (nom, description, categorie_id)
    VALUES ('MOBILIARIO_ESCRITORIO', 'Mobiliário, cadeiras, mesas e material de escritório', 57)
    ON CONFLICT DO NOTHING;

    INSERT INTO api_souscategorie (nom, description, categorie_id)
    VALUES ('OUTROS_DIVERS', 'Outros materiais diversos não classificados', 57)
    ON CONFLICT DO NOTHING;

    -- PECAS BOMBA (categorie_id=62)
    INSERT INTO api_souscategorie (nom, description, categorie_id)
    VALUES ('EIXO_HELICE', 'Eixos, hélices e peças rotativas de bomba', 62)
    ON CONFLICT DO NOTHING;

    INSERT INTO api_souscategorie (nom, description, categorie_id)
    VALUES ('MOTOR_AGITADOR', 'Motores e agitadores de bomba', 62)
    ON CONFLICT DO NOTHING;

    INSERT INTO api_souscategorie (nom, description, categorie_id)
    VALUES ('MANGA_PECA', 'Mangas e peças de desgaste de bomba', 62)
    ON CONFLICT DO NOTHING;

    -- INSTRUMENTACAO (categorie_id=66)
    INSERT INTO api_souscategorie (nom, description, categorie_id)
    VALUES ('MANOMETRO_SENSOR', 'Manómetros, sensores e transmissores de nível/pressão', 66)
    ON CONFLICT DO NOTHING;

    INSERT INTO api_souscategorie (nom, description, categorie_id)
    VALUES ('DETECTOR_GAS', 'Detectores de gás e equipamentos de análise', 66)
    ON CONFLICT DO NOTHING;

    INSERT INTO api_souscategorie (nom, description, categorie_id)
    VALUES ('MODULO_CONTROLO', 'Módulos de expansão, controladores e automação', 66)
    ON CONFLICT DO NOTHING;

    -- EPI (categorie_id=72 e 73)
    INSERT INTO api_souscategorie (nom, description, categorie_id)
    VALUES ('EPI_RESPIRATORIO', 'Máscaras, respiradores e cartuchos de protecção respiratória', 72)
    ON CONFLICT DO NOTHING;

    INSERT INTO api_souscategorie (nom, description, categorie_id)
    VALUES ('EPI_CORPORAL', 'Fatos, luvas, botas e capacetes de protecção', 72)
    ON CONFLICT DO NOTHING;

    INSERT INTO api_souscategorie (nom, description, categorie_id)
    VALUES ('EPI_INCENDIO', 'Extintores e sinalização de segurança contra incêndio', 72)
    ON CONFLICT DO NOTHING;

    INSERT INTO api_souscategorie (nom, description, categorie_id)
    VALUES ('FATO_PROTECAO', 'Fatos macaco e vestuário de protecção química', 73)
    ON CONFLICT DO NOTHING;

    -- FERRAMENTAS MANUAIS (categorie_id=76)
    INSERT INTO api_souscategorie (nom, description, categorie_id)
    VALUES ('CHAVE_BOCA_CAIXA', 'Chaves de boca, caixa e catraca', 76)
    ON CONFLICT DO NOTHING;

    INSERT INTO api_souscategorie (nom, description, categorie_id)
    VALUES ('BROCA_CORTE', 'Brocas, limas, serras e ferramentas de corte', 76)
    ON CONFLICT DO NOTHING;

    INSERT INTO api_souscategorie (nom, description, categorie_id)
    VALUES ('MACACO_ELEVACAO', 'Macacos, andaimes e equipamentos de elevação manual', 76)
    ON CONFLICT DO NOTHING;

    INSERT INTO api_souscategorie (nom, description, categorie_id)
    VALUES ('MARTELO_PERCUSSAO', 'Martelos, marretas e ferramentas de percussão', 76)
    ON CONFLICT DO NOTHING;

    -- ALICATES (categorie_id=77)
    INSERT INTO api_souscategorie (nom, description, categorie_id)
    VALUES ('ALICATE_GERAL', 'Alicates universais, de corte e de pressão', 77)
    ON CONFLICT DO NOTHING;

    -- FERRAMENTAS ELECTRICAS (categorie_id=78)
    INSERT INTO api_souscategorie (nom, description, categorie_id)
    VALUES ('BERBEQUIM_APARAFUSADORA', 'Berbequins, aparafusadoras e brocas', 78)
    ON CONFLICT DO NOTHING;

    INSERT INTO api_souscategorie (nom, description, categorie_id)
    VALUES ('REBARBADEIRA', 'Rebarbadeiras e discos de corte', 78)
    ON CONFLICT DO NOTHING;

    -- SOLDADURA (categorie_id=79)
    INSERT INTO api_souscategorie (nom, description, categorie_id)
    VALUES ('FERRO_SOLDAR', 'Ferros de soldar e acessórios de soldadura', 79)
    ON CONFLICT DO NOTHING;

    -- ELETRICO GERAL (categorie_id=85)
    INSERT INTO api_souscategorie (nom, description, categorie_id)
    VALUES ('CABO_TERMINAL', 'Cabos, terminais e ligadores eléctricos', 85)
    ON CONFLICT DO NOTHING;

    INSERT INTO api_souscategorie (nom, description, categorie_id)
    VALUES ('DISJUNTOR_PROTECAO', 'Disjuntores, fusíveis e dispositivos de protecção', 85)
    ON CONFLICT DO NOTHING;

    INSERT INTO api_souscategorie (nom, description, categorie_id)
    VALUES ('TOMADA_INTERRUPTOR', 'Tomadas, interruptores e fêmeas eléctricas', 85)
    ON CONFLICT DO NOTHING;

    INSERT INTO api_souscategorie (nom, description, categorie_id)
    VALUES ('ILUMINACAO', 'Lâmpadas LED e luminárias', 85)
    ON CONFLICT DO NOTHING;

    INSERT INTO api_souscategorie (nom, description, categorie_id)
    VALUES ('QUADRO_ELETRICO', 'Quadros eléctricos e calhas de distribuição', 85)
    ON CONFLICT DO NOTHING;

    RAISE NOTICE '✅ ETAP 1 TERMINE: Souscategories inseri';

    -- ============================================================
    -- ETAP 2: UPDATE api_materiel — ASIYE souscategorie_id
    -- ============================================================

    -- ---- TUBOS PEHD (categorie_id=1) ----
    UPDATE api_materiel SET souscategorie_id = (
        SELECT id FROM api_souscategorie WHERE nom = 'PEAD PE100' AND categorie_id = 1 LIMIT 1)
    WHERE categorie_id = 1 AND UPPER(description) LIKE '%PE100%';

    UPDATE api_materiel SET souscategorie_id = (
        SELECT id FROM api_souscategorie WHERE nom = 'PEAD PE80' AND categorie_id = 1 LIMIT 1)
    WHERE categorie_id = 1 AND souscategorie_id IS NULL;

    -- ---- TUBOS PVC (categorie_id=4) ----
    UPDATE api_materiel SET souscategorie_id = (
        SELECT id FROM api_souscategorie WHERE nom = 'TUBO_PVC_PRESSAO' AND categorie_id = 4 LIMIT 1)
    WHERE categorie_id = 4
      AND UPPER(description) LIKE '%TUBO PVC%'
      AND (UPPER(description) LIKE '%PRESS%' OR UPPER(description) LIKE '%PN%');

    UPDATE api_materiel SET souscategorie_id = (
        SELECT id FROM api_souscategorie WHERE nom = 'TUBO_PVC_GERAL' AND categorie_id = 4 LIMIT 1)
    WHERE categorie_id = 4
      AND souscategorie_id IS NULL
      AND (UPPER(code) LIKE '%-TUB-%' OR UPPER(description) LIKE '%TUBO%');

    UPDATE api_materiel SET souscategorie_id = (
        SELECT id FROM api_souscategorie WHERE nom = 'COLA_FIXADOR_PVC' AND categorie_id = 4 LIMIT 1)
    WHERE categorie_id = 4
      AND souscategorie_id IS NULL
      AND UPPER(code) LIKE '%-COL-%';

    UPDATE api_materiel SET souscategorie_id = (
        SELECT id FROM api_souscategorie WHERE nom = 'ACESSORIO_PVC' AND categorie_id = 4 LIMIT 1)
    WHERE categorie_id = 4 AND souscategorie_id IS NULL;

    -- ---- TUBOS METAL (categorie_id=7) ----
    UPDATE api_materiel SET souscategorie_id = (
        SELECT id FROM api_souscategorie WHERE nom = 'VARAO_ROSCADO' AND categorie_id = 7 LIMIT 1)
    WHERE categorie_id = 7 AND UPPER(code) LIKE '%-VAR-%';

    UPDATE api_materiel SET souscategorie_id = (
        SELECT id FROM api_souscategorie WHERE nom = 'TUBO_GALVANIZADO' AND categorie_id = 7 LIMIT 1)
    WHERE categorie_id = 7 AND souscategorie_id IS NULL;

    -- ---- COTOVELOS / CONEXOES (categorie_id=13) ----
    UPDATE api_materiel SET souscategorie_id = (
        SELECT id FROM api_souscategorie WHERE nom = 'JOELHO_CONEXAO' AND categorie_id = 13 LIMIT 1)
    WHERE categorie_id = 13
      AND (UPPER(code) LIKE '%-JOE-%' OR UPPER(code) LIKE '%-COT-%');

    UPDATE api_materiel SET souscategorie_id = (
        SELECT id FROM api_souscategorie WHERE nom = 'TE_CONEXAO' AND categorie_id = 13 LIMIT 1)
    WHERE categorie_id = 13
      AND (UPPER(code) LIKE '%-TEP-%' OR UPPER(code) LIKE '%-TEI-%');

    UPDATE api_materiel SET souscategorie_id = (
        SELECT id FROM api_souscategorie WHERE nom = 'UNIAO_REDUCAO' AND categorie_id = 13 LIMIT 1)
    WHERE categorie_id = 13
      AND (UPPER(code) LIKE '%-UNI-%' OR UPPER(code) LIKE '%-RED-%' OR UPPER(code) LIKE '%-NIP-%');

    UPDATE api_materiel SET souscategorie_id = (
        SELECT id FROM api_souscategorie WHERE nom = 'COLARINHO' AND categorie_id = 13 LIMIT 1)
    WHERE categorie_id = 13 AND UPPER(code) LIKE '%-CLR-%';

    UPDATE api_materiel SET souscategorie_id = (
        SELECT id FROM api_souscategorie WHERE nom = 'BUCHA_CASQUILHO' AND categorie_id = 13 LIMIT 1)
    WHERE categorie_id = 13
      AND (UPPER(code) LIKE '%-BUC-%' OR UPPER(code) LIKE '%-CAS-%');

    UPDATE api_materiel SET souscategorie_id = (
        SELECT id FROM api_souscategorie WHERE nom = 'FERRAMENTA_CONSUMIVEL' AND categorie_id = 13 LIMIT 1)
    WHERE categorie_id = 13 AND souscategorie_id IS NULL;

    -- ---- JUNTAS (categorie_id=23) ----
    UPDATE api_materiel SET souscategorie_id = (
        SELECT id FROM api_souscategorie WHERE nom = 'JUNTA_BORRACHA' AND categorie_id = 23 LIMIT 1)
    WHERE categorie_id = 23
      AND (UPPER(description) LIKE '%NITRILA%'
        OR UPPER(description) LIKE '%BORRACHA%'
        OR UPPER(code) LIKE '%-COR-%');

    UPDATE api_materiel SET souscategorie_id = (
        SELECT id FROM api_souscategorie WHERE nom = 'JUNTA_MECANICA' AND categorie_id = 23 LIMIT 1)
    WHERE categorie_id = 23 AND souscategorie_id IS NULL;

    -- ---- VALVULAS (categorie_id=27) ----
    UPDATE api_materiel SET souscategorie_id = (
        SELECT id FROM api_souscategorie WHERE nom = 'VALVULA_BORBOLETA' AND categorie_id = 27 LIMIT 1)
    WHERE categorie_id = 27
      AND (UPPER(description) LIKE '%BORBOL%' OR UPPER(description) LIKE '%BORBUL%');

    UPDATE api_materiel SET souscategorie_id = (
        SELECT id FROM api_souscategorie WHERE nom = 'VALVULA_GAVETA' AND categorie_id = 27 LIMIT 1)
    WHERE categorie_id = 27 AND UPPER(description) LIKE '%GAVETA%';

    UPDATE api_materiel SET souscategorie_id = (
        SELECT id FROM api_souscategorie WHERE nom = 'VALVULA_GAVETA' AND categorie_id = 27 LIMIT 1)
    WHERE categorie_id = 27 AND souscategorie_id IS NULL;

    -- ---- BOMBAS SUBMERSIVEL (categorie_id=40) ----
    UPDATE api_materiel SET souscategorie_id = (
        SELECT id FROM api_souscategorie WHERE nom = 'BOMBA_FURO' AND categorie_id = 40 LIMIT 1)
    WHERE categorie_id = 40;

    -- ---- BOMBAS SUPERFICIE (categorie_id=43) ----
    UPDATE api_materiel SET souscategorie_id = (
        SELECT id FROM api_souscategorie WHERE nom = 'BOMBA_SUPERFICIE' AND categorie_id = 43 LIMIT 1)
    WHERE categorie_id = 43 AND UPPER(code) LIKE '%-BOM-%';

    UPDATE api_materiel SET souscategorie_id = (
        SELECT id FROM api_souscategorie WHERE nom = 'COMPRESSOR' AND categorie_id = 43 LIMIT 1)
    WHERE categorie_id = 43 AND UPPER(code) LIKE '%-COM-%';

    UPDATE api_materiel SET souscategorie_id = (
        SELECT id FROM api_souscategorie WHERE nom = 'VENTILADOR_MOTOR' AND categorie_id = 43 LIMIT 1)
    WHERE categorie_id = 43
      AND (UPPER(code) LIKE '%-VEN-%' OR UPPER(code) LIKE '%-MOT-%');

    UPDATE api_materiel SET souscategorie_id = (
        SELECT id FROM api_souscategorie WHERE nom = 'GERADOR' AND categorie_id = 43 LIMIT 1)
    WHERE categorie_id = 43 AND UPPER(code) LIKE '%-GER-%';

    UPDATE api_materiel SET souscategorie_id = (
        SELECT id FROM api_souscategorie WHERE nom = 'EQUIPAMENTO_ELEVACAO' AND categorie_id = 43 LIMIT 1)
    WHERE categorie_id = 43
      AND (UPPER(code) LIKE '%-EMP-%'
        OR UPPER(code) LIKE '%-GRU-%'
        OR UPPER(code) LIKE '%-GUI-%'
        OR UPPER(code) LIKE '%-ENG-%');

    -- ---- ANALISADORES (categorie_id=59) ----
    UPDATE api_materiel SET souscategorie_id = (
        SELECT id FROM api_souscategorie WHERE nom = 'ANALISADOR_CLORO' AND categorie_id = 59 LIMIT 1)
    WHERE categorie_id = 59 AND UPPER(description) LIKE '%CLORO%';

    UPDATE api_materiel SET souscategorie_id = (
        SELECT id FROM api_souscategorie WHERE nom = 'ANALISADOR_PH' AND categorie_id = 59 LIMIT 1)
    WHERE categorie_id = 59 AND souscategorie_id IS NULL;

    -- ---- MATERIEL DIVERS (categorie_id=57) ----
    UPDATE api_materiel SET souscategorie_id = (
        SELECT id FROM api_souscategorie WHERE nom = 'FIXACAO_PARAFUSO' AND categorie_id = 57 LIMIT 1)
    WHERE categorie_id = 57
      AND (UPPER(code) LIKE '%-PAR-%'
        OR UPPER(code) LIKE '%-POR-%'
        OR UPPER(code) LIKE '%-ANI-%'
        OR UPPER(code) LIKE '%-ARR-%');

    UPDATE api_materiel SET souscategorie_id = (
        SELECT id FROM api_souscategorie WHERE nom = 'CONSUMIVEL_MANUTENCAO' AND categorie_id = 57 LIMIT 1)
    WHERE categorie_id = 57
      AND souscategorie_id IS NULL
      AND (UPPER(code) LIKE '%-LAT-%'
        OR UPPER(code) LIKE '%-GRA-%'
        OR UPPER(code) LIKE '%-ADE-%'
        OR UPPER(code) LIKE '%-SIK-%'
        OR UPPER(code) LIKE '%-ISO-%'
        OR UPPER(code) LIKE '%-LIX-%'
        OR UPPER(code) LIKE '%-FOL-%'
        OR UPPER(code) LIKE '%-DIL-%'
        OR UPPER(code) LIKE '%-POW-%'
        OR UPPER(code) LIKE '%-OSH-%'
        OR UPPER(code) LIKE '%-BET-%');

    UPDATE api_materiel SET souscategorie_id = (
        SELECT id FROM api_souscategorie WHERE nom = 'EQUIPAMENTO_PROTECAO' AND categorie_id = 57 LIMIT 1)
    WHERE categorie_id = 57
      AND souscategorie_id IS NULL
      AND (UPPER(code) LIKE '%-EST-%'
        OR UPPER(code) LIKE '%-CIN-%'
        OR UPPER(code) LIKE '%-KWB-%'
        OR UPPER(code) LIKE '%-MUL-%');

    UPDATE api_materiel SET souscategorie_id = (
        SELECT id FROM api_souscategorie WHERE nom = 'MATERIAL_ELETRICO_DIVERS' AND categorie_id = 57 LIMIT 1)
    WHERE categorie_id = 57
      AND souscategorie_id IS NULL
      AND (UPPER(code) LIKE '%-DIJ-%'
        OR UPPER(code) LIKE '%-GAM-%'
        OR UPPER(code) LIKE '%-PAI-%'
        OR UPPER(code) LIKE '%-TRA-%'
        OR UPPER(code) LIKE '%-BUS-%');

    UPDATE api_materiel SET souscategorie_id = (
        SELECT id FROM api_souscategorie WHERE nom = 'MOBILIARIO_ESCRITORIO' AND categorie_id = 57 LIMIT 1)
    WHERE categorie_id = 57
      AND souscategorie_id IS NULL
      AND (UPPER(code) LIKE '%-CAD-%'
        OR UPPER(code) LIKE '%-MES-%'
        OR UPPER(code) LIKE '%-CAC-%');

    UPDATE api_materiel SET souscategorie_id = (
        SELECT id FROM api_souscategorie WHERE nom = 'OUTROS_DIVERS' AND categorie_id = 57 LIMIT 1)
    WHERE categorie_id = 57 AND souscategorie_id IS NULL;

    -- ---- PECAS BOMBA (categorie_id=62) ----
    UPDATE api_materiel SET souscategorie_id = (
        SELECT id FROM api_souscategorie WHERE nom = 'EIXO_HELICE' AND categorie_id = 62 LIMIT 1)
    WHERE categorie_id = 62
      AND (UPPER(code) LIKE '%-EIX-%' OR UPPER(code) LIKE '%-HEL-%');

    UPDATE api_materiel SET souscategorie_id = (
        SELECT id FROM api_souscategorie WHERE nom = 'MOTOR_AGITADOR' AND categorie_id = 62 LIMIT 1)
    WHERE categorie_id = 62 AND UPPER(code) LIKE '%-MOT-%';

    UPDATE api_materiel SET souscategorie_id = (
        SELECT id FROM api_souscategorie WHERE nom = 'MANGA_PECA' AND categorie_id = 62 LIMIT 1)
    WHERE categorie_id = 62 AND souscategorie_id IS NULL;

    -- ---- INSTRUMENTACAO (categorie_id=66) ----
    UPDATE api_materiel SET souscategorie_id = (
        SELECT id FROM api_souscategorie WHERE nom = 'MANOMETRO_SENSOR' AND categorie_id = 66 LIMIT 1)
    WHERE categorie_id = 66
      AND (UPPER(code) LIKE '%-MAN-%'
        OR UPPER(code) LIKE '%-SNV-%'
        OR UPPER(code) LIKE '%-SON-%'
        OR UPPER(code) LIKE '%-TNV-%'
        OR UPPER(code) LIKE '%-MED-%'
        OR UPPER(code) LIKE '%-IND-%');

    UPDATE api_materiel SET souscategorie_id = (
        SELECT id FROM api_souscategorie WHERE nom = 'DETECTOR_GAS' AND categorie_id = 66 LIMIT 1)
    WHERE categorie_id = 66 AND UPPER(code) LIKE '%-CLO-%';

    UPDATE api_materiel SET souscategorie_id = (
        SELECT id FROM api_souscategorie WHERE nom = 'MODULO_CONTROLO' AND categorie_id = 66 LIMIT 1)
    WHERE categorie_id = 66 AND souscategorie_id IS NULL;

    -- ---- EPI (categorie_id=72) ----
    UPDATE api_materiel SET souscategorie_id = (
        SELECT id FROM api_souscategorie WHERE nom = 'EPI_RESPIRATORIO' AND categorie_id = 72 LIMIT 1)
    WHERE categorie_id = 72
      AND (UPPER(code) LIKE '%-MAS-%'
        OR UPPER(code) LIKE '%-RES-%'
        OR UPPER(code) LIKE '%-CAR-%'
        OR UPPER(code) LIKE '%-APA-%');

    UPDATE api_materiel SET souscategorie_id = (
        SELECT id FROM api_souscategorie WHERE nom = 'EPI_INCENDIO' AND categorie_id = 72 LIMIT 1)
    WHERE categorie_id = 72
      AND (UPPER(code) LIKE '%-EXT-%' OR UPPER(code) LIKE '%-SIN-%');

    UPDATE api_materiel SET souscategorie_id = (
        SELECT id FROM api_souscategorie WHERE nom = 'EPI_CORPORAL' AND categorie_id = 72 LIMIT 1)
    WHERE categorie_id = 72 AND souscategorie_id IS NULL;

    -- ---- FATO PROTECAO (categorie_id=73) ----
    UPDATE api_materiel SET souscategorie_id = (
        SELECT id FROM api_souscategorie WHERE nom = 'FATO_PROTECAO' AND categorie_id = 73 LIMIT 1)
    WHERE categorie_id = 73;

    -- ---- FERRAMENTAS MANUAIS (categorie_id=76) ----
    UPDATE api_materiel SET souscategorie_id = (
        SELECT id FROM api_souscategorie WHERE nom = 'CHAVE_BOCA_CAIXA' AND categorie_id = 76 LIMIT 1)
    WHERE categorie_id = 76
      AND (UPPER(code) LIKE '%-CHA-%'
        OR UPPER(code) LIKE '%-CCA-%'
        OR UPPER(code) LIKE '%-CFR-%'
        OR UPPER(code) LIKE '%-CAI-%'
        OR UPPER(code) LIKE '%-CON-%');

    UPDATE api_materiel SET souscategorie_id = (
        SELECT id FROM api_souscategorie WHERE nom = 'BROCA_CORTE' AND categorie_id = 76 LIMIT 1)
    WHERE categorie_id = 76
      AND (UPPER(code) LIKE '%-BRC-%'
        OR UPPER(code) LIKE '%-LIM-%'
        OR UPPER(code) LIKE '%-TES-%'
        OR UPPER(code) LIKE '%-TRA-%'
        OR UPPER(code) LIKE '%-PAQ-%');

    UPDATE api_materiel SET souscategorie_id = (
        SELECT id FROM api_souscategorie WHERE nom = 'MACACO_ELEVACAO' AND categorie_id = 76 LIMIT 1)
    WHERE categorie_id = 76
      AND (UPPER(code) LIKE '%-OMC-%'
        OR UPPER(code) LIKE '%-BOV-%'
        OR UPPER(code) LIKE '%-AND-%'
        OR UPPER(code) LIKE '%-ESC-%');

    UPDATE api_materiel SET souscategorie_id = (
        SELECT id FROM api_souscategorie WHERE nom = 'MARTELO_PERCUSSAO' AND categorie_id = 76 LIMIT 1)
    WHERE categorie_id = 76
      AND (UPPER(code) LIKE '%-MAR-%'
        OR UPPER(code) LIKE '%-LIN-%'
        OR UPPER(code) LIKE '%-TEE-%');

    UPDATE api_materiel SET souscategorie_id = (
        SELECT id FROM api_souscategorie WHERE nom = 'CHAVE_BOCA_CAIXA' AND categorie_id = 76 LIMIT 1)
    WHERE categorie_id = 76 AND souscategorie_id IS NULL;

    -- ---- ALICATES (categorie_id=77) ----
    UPDATE api_materiel SET souscategorie_id = (
        SELECT id FROM api_souscategorie WHERE nom = 'ALICATE_GERAL' AND categorie_id = 77 LIMIT 1)
    WHERE categorie_id = 77;

    -- ---- FERRAMENTAS ELECTRICAS (categorie_id=78) ----
    UPDATE api_materiel SET souscategorie_id = (
        SELECT id FROM api_souscategorie WHERE nom = 'REBARBADEIRA' AND categorie_id = 78 LIMIT 1)
    WHERE categorie_id = 78
      AND (UPPER(code) LIKE '%-REB-%' OR UPPER(code) LIKE '%-HIL-%');

    UPDATE api_materiel SET souscategorie_id = (
        SELECT id FROM api_souscategorie WHERE nom = 'BERBEQUIM_APARAFUSADORA' AND categorie_id = 78 LIMIT 1)
    WHERE categorie_id = 78 AND souscategorie_id IS NULL;

    -- ---- SOLDADURA (categorie_id=79) ----
    UPDATE api_materiel SET souscategorie_id = (
        SELECT id FROM api_souscategorie WHERE nom = 'FERRO_SOLDAR' AND categorie_id = 79 LIMIT 1)
    WHERE categorie_id = 79;

    -- ---- ELETRICO GERAL (categorie_id=85) ----
    UPDATE api_materiel SET souscategorie_id = (
        SELECT id FROM api_souscategorie WHERE nom = 'CABO_TERMINAL' AND categorie_id = 85 LIMIT 1)
    WHERE categorie_id = 85
      AND (UPPER(code) LIKE '%-CAB-%'
        OR UPPER(code) LIKE '%-LIG-%'
        OR UPPER(code) LIKE '%-BLO-%');

    UPDATE api_materiel SET souscategorie_id = (
        SELECT id FROM api_souscategorie WHERE nom = 'DISJUNTOR_PROTECAO' AND categorie_id = 85 LIMIT 1)
    WHERE categorie_id = 85
      AND (UPPER(code) LIKE '%-DIJ-%'
        OR UPPER(code) LIKE '%-DIS-%'
        OR UPPER(code) LIKE '%-FUS-%'
        OR UPPER(code) LIKE '%-INT-%');

    UPDATE api_materiel SET souscategorie_id = (
        SELECT id FROM api_souscategorie WHERE nom = 'TOMADA_INTERRUPTOR' AND categorie_id = 85 LIMIT 1)
    WHERE categorie_id = 85
      AND (UPPER(code) LIKE '%-FEM-%'
        OR UPPER(code) LIKE '%-BOC-%');

    UPDATE api_materiel SET souscategorie_id = (
        SELECT id FROM api_souscategorie WHERE nom = 'ILUMINACAO' AND categorie_id = 85 LIMIT 1)
    WHERE categorie_id = 85 AND UPPER(code) LIKE '%-LUM-%';

    UPDATE api_materiel SET souscategorie_id = (
        SELECT id FROM api_souscategorie WHERE nom = 'QUADRO_ELETRICO' AND categorie_id = 85 LIMIT 1)
    WHERE categorie_id = 85
      AND (UPPER(code) LIKE '%-QDR-%'
        OR UPPER(code) LIKE '%-CAL-%'
        OR UPPER(code) LIKE '%-MUL-%'
        OR UPPER(code) LIKE '%-REL-%'
        OR UPPER(code) LIKE '%-MAL-%');

    RAISE NOTICE '✅ ETAP 2 TERMINE: Materyel yo update';

END $$;

-- ============================================================
-- ETAP 3: VERIFYE FINAL (kouri separe apre DO block la)
-- ============================================================

-- Konbyen ki toujou NULL pa categorie
SELECT
    COALESCE(m.categorie_id::text, 'NULL') AS categorie_id,
    COALESCE(c.nom, 'SANS CATEGORIE') AS categorie_nom,
    COUNT(*) AS total_null
FROM api_materiel m
LEFT JOIN api_categorie c ON m.categorie_id = c.id
WHERE m.souscategorie_id IS NULL
GROUP BY m.categorie_id, c.nom
HAVING COUNT(*) > 0
ORDER BY m.categorie_id;
