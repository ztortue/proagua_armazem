'use client';

import { Suspense, useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '../lib/api';

type PaginatedResponse<T> = {
  results: T[];
  next?: string | null;
};

function MateriaisContent() {
  const extractApiError = (data: any): string => {
    if (!data) return '';
    if (typeof data === 'string') return data;
    if (typeof data.detail === 'string') return data.detail;
    if (Array.isArray(data.items) && data.items.length > 0) return String(data.items[0]);
    if (typeof data.items === 'string') return data.items;
    if (Array.isArray(data.entrepot) && data.entrepot.length > 0) return String(data.entrepot[0]);
    if (typeof data.entrepot === 'string') return data.entrepot;
    const firstKey = Object.keys(data)[0];
    const firstValue = firstKey ? data[firstKey] : null;
    if (Array.isArray(firstValue) && firstValue.length > 0) return String(firstValue[0]);
    if (typeof firstValue === 'string') return firstValue;
    return JSON.stringify(data);
  };
  const searchParams = useSearchParams();
  const pilierParam = searchParams.get('pilier');
  const entrepotParam = searchParams.get('entrepot');
  const lockedEntrepotId = entrepotParam ? Number(entrepotParam) : null;
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';
  const mediaBaseUrl = apiBaseUrl.startsWith('http') ? apiBaseUrl.replace(/\/api\/?$/, '') : '';
  const resolvePhotoUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `${mediaBaseUrl}${url}`;
  };
  const normalizeText = (value: string) =>
    String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase();
  const getLocEntrepotId = (loc: any): number => Number(loc?.entrepot_id ?? loc?.entrepot_id_value ?? 0);
  const onlyLetters = (value: string) => normalizeText(value).replace(/[^A-Z0-9]/g, '');
  const token3 = (value: string, fallback: string) => {
    const letters = onlyLetters(value || '');
    return (letters.slice(0, 3) || fallback).padEnd(3, 'X');
  };
  const mapFamilleCode = (familleCode: string, familleNom: string) =>
    token3((familleCode || '').trim() || (familleNom || '').trim(), 'MAT');
  const mapCategorieCode = (categorieNom: string) => token3(categorieNom, 'CAT');
  const mapSousCategorieCode = (sousCategorieNom: string) => token3(sousCategorieNom, 'SUB');
  const [allMaterialCodes, setAllMaterialCodes] = useState<string[]>([]);
  const toRelativeApiPath = (nextUrl: string) => {
    try {
      const url = new URL(nextUrl);
      return url.pathname + url.search;
    } catch {
      return nextUrl;
    }
  };
  const fetchAllPages = async (url: string) => {
    const collected: any[] = [];
    let nextPath: string | null = url;
    while (nextPath) {
      const res: { data: PaginatedResponse<any> | any[] } = await api.get(nextPath);
      const data: PaginatedResponse<any> | any[] = res.data;
      if (Array.isArray(data)) return data;
      const rows = Array.isArray(data.results) ? data.results : [];
      collected.push(...rows);
      const nextRaw: string | null = data.next ?? null;
      nextPath = nextRaw ? toRelativeApiPath(String(nextRaw)) : null;
    }
    return collected;
  };
  const loadAllMaterialCodes = async () => {
    const codes: string[] = [];
    let nextPath: string | null = '/materiais/?page=1';
    while (nextPath) {
      const res: { data: PaginatedResponse<any> | any[] } = await api.get(nextPath);
      const data: PaginatedResponse<any> | any[] = res.data;
      const rows = Array.isArray(data) ? data : data.results || [];
      rows.forEach((m: any) => {
        if (m?.code) codes.push(String(m.code).toUpperCase());
      });
      const nextRaw: string | null = Array.isArray(data) ? null : data.next ?? null;
      nextPath = nextRaw ? toRelativeApiPath(String(nextRaw)) : null;
    }
    setAllMaterialCodes(codes);
  };

  const [materiais, setMateriais] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalNewOpen, setModalNewOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailMateriel, setDetailMateriel] = useState<any>(null);
  const [detailDescription, setDetailDescription] = useState('');
  const [savingDetail, setSavingDetail] = useState(false);
  const [photoUploadModalOpen, setPhotoUploadModalOpen] = useState(false);
  const [photoTargetMateriel, setPhotoTargetMateriel] = useState<any>(null);
  const [photoUploadFile, setPhotoUploadFile] = useState<File | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [nouveauMateriel, setNouveauMateriel] = useState({
    code: '',
    description: '',
    categorie_id: '',
    souscategorie_id: '',
    fournisseur_id: '',
    entrepot_principal_id: '',
    unite: 'un',
    diametre_nominal: '',
    pression_nominal: '',
    type_materiau: '',
    usage_typique: '',
    usage_type: 'INSTALL',
    stock_min: '0',
    stock_max: '',
    prix_unitaire: '0',
  });

  const [categories, setCategories] = useState<any[]>([]);
  const [sousCategories, setSousCategories] = useState<any[]>([]);
  const [entrepots, setEntrepots] = useState<any[]>([]);
  const [usosTipicos, setUsosTipicos] = useState<any[]>([]);
  const [utilisateursFinal, setUtilisateursFinal] = useState<any[]>([]);
  const [selectedDemandeurReelId, setSelectedDemandeurReelId] = useState('');
  const [descricaoDemanda, setDescricaoDemanda] = useState('');
  const [selectedTipoFluxoDemanda, setSelectedTipoFluxoDemanda] = useState<'INSTALACAO' | 'EMPRESTIMO' | 'COMPRAS' | 'ENTRADA' | 'TRANSFERENCIA'>('INSTALACAO');
  const [selectedTransferDestinoDemandaId, setSelectedTransferDestinoDemandaId] = useState('');
  const [dataRetornoPrevistaDemanda, setDataRetornoPrevistaDemanda] = useState('');
  const [addItemSearchDemanda, setAddItemSearchDemanda] = useState('');
  const [addItemIdDemanda, setAddItemIdDemanda] = useState('');
  const [addItemPoolDemanda, setAddItemPoolDemanda] = useState<any[]>([]);
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [selectedEntrepotDemanda, setSelectedEntrepotDemanda] = useState<Record<number, string>>({});
  const [quantiteDemande, setQuantiteDemande] = useState<{[key: number]: number}>({});
  const [filterDiametre, setFilterDiametre] = useState('');
  const [filterPN, setFilterPN] = useState('');
  const [filterUsage, setFilterUsage] = useState('');
  const [filterFamille, setFilterFamille] = useState('');
  const [filterCategorie, setFilterCategorie] = useState('');
  const [filterSousCategorie, setFilterSousCategorie] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [selectedViewEntrepotId, setSelectedViewEntrepotId] = useState('');
  const [effectivePilier, setEffectivePilier] = useState<'PILAR1' | 'PILAR2' | 'PILAR3' | null>(null);
  const [hasAllPilierAccess, setHasAllPilierAccess] = useState(false);
  const [pilierResolved, setPilierResolved] = useState(false);
  const isValidPilier = (value: string | null | undefined): value is 'PILAR1' | 'PILAR2' | 'PILAR3' =>
    value === 'PILAR1' || value === 'PILAR2' || value === 'PILAR3';

  const entrepotOptions = useMemo(() => {
    if (lockedEntrepotId) {
      return entrepots.filter((ent) => Number(ent.id) === lockedEntrepotId);
    }
    return entrepots;
  }, [entrepots, lockedEntrepotId]);
  const viewEntrepotId = selectedViewEntrepotId ? Number(selectedViewEntrepotId) : (lockedEntrepotId ?? null);

  useEffect(() => {
    if (selectedViewEntrepotId && entrepots.some((ent) => String(ent.id) === selectedViewEntrepotId)) return;
    if (lockedEntrepotId && entrepots.some((ent) => Number(ent.id) === lockedEntrepotId)) {
      setSelectedViewEntrepotId(String(lockedEntrepotId));
      return;
    }
    if (effectivePilier && entrepots.length === 1) {
      setSelectedViewEntrepotId(String(entrepots[0].id));
      return;
    }
    setSelectedViewEntrepotId('');
  }, [lockedEntrepotId, entrepots, selectedViewEntrepotId, effectivePilier]);

  useEffect(() => {
    const resolvePilier = async () => {
      try {
        const meRes = await api.get('/me/');
        const mePilier = meRes.data?.pilier_affectation;
        const meRole = String(meRes.data?.role || '').toUpperCase();
        const allAccess = meRole === 'ADMIN' || mePilier === 'TODOS';
        setHasAllPilierAccess(allAccess);

        if (allAccess) {
          setEffectivePilier(null);
          setPilierResolved(true);
          return;
        }

        if (isValidPilier(pilierParam)) {
          setEffectivePilier(pilierParam);
          setPilierResolved(true);
          return;
        }

        if (isValidPilier(mePilier)) {
          setEffectivePilier(mePilier);
          setPilierResolved(true);
          return;
        }
      } catch (error) {
        console.error('Erro ao carregar utilizador (/me):', error);
      }

      setHasAllPilierAccess(false);
      setEffectivePilier(null);
      setPilierResolved(true);
    };

    resolvePilier();
  }, [pilierParam]);

  useEffect(() => {
    if (!pilierResolved) return;

    async function load() {
      try {
        let url = `/materiais/?page=${page}`;
        const params = new URLSearchParams();
        if (effectivePilier) params.append('pilier', effectivePilier);
        if (viewEntrepotId) params.append('entrepot', String(viewEntrepotId));
        if (search) params.append('search', search);
        if (filterFamille) params.append('categorie__famille', filterFamille);
        if (filterCategorie) params.append('categorie', filterCategorie);
        if (filterSousCategorie) params.append('souscategorie', filterSousCategorie);
        if (filterDiametre) params.append('diametre_nominal', filterDiametre);
        if (filterPN) params.append('pression_nominal', filterPN);
        if (filterUsage) params.append('usage_typique', filterUsage);
        if (params.toString()) url += '&' + params.toString();
        const entrepotsUrl = effectivePilier ? `/entrepots/?pilier=${effectivePilier}` : '/entrepots/';

        const [resMateriais, allCategories, allSousCategories, resEntrepots, resUsosTipicos, resDemandantes] = await Promise.all([
          api.get(url),
          fetchAllPages('/categories/?page=1'),
          fetchAllPages('/souscategories/?page=1'),
          api.get(entrepotsUrl),
          api.get('/usos-tipicos/'),
          api.get('/utilisateurs-final/'),
        ]);

        const data = resMateriais.data;
        const list = Array.isArray(data) ? data : data.results || [];
        setMateriais(list);
        if (data.count !== undefined) {
          setTotalCount(data.count);
          setTotalPages(Math.max(1, Math.ceil(data.count / 20)));
        } else {
          setTotalCount(list.length);
          setTotalPages(1);
        }
        setCategories(allCategories);
        setSousCategories(allSousCategories);
        setNouveauMateriel((prev) => ({ ...prev }));
        setEntrepots(Array.isArray(resEntrepots.data) ? resEntrepots.data : resEntrepots.data.results || []);
        setUsosTipicos(Array.isArray(resUsosTipicos.data) ? resUsosTipicos.data : resUsosTipicos.data.results || []);
        setUtilisateursFinal(Array.isArray(resDemandantes.data) ? resDemandantes.data : resDemandantes.data.results || []);
      } catch (error) {
        console.error('Erro ao carregar:', error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [search, filterFamille, filterCategorie, filterSousCategorie, filterDiametre, filterPN, filterUsage, page, effectivePilier, pilierResolved, viewEntrepotId, refreshKey]);

  useEffect(() => {
    if (!modalOpen || !pilierResolved) return;
    const loadAddPool = async () => {
      try {
        const params = new URLSearchParams();
        if (effectivePilier) params.append('pilier', effectivePilier);
        const url = `/materiais/?page=1${params.toString() ? `&${params.toString()}` : ''}`;
        const all = await fetchAllPages(url);
        setAddItemPoolDemanda(Array.isArray(all) ? all : []);
      } catch (error) {
        console.error('Erro ao carregar materiais para adicionao na requisicao:', error);
        setAddItemPoolDemanda([]);
      }
    };
    loadAddPool();
  }, [modalOpen, effectivePilier, pilierResolved]);

  useEffect(() => {
    loadAllMaterialCodes().catch((error) => {
      console.error('Erro ao carregar codigos de materiais:', error);
    });
  }, []);

  useEffect(() => {
    const selectedCategory = categories.find((cat: any) => String(cat.id) === String(nouveauMateriel.categorie_id));
    const selectedSousCategory = sousCategories.find((sc: any) => String(sc.id) === String(nouveauMateriel.souscategorie_id));
    const familleNom = selectedCategory?.famille?.nom || selectedCategory?.famille_nom || '';
    const familleCode = selectedCategory?.famille?.code || selectedCategory?.famille_code || '';
    const categorieNom = selectedCategory?.nom || '';
    const sousCategorieNom = selectedSousCategory?.nom || '';
    if (!categorieNom) {
      if (nouveauMateriel.code) {
        setNouveauMateriel((prev) => ({ ...prev, code: '' }));
      }
      return;
    }
    const categorieCode = mapCategorieCode(categorieNom);
    const sousCategorieCode = mapSousCategorieCode(sousCategorieNom);
    const prefix = `${mapFamilleCode(familleCode, familleNom)}-${categorieCode}-${sousCategorieCode}`;
    const regex = new RegExp(`^${prefix}-([0-9]{4})$`);
    let maxSeq = 0;
    allMaterialCodes.forEach((code) => {
      const match = code.match(regex);
      if (!match) return;
      const seq = Number(match[1]);
      if (seq > maxSeq) maxSeq = seq;
    });
    const nextCode = `${prefix}-${String(maxSeq + 1).padStart(4, '0')}`;
    if (nouveauMateriel.code !== nextCode) {
      setNouveauMateriel((prev) => ({ ...prev, code: nextCode }));
    }
  }, [nouveauMateriel.categorie_id, nouveauMateriel.souscategorie_id, categories, sousCategories, allMaterialCodes]);

  const isHydraulicTypeSelected = useMemo(() => {
    const selectedCategory = categories.find((cat: any) => String(cat.id) === String(nouveauMateriel.categorie_id));
    const selectedSousCategory = sousCategories.find((sc: any) => String(sc.id) === String(nouveauMateriel.souscategorie_id));
    const tokens = normalizeText(
      [
        nouveauMateriel.type_materiau,
        selectedCategory?.nom || '',
        selectedSousCategory?.nom || '',
      ].join(' ')
    );
    return [
      'HIDRAUL', 'TUBO', 'TUBUL', 'VALV', 'FLANGE', 'CONEX',
      'ADUCAO', 'DISTRIBU', 'DEBIT', 'CAUDAL', 'MEDIDOR', 'MANOMET', 'PRESSAO',
    ].some((keyword) => tokens.includes(keyword));
  }, [nouveauMateriel.type_materiau, nouveauMateriel.categorie_id, nouveauMateriel.souscategorie_id, categories, sousCategories]);

  useEffect(() => {
    if (isHydraulicTypeSelected) return;
    if (!nouveauMateriel.diametre_nominal && !nouveauMateriel.pression_nominal) return;
    setNouveauMateriel((prev) => ({ ...prev, diametre_nominal: '', pression_nominal: '' }));
  }, [isHydraulicTypeSelected, nouveauMateriel.diametre_nominal, nouveauMateriel.pression_nominal]);

  useEffect(() => {
    setPage(1);
  }, [search, filterFamille, filterCategorie, filterSousCategorie, filterDiametre, filterPN, filterUsage, selectedViewEntrepotId, lockedEntrepotId]);

  const famillesOptions = useMemo(() => {
    const map = new Map<string, { id: string; nom: string }>();
    categories.forEach((cat: any) => {
      const fid = cat?.famille?.id;
      const fnom = cat?.famille?.nom;
      if (!fid || !fnom) return;
      map.set(String(fid), { id: String(fid), nom: String(fnom) });
    });
    return Array.from(map.values()).sort((a, b) => a.nom.localeCompare(b.nom));
  }, [categories]);

  const categoriesOptions = useMemo(() => {
    const list = categories
      .filter((cat: any) => !filterFamille || String(cat?.famille?.id || '') === filterFamille)
      .map((cat: any) => ({ id: String(cat.id), nom: String(cat.nom || '') }));
    return list.sort((a, b) => a.nom.localeCompare(b.nom));
  }, [categories, filterFamille]);

  const sousCategoriesFilterOptions = useMemo(() => {
    const list = sousCategories
      .filter((sc: any) => !filterCategorie || String(sc?.categorie || sc?.categorie_id || '') === filterCategorie)
      .map((sc: any) => ({ id: String(sc.id), nom: String(sc.nom || '') }));
    return list.sort((a, b) => a.nom.localeCompare(b.nom));
  }, [sousCategories, filterCategorie]);

  const sousCategoriesCreateOptions = useMemo(() => {
    if (!nouveauMateriel.categorie_id) return [];
    const list = sousCategories
      .filter((sc: any) => String(sc?.categorie || sc?.categorie_id || '') === String(nouveauMateriel.categorie_id))
      .map((sc: any) => ({ id: String(sc.id), nom: String(sc.nom || '') }));
    return list.sort((a, b) => a.nom.localeCompare(b.nom));
  }, [sousCategories, nouveauMateriel.categorie_id]);

  const categoriesCreateOptions = useMemo(() => {
    if (!nouveauMateriel.type_materiau) return categories;
    const selectedFamily = normalizeText(nouveauMateriel.type_materiau);
    return categories
      .filter((cat: any) => normalizeText(cat?.famille?.nom || '') === selectedFamily)
      .sort((a: any, b: any) => String(a?.nom || '').localeCompare(String(b?.nom || '')));
  }, [categories, nouveauMateriel.type_materiau]);

  useEffect(() => {
    if (!filterCategorie) return;
    const stillValid = categoriesOptions.some((c) => c.id === filterCategorie);
    if (!stillValid) setFilterCategorie('');
  }, [filterFamille, filterCategorie, categoriesOptions]);

  useEffect(() => {
    if (!filterSousCategorie) return;
    const stillValid = sousCategoriesFilterOptions.some((sc) => sc.id === filterSousCategorie);
    if (!stillValid) setFilterSousCategorie('');
  }, [filterCategorie, filterSousCategorie, sousCategoriesFilterOptions]);

  useEffect(() => {
    if (!nouveauMateriel.categorie_id) return;
    const stillValid = categoriesCreateOptions.some(
      (cat: any) => String(cat.id) === String(nouveauMateriel.categorie_id)
    );
    if (!stillValid) {
      setNouveauMateriel((prev) => ({ ...prev, categorie_id: '', souscategorie_id: '' }));
    }
  }, [categoriesCreateOptions, nouveauMateriel.categorie_id]);

  const materiaisView = useMemo(() => {
    const byPilier = effectivePilier
      ? materiais.filter((m) =>
          (m.stock_locations || []).some((loc: any) =>
            entrepots.some((ent) => Number(ent.id) === getLocEntrepotId(loc))
          )
        )
      : materiais;
    if (!viewEntrepotId) return byPilier;
    return byPilier.filter((m) =>
      (m.stock_locations || []).some((loc: any) => getLocEntrepotId(loc) === viewEntrepotId)
    );
  }, [materiais, viewEntrepotId, effectivePilier, entrepots]);

  const activeEntrepotName = useMemo(() => {
    if (!viewEntrepotId) return '';
    const found = entrepots.find((ent) => Number(ent.id) === viewEntrepotId);
    return found?.nom || `#${viewEntrepotId}`;
  }, [entrepots, viewEntrepotId]);

  const toggleItem = (item: any) => {
    setSelectedItems(prev => {
      const exists = prev.find(i => i.id === item.id);
      if (exists) {
        const newItems = prev.filter(i => i.id !== item.id);
        const newQuantite = { ...quantiteDemande };
        const newEntrepot = { ...selectedEntrepotDemanda };
        delete newQuantite[item.id];
        delete newEntrepot[item.id];
        setQuantiteDemande(newQuantite);
        setSelectedEntrepotDemanda(newEntrepot);
        return newItems;
      } else {
        setQuantiteDemande(prev => ({ ...prev, [item.id]: 1 }));
        const autoEntrepotId = viewEntrepotId
          ? String(viewEntrepotId)
          : item.stock_locations.length === 1
            ? String(getLocEntrepotId(item.stock_locations[0]))
            : '';
        setSelectedEntrepotDemanda((prev) => ({ ...prev, [item.id]: autoEntrepotId }));
        return [...prev, item];
      }
    });
  };

  const handleSubmitDemanda = async () => {
    if (!selectedDemandeurReelId) {
      alert('Selecione a empresa demandante.');
      return;
    }
    if (selectedTipoFluxoDemanda === 'EMPRESTIMO' && !dataRetornoPrevistaDemanda) {
      alert('Informe a data/hora prevista de retorno para emprestimo.');
      return;
    }
    if (selectedTipoFluxoDemanda === 'TRANSFERENCIA') {
      if (!selectedTransferDestinoDemandaId) {
        alert('Selecione o deposito de destino para transferencia.');
        return;
      }
      const sameOriginDestino = selectedItems.find(
        (item) => Number(selectedEntrepotDemanda[item.id]) === Number(selectedTransferDestinoDemandaId)
      );
      if (sameOriginDestino) {
        alert('Origem e destino não podem ser iguais na transferencia.');
        return;
      }
    }
    const missingEntrepot = selectedItems.find((item) => !selectedEntrepotDemanda[item.id]);
    if (missingEntrepot) {
      alert(`Selecione o depósito para ${missingEntrepot.code}.`);
      return;
    }

    const items = selectedItems.map(item => ({
      materiel_id: item.id,
      quantite_demandee: quantiteDemande[item.id] || 1,
      entrepot_id: Number(selectedEntrepotDemanda[item.id]),
    }));

    try {
      const payloadDescription = descricaoDemanda.trim();
      await api.post('/pedidos/', {
        description: payloadDescription || undefined,
        demandeur_reel_id: Number(selectedDemandeurReelId),
        tipo_fluxo: selectedTipoFluxoDemanda,
        data_retorno_prevista:
          selectedTipoFluxoDemanda === 'EMPRESTIMO' && dataRetornoPrevistaDemanda
            ? new Date(dataRetornoPrevistaDemanda).toISOString()
            : null,
        entrepot_destino_id:
          selectedTipoFluxoDemanda === 'TRANSFERENCIA' && selectedTransferDestinoDemandaId
            ? Number(selectedTransferDestinoDemandaId)
            : null,
        items,
      });
      alert('Requisição enviada com sucesso! Aguarde aprovação.');
      setModalOpen(false);
      setSelectedItems([]);
      setQuantiteDemande({});
      setSelectedEntrepotDemanda({});
      setAddItemSearchDemanda('');
      setAddItemIdDemanda('');
      setSelectedDemandeurReelId('');
      setDescricaoDemanda('');
      setSelectedTipoFluxoDemanda('INSTALACAO');
      setSelectedTransferDestinoDemandaId('');
      setDataRetornoPrevistaDemanda('');
    } catch (error: any) {
      const data = error.response?.data;
      let apiError = extractApiError(data) || 'Erro ao enviar requisição';
      if (typeof apiError === 'string' && apiError.toLowerCase().includes('deposit')) {
        apiError =
          'Estes materiais não podem ficar no mesmo pedido porque estão em depósitos diferentes. ' +
          'Faça pedidos separados ou selecione materiais do mesmo depósito.';
      }
      alert('Erro: ' + apiError);
    }
  };

  const addCandidatesDemanda = useMemo(() => {
    const selectedIds = new Set(selectedItems.map((it) => it.id));
    const term = addItemSearchDemanda.trim().toLowerCase();
    const pool = addItemPoolDemanda.length > 0 ? addItemPoolDemanda : materiais;
    return pool
      .filter((m) =>
        !viewEntrepotId ||
        (m.stock_locations || []).some((loc: any) => getLocEntrepotId(loc) === viewEntrepotId)
      )
      .filter((m) => {
        if (selectedIds.has(m.id)) return false;
        if (!term) return true;
        return (
          String(m.code || '').toLowerCase().includes(term) ||
          String(m.description || '').toLowerCase().includes(term)
        );
      });
  }, [addItemPoolDemanda, materiais, viewEntrepotId, selectedItems, addItemSearchDemanda]);

  const handleAddItemDemanda = () => {
    if (!addItemIdDemanda) return;
    const source = addItemPoolDemanda.length > 0 ? addItemPoolDemanda : materiais;
    const item = source.find((m) => m.id === Number(addItemIdDemanda));
    if (!item) return;
    toggleItem(item);
    setAddItemIdDemanda('');
    setAddItemSearchDemanda('');
  };

  // ============================================================
  // ✅ handleCreateMaterial — VERSION CORRIGÉE
  //
  // FIX #1 : Photo opsyonèl — retire blòk ki te bloke soumisyon
  // FIX #2 : FormData voye san headers manyèl — kite axios +
  //           intercepteur api.ts jere Content-Type + boundary
  // FIX #3 : Erè API afiche pa champ pou dyagnostik pi fasil
  // ============================================================
  const handleCreateMaterial = async () => {
    // Validasyon champ obligatwa
    if (!nouveauMateriel.entrepot_principal_id) {
      alert('Selecione o deposito do material.');
      return;
    }
    if (!nouveauMateriel.description.trim()) {
      alert('A descrição do material é obrigatória.');
      return;
    }
    if (!nouveauMateriel.categorie_id) {
      alert('Selecione a categoria do material.');
      return;
    }

    // Konstwi FormData
    const formData = new FormData();
    Object.entries(nouveauMateriel).forEach(([key, value]) => {
      // Voye sèlman valè ki pa vid
      if (value !== '' && value !== null && value !== undefined) {
        formData.append(key, String(value));
      }
    });

    // ✅ FIX #1 — Foto opsyonèl : ajoute sèlman si itilizatè chwazi youn
    // Anvan: foto te obligatwa epi bloke tout kreye si pa gen foto
    if (photoFile) {
      formData.append('photo', photoFile);
    }

    try {
      // ✅ FIX #2 — Pa voye headers manyèlman
      // Intercepteur nan api.ts detekte FormData epi retire Content-Type
      // pou kite axios mete bon "multipart/form-data; boundary=..." otomatikman
      // Anvan: { headers: { 'Content-Type': undefined } } te kase boundary →
      // Django pa t ka parse champ yo → materyal kreye men vid nan DB
      await api.post('/materiais/', formData);

      const successMsg = photoFile
        ? 'Material criado com sucesso (com foto)!'
        : 'Material criado com sucesso!';
      alert(successMsg);

      // Reset fòm lan
      setModalNewOpen(false);
      setPhotoFile(null);
      setNouveauMateriel({
        code: '',
        description: '',
        categorie_id: '',
        souscategorie_id: '',
        fournisseur_id: '',
        entrepot_principal_id: '',
        unite: 'un',
        diametre_nominal: '',
        pression_nominal: '',
        type_materiau: '',
        usage_typique: '',
        usage_type: 'INSTALL',
        stock_min: '0',
        stock_max: '',
        prix_unitaire: '0',
      });

      // Rechaje paj la
      setPage(1);
      setRefreshKey((k) => k + 1);
      await loadAllMaterialCodes();
    } catch (error: any) {
      // ✅ FIX #3 — Afiche erè API pa champ pou dyagnostik pi fasil
      const apiData = error.response?.data;
      let errMsg = 'Erro ao criar material.';
      if (typeof apiData === 'string') {
        errMsg = apiData;
      } else if (apiData?.detail) {
        errMsg = apiData.detail;
      } else if (apiData && typeof apiData === 'object') {
        const parts = Object.entries(apiData)
          .map(([field, msgs]) => {
            const msgStr = Array.isArray(msgs) ? msgs.join(', ') : String(msgs);
            return `${field}: ${msgStr}`;
          })
          .join('\n');
        errMsg = parts || JSON.stringify(apiData);
      }
      alert('Erro:\n' + errMsg);
      console.error('Erro ao criar material:', apiData || error);
    }
  };

  const openDetailModal = (materiel: any) => {
    setDetailMateriel(materiel);
    setDetailDescription(materiel.description || '');
    setDetailModalOpen(true);
  };

  const handleSaveDetail = async () => {
    if (!detailMateriel) return;
    try {
      setSavingDetail(true);
      const res = await api.patch(`/materiais/${detailMateriel.id}/`, {
        description: detailDescription,
      });
      const updated = res.data;
      setMateriais((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      setDetailMateriel(updated);
      alert('Descricao atualizada com sucesso.');
    } catch (error: any) {
      alert('Erro: ' + (error.response?.data?.detail || 'Não foi possível atualizar.'));
    } finally {
      setSavingDetail(false);
    }
  };

  const handleDemandFromDetail = () => {
    if (!detailMateriel) return;
    setSelectedItems([detailMateriel]);
    setQuantiteDemande({ [detailMateriel.id]: 1 });
    const autoEntrepotId = viewEntrepotId
      ? String(viewEntrepotId)
      : detailMateriel.stock_locations.length === 1
        ? String(getLocEntrepotId(detailMateriel.stock_locations[0]))
        : '';
    setSelectedEntrepotDemanda({ [detailMateriel.id]: autoEntrepotId });
    setDetailModalOpen(false);
    setModalOpen(true);
  };

  const openPhotoUploadModal = (materiel: any) => {
    setPhotoTargetMateriel(materiel);
    setPhotoUploadFile(null);
    setPhotoUploadModalOpen(true);
  };

  const handleUploadMaterialPhoto = async () => {
    if (!photoTargetMateriel) return;
    if (!photoUploadFile) {
      alert('Selecione uma foto.');
      return;
    }
    try {
      setUploadingPhoto(true);
      const formData = new FormData();
      formData.append('photo', photoUploadFile);
      // ✅ Pa voye Content-Type manyèlman — intercepteur api.ts jere sa
      const res = await api.patch(`/materiais/${photoTargetMateriel.id}/`, formData);
      const updated = res.data;
      setMateriais((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      if (detailMateriel?.id === updated.id) {
        setDetailMateriel(updated);
      }
      alert('Foto atualizada com sucesso.');
      setPhotoUploadModalOpen(false);
      setPhotoTargetMateriel(null);
      setPhotoUploadFile(null);
    } catch (error: any) {
      alert('Erro ao atualizar foto: ' + (error.response?.data?.detail || 'Erro desconhecido'));
    } finally {
      setUploadingPhoto(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">Gestão de Materiais</h1>
        <div className="flex gap-4">
          <Link
            href={pilierParam ? `/dashboard/pedidos?pilier=${pilierParam}` : '/dashboard/pedidos'}
            className="rounded-xl border border-orange-300 bg-orange-100 px-5 py-3 text-sm font-semibold text-orange-800 transition hover:bg-orange-200"
          >
            Operações
          </Link>
          <button
            onClick={() => {
              setNouveauMateriel((prev) => ({
                ...prev,
                entrepot_principal_id: prev.entrepot_principal_id || (lockedEntrepotId ? String(lockedEntrepotId) : ''),
              }));
              setModalNewOpen(true);
            }}
            className="btn btn-success btn-lg"
          >
            + Novo Material
          </button>
          <button
            onClick={() => setModalOpen(true)}
            className="btn btn-primary btn-lg"
          >
            + Nova Requisição
          </button>
        </div>
      </div>

      <div className="mb-6">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Pesquisar por codigo ou descricao..."
            className="input input-bordered w-full max-w-md"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5">
            <span className="text-xs font-semibold text-primary">Armazem:</span>
            <select
              className="select select-sm select-bordered min-w-[260px]"
              value={selectedViewEntrepotId}
              onChange={(e) => setSelectedViewEntrepotId(e.target.value)}
            >
              <option value="">
                {effectivePilier
                  ? `Todos (${effectivePilier})`
                  : hasAllPilierAccess
                    ? 'Todos (todos os pilares)'
                    : 'Todos'}
              </option>
              {entrepotOptions.map((ent) => (
                <option key={ent.id} value={ent.id}>{ent.nom}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <select className="select select-bordered w-56" value={filterFamille} onChange={(e) => setFilterFamille(e.target.value)}>
            <option value="">Todas famílias</option>
            {famillesOptions.map((fam) => (
              <option key={fam.id} value={fam.id}>{fam.nom}</option>
            ))}
          </select>
          <select className="select select-bordered w-64" value={filterCategorie} onChange={(e) => { setFilterCategorie(e.target.value); setFilterSousCategorie(''); }}>
            <option value="">Todas categorias</option>
            {categoriesOptions.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.nom}</option>
            ))}
          </select>
          <select className="select select-bordered w-64" value={filterSousCategorie} onChange={(e) => setFilterSousCategorie(e.target.value)} disabled={!filterCategorie}>
            <option value="">Todas subcategorias</option>
            {sousCategoriesFilterOptions.map((sc) => (
              <option key={sc.id} value={sc.id}>{sc.nom}</option>
            ))}
          </select>
          <select className="select select-bordered w-48" value={filterDiametre} onChange={(e) => setFilterDiametre(e.target.value)}>
            <option value="">Todos diametros</option>
            <option>50</option><option>63</option><option>75</option><option>90</option><option>110</option><option>160</option>
          </select>
          <select className="select select-bordered w-48" value={filterPN} onChange={(e) => setFilterPN(e.target.value)}>
            <option value="">Todas pressoes</option>
            <option>PN6</option><option>PN10</option><option>PN16</option>
          </select>
          <select className="select select-bordered w-64" value={filterUsage} onChange={(e) => setFilterUsage(e.target.value)}>
            <option value="">Todos usos</option>
            {usosTipicos.filter((u) => u.actif !== false).map((u) => (
              <option key={u.id} value={u.nom}>{u.nom}</option>
            ))}
          </select>
          {activeEntrepotName && (
            <div className="badge badge-primary badge-lg">{`Armazem: ${activeEntrepotName}`}</div>
          )}
          <button className="btn btn-outline btn-sm" onClick={() => { setFilterFamille(''); setFilterCategorie(''); setFilterSousCategorie(''); setFilterDiametre(''); setFilterPN(''); setFilterUsage(''); }}>
            Limpar filtros
          </button>
          <div className="ml-auto flex items-center gap-3">
            <button className="btn btn-outline btn-sm" onClick={() => setPage(1)} disabled={page <= 1}>Primeira</button>
            <button className="btn btn-outline btn-sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>Anterior</button>
            <span className="text-sm text-gray-500">{`Página ${page} / ${totalPages} - Total ${totalCount}`}</span>
            <button className="btn btn-outline btn-sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Próxima</button>
            <button className="btn btn-outline btn-sm" onClick={() => setPage(totalPages)} disabled={page >= totalPages}>Última</button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto bg-base-100 rounded-box shadow-lg">
        <table className="table table-zebra">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={selectedItems.length === materiaisView.length && materiaisView.length > 0}
                  onChange={() => {
                    if (selectedItems.length === materiaisView.length) {
                      setSelectedItems([]);
                      setQuantiteDemande({});
                      setSelectedEntrepotDemanda({});
                    } else {
                      setSelectedItems(materiaisView);
                      const newQ: any = {};
                      const newEntrepot: Record<number, string> = {};
                      materiaisView.forEach(m => newQ[m.id] = 1);
                      materiaisView.forEach((m) => {
                        newEntrepot[m.id] = viewEntrepotId
                          ? String(viewEntrepotId)
                          : m.stock_locations.length === 1
                            ? String(getLocEntrepotId(m.stock_locations[0]))
                            : '';
                      });
                      setQuantiteDemande(newQ);
                      setSelectedEntrepotDemanda(newEntrepot);
                    }
                  }}
                  className="checkbox checkbox-primary"
                />
              </th>
              <th>Codigo</th>
              <th>Descricao</th>
              <th>Stock Atual</th>
              <th>Stock Min</th>
              <th>Foto</th>
            </tr>
          </thead>
          <tbody>
            {materiaisView.map(m => (
              <tr key={m.id} className="hover">
                <td>
                  <input
                    type="checkbox"
                    checked={selectedItems.some(i => i.id === m.id)}
                    onChange={() => toggleItem(m)}
                    className="checkbox checkbox-primary"
                  />
                </td>
                <td>
                  <button type="button" className="font-bold text-primary hover:underline" onClick={() => openDetailModal(m)}>
                    {m.code}
                  </button>
                </td>
                <td>
                  <div>{m.description}</div>
                  {(m.categorie || m.souscategorie?.nom) && (
                    <div className="text-xs text-gray-500">
                      {m.categorie || '-'}
                      {m.souscategorie?.nom ? ` -> ${m.souscategorie.nom}` : ''}
                    </div>
                  )}
                </td>
                <td>
                  <span className={`badge ${m.stock_actuel < m.stock_min ? 'badge-error' : 'badge-success'} badge-lg`}>
                    {m.stock_actuel || 0}
                  </span>
                </td>
                <td>{m.stock_min}</td>
                <td>
                  {m.photo ? (
                    <img
                      src={resolvePhotoUrl(m.photo)}
                      alt={m.code}
                      className="w-20 h-20 object-contain rounded bg-white border"
                      loading="lazy"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => openPhotoUploadModal(m)}
                      className="bg-gray-200 border-2 border-dashed rounded-xl w-20 h-20 flex items-center justify-center text-xs hover:bg-gray-300 transition-colors"
                      title="Clique para adicionar foto"
                    >
                      Sem foto
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL ADICIONAR FOTO */}
      {photoUploadModalOpen && photoTargetMateriel && (
        <div className="modal modal-open">
          <div className="modal-box max-w-xl">
            <h3 className="font-bold text-xl mb-2">Adicionar foto do material</h3>
            <p className="text-sm mb-4">{photoTargetMateriel.code} - {photoTargetMateriel.description}</p>
            <div className="space-y-4">
              <input
                type="file"
                accept="image/*"
                className="file-input file-input-bordered file-input-primary w-full"
                onChange={(e) => setPhotoUploadFile(e.target.files?.[0] || null)}
              />
              {photoUploadFile && (
                <p className="text-sm text-gray-600">Ficheiro selecionado: {photoUploadFile.name}</p>
              )}
            </div>
            <div className="modal-action">
              <button className="btn btn-outline" onClick={() => { setPhotoUploadModalOpen(false); setPhotoTargetMateriel(null); setPhotoUploadFile(null); }} disabled={uploadingPhoto}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={handleUploadMaterialPhoto} disabled={!photoUploadFile || uploadingPhoto}>
                {uploadingPhoto ? 'A guardar...' : 'Guardar foto'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NOVO MATERIAL */}
      {modalNewOpen && (
        <div className="modal modal-open">
          <div className="modal-box max-w-4xl">
            <h3 className="font-bold text-3xl mb-6 text-center text-primary">Novo Material</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="col-span-2">
                <label className="label">
                  <span className="label-text font-bold text-primary">
                    Foto do Material <span className="text-gray-400 font-normal">(opcional)</span>
                  </span>
                </label>
                <input
                  type="file"
                  accept="image/*"
                  className="file-input file-input-bordered file-input-primary w-full"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      setPhotoFile(e.target.files[0]);
                      const preview = document.getElementById('photo-preview') as HTMLImageElement;
                      if (preview) {
                        preview.src = URL.createObjectURL(e.target.files[0]);
                        preview.classList.remove('hidden');
                      }
                    }
                  }}
                />
                <img id="photo-preview" className="hidden mt-4 max-w-sm max-h-64 rounded-lg shadow-lg object-cover border-4 border-primary" alt="Pre-visualizacao" />
              </div>

              <div>
                <label className="label"><span className="label-text font-bold">Codigo (gerado automaticamente)</span></label>
                <input type="text" placeholder="Gerado automaticamente" className="input input-bordered w-full bg-base-200" value={nouveauMateriel.code} readOnly />
                <label className="label"><span className="label-text-alt">Formato: FFF-CCC-KKK-NNNN</span></label>
              </div>

              <div>
                <label className="label"><span className="label-text font-bold">Descricao *</span></label>
                <input type="text" placeholder="Tubo PEHD DN110 PN10 - 12m" className="input input-bordered w-full" value={nouveauMateriel.description} onChange={(e) => setNouveauMateriel(prev => ({ ...prev, description: e.target.value }))} />
              </div>

              <div>
                <label className="label"><span className="label-text font-bold">Diametro Nominal (mm)</span></label>
                <input type="number" placeholder="110" className="input input-bordered w-full" value={nouveauMateriel.diametre_nominal} onChange={(e) => setNouveauMateriel(prev => ({ ...prev, diametre_nominal: e.target.value }))} disabled={!isHydraulicTypeSelected} />
              </div>

              <div>
                <label className="label"><span className="label-text font-bold">Pressao Nominal</span></label>
                <select className="select select-bordered w-full" value={nouveauMateriel.pression_nominal} onChange={(e) => setNouveauMateriel(prev => ({ ...prev, pression_nominal: e.target.value }))} disabled={!isHydraulicTypeSelected}>
                  <option value="">Selecione</option>
                  <option>PN6</option><option>PN10</option><option>PN16</option><option>PN25</option>
                </select>
              </div>

              <div>
                <label className="label"><span className="label-text font-bold">Tipo de Material (Familia) *</span></label>
                <select className="select select-bordered w-full" value={nouveauMateriel.type_materiau} onChange={(e) => setNouveauMateriel(prev => ({ ...prev, type_materiau: e.target.value }))}>
                  <option value="">Selecione</option>
                  {famillesOptions.map((fam) => (
                    <option key={fam.id} value={fam.nom}>{fam.nom}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label"><span className="label-text font-bold">Uso Tipico</span></label>
                <select className="select select-bordered w-full" value={nouveauMateriel.usage_typique} onChange={(e) => setNouveauMateriel(prev => ({ ...prev, usage_typique: e.target.value }))}>
                  <option value="">Selecione</option>
                  {usosTipicos.filter((u) => u.actif !== false).map((u) => (
                    <option key={u.id} value={u.nom}>{u.nom}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label"><span className="label-text font-bold">Estoque Minimo</span></label>
                <input type="number" className="input input-bordered w-full" value={nouveauMateriel.stock_min} onChange={(e) => setNouveauMateriel(prev => ({ ...prev, stock_min: e.target.value }))} />
              </div>

              <div>
                <label className="label"><span className="label-text font-bold">Estoque Maximo</span></label>
                <input type="number" className="input input-bordered w-full" value={nouveauMateriel.stock_max} onChange={(e) => setNouveauMateriel(prev => ({ ...prev, stock_max: e.target.value }))} />
              </div>

              <div>
                <label className="label"><span className="label-text font-bold">Preco Unitario</span></label>
                <input type="number" step="0.01" className="input input-bordered w-full" value={nouveauMateriel.prix_unitaire} onChange={(e) => setNouveauMateriel(prev => ({ ...prev, prix_unitaire: e.target.value }))} />
              </div>

              <div>
                <label className="label"><span className="label-text font-bold">Unidade</span></label>
                <select className="select select-bordered w-full" value={nouveauMateriel.unite} onChange={(e) => setNouveauMateriel(prev => ({ ...prev, unite: e.target.value }))}>
                  <option>un</option><option>m</option><option>kg</option><option>lot</option>
                </select>
              </div>

              <div>
                <label className="label"><span className="label-text font-bold">Categoria *</span></label>
                <select className="select select-bordered w-full" value={nouveauMateriel.categorie_id} onChange={(e) => setNouveauMateriel((prev) => ({ ...prev, categorie_id: e.target.value, souscategorie_id: '' }))}>
                  <option value="">Selecione</option>
                  {categoriesCreateOptions.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.nom}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label"><span className="label-text font-bold">Subcategoria (opcional)</span></label>
                <select className="select select-bordered w-full" value={nouveauMateriel.souscategorie_id} onChange={(e) => setNouveauMateriel(prev => ({ ...prev, souscategorie_id: e.target.value }))} disabled={!nouveauMateriel.categorie_id}>
                  <option value="">Sem subcategoria</option>
                  {sousCategoriesCreateOptions.map((sc) => (
                    <option key={sc.id} value={sc.id}>{sc.nom}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label"><span className="label-text font-bold">Tipo de Uso *</span></label>
                <select className="select select-bordered w-full" value={nouveauMateriel.usage_type} onChange={(e) => setNouveauMateriel(prev => ({ ...prev, usage_type: e.target.value }))}>
                  <option value="INSTALL">Instalar</option>
                  <option value="PRET">Empréstimo</option>
                </select>
              </div>

              <div>
                <label className="label"><span className="label-text font-bold">Deposito *</span></label>
                <select className="select select-bordered w-full" value={nouveauMateriel.entrepot_principal_id} onChange={(e) => setNouveauMateriel(prev => ({ ...prev, entrepot_principal_id: e.target.value }))} disabled={!!lockedEntrepotId}>
                  <option value="">Selecione</option>
                  {entrepotOptions.map(ent => (
                    <option key={ent.id} value={ent.id}>{ent.nom}</option>
                  ))}
                </select>
                <label className="label">
                  <span className="label-text-alt">
                    {effectivePilier ? `Depositos disponiveis em ${effectivePilier}` : 'Todos os depositos disponiveis'}
                  </span>
                </label>
              </div>
            </div>

            <div className="modal-action mt-8">
              <button onClick={() => { setModalNewOpen(false); setPhotoFile(null); }} className="btn btn-outline">
                Cancelar
              </button>
              {/* ✅ FIX #4 — Retire !photoFile — foto pa obligatwa pou aktive bouton */}
              <button
                onClick={handleCreateMaterial}
                disabled={!nouveauMateriel.description || !nouveauMateriel.categorie_id || !nouveauMateriel.entrepot_principal_id}
                className="btn btn-success btn-lg px-10"
              >
                Criar Material
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DEMANDA */}
      {modalOpen && (
        <div className="modal modal-open">
          <div className="modal-box max-w-5xl">
            <h3 className="font-bold text-2xl mb-6">Nova Requisição de Materiais</h3>
            <h2 className="font-bold text-xl text-green-600 mb-4">Gestão de Materiais</h2>
            <div className="alert alert-info mb-6">
              <span>{`Voce selecionou ${selectedItems.length} item(s)`}</span>
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto">
              <div className="rounded-xl border border-base-300 p-4 bg-base-100">
                <div className="text-sm font-semibold mb-3">Adicionar outro material</div>
                <div className="grid grid-cols-1 md:grid-cols-[1fr,1fr,auto] gap-3">
                  <input
                    type="text"
                    className="input input-bordered w-full"
                    placeholder="Pesquisar por codigo ou descricao..."
                    value={addItemSearchDemanda}
                    onChange={(e) => setAddItemSearchDemanda(e.target.value)}
                  />
                  <select className="select select-bordered w-full" value={addItemIdDemanda} onChange={(e) => setAddItemIdDemanda(e.target.value)}>
                    <option value="">Selecione o material</option>
                    {addCandidatesDemanda.map((m) => (
                      <option key={m.id} value={m.id}>{m.code} - {m.description}</option>
                    ))}
                  </select>
                  <button type="button" className="btn btn-outline" onClick={handleAddItemDemanda} disabled={!addItemIdDemanda}>
                    + Adicionar
                  </button>
                </div>
              </div>

              {selectedItems.map(item => (
                <div key={item.id} className="flex items-center gap-4 p-4 border-2 border-base-300 rounded-xl hover:border-primary transition-all">
                  <div className="flex-1">
                    <p className="font-bold text-lg">{item.code}</p>
                    <p className="text-sm opacity-80">{item.description}</p>
                    <p className="text-xs opacity-60">{`Stock atual: ${item.stock_actuel} | Min: ${item.stock_min}`}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="1"
                      value={quantiteDemande[item.id] || 1}
                      onChange={(e) => setQuantiteDemande(prev => ({ ...prev, [item.id]: Math.max(1, parseInt(e.target.value) || 1) }))}
                      className="input input-bordered w-28 text-center font-bold"
                    />
                    <select
                      className="select select-bordered w-56"
                      value={selectedEntrepotDemanda[item.id] || ''}
                      onChange={(e) => setSelectedEntrepotDemanda((prev) => ({ ...prev, [item.id]: e.target.value }))}
                      disabled={!!lockedEntrepotId}
                    >
                      <option value="">Selecione o deposito</option>
                      {(item.stock_locations || [])
                        .filter((loc: any) => !viewEntrepotId || getLocEntrepotId(loc) === viewEntrepotId)
                        .map((loc: any) => (
                          <option key={getLocEntrepotId(loc)} value={getLocEntrepotId(loc)}>
                            {loc.entrepot} {`(Qtd: ${loc.quantite || 0})`}
                          </option>
                        ))}
                    </select>
                    <button onClick={() => toggleItem(item)} className="btn btn-circle btn-error btn-sm">×</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="form-control w-full">
                <label className="label"><span className="label-text font-semibold">Tipo de movimento</span></label>
                <select
                  className="select select-bordered w-full"
                  value={selectedTipoFluxoDemanda}
                  onChange={(e) => {
                    const next = e.target.value as any;
                    setSelectedTipoFluxoDemanda(next);
                    if (next !== 'TRANSFERENCIA') setSelectedTransferDestinoDemandaId('');
                  }}
                >
                  <option value="INSTALACAO">Saida (Instalação)</option>
                  <option value="EMPRESTIMO">Empréstimo</option>
                  <option value="COMPRAS">Compras</option>
                  <option value="ENTRADA">Entrada</option>
                  <option value="TRANSFERENCIA">Transferencia</option>
                </select>
              </div>
              {selectedTipoFluxoDemanda === 'TRANSFERENCIA' && (
                <div className="form-control w-full">
                  <label className="label"><span className="label-text font-semibold">Deposito de destino</span></label>
                  <select className="select select-bordered w-full" value={selectedTransferDestinoDemandaId} onChange={(e) => setSelectedTransferDestinoDemandaId(e.target.value)}>
                    <option value="">Selecione o deposito de destino</option>
                    {entrepots
                      .filter((ent) => !Object.values(selectedEntrepotDemanda).some((origemId) => Number(origemId) === Number(ent.id)))
                      .map((ent) => (
                        <option key={ent.id} value={ent.id}>{ent.nom}</option>
                      ))}
                  </select>
                </div>
              )}
              {selectedTipoFluxoDemanda === 'EMPRESTIMO' && (
                <div className="form-control w-full">
                  <label className="label"><span className="label-text font-semibold">Data/hora prevista de retorno</span></label>
                  <input type="datetime-local" className="input input-bordered w-full" value={dataRetornoPrevistaDemanda} onChange={(e) => setDataRetornoPrevistaDemanda(e.target.value)} />
                </div>
              )}
              <div className="form-control w-full">
                <label className="label"><span className="label-text font-semibold">Empresa demandante</span></label>
                <select className="select select-bordered w-full" value={selectedDemandeurReelId} onChange={(e) => setSelectedDemandeurReelId(e.target.value)}>
                  <option value="">Selecione</option>
                  {utilisateursFinal.map((u) => (
                    <option key={u.id} value={u.id}>{u.entreprise}</option>
                  ))}
                </select>
              </div>
              <div className="form-control w-full md:col-span-2">
                <label className="label"><span className="label-text font-semibold">Justificativa / Observacao</span></label>
                <textarea
                  className="textarea textarea-bordered w-full"
                  rows={3}
                  placeholder="Descreva o motivo da operação (opcional)"
                  value={descricaoDemanda}
                  onChange={(e) => setDescricaoDemanda(e.target.value)}
                />
              </div>
              <div className="flex items-center justify-end gap-3 md:col-span-2">
                <button
                  onClick={() => { setModalOpen(false); setAddItemSearchDemanda(''); setAddItemIdDemanda(''); setDescricaoDemanda(''); setSelectedTransferDestinoDemandaId(''); setDataRetornoPrevistaDemanda(''); }}
                  className="btn btn-outline"
                >
                  Cancelar
                </button>
                <button onClick={handleSubmitDemanda} disabled={selectedItems.length === 0} className="btn btn-success btn-lg px-8">
                  Enviar Requisição ({selectedItems.length})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETALHES MATERIAL */}
      {detailModalOpen && detailMateriel && (
        <div className="modal modal-open">
          <div className="modal-box max-w-3xl">
            <h3 className="font-bold text-2xl mb-2">{`Detalhes: ${detailMateriel.code}`}</h3>
            <p className="text-sm opacity-70 mb-4">
              {detailMateriel.categorie || '-'}
              {detailMateriel.souscategorie?.nom ? ` -> ${detailMateriel.souscategorie.nom}` : ''}
            </p>
            <p className="text-xs opacity-70 mb-4">
              {`Modificado por: ${detailMateriel.updated_by_nome || '-'} em ${
                detailMateriel.updated_at ? new Date(detailMateriel.updated_at).toLocaleString('pt-BR') : '-'
              }`}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
              <div className="bg-base-200 rounded-lg p-3">
                <div className="text-xs opacity-70">Stock atual</div>
                <div className="text-xl font-bold">{detailMateriel.stock_actuel || 0}</div>
              </div>
              <div className="bg-base-200 rounded-lg p-3">
                <div className="text-xs opacity-70">Disponivel em depositos</div>
                <div className="text-xl font-bold">{(detailMateriel.stock_locations || []).length}</div>
              </div>
            </div>
            <div className="mb-4">
              <label className="label"><span className="label-text font-semibold">Descricao</span></label>
              <textarea className="textarea textarea-bordered w-full" rows={3} value={detailDescription} onChange={(e) => setDetailDescription(e.target.value)} />
            </div>
            <div className="mb-6">
              <div className="font-semibold mb-2">Depositos e quantidades</div>
              <div className="rounded-lg border border-base-300 max-h-52 overflow-y-auto">
                {(detailMateriel.stock_locations || []).length === 0 ? (
                  <div className="p-3 text-sm opacity-70">Sem estoque em nenhum deposito.</div>
                ) : (
                  <ul className="divide-y divide-base-300">
                    {(detailMateriel.stock_locations || []).map((loc: any) => (
                      <li key={getLocEntrepotId(loc)} className="p-3 flex justify-between text-sm">
                        <span>{loc.entrepot}</span>
                        <span className="font-semibold">{`Qtd: ${loc.quantite || 0}`}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <div className="modal-action">
              <button className="btn btn-outline" onClick={() => setDetailModalOpen(false)}>Fechar</button>
              <button className="btn btn-primary" onClick={handleDemandFromDetail}>Fazer Requisição</button>
              <button className="btn btn-success" onClick={handleSaveDetail} disabled={savingDetail}>
                {savingDetail ? 'Salvando...' : 'Salvar descricao'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MateriaisPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center min-h-screen">
          <span className="loading loading-spinner loading-lg text-primary" />
        </div>
      }
    >
      <MateriaisContent />
    </Suspense>
  );
}
