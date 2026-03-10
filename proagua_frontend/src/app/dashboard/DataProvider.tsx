// src/app/dashboard/DataProvider.tsx
'use client';

import { useEffect, useState } from 'react';
import { api } from './lib/api';

export default function DashboardContent() {
  const [stats, setStats] = useState<any>(null);
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [estoqueCritico, setEstoqueCritico] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [materiaisRes, estoquesRes, pedidosRes, movimentosRes] = await Promise.all([
          api.get('/materiais/'),
          api.get('/estoques/'),
          api.get('/pedidos/?ordering=-date_demande'),
          api.get('/movimentos/'),
        ]);

        const materiais = Array.isArray(materiaisRes.data) ? materiaisRes.data : materiaisRes.data.results || [];
        const estoques = Array.isArray(estoquesRes.data) ? estoquesRes.data : estoquesRes.data.results || [];
        const pedidosData = Array.isArray(pedidosRes.data) ? pedidosRes.data : pedidosRes.data.results || [];
        const movimentos = Array.isArray(movimentosRes.data) ? movimentosRes.data : movimentosRes.data.results || [];

        //const materiais = await materiaisRes.json();
        // const estoques = await estoquesRes.json();
        // const pedidosData = await pedidosRes.json();
        // const movimentos = await movimentosRes.json();

        const hoje = new Date().toISOString().split('T')[0];
        const movimentosHoje = movimentos.filter((m: any) => m.date_mvt.startsWith(hoje)).length;

        const stockBa = estoques.filter((e: any) => e.quantite < e.materiel.stock_min && e.quantite > 0);

        setStats({
          totalMateriais: materiais.length,
          stockBa: stockBa.length,
          pedidosPendentes: pedidosData.filter((p: any) => p.statut === 'EN_ATTENTE').length,
          movimentosHoje,
        });

        setPedidos(pedidosData.slice(0, 5));
        setEstoqueCritico(estoques.filter((e: any) => e.quantite < e.materiel.stock_min).slice(0, 5));
      } catch (err) {
        window.location.href = '/';
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center itemscenter min-h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return { stats, pedidos, estoqueCritico };
}