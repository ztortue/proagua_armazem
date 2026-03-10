-- A) Chwazi material + depo pou teste
-- Ranplase 669 ak id materyèl ou teste a
SELECT
  s.entrepot_id,
  m.description,
  e.nom AS entrepot_nom,
  s.materiel_id,
  m.code AS materiel_code,
  s.quantite
FROM api_stockentrepot s
JOIN api_entrepot e ON e.id = s.entrepot_id
JOIN api_materiel m ON m.id = s.materiel_id
WHERE s.materiel_id = 669
ORDER BY e.nom;
