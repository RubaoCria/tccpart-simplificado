import { useState, useEffect } from 'react';
import { Calendar, Badge, Panel, Stack, Divider } from 'rsuite';
import { api } from '../services/api';

export default function Agenda() {
  const [agendamentos, setAgendamentos] = useState([]);
  const [dataSelecionada, setDataSelecionada] = useState(new Date());

  useEffect(() => {
    buscarAgendamentos();
  }, []);

  const buscarAgendamentos = async () => {
    try {
      const dados = await api('/appointments', { method: 'GET' });
      setAgendamentos(dados);
    } catch (err) {
      console.error("Erro ao carregar agenda:", err);
    }
  };

  // Lógica Matemática: Filtra agendamentos do dia selecionado
  const agendamentosDoDia = agendamentos.filter(ag => {
    const dataAg = new Date(ag.scheduledAt || ag.date);
    return dataAg.toDateString() === dataSelecionada.toDateString();
  });

  const receitaDoDia = agendamentosDoDia.reduce((acc, ag) => acc + (ag.chargedPriceInCents || 0), 0) / 100;

  // Renderiza bolinhas coloridas no calendário para dias que têm serviço
  function renderCell(date) {
    const temServico = agendamentos.some(ag => new Date(ag.scheduledAt || ag.date).toDateString() === date.toDateString());
    if (temServico) return <Badge style={{ background: '#7c3aed' }} />; // Pontinho roxo
    return null;
  }

  return (
    <div>
      <h3 style={{ marginBottom: 20 }}>📅 Agenda de Atendimentos</h3>

      {/* Cards de Resumo do Dia Selecionado */}
      <Stack spacing={20} style={{ marginBottom: 20 }}>
        <Panel shaded bordered style={{ flex: 1, background: '#f5f3ff', borderLeft: '5px solid #7c3aed' }}>
          <div style={{ color: '#7c3aed', fontWeight: 'bold' }}>CLIENTES EM {dataSelecionada.toLocaleDateString('pt-BR')}</div>
          <h2 style={{ margin: 0 }}>{agendamentosDoDia.length}</h2>
        </Panel>
        <Panel shaded bordered style={{ flex: 1, background: '#f0fdf4', borderLeft: '5px solid #22c55e' }}>
          <div style={{ color: '#16a34a', fontWeight: 'bold' }}>RECEITA PREVISTA</div>
          <h2 style={{ margin: 0 }}>R$ {receitaDoDia.toFixed(2).replace('.', ',')}</h2>
        </Panel>
      </Stack>

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        {/* Calendário */}
        <div style={{ flex: 1, minWidth: '300px' }}>
          <Calendar 
            compact 
            bordered 
            renderCell={renderCell} 
            onSelect={setDataSelecionada} 
            value={dataSelecionada}
          />
        </div>

        {/* Lista de Horários do Dia */}
        <div style={{ flex: 1, minWidth: '300px' }}>
          <h5>Horários para {dataSelecionada.toLocaleDateString('pt-BR')}</h5>
          <Divider />
          {agendamentosDoDia.length === 0 ? (
            <p style={{ color: '#999', textAlign: 'center', marginTop: 50 }}>Nenhum horário marcado para este dia.</p>
          ) : (
            agendamentosDoDia.map(ag => (
              <Panel key={ag.id} shaded style={{ marginBottom: 10, borderLeft: '4px solid #7c3aed' }}>
                <Stack justify="space-between">
                  <div>
                    <b style={{ fontSize: '1.1em' }}>{new Date(ag.scheduledAt || ag.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</b>
                    <div style={{ color: '#666' }}>{ag.client?.name || 'Cliente'}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.9em', fontWeight: 'bold' }}>{ag.service?.title}</div>
                    <div style={{ color: '#16a34a' }}>R$ {(ag.chargedPriceInCents / 100).toFixed(2)}</div>
                  </div>
                </Stack>
              </Panel>
            ))
          )}
        </div>
      </div>
    </div>
  );
}