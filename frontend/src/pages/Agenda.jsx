import { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';
import { api } from '../services/api';

export default function Agenda() {
  const [agendamentos, setAgendamentos] = useState([]);
  const [dataSelecionadaFormatada, setDataSelecionadaFormatada] = useState(new Date().toLocaleDateString('pt-BR'));
  
  // Cria o filtro inicial com o dia de hoje no formato YYYY-MM-DD
  const hoje = new Date();
  const hojeString = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
  const [dataFiltro, setDataFiltro] = useState(hojeString);

  useEffect(() => {
    carregarAgendamentos();
  }, []);

  const carregarAgendamentos = async () => {
    try {
      const dados = await api('/appointments', { method: 'GET' });
      setAgendamentos(dados);
    } catch (err) {
      console.error('Erro ao carregar agenda:', err);
    }
  };

  const handleDateClick = (arg) => {
    setDataFiltro(arg.dateStr); // O FullCalendar entrega exatamente "YYYY-MM-DD"
    const partes = arg.dateStr.split('-');
    setDataSelecionadaFormatada(`${partes[2]}/${partes[1]}/${partes[0]}`); // Transforma em DD/MM/YYYY para o título
  };

  // Filtro inteligente e livre de bugs de fuso horário
  const agendamentosDoDia = agendamentos.filter((ag) => {
    if (!ag || !ag.scheduledAt) return false;
    
    const dateObj = new Date(ag.scheduledAt);
    if (isNaN(dateObj.getTime())) return false;
    
    // Extrai o ano, mês e dia local do agendamento do banco
    const ano = dateObj.getFullYear();
    const mes = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dia = String(dateObj.getDate()).padStart(2, '0');
    const dataAgendamentoString = `${ano}-${mes}-${dia}`;
    
    return dataAgendamentoString === dataFiltro;
  });

  // Desenha as barrinhas coloridas dentro dos quadrados do calendário
  const eventosCalendario = agendamentos
    .filter(ag => ag && ag.scheduledAt && !isNaN(new Date(ag.scheduledAt).getTime()))
    .map((ag) => ({
      id: ag.id,
      title: `${ag.client?.name || 'Cliente'} - ${ag.service?.title || 'Serviço'}`,
      date: ag.scheduledAt 
    }));

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          locale={ptBrLocale}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
          }}
          buttonText={{ today: 'Hoje', month: 'Mês', week: 'Semana', day: 'Dia' }}
          height="450px"
          dateClick={handleDateClick}
          events={eventosCalendario} 
        />
      </div>

      <div style={{ padding: '20px', border: '1px solid #eee', borderRadius: '10px', background: '#fcfcfc' }}>
        <h4>Horários de: <span style={{ color: '#7B2CBF' }}>{dataSelecionadaFormatada}</span></h4>
        <hr />

        {agendamentosDoDia.length === 0 ? (
          <p style={{ color: '#999', textAlign: 'center', padding: '20px' }}>Nenhum agendamento para este dia.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {agendamentosDoDia.map((ag) => {
              const horario = new Date(ag.scheduledAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
              const clienteNome = ag.client?.name || 'Cliente Não Informado';
              const servicoNome = ag.service?.title || 'Serviço Não Informado';
              const valorReal = ag.service?.priceInCents ? `R$ ${(ag.service.priceInCents / 100).toFixed(2).replace('.', ',')}` : 'R$ 0,00';

              return (
                <li key={ag.id} style={{
                  padding: '15px',
                  borderLeft: '5px solid #7B2CBF',
                  background: 'white',
                  marginBottom: '10px',
                  borderRadius: '5px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <h5 style={{ margin: 0, color: '#7B2CBF' }}>{horario} - {servicoNome}</h5>
                    <small style={{ color: '#666' }}>👤 Cliente: {clienteNome}</small>
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#2ecc71' }}>
                    {valorReal}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}