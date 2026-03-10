BEGIN;

-- Optional, utile si ou bezwen normalize texte
CREATE EXTENSION IF NOT EXISTS unaccent;

WITH first_item AS (
  SELECT
    dl.id AS lot_id,
    dl.date_demande,
    m.code AS materiel_code
  FROM api_demandelot dl
  LEFT JOIN LATERAL (
    SELECT di.materiel_id
    FROM api_demandeitem di
    WHERE di.lot_id = dl.id
    ORDER BY di.id
    LIMIT 1
  ) fi ON true
  LEFT JOIN api_materiel m ON m.id = fi.materiel_id
),
parsed AS (
  SELECT
    lot_id,
    date_demande,
    COALESCE(
      NULLIF(LEFT(regexp_replace(split_part(COALESCE(materiel_code, ''), '-', 1), '[^A-Za-z0-9]', '', 'g'), 3), ''),
      'GEN'
    )::text AS key3,
    COALESCE(
      LPAD(
        NULLIF(
          substring(COALESCE(materiel_code, '') from '([0-9]+)(?!.*[0-9])'),
          ''
        ),
        4,
        '0'
      ),
      LPAD(lot_id::text, 4, '0')
    )::text AS num4
  FROM first_item
),
ranked AS (
  SELECT
    lot_id,
    key3,
    num4,
    ROW_NUMBER() OVER (
      PARTITION BY key3, num4
      ORDER BY date_demande NULLS LAST, lot_id
    ) AS seq2
  FROM parsed
),
new_refs AS (
  SELECT
    lot_id,
    format('PED-SAI-%s-%s-%02s', UPPER(key3), num4, seq2) AS new_reference
  FROM ranked
),
dups AS (
  SELECT new_reference
  FROM new_refs
  GROUP BY new_reference
  HAVING COUNT(*) > 1
)
-- rollback auto si doublon
SELECT CASE
  WHEN EXISTS (SELECT 1 FROM dups) THEN
    pg_catalog.raise_exception('Duplication detectee dans les references generees.')
  ELSE 1
END;

UPDATE api_demandelot dl
SET reference = nr.new_reference
FROM new_refs nr
WHERE dl.id = nr.lot_id;

COMMIT;
