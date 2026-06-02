import { useState, useEffect } from 'react';
import { Form, Button, Table, Message, useToaster, Stack, SelectPicker, CheckPicker, Panel, Modal } from 'rsuite';
import * as z from 'zod';
import { api } from '../services/api';
import BlurText from '../components/BlurText';
import GooeyNav from '../components/GooeyNav';

const { Column, HeaderCell, Cell } = Table;

const schema = z.object({
  clientId: z.string().min(1, "Por favor, selecione um cliente."),
  serviceIds: z.array(z.string()).min(1, "Por favor, selecione pelo menos um serviço."),
  barberId: z.string().min(1, "Por favor, selecione um barbeiro."),
  date: z.string().min(1, "A data do agendamento é obrigatória."),
  time: z.string().min(1, "Você precisa escolher um horário disponível.")
});

export default function Horarios() {
  const [formData, setFormData] = useState({ clientId: '', serviceIds: [], barberId: '' });
  const [dataAgenda, setDataAgenda] = useState(''); 
  const [horaAgenda, setHoraAgenda] = useState(''); 
  
  const [filtroData, setFiltroData] = useState('');
  const [filtroBarbeiro, setFiltroBarbeiro] = useState(null);
  
  const [expediente, setExpediente] = useState({
    inicio: localStorage.getItem('exped_inicio') || '08:00',
    almocoInicio: localStorage.getItem('exped_almocoInicio') || '12:00',
    almocoFim: localStorage.getItem('exped_almocoFim') || '13:30',
    fim: localStorage.getItem('exped_fim') || '19:00'
  });
  
  const [agendamentos, setAgendamentos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [barbeiros, setBarbeiros] = useState([]);
  
  const [feriados, setFeriados] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  
  const [modalFormAberto, setModalFormAberto] = useState(false);
  const [modalCancelarAberto, setModalCancelarAberto] = useState(false);
  const [agendamentoParaCancelar, setAgendamentoParaCancelar] = useState(null);
  
  const toaster = useToaster();

  useEffect(() => {
    buscarTodosOsDados();
    buscarFeriados();
  }, []);

  const mostrarNotificacao = (type, text) => {
    toaster.push(<Message showIcon type={type} closable>{text}</Message>, { placement: 'topEnd' });
  };

  const buscarFeriados = async () => {
    try {
      const anoAtual = new Date().getFullYear();
      const resposta = await fetch(`https://brasilapi.com.br/api/feriados/v1/${anoAtual}`);
      const dados = await resposta.json();
      setFeriados(dados);
    } catch (err) {
      console.error("Erro ao buscar calendário de feriados:", err);
    }
  };

  const buscarTodosOsDados = async () => {
    setCarregando(true);
    try {
      const [dadosAgendamentos, dadosClientes, dadosServicos, dadosBarbeirosApi] = await Promise.all([
        api('/appointments', { method: 'GET' }),
        api('/clients', { method: 'GET' }),
        api('/services', { method: 'GET' }),
        api('/barbers', { method: 'GET' })
      ]);

      setAgendamentos(dadosAgendamentos.sort((a, b) => new Date(a.scheduledAt || a.date) - new Date(b.scheduledAt || b.date)));
      setClientes(dadosClientes.map(c => ({ label: c.name, value: String(c.id) })));
      setServicos(dadosServicos.map(s => ({ 
        label: `${s.title} (${s.durationMinutes} min) - R$ ${(s.priceInCents / 100).toFixed(2)}`, 
        value: String(s.id), 
        originalPrice: s.priceInCents,
        durationMinutes: s.durationMinutes 
      })));
      
      setBarbeiros(dadosBarbeirosApi.map(b => ({
        label: b.name,
        value: String(b.id)
      })));

    } catch (err) {
      mostrarNotificacao('error', 'Erro ao carregar dados: ' + err.message);
    } finally {
      setCarregando(false);
    }
  };

  const gerarSlotsDinamicos = () => {
    const slots = [];
    const parseTime = (timeStr) => {
      const [h, m] = timeStr.split(':').map(Number);
      return (h * 60) + m;
    };
    const inicioMin = parseTime(expediente.inicio);
    const almocoInicioMin = parseTime(expediente.almocoInicio);
    const almocoFimMin = parseTime(expediente.almocoFim);
    const fimMin = parseTime(expediente.fim);

    for (let m = inicioMin; m < fimMin; m += 30) {
      if (m >= almocoInicioMin && m < almocoFimMin) continue;
      const hh = String(Math.floor(m / 60)).padStart(2, '0');
      const mm = String(m % 60).padStart(2, '0');
      slots.push(`${hh}:${mm}`);
    }
    return slots;
  };

  const slotsPadrao = gerarSlotsDinamicos();

  const atualizarExpediente = (campo, valor) => {
    setExpediente(prev => ({ ...prev, [campo]: valor }));
    localStorage.setItem(`exped_${campo}`, valor);
  };

  const verificarDisponibilidadeSlot = (slot) => {
    if (!dataAgenda || formData.serviceIds.length === 0 || !formData.barberId) return true;
    
    // TRAVA DE TEMPO: Verifica se o horário selecionado já passou
    const inicioProposto = new Date(`${dataAgenda}T${slot}:00`).getTime();
    const agora = new Date().getTime();
    
    if (inicioProposto < agora) {
      return false; 
    }

    // Calcula a duração somada de todos os serviços escolhidos
    const servicosEscolhidos = servicos.filter(s => formData.serviceIds.includes(s.value));
    const duracaoTotal = servicosEscolhidos.reduce((total, s) => total + s.durationMinutes, 0) || 30;
    const fimProposto = inicioProposto + (duracaoTotal * 60 * 1000);

    return !agendamentos.some(ag => {
      if (editandoId && ag.id === editandoId) return false;
      if (String(ag.barberId) !== formData.barberId) return false;
      if (ag.status === 'cancelado') return false;

      const inicioExistente = new Date(ag.scheduledAt || ag.date).getTime();
      const duracaoExistente = ag.services ? ag.services.reduce((total, s) => total + s.durationMinutes, 0) : 30;
      const fimExistente = inicioExistente + (duracaoExistente * 60 * 1000);
      
      // Checa se os blocos de tempo se sobrepõem
      return (inicioProposto < fimExistente && fimProposto > inicioExistente);
    });
  };

  const salvarAgendamento = async () => {
    const validacao = schema.safeParse({
      clientId: String(formData.clientId),
      serviceIds: formData.serviceIds,
      barberId: String(formData.barberId),
      date: dataAgenda,
      time: horaAgenda
    });

    if (!validacao.success) {
      mostrarNotificacao('warning', validacao.error.errors[0].message);
      return;
    }

    setCarregando(true);
    try {
      const servicosEscolhidos = servicos.filter(s => formData.serviceIds.includes(s.value));
      const precoTotal = servicosEscolhidos.reduce((total, s) => total + s.originalPrice, 0);
      const duracaoTotal = servicosEscolhidos.reduce((total, s) => total + s.durationMinutes, 0);
      
      const dataFormatadaISO = new Date(`${dataAgenda}T${horaAgenda}:00`).toISOString();
      const dataFimISO = new Date(new Date(`${dataAgenda}T${horaAgenda}:00`).getTime() + (duracaoTotal * 60 * 1000)).toISOString();

      const dadosParaSalvar = {
        clientId: Number(formData.clientId),
        serviceIds: formData.serviceIds.map(Number),
        barberId: Number(formData.barberId), 
        scheduledAt: dataFormatadaISO,
        chargedPriceInCents: precoTotal
      };

      if (editandoId) {
        await api(`/appointments/${editandoId}`, { method: 'PATCH', body: JSON.stringify(dadosParaSalvar) });
        mostrarNotificacao('success', 'Você editou seu agendamento!');
      } else {
        await api('/appointments', { method: 'POST', body: JSON.stringify(dadosParaSalvar) });
        mostrarNotificacao('success', 'Você cadastrou seu agendamento!');
      }
      fecharModalForm();
      buscarTodosOsDados();
    } catch (err) {
      mostrarNotificacao('error', 'Erro ao salvar: ' + err.message);
    } finally {
      setCarregando(false);
    }
  };

  const confirmarCancelamento = async () => {
    try {
      await api(`/appointments/${agendamentoParaCancelar.id}`, { method: 'DELETE' });
      localStorage.removeItem(`appt_status_${agendamentoParaCancelar.id}`);
      mostrarNotificacao('success', 'Agendamento cancelado!');
      buscarTodosOsDados();
    } catch (err) {
      mostrarNotificacao('error', 'Erro: ' + err.message);
    } finally {
      setModalCancelarAberto(false);
    }
  };

  const abrirModalNovo = () => {
    setEditandoId(null);
    setFormData({ clientId: '', serviceIds: [], barberId: '' });
    setDataAgenda('');
    setHoraAgenda('');
    setModalFormAberto(true);
  };

  const fecharModalForm = () => {
    setModalFormAberto(false);
    setEditandoId(null);
    setFormData({ clientId: '', serviceIds: [], barberId: '' });
    setDataAgenda('');
    setHoraAgenda('');
  };

  const iniciarEdicao = (ag) => {
    setEditandoId(ag.id);
    const dataReal = ag.scheduledAt || ag.date; 
    if (dataReal) {
      const d = new Date(dataReal);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const hh = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      setDataAgenda(`${yyyy}-${mm}-${dd}`);
      setHoraAgenda(`${hh}:${min}`);
    }
    setFormData({ 
        clientId: String(ag.clientId), 
        serviceIds: ag.services ? ag.services.map(s => String(s.id)) : [], // Carrega múltiplos IDs
        barberId: String(ag.barberId || '') 
    });
    setModalFormAberto(true);
  };

  const dadosFiltrados = agendamentos.filter(ag => {
    let passaData = true;
    let passaBarbeiro = true;

    if (filtroData) passaData = new Date(ag.scheduledAt || ag.date).toISOString().split('T')[0] === filtroData;
    if (filtroBarbeiro) passaBarbeiro = String(ag.barberId) === filtroBarbeiro;

    return passaData && passaBarbeiro;
  });

  const feriadoSelecionado = feriados.find(f => f.date === dataAgenda);
  const hoje = new Date();
  const dataHoje = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;

  return (
    <div>
      <Stack justify="space-between" alignItems="center" style={{ marginBottom: 20 }}>
        <h3>
          <BlurText text="📅 Gerenciar Horários" delay={100} />
        </h3>
        <Button appearance="primary" color="violet" onClick={abrirModalNovo}>
          + Novo Agendamento
        </Button>
      </Stack>

      <Panel header="⚙️ Configurações de Expediente" collapsible bordered style={{ marginBottom: 25, background: '#fff' }}>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          {['inicio', 'almocoInicio', 'almocoFim', 'fim'].map(campo => (
            <div key={campo} style={{ flex: 1, minWidth: '150px' }}>
              <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 5 }}>{campo.toUpperCase()}</label>
              <input type="time" className="rs-input" value={expediente[campo]} onChange={(e) => atualizarExpediente(campo, e.target.value)} />
            </div>
          ))}
        </div>
      </Panel>

      <div style={{ background: 'white', padding: 15, borderRadius: 8, border: '1px solid #eee' }}>
        <Stack justify="space-between" style={{ marginBottom: 15, flexWrap: 'wrap' }}>
          <h5>Lista Geral de Agendamentos</h5>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
             <SelectPicker 
                data={barbeiros} 
                value={filtroBarbeiro} 
                onChange={setFiltroBarbeiro} 
                placeholder="Filtrar Barbeiro" 
                style={{ width: 180 }}
                onClean={() => setFiltroBarbeiro(null)}
             />
             <input type="date" className="rs-input" value={filtroData} onChange={(e) => setFiltroData(e.target.value)} />
             <Button appearance="subtle" onClick={() => {setFiltroData(''); setFiltroBarbeiro(null);}}>Limpar</Button>
          </div>
        </Stack>

        <Table data={dadosFiltrados} autoHeight bordered cellBordered loading={carregando}>
          <Column width={160}><HeaderCell>Data e Hora</HeaderCell><Cell>{rowData => new Date(rowData.scheduledAt || rowData.date).toLocaleString('pt-BR')}</Cell></Column>
          <Column flexGrow={1}><HeaderCell>Cliente</HeaderCell><Cell>{rowData => rowData.client?.name}</Cell></Column>
          <Column flexGrow={1}><HeaderCell>Serviços</HeaderCell><Cell>{rowData => rowData.services ? rowData.services.map(s => s.title).join(', ') : '-'}</Cell></Column>
          <Column flexGrow={1}><HeaderCell>Barbeiro</HeaderCell><Cell>{rowData => barbeiros.find(b => b.value === String(rowData.barberId))?.label || '-'}</Cell></Column>
          <Column width={150} align="center" fixed="right">
            <HeaderCell>Ações</HeaderCell>
            <Cell>{rowData => (
              <Stack spacing={5} justify="center">
                <Button color="blue" appearance="link" size="xs" onClick={() => iniciarEdicao(rowData)}>Editar</Button>
                <Button color="red" appearance="link" size="xs" onClick={() => { setAgendamentoParaCancelar(rowData); setModalCancelarAberto(true); }}>Cancelar</Button>
              </Stack>
            )}</Cell>
          </Column>
        </Table>
      </div>

      <Modal open={modalFormAberto} onClose={fecharModalForm} size="md" overflow={true}>
        <Modal.Header><Modal.Title>{editandoId ? '✍️ Editar Agendamento' : '✨ Agendar Novo Horário'}</Modal.Title></Modal.Header>
        <Modal.Body style={{ paddingRight: 10 }}>
          <Form fluid>
            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
              <Form.Group style={{ flex: 1, minWidth: '150px' }}>
                <Form.ControlLabel>Cliente</Form.ControlLabel>
                <SelectPicker data={clientes} block value={formData.clientId} onChange={(val) => setFormData({ ...formData, clientId: val })} />
              </Form.Group>
              <Form.Group style={{ flex: 1, minWidth: '150px' }}>
                <Form.ControlLabel>Serviços (Selecione um ou mais)</Form.ControlLabel>
                {/* Aqui está o CheckPicker nativo do RSuite para múltiplas seleções */}
                <CheckPicker data={servicos} block value={formData.serviceIds} searchable={false} placeholder="Selecione..." onChange={(val) => { setFormData({ ...formData, serviceIds: val }); setHoraAgenda(''); }} />
              </Form.Group>
              <Form.Group style={{ flex: 1, minWidth: '150px' }}>
                <Form.ControlLabel>Barbeiro</Form.ControlLabel>
                <SelectPicker data={barbeiros} block value={formData.barberId} onChange={(val) => { setFormData({ ...formData, barberId: val }); setHoraAgenda(''); }} />
              </Form.Group>
            </div>
            
            <div style={{ marginTop: '15px' }}>
                <Form.Group style={{ width: '200px' }}>
                    <Form.ControlLabel>Data</Form.ControlLabel>
                    <input type="date" className="rs-input" min={dataHoje} value={dataAgenda} onChange={(e) => { setDataAgenda(e.target.value); setHoraAgenda(''); }} />
                </Form.Group>
            </div>

            {dataAgenda && feriadoSelecionado && (
              <div style={{ marginTop: '20px', padding: '12px', background: '#fee2e2', borderRadius: '6px', border: '1px solid #ef4444', color: '#b91c1c' }}>
                <strong>⚠️ Salão Fechado:</strong> O dia selecionado é feriado nacional (<strong>{feriadoSelecionado.name}</strong>). Não é possível agendar nesta data.
              </div>
            )}

            {dataAgenda && !feriadoSelecionado && formData.serviceIds.length > 0 && formData.barberId && (
              <div style={{ marginTop: '20px' }}>
                <label style={{ fontWeight: 'bold' }}>⏰ Horários Disponíveis:</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
                  {slotsPadrao.map(slot => {
                     const disponivel = verificarDisponibilidadeSlot(slot);
                     return (
                       <Button 
                         key={slot} 
                         disabled={!disponivel} 
                         appearance={horaAgenda === slot ? 'primary' : 'subtle'} 
                         onClick={() => setHoraAgenda(slot)}
                         style={{
                           textDecoration: disponivel ? 'none' : 'line-through',
                           backgroundColor: disponivel ? (horaAgenda === slot ? '#8b5cf6' : '#f3f4f6') : '#fee2e2', // Fundo vermelho claro se indisponível
                           color: disponivel ? (horaAgenda === slot ? '#fff' : '#1f2937') : '#9ca3af',
                           border: disponivel ? '1px solid #d1d5db' : '1px solid #fca5a5'
                         }}
                       >
                         {slot}
                       </Button>
                     )
                  })}
                </div>
              </div>
            )}
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button appearance="primary" color="violet" onClick={salvarAgendamento} loading={carregando} disabled={!!feriadoSelecionado}>
            {editandoId ? 'Salvar Alterações' : 'Confirmar Agendamento'}
          </Button>
          <Button appearance="subtle" onClick={fecharModalForm}>Cancelar</Button>
        </Modal.Footer>
      </Modal>

      <Modal open={modalCancelarAberto} onClose={() => setModalCancelarAberto(false)} size="xs">
        <Modal.Header><Modal.Title>Cancelar Agendamento</Modal.Title></Modal.Header>
        <Modal.Body>Tem certeza que deseja cancelar este agendamento?</Modal.Body>
        <Modal.Footer>
          <Button onClick={confirmarCancelamento} color="red" appearance="primary">Sim, cancelar</Button>
          <Button onClick={() => setModalCancelarAberto(false)} appearance="subtle">Não</Button>
        </Modal.Footer>
      </Modal>

    </div>
  );
}y