BEGIN;

-- DemandeLot
UPDATE api_demandelot
SET statut = 'ENTREGUE'
WHERE statut = 'LIVREE';

-- Commande (si existant dans l'historique)
UPDATE api_commande
SET statut = 'ENTREGUE'
WHERE statut = 'LIVREE';

COMMIT;

