-- Audit workflow integrite stock / statuts / traçabilité
-- Date: 2026-03-04

-- 1) Repartition statuts par type de flux
SELECT
  pf.tipo_fluxo,
  dl.statut,
  COUNT(*) AS total
FROM api_demandelot dl
JOIN api_pedidoformulario pf ON pf.demande_lot_id = dl.id
GROUP BY pf.tipo_fluxo, dl.statut
ORDER BY pf.tipo_fluxo, dl.statut;

-- 2) Detecter valeurs legacy qui ne devraient plus exister
SELECT
  dl.id,
  dl.reference,
  dl.statut,
  pf.tipo_fluxo,
  dl.date_demande
FROM api_demandelot dl
JOIN api_pedidoformulario pf ON pf.demande_lot_id = dl.id
WHERE dl.statut = 'LIVREE'
ORDER BY dl.date_demande DESC;

-- 3) Operations source eligibles a devolucao (controle UI/backend)
SELECT
  dl.id,
  dl.reference,
  pf.tipo_fluxo,
  dl.statut,
  dl.date_demande
FROM api_demandelot dl
JOIN api_pedidoformulario pf ON pf.demande_lot_id = dl.id
WHERE pf.tipo_fluxo IN ('INSTALACAO', 'EMPRESTIMO', 'TRANSFERENCIA', 'COMPRAS')
  AND dl.statut IN ('ENTREGUE', 'RECEBIDA')
ORDER BY dl.date_demande DESC;

-- 4) Vue stock par materiel et depot
SELECT
  s.materiel_id,
  m.code,
  m.description,
  s.entrepot_id,
  e.nom AS entrepot_nom,
  s.quantite AS stock_actuel
FROM api_stockentrepot s
JOIN api_materiel m ON m.id = s.materiel_id
JOIN api_entrepot e ON e.id = s.entrepot_id
ORDER BY m.code, e.nom;

-- 5) Historique mouvement d'un materiel (remplacer le code)
-- SELECT
--   mv.id, mv.reference, mv.date_mvt, mv.type_mvt, mv.quantite,
--   mv.entrepot_id, e.nom AS entrepot_nom, mv.raison
-- FROM api_mouvement mv
-- JOIN api_materiel m ON m.id = mv.materiel_id
-- LEFT JOIN api_entrepot e ON e.id = mv.entrepot_id
-- WHERE m.code = 'INS-SEN-PRE-0001'
-- ORDER BY mv.date_mvt DESC, mv.id DESC;

