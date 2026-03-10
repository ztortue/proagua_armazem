-- B) Dènye mouvman pou materyèl sa
SELECT
  mv.id, m.description,
  mv.date_mvt,
  mv.type_mvt,
  mv.quantite,
  mv.entrepot_id,
  e.nom AS entrepot_nom,
  mv.raison
FROM api_mouvement mv
JOIN api_entrepot e ON e.id = mv.entrepot_id
WHERE mv.materiel_id = 669
ORDER BY mv.id DESC
LIMIT 20;
