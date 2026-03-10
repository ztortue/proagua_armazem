
SELECT
  m.id,
  m.code,
  m.description,
  f.nom AS famille,
  c.nom AS categorie,
  e.nom AS armazem,
  p.pilier,
  COALESCE(se.quantite, 0) AS stock_atual
FROM api_materiel m
LEFT JOIN api_categorie c ON c.id = m.categorie_id
LEFT JOIN api_famille f ON f.id = c.famille_id
LEFT JOIN api_entrepot e ON e.id = m.entrepot_principal_id
LEFT JOIN api_projetchantier p ON p.id = e.projet_id
LEFT JOIN api_stockentrepot se
  ON se.materiel_id = m.id
 AND se.entrepot_id = e.id
WHERE
      p.pilier = 'PILAR2'
   OR lower(unaccent(e.nom)) = lower(unaccent('Armazem Marcal'))
   OR lower(unaccent(e.nom)) = lower(unaccent('CD Marcal'))
ORDER BY e.nom, f.nom, c.nom, m.description;
