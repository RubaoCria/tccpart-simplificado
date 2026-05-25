import { useState, useEffect } from 'react';
import { api } from '../services/api';

export default function Dashboard() {
  const [stats, setStats] = useState({ clientes: 0, agendamentosHoje: 0, receitaTotal: 0 });

  useEffect(() => {
    async function carregarDados() {
      try {
        const [clientes, agendamentos] = await Promise.all([
          api('/clients', { method: 'GET' }),
          api('/appointments', { method: 'GET' })
        ]);

        // Pega o dia de hoje sem depender de fuso horário
        const hoje = new Date();
        const hojeString = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
        
        const agendamentosHoje = agendamentos.filter(ag => {
          if (!ag.scheduledAt && !ag.date) return false;
          const dataAg = new Date(ag.scheduledAt || ag.date);
          const dataAgString = `${dataAg.getFullYear()}-${String(dataAg.getMonth() + 1).padStart(2, '0')}-${String(dataAg.getDate()).padStart(2, '0')}`;
          return dataAgString === hojeString;
        }).length;

        const receita = agendamentos.reduce((acc, ag) => acc + (ag.chargedPriceInCents || 0), 0);

        setStats({
          clientes: clientes.length,
          agendamentosHoje,
          receitaTotal: receita / 100
        });
      } catch (error) {
        console.error('Erro no dashboard:', error);
      }
    }
    carregarDados();
  }, []);

  return (
    <div style={{ padding: '20px' }}>
      <h3 style={{ marginBottom: '25px', color: '#333' }}>📊 Painel de Controle do Salão</h3>
      
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        
        {/* Card Clientes */}
        <div style={{ flex: '1', minWidth: '200px', background: '#f0f9ff', padding: '30px', borderRadius: '10px', border: '1px solid #cce5ff', textAlign: 'center' }}>
          <h4 style={{ color: '#0056b3', margin: 0 }}>👥 Total de Clientes</h4>
          <h1 style={{ margin: '15px 0 0 0', color: '#004085' }}>{stats.clientes}</h1>
        </div>

        {/* Card Agendamentos */}
        <div style={{ flex: '1', minWidth: '200px', background: '#fff5f0', padding: '30px', borderRadius: '10px', border: '1px solid #ffdec9', textAlign: 'center' }}>
          <h4 style={{ color: '#c82333', margin: 0 }}>📅 Agendamentos Hoje</h4>
          <h1 style={{ margin: '15px 0 0 0', color: '#721c24' }}>{stats.agendamentosHoje}</h1>
        </div>

        {/* Card Receita */}
        <div style={{ flex: '1', minWidth: '200px', background: '#f0fff4', padding: '30px', borderRadius: '10px', border: '1px solid #c3e6cb', textAlign: 'center' }}>
          <h4 style={{ color: '#218838', margin: 0 }}>💰 Receita Total</h4>
          <h2 style={{ margin: '20px 0 0 0', color: '#155724' }}>
            R$ {stats.receitaTotal.toFixed(2).replace('.', ',')}
          </h2>
        </div>

      </div>
    </div>
  );
}