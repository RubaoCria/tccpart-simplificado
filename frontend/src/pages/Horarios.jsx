import { useState, useEffect } from 'react';
import { Form, Button, Table, Message, useToaster, Stack, SelectPicker, Panel } from 'rsuite';
import { api } from '../services/api';

const { Column, HeaderCell, Cell } = Table;

export default function Horarios() {
  const [formData, setFormData] = useState({ clientId: '', serviceId: '' });
  const [dataAgenda, setDataAgenda] = useState(''); 
  const [horaAgenda, setHoraAgenda] = useState(''); 
  
  // ESTADO DO EXPEDIENTE: Carrega do navegador ou usa um padrão
  const [expediente, setExpediente] = useState({
    inicio: localStorage.getItem('exped_inicio') || '08:00',
    almocoInicio: localStorage.getItem('exped_almocoInicio') || '12:00',
    almocoFim: localStorage.getItem('exped_almocoFim') || '13:30',
    fim: localStorage.getItem('exped_fim') || '19:00'
  });
  
  const [agendamentos, setAgendamentos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const toaster = useToaster();

  useEffect(() => {
    buscarTodosOsDados();
  }, []);

  const buscarTodosOsDados = async () => {
    setCarregando(true);
    try {
      const [dadosAgendamentos, dadosClientes, dadosServicos] = await Promise.all([
        api('/appointments', { method: 'GET' }),
        api('/clients', { method: 'GET' }),
        api('/services', { method: 'GET' })
      ]);

      setAgendamentos(dadosAgendamentos.sort((a, b) => new Date(a.scheduledAt || a.date) - new Date(b.scheduledAt || b.date)));
      setClientes(dadosClientes.map(c => ({ label: c.name, value: c.id })));
      setServicos(dadosServicos.map(s => ({ 
        label: `${s.title} (${s.durationMinutes} min)`, 
        value: s.id, 
        originalPrice: s.priceInCents,
        durationMinutes: s.durationMinutes 
      })));
    } catch (err) {
      mostrarNotificacao('error', 'Erro ao carregar dados: ' + err.message);
    } finally {
      setCarregando(false);
    }
  };

  // LÓGICA MATEMÁTICA 1: Gerador de Botões de Horário (Pula o almoço automaticamente)
  const gerarSlotsDinamicos = () => {
    const slots = [];
    const parseTime = (timeStr) => {
      const [h, m] = timeStr.split(':').map(Number);
      return (h * 60) + m; // Converte tudo para minutos
    };
    
    const inicioMin = parseTime(expediente.inicio);
    const almocoInicioMin = parseTime(expediente.almocoInicio);
    const almocoFimMin = parseTime(expediente.almocoFim);
    const fimMin = parseTime(expediente.fim);

    for (let m = inicioMin; m < fimMin; m += 30) {
      // Se a hora atual bater dentro da faixa do almoço, pula pra próxima meia hora
      if (m >= almocoInicioMin && m < almocoFimMin) continue;
      
      const hh = String(Math.floor(m / 60)).padStart(2, '0');
      const mm = String(m % 60).padStart(2, '0');
      slots.push(`${hh}:${mm}`);
    }
    return slots;
  };

  const slotsPadrao = gerarSlotsDinamicos();

  // Função para salvar a mudança do expediente na hora que digitar
  const atualizarExpediente = (campo, valor) => {
    const novoExpediente = { ...expediente, [campo]: valor };
    setExpediente(novoExpediente);
    localStorage.setItem(`exped_${campo}`, valor);
    setHoraAgenda(''); // Reseta a escolha de hora pra evitar bugs se o horário sumir
  };

  // LÓGICA MATEMÁTICA 2: Bloqueia botões de clientes já agendados
  const verificarDisponibilidadeSlot = (slot) => {
    if (!dataAgenda || !formData.serviceId) return true;

    const servicoAtual = servicos.find(s => s.value === formData.serviceId);
    const duracaoAtual = servicoAtual ? servicoAtual.durationMinutes : 30;

    const inicioProposto = new Date(`${dataAgenda}T${slot}:00`).getTime();
    const fimProposto = inicioProposto + (duracaoAtual * 60 * 1000);

    const temColisao = agendamentos.some(ag => {
      if (editandoId && ag.id === editandoId) return false;

      const dataAg = ag.scheduledAt || ag.date;
      if (!dataAg) return false;

      const inicioExistente = new Date(dataAg).getTime();
      const servicoExistente = servicos.find(s => s.value === ag.serviceId);
      const duracaoExistente = servicoExistente ? servicoExistente.durationMinutes : 30;
      const fimExistente = inicioExistente + (duracaoExistente * 60 * 1000);

      return (inicioProposto < fimExistente && fimProposto > inicioExistente);
    });

    return !temColisao; 
  };

  const salvarAgendamento = async () => {
    if (!formData.clientId || !formData.serviceId || !dataAgenda || !horaAgenda) {
      window.alert('⚠️ Erro: Por favor, selecione o Cliente, o Serviço, a Data e um dos Horários disponíveis!');
      return;
    }
    setCarregando(true);

    try {
      const servicoSelecionado = servicos.find(s => s.value === formData.serviceId);
      const dataFormatadaISO = new Date(`${dataAgenda}T${horaAgenda}:00`).toISOString();

      const dadosParaSalvar = {
        clientId: Number(formData.clientId),
        serviceId: Number(formData.serviceId),
        scheduledAt: dataFormatadaISO,
        chargedPriceInCents: servicoSelecionado ? servicoSelecionado.originalPrice : 0
      };

      if (editandoId) {
        await api(`/appointments/${editandoId}`, { method: 'PATCH', body: JSON.stringify(dadosParaSalvar) });
        mostrarNotificacao('success', 'Agendamento atualizado!');
      } else {
        await api('/appointments', { method: 'POST', body: JSON.stringify(dadosParaSalvar) });
        mostrarNotificacao('success', 'Agendamento realizado!');
      }

      cancelarEdicao();
      buscarTodosOsDados();
    } catch (err) {
      window.alert('Erro ao salvar: ' + err.message);
    } finally {
      setCarregando(false);
    }
  };

  const cancelarAgendamentoBanco = async (id) => {
    if (!confirm('Tem certeza que deseja cancelar este horário?')) return;
    try {
      await api(`/appointments/${id}`, { method: 'DELETE' });
      mostrarNotificacao('success', 'Horário cancelado!');
      buscarTodosOsDados();
    } catch (err) {
      mostrarNotificacao('error', 'Erro ao cancelar: ' + err.message);
    }
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
    setFormData({ clientId: ag.clientId, serviceId: ag.serviceId });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelarEdicao = () => {
    setEditandoId(null);
    setFormData({ clientId: '', serviceId: '' });
    setDataAgenda('');
    setHoraAgenda('');
  };

  const mostrarNotificacao = (type, text) => {
    toaster.push(<Message showIcon type={type} closable>{text}</Message>, { placement: 'topEnd' });
  };

  return (
    <div>
      <h3 style={{ marginBottom: 20 }}>📅 Gerenciar Horários</h3>

      {/* PAINEL DE CONFIGURAÇÃO DE EXPEDIENTE */}
      <Panel header="⚙️ Configurações de Expediente da Barbearia" collapsible bordered style={{ marginBottom: 25, background: '#fff' }}>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '150px' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 5 }}>Abertura</label>
            <input type="time" className="rs-input" value={expediente.inicio} onChange={(e) => atualizarExpediente('inicio', e.target.value)} />
          </div>
          <div style={{ flex: 1, minWidth: '150px' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 5 }}>Saída Almoço</label>
            <input type="time" className="rs-input" value={expediente.almocoInicio} onChange={(e) => atualizarExpediente('almocoInicio', e.target.value)} />
          </div>
          <div style={{ flex: 1, minWidth: '150px' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 5 }}>Volta Almoço</label>
            <input type="time" className="rs-input" value={expediente.almocoFim} onChange={(e) => atualizarExpediente('almocoFim', e.target.value)} />
          </div>
          <div style={{ flex: 1, minWidth: '150px' }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 5 }}>Fechamento</label>
            <input type="time" className="rs-input" value={expediente.fim} onChange={(e) => atualizarExpediente('fim', e.target.value)} />
          </div>
        </div>
        <p style={{ marginTop: 15, color: '#666', fontSize: '0.9em' }}>* Os botões de agendamento se adaptam instantaneamente a essas regras.</p>
      </Panel>

      <div style={{ background: '#f9f9f9', padding: 20, borderRadius: 8, marginBottom: 30, border: '1px solid #eee' }}>
        <h5>{editandoId ? '✍️ Editar Agendamento' : '✨ Agendar Novo Horário'}</h5>
        <br />
        <Form fluid>
          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <Form.Group style={{ flex: 1, minWidth: '200px' }}>
              <Form.ControlLabel>Selecione o Cliente</Form.ControlLabel>
              <SelectPicker data={clientes} block placeholder="Escolha o cliente" value={formData.clientId} onChange={(val) => setFormData({ ...formData, clientId: val })} />
            </Form.Group>

            <Form.Group style={{ flex: 1, minWidth: '200px' }}>
              <Form.ControlLabel>Selecione o Serviço</Form.ControlLabel>
              <SelectPicker data={servicos} block placeholder="Escolha o serviço" value={formData.serviceId} onChange={(val) => { setFormData({ ...formData, serviceId: val }); setHoraAgenda(''); }} />
            </Form.Group>

            <Form.Group style={{ flex: 1, minWidth: '200px' }}>
              <Form.ControlLabel>Selecione o Dia</Form.ControlLabel>
              <input type="date" className="rs-input" value={dataAgenda} onChange={(e) => { setDataAgenda(e.target.value); setHoraAgenda(''); }} style={{ height: '36px' }} />
            </Form.Group>
          </div>

          {dataAgenda && formData.serviceId && (
            <div style={{ marginTop: '25px' }}>
              <Form.ControlLabel style={{ fontWeight: 'bold', display: 'block', marginBottom: '10px' }}>
                ⏰ Horários Disponíveis:
              </Form.ControlLabel>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', background: '#fff', padding: '15px', borderRadius: '6px', border: '1px solid #ddd' }}>
                {slotsPadrao.length === 0 ? (
                  <p style={{ color: 'red' }}>Nenhum horário configurado para este dia.</p>
                ) : (
                  slotsPadrao.map(slot => {
                    const disponivel = verificarDisponibilidadeSlot(slot);
                    const selecionado = horaAgenda === slot;

                    return (
                      <Button
                        key={slot}
                        disabled={!disponivel}
                        appearance={selecionado ? 'primary' : 'outline'}
                        color={selecionado ? 'violet' : 'default'}
                        onClick={() => setHoraAgenda(slot)}
                        style={{ width: '85px', fontWeight: selecionado ? 'bold' : 'normal', textDecoration: !disponivel ? 'line-through' : 'none' }}
                      >
                        {slot}
                      </Button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          <Stack spacing={10} style={{ marginTop: 25 }}>
            <Button appearance="primary" color="violet" onClick={salvarAgendamento} loading={carregando}>
              {editandoId ? 'Salvar Alterações' : 'Confirmar Agendamento'}
            </Button>
            {editandoId && <Button appearance="subtle" onClick={cancelarEdicao}>Cancelar</Button>}
          </Stack>
        </Form>
      </div>

      <h5>Lista Geral de Agendamentos</h5>
      <br />
      <Table data={agendamentos} autoHeight bordered cellBordered loading={carregando}>
        <Column width={160}><HeaderCell>Data e Hora</HeaderCell><Cell>{rowData => { const dataExibir = rowData.scheduledAt || rowData.date; return dataExibir ? new Date(dataExibir).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'; }}</Cell></Column>
        <Column flexGrow={2}><HeaderCell>Cliente</HeaderCell><Cell>{rowData => rowData.client?.name || `ID: ${rowData.clientId}`}</Cell></Column>
        <Column flexGrow={2}><HeaderCell>Serviço</HeaderCell><Cell>{rowData => rowData.service?.title || 'Serviço não informado'}</Cell></Column>
        <Column flexGrow={1}><HeaderCell>Valor Cobrado</HeaderCell><Cell>{rowData => rowData.chargedPriceInCents ? `R$ ${(rowData.chargedPriceInCents / 100).toFixed(2).replace('.', ',')}` : '-'}</Cell></Column>
        <Column width={150} align="center" fixed="right"><HeaderCell>Ações</HeaderCell><Cell>{rowData => (<Stack spacing={5} justify="center"><Button color="blue" appearance="link" size="xs" onClick={() => iniciarEdicao(rowData)}>Editar</Button><Button color="red" appearance="link" size="xs" onClick={() => cancelarAgendamentoBanco(rowData.id)}>Cancelar</Button></Stack>)}</Cell></Column>
      </Table>
    </div>
  );
}