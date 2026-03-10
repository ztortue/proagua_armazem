BEGIN;

CREATE EXTENSION IF NOT EXISTS unaccent;
DROP TABLE IF EXISTS tmp_p2_code_plan;

CREATE TEMP TABLE tmp_p2_code_plan AS
WITH scope_material AS (
  SELECT DISTINCT m.id, m.code AS old_code, m.description, m.categorie_id
  FROM api_materiel m
  WHERE EXISTS (
    SELECT 1
    FROM api_stockentrepot se
    JOIN api_entrepot e ON e.id = se.entrepot_id
    LEFT JOIN api_projetchantier p ON p.id = e.projet_id
    WHERE se.materiel_id = m.id
      AND (
           p.pilier = 'PILAR2'
        OR lower(unaccent(e.nom)) = lower(unaccent('Armazem Marcal'))
        OR lower(unaccent(e.nom)) = lower(unaccent('CD Marcal'))
      )
  )
  AND COALESCE(m.code, '') !~ '^[A-Z]{3}-[A-Z]{3}-[A-Z]{3}-[0-9]{4}$'
),
joined AS (
  SELECT
    s.id,
    s.old_code,
    s.description,
    COALESCE(c.nom, '') AS categorie_nom,
    COALESCE(f.nom, '') AS famille_nom,
    lower(unaccent(COALESCE(s.description, ''))) AS d,
    upper(unaccent(COALESCE(c.nom, ''))) AS c_norm,
    upper(unaccent(COALESCE(f.nom, ''))) AS f_norm
  FROM scope_material s
  LEFT JOIN api_categorie c ON c.id = s.categorie_id
  LEFT JOIN api_famille f ON f.id = c.famille_id
),
mapped AS (
  SELECT
    j.*,
    CASE
      WHEN f_norm LIKE '%HIDRAUL%' THEN 'HID'
      WHEN f_norm LIKE '%FERRAMENT%' THEN 'FER'
      WHEN f_norm LIKE '%ELECTR%' OR f_norm LIKE '%ELETR%' THEN 'ELE'
      WHEN f_norm LIKE '%INSTRUMENT%' THEN 'INS'
      WHEN f_norm LIKE '%SCADA%' OR f_norm LIKE '%AUTOMAC%' THEN 'SCA'
      WHEN f_norm LIKE '%SEGURANCA%' OR f_norm LIKE '%EPC%' THEN 'EPC'
      WHEN f_norm LIKE '%ACESSOR%' THEN 'ACE'
      WHEN f_norm LIKE '%CONSUM%' THEN 'CON'
      ELSE 'OUT'
    END AS fff,
    CASE
      WHEN c_norm LIKE '%ALICATE%' OR c_norm LIKE '%PINCA%' THEN 'ALI'
      WHEN c_norm LIKE '%CHAVE%' THEN 'CHV'
      WHEN c_norm LIKE '%FERRAMENTA%ELETR%' THEN 'FEL'
      WHEN c_norm LIKE '%BROCA%' OR c_norm LIKE '%CORTE%' THEN 'BRC'
      WHEN c_norm LIKE '%VALVULA%' THEN 'VAL'
      WHEN c_norm LIKE '%TUBO%' OR c_norm LIKE '%CONEX%' THEN 'TUB'
      WHEN c_norm LIKE '%BOMBA%' THEN 'BOM'
      WHEN c_norm LIKE '%FLANGE%' OR c_norm LIKE '%BRACADEIRA%' THEN 'FLA'
      WHEN c_norm LIKE '%CABO%' OR c_norm LIKE '%CONDUTOR%' THEN 'CAB'
      WHEN c_norm LIKE '%DISJUNTOR%' OR c_norm LIKE '%PROTECAO%' THEN 'DIS'
      WHEN c_norm LIKE '%QUADRO%' OR c_norm LIKE '%CAIXA%' THEN 'QDC'
      WHEN c_norm LIKE '%TOMADA%' OR c_norm LIKE '%INTERRUPTOR%' THEN 'TOM'
      WHEN c_norm LIKE '%SENSOR%' OR c_norm LIKE '%TRANSMISSOR%' THEN 'SNS'
      WHEN c_norm LIKE '%PLC%' OR c_norm LIKE '%SCADA%' OR c_norm LIKE '%MODULO%' THEN 'PLC'
      WHEN c_norm LIKE '%EPI%' THEN 'EPI'
      WHEN c_norm LIKE '%EPC%' THEN 'EPC'
      WHEN c_norm LIKE '%PARAFUS%' OR c_norm LIKE '%FIXA%' OR c_norm LIKE '%PORCA%' OR c_norm LIKE '%ANILHA%' THEN 'FIX'
      ELSE 'GEN'
    END AS ccc,
    CASE
      WHEN d ~ 'alicate.*bomba|bomba.*agua' THEN 'ABO'
      WHEN d ~ 'alicate.*pressao' THEN 'APR'
      WHEN d ~ 'alicate.*universal' THEN 'AUN'
      WHEN d ~ 'alicate.*corte' THEN 'ACO'
      WHEN d ~ 'valvula.*borboleta' THEN 'VBO'
      WHEN d ~ 'valvula.*retenc' THEN 'VRT'
      WHEN d ~ 'valvula.*esfera' THEN 'VES'
      WHEN d ~ 'tubo.*pvc' THEN 'PVC'
      WHEN d ~ 'tubo.*pead|pead' THEN 'PEA'
      WHEN d ~ 'disjuntor' THEN 'DIS'
      WHEN d ~ 'cabo' THEN 'CAB'
      WHEN d ~ 'sensor.*nivel|nivel' THEN 'SNV'
      WHEN d ~ 'sensor.*pressao|pressao' THEN 'SPR'
      WHEN d ~ 'transmissor.*nivel' THEN 'TNV'
      WHEN d ~ 'capacete' THEN 'CAP'
      WHEN d ~ 'luva' THEN 'LUV'
      WHEN d ~ 'bota' THEN 'BOT'
      WHEN d ~ 'bomba' THEN 'BOM'
      ELSE COALESCE(NULLIF(substr(regexp_replace(upper(unaccent(j.description)), '[^A-Z]', '', 'g'), 1, 3), ''), 'GEN')
    END AS kkk
  FROM joined j
),
pref AS (
  SELECT *, (fff || '-' || ccc || '-' || kkk) AS prefixo
  FROM mapped
),
seq AS (
  SELECT *,
         row_number() OVER (PARTITION BY prefixo ORDER BY id) AS rn
  FROM pref
),
mx AS (
  SELECT
    s.*,
    COALESCE((
      SELECT MAX(CAST(right(m2.code, 4) AS integer))
      FROM api_materiel m2
      WHERE m2.code ~ ('^' || s.prefixo || '-[0-9]{4}$')
    ), 0) AS base_num
  FROM seq s
)
SELECT
  id,
  old_code,
  description,
  famille_nom,
  categorie_nom,
  prefixo,
  (base_num + rn) AS new_num,
  (prefixo || '-' || lpad((base_num + rn)::text, 4, '0')) AS new_code
FROM mx;

-- Preview
SELECT id, old_code, new_code, description
FROM tmp_p2_code_plan
ORDER BY id
LIMIT 200;

-- Check 1: overflow
DO $$
DECLARE v_over integer;
BEGIN
  SELECT COUNT(*) INTO v_over
  FROM tmp_p2_code_plan
  WHERE new_num > 9999;

  IF v_over > 0 THEN
    RAISE EXCEPTION 'Rollback: % códigos excedem 9999.', v_over;
  END IF;
END $$;

-- Check 2: duplicates in plan
DO $$
DECLARE v_dup integer;
BEGIN
  SELECT COUNT(*) INTO v_dup
  FROM (
    SELECT new_code
    FROM tmp_p2_code_plan
    GROUP BY new_code
    HAVING COUNT(*) > 1
  ) d;

  IF v_dup > 0 THEN
    RAISE EXCEPTION 'Rollback: % códigos duplicados no plano.', v_dup;
  END IF;
END $$;

-- Check 3: conflicts with existing table
DO $$
DECLARE v_conf integer;
BEGIN
  SELECT COUNT(*) INTO v_conf
  FROM tmp_p2_code_plan p
  JOIN api_materiel m ON m.code = p.new_code AND m.id <> p.id;

  IF v_conf > 0 THEN
    RAISE EXCEPTION 'Rollback: % conflitos com códigos existentes.', v_conf;
  END IF;
END $$;

-- Apply update
UPDATE api_materiel m
SET code = p.new_code
FROM tmp_p2_code_plan p
WHERE m.id = p.id
  AND m.code <> p.new_code;

COMMIT;
