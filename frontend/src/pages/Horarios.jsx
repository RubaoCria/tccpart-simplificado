import { useState, useEffect } from 'react';
import { 
  Form, Button, Table, Message, useToaster, Stack, SelectPicker, 
  CheckPicker, Modal, Input, TimePicker, Checkbox, CheckboxGroup, Divider, DatePicker,
  CustomProvider 
} from 'rsuite';
import ptBR from 'rsuite/locales/pt_BR'; 
import { FaClock, FaCalendarDays, FaGear } from 'react-icons/fa6';
import * as z from 'zod';
import { api } from '../services/api';
import BlurText from '../components/BlurText';

const { Column, HeaderCell, Cell } = Table;

const theme = {
  primary: '#7B2CBF',
  light: '#fff',
  success: '#0acc03',
  danger: '#D62828',
  dark: '#21232F',
  muted: '#5E6171'
};

const schema = z.object({
  clientId: z.string().min(1, "Por favor, selecione um cliente."),
  serviceIds: z.array(z.string()).min(1, "Por favor, selecione pelo menos um serviço."),
  barberId: z.string().min(1, "Por favor, selecione um barbeiro."),
  date: z.string().min(1, "A data do agendamento é obrigatória."),
  time: z.string().min(1, "Você precisa escolher um horário disponível.")
});

export default function Horarios() {
  const [buscaCliente, setBuscaCliente] = useState('');
  const [modalClienteRapidoAberto, setModalClienteRapidoAberto] = useState(false);
  const [novoClienteForm, setNovoClienteForm] = useState({ 
    name: '', email: '', phone: '', street: '', number: '', city: '' 
  });

  const [formData, setFormData] = useState({ clientId: '', serviceIds: [], barberId: '' });
  const [dataAgenda, setDataAgenda] = useState(''); 
  const [horaAgenda, setHoraAgenda] = useState(''); 
  
  const [filtroData, setFiltroData] = useState('');
  const [filtroBarbeiro, setFiltroBarbeiro] = useState(null);
  
  const [modalExpedienteAberto, setModalExpedienteAberto] = useState(false);

  const parseSavedTime = (timeStr) => {
    if (!timeStr) return new Date();
    const [h, m] = timeStr.split(':');
    const d = new Date();
    d.setHours(Number(h), Number(m), 0);
    return d;
  };

  const getSavedDays = () => {
    const saved = localStorage.getItem('exped_diasTrabalho');
    return saved ? JSON.parse(saved) : ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
  };

  const [expediente, setExpediente] = useState({
    inicio: parseSavedTime(localStorage.getItem('exped_inicio') || '08:00'),
    almocoInicio: parseSavedTime(localStorage.getItem('exped_almocoInicio') || '12:00'),
    almocoFim: parseSavedTime(localStorage.getItem('exped_almocoFim') || '13:30'),
    fim: parseSavedTime(localStorage.getItem('exped_fim') || '19:00'),
    diasTrabalho: getSavedDays()
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

  const salvarClienteRapido = async () => {
    if (!novoClienteForm.name || !novoClienteForm.phone || !novoClienteForm.email) {
      mostrarNotificacao('warning', 'Preencha pelo menos Nome, E-mail e Telefone.');
      return;
    }
    
    setCarregando(true);
    try {
      const clienteCriado = await api('/clients', { method: 'POST', body: JSON.stringify(novoClienteForm) });
      
      const dadosClientes = await api('/clients', { method: 'GET' });
      setClientes(dadosClientes.map(c => ({ label: c.name, value: String(c.id) })));
      
      if (clienteCriado && clienteCriado.id) {
        setFormData(prev => ({ ...prev, clientId: String(clienteCriado.id) }));
      }
      
      mostrarNotificacao('success', 'Cliente cadastrado com sucesso!');
      setModalClienteRapidoAberto(false);
    } catch (err) {
      mostrarNotificacao('error', 'Erro ao cadastrar cliente: ' + err.message);
    } finally {
      setCarregando(false);
    }
  };

  const salvarExpediente = () => {
    const formatTime = (dateObj) => {
      if(!dateObj) return "00:00";
      return `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
    };

    localStorage.setItem('exped_inicio', formatTime(expediente.inicio));
    localStorage.setItem('exped_almocoInicio', formatTime(expediente.almocoInicio));
    localStorage.setItem('exped_almocoFim', formatTime(expediente.almocoFim));
    localStorage.setItem('exped_fim', formatTime(expediente.fim));
    localStorage.setItem('exped_diasTrabalho', JSON.stringify(expediente.diasTrabalho));

    mostrarNotificacao('success', 'Configurações de expediente salvas com sucesso!');
    setModalExpedienteAberto(false);
  };

  const gerarSlotsDinamicos = () => {
    const slots = [];
    const getMinutes = (dateObj) => (dateObj.getHours() * 60) + dateObj.getMinutes();
    
    const inicioMin = getMinutes(expediente.inicio);
    const almocoInicioMin = getMinutes(expediente.almocoInicio);
    const almocoFimMin = getMinutes(expediente.almocoFim);
    const fimMin = getMinutes(expediente.fim);

    for (let m = inicioMin; m < fimMin; m += 30) {
      if (m >= almocoInicioMin && m < almocoFimMin) continue;
      const hh = String(Math.floor(m / 60)).padStart(2, '0');
      const mm = String(m % 60).padStart(2, '0');
      slots.push(`${hh}:${mm}`);
    }
    return slots;
  };

  const slotsPadrao = gerarSlotsDinamicos();

  const verificarDisponibilidadeSlot = (slot) => {
    if (!dataAgenda || formData.serviceIds.length === 0 || !formData.barberId) return true;
    
    const inicioProposto = new Date(`${dataAgenda}T${slot}:00`).getTime();
    const agora = new Date().getTime();
    
    // Bloqueia horários que já passaram hoje
    if (inicioProposto < agora) {
      return false; 
    }

    // Calcula a soma em minutos dos serviços escolhidos agora na tela
    const servicosEscolhidos = servicos.filter(s => formData.serviceIds.includes(s.value));
    const duracaoTotalMinutos = servicosEscolhidos.reduce((total, s) => total + s.durationMinutes, 0) || 30;
    
    // 💡 CORREÇÃO 1: Impede que a soma dos serviços ultrapasse o horário de fim de expediente
    const fimExpedienteProposto = new Date(`${dataAgenda}T00:00:00`);
    fimExpedienteProposto.setHours(expediente.fim.getHours(), expediente.fim.getMinutes(), 0);
    const limiteExpediente = fimExpedienteProposto.getTime();
    
    const fimProposto = inicioProposto + (duracaoTotalMinutos * 60 * 1000);

    // Se o serviço terminar depois da hora de fechar, bloqueia o botão
    if (fimProposto > limiteExpediente) {
      return false;
    }

    // Varre os agendamentos antigos para ver se colide
    return !agendamentos.some(ag => {
      if (editandoId && ag.id === editandoId) return false;
      if (String(ag.barberId) !== formData.barberId) return false;
      if (ag.status === 'cancelado') return false;

      const inicioExistente = new Date(ag.scheduledAt || ag.date).getTime();
      const duracaoExistente = ag.services ? ag.services.reduce((total, s) => total + s.durationMinutes, 0) : 30;
      const fimExistente = inicioExistente + (duracaoExistente * 60 * 1000);
      
      // Regra de Sobreposição de horários
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
      
      const dataFormatadaISO = new Date(`${dataAgenda}T${horaAgenda}:00`).toISOString();

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
      const canceladosHist = JSON.parse(localStorage.getItem('historico_cancelados') || '[]');
      
      const nomeServico = agendamentoParaCancelar.service?.title 
        || (agendamentoParaCancelar.services ? agendamentoParaCancelar.services.map(s => s.title).join(', ') : 'Serviço');

      canceladosHist.push({
        id: agendamentoParaCancelar.id,
        cliente: agendamentoParaCancelar.client?.name || 'Cliente',
        servico: nomeServico,
        barbeiroId: agendamentoParaCancelar.barberId,
        dataHora: agendamentoParaCancelar.scheduledAt || agendamentoParaCancelar.date
      });
      localStorage.setItem('historico_cancelados', JSON.stringify(canceladosHist));

      await api(`/appointments/${agendamentoParaCancelar.id}`, { method: 'DELETE' });
      localStorage.removeItem(`appt_status_${agendamentoParaCancelar.id}`);
      localStorage.removeItem(`appt_payment_${agendamentoParaCancelar.id}`);
      
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
    setBuscaCliente('');
    setModalFormAberto(true);
  };

  const fecharModalForm = () => {
    setModalFormAberto(false);
    setEditandoId(null);
    setFormData({ clientId: '', serviceIds: [], barberId: '' });
    setDataAgenda('');
    setHoraAgenda('');
    setBuscaCliente('');
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
        serviceIds: ag.services ? ag.services.map(s => String(s.id)) : [],
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
  
  const mapaDiasSemana = {
    domingo: 0,
    segunda: 1,
    terca: 2,
    quarta: 3,
    quinta: 4,
    sexta: 5,
    sabado: 6
  };
  
  const diasPermitidosParaAgendar = expediente.diasTrabalho.map(dia => mapaDiasSemana[dia]);

  return (
    <CustomProvider locale={ptBR}>
      <div>
        <Stack justify="space-between" alignItems="center" style={{ marginBottom: 20, flexWrap: 'wrap', gap: 15 }}>
          <h3>
            <BlurText text="📅 Gerenciar Horários" delay={100} />
          </h3>
          <Stack spacing={15}>
            <Button 
              appearance="ghost" 
              color="violet" 
              startIcon={<FaGear />} 
              onClick={() => setModalExpedienteAberto(true)}
            >
              Configurações Expediente
            </Button>
            <Button appearance="primary" color="violet" onClick={abrirModalNovo}>
              + Novo Agendamento
            </Button>
          </Stack>
        </Stack>

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
                  <Button color="violet" appearance="link" size="xs" onClick={() => iniciarEdicao(rowData)}>Editar</Button>
                  <Button color="red" appearance="link" size="xs" onClick={() => { setAgendamentoParaCancelar(rowData); setModalCancelarAberto(true); }}>Cancelar</Button>
                </Stack>
              )}</Cell>
            </Column>
          </Table>
        </div>

        <Modal open={modalExpedienteAberto} onClose={() => setModalExpedienteAberto(false)} size="sm" backdrop="static">
          <Modal.Header>
            <Modal.Title style={{ color: theme.primary }}>
              <Stack spacing={10}><FaClock /> <span>Configurar Expediente Geral</span></Stack>
            </Modal.Title>
          </Modal.Header>
          
          <Modal.Body style={{ padding: '10px 0' }}>
            <Stack direction="column" alignItems="stretch" spacing={20}>
              
              <div>
                <h6 style={{ marginBottom: 15, color: theme.muted }}>Horários de Funcionamento</h6>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: 5 }}>Início do Dia</label>
                    <TimePicker format="HH:mm" block value={expediente.inicio} onChange={(val) => setExpediente({...expediente, inicio: val})} hideSeconds />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: 5 }}>Fim do Dia</label>
                    <TimePicker format="HH:mm" block value={expediente.fim} onChange={(val) => setExpediente({...expediente, fim: val})} hideSeconds />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: 5 }}>Início Almoço</label>
                    <TimePicker format="HH:mm" block value={expediente.almocoInicio} onChange={(val) => setExpediente({...expediente, almocoInicio: val})} hideSeconds />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: 5 }}>Fim Almoço</label>
                    <TimePicker format="HH:mm" block value={expediente.almocoFim} onChange={(val) => setExpediente({...expediente, almocoFim: val})} hideSeconds />
                  </div>
                </div>
              </div>

              <Divider style={{ margin: '10px 0' }} />

              <div>
                <h6 style={{ marginBottom: 15, color: theme.muted }}>
                  <Stack spacing={10}><FaCalendarDays /> <span>Dias de Trabalho</span></Stack>
                </h6>
                <CheckboxGroup 
                  inline 
                  name="diasTrabalho" 
                  value={expediente.diasTrabalho}
                  onChange={(val) => setExpediente({...expediente, diasTrabalho: val})}
                >
                  <Checkbox value="segunda">Seg</Checkbox>
                  <Checkbox value="terca">Ter</Checkbox>
                  <Checkbox value="quarta">Qua</Checkbox>
                  <Checkbox value="quinta">Qui</Checkbox>
                  <Checkbox value="sexta">Sex</Checkbox>
                  <Checkbox value="sabado">Sáb</Checkbox>
                  <Checkbox value="domingo">Dom</Checkbox>
                </CheckboxGroup>
              </div>

            </Stack>
          </Modal.Body>

          <Modal.Footer>
            <Button onClick={salvarExpediente} appearance="primary" color="violet">
              Salvar Alterações
            </Button>
            <Button onClick={() => setModalExpedienteAberto(false)} appearance="subtle">
              Cancelar
            </Button>
          </Modal.Footer>
        </Modal>

        {/* MODAL PRINCIPAL: CRIAR OU EDITAR AGENDAMENTO */}
        <Modal open={modalFormAberto} onClose={fecharModalForm} size="md" overflow={true}>
          <Modal.Header><Modal.Title>{editandoId ? '✍️ Editar Agendamento' : '✨ Agendar Novo Horário'}</Modal.Title></Modal.Header>
          <Modal.Body style={{ paddingRight: 10 }}>
            <Form fluid>
              <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                <Form.Group style={{ flex: 1, minWidth: '150px' }}>
                  <Form.ControlLabel>Cliente</Form.ControlLabel>
                  <SelectPicker 
                    data={clientes} 
                    block 
                    value={formData.clientId} 
                    onChange={(val) => setFormData({ ...formData, clientId: val })} 
                    onSearch={(keyword) => setBuscaCliente(keyword)}
                    renderExtraFooter={() => {
                      const clienteNaoEncontrado = buscaCliente && !clientes.some(c => c.label.toLowerCase().includes(buscaCliente.toLowerCase()));

                      if (clienteNaoEncontrado) {
                        return (
                          <div style={{ padding: '15px', textAlign: 'center', borderTop: '1px solid #e5e5ea', background: '#f9fafb' }}>
                            <p style={{ marginBottom: '10px', color: '#6b7280', fontSize: '13px' }}>Cliente não encontrado.</p>
                            <Button 
                              appearance="primary" 
                              color="violet" 
                              size="sm"
                              onClick={() => {
                                setNovoClienteForm({ 
                                  name: buscaCliente, 
                                  email: '', 
                                  phone: '', 
                                  street: '', 
                                  number: '', 
                                  city: '' 
                                });
                                setModalClienteRapidoAberto(true);
                              }}
                            >
                              + Cadastrar "{buscaCliente}"
                            </Button>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </Form.Group>
                
                {/* 💡 CORREÇÃO 2: Formatação da exibição de múltiplos serviços no CheckPicker */}
                <Form.Group style={{ flex: 1, minWidth: '150px' }}>
                  <Form.ControlLabel>Serviços (Selecione um ou mais)</Form.ControlLabel>
                  <CheckPicker 
                    data={servicos} 
                    block 
                    value={formData.serviceIds} 
                    searchable={false} 
                    placeholder="Selecione..." 
                    onChange={(val) => { setFormData({ ...formData, serviceIds: val }); setHoraAgenda(''); }}
                    countable={false} // Evita as tags numéricas grandes que quebram o layout
                    renderValue={(value, item, selectedElement) => {
                       // Formata o texto para não estourar a linha quando seleciona vários
                       if (value.length === 1) return item[0].label;
                       return `${value.length} serviços selecionados`;
                    }}
                  />
                </Form.Group>

                <Form.Group style={{ flex: 1, minWidth: '150px' }}>
                  <Form.ControlLabel>Barbeiro</Form.ControlLabel>
                  <SelectPicker data={barbeiros} block value={formData.barberId} onChange={(val) => { setFormData({ ...formData, barberId: val }); setHoraAgenda(''); }} />
                </Form.Group>
              </div>
              
              <div style={{ marginTop: '15px' }}>
                  <Form.Group style={{ width: '200px' }}>
                      <Form.ControlLabel>Data</Form.ControlLabel>
                      
                      <DatePicker 
                        format="yyyy-MM-dd"
                        block
                        value={dataAgenda ? new Date(dataAgenda + 'T12:00:00') : null}
                        onChange={(dataSelecionada) => {
                          if (dataSelecionada) {
                            const yyyy = dataSelecionada.getFullYear();
                            const mm = String(dataSelecionada.getMonth() + 1).padStart(2, '0');
                            const dd = String(dataSelecionada.getDate()).padStart(2, '0');
                            setDataAgenda(`${yyyy}-${mm}-${dd}`);
                          } else {
                            setDataAgenda('');
                          }
                          setHoraAgenda('');
                        }}
                        shouldDisableDate={(dataCalendario) => {
                          const ontem = new Date();
                          ontem.setHours(0, 0, 0, 0);
                          if (dataCalendario < ontem) return true;
                          if (!diasPermitidosParaAgendar.includes(dataCalendario.getDay())) return true;
                          return false;
                        }}
                        renderCell={(dataCalendario) => {
                          const ontem = new Date();
                          ontem.setHours(0, 0, 0, 0);
                          const isBloqueado = dataCalendario < ontem || !diasPermitidosParaAgendar.includes(dataCalendario.getDay());

                          if (isBloqueado) {
                            return (
                              <div style={{ 
                                color: theme.primary, 
                                opacity: 0.4, 
                                textDecoration: 'line-through',
                                fontWeight: 'bold'
                              }}>
                                {dataCalendario.getDate()}
                              </div>
                            );
                          }
                          return dataCalendario.getDate();
                        }}
                      />
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
                             backgroundColor: disponivel ? (horaAgenda === slot ? '#8b5cf6' : '#f3f4f6') : '#fee2e2',
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

        {/* MODAL SECUNDÁRIO: CADASTRO RÁPIDO DE CLIENTE */}
        <Modal open={modalClienteRapidoAberto} onClose={() => setModalClienteRapidoAberto(false)} size="sm">
          <Modal.Header><Modal.Title>⚡ Cadastro Rápido</Modal.Title></Modal.Header>
          <Modal.Body>
            <Form fluid>
              <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginBottom: '15px' }}>
                <Form.Group style={{ flex: 1, minWidth: '200px' }}>
                  <Form.ControlLabel>Nome Completo</Form.ControlLabel>
                  <Form.Control name="name" accepter={Input} value={novoClienteForm.name} onChange={(val) => setNovoClienteForm({ ...novoClienteForm, name: val })} />
                </Form.Group>
                <Form.Group style={{ flex: 1, minWidth: '200px' }}>
                  <Form.ControlLabel>E-mail</Form.ControlLabel>
                  <Form.Control name="email" accepter={Input} type="email" value={novoClienteForm.email} onChange={(val) => setNovoClienteForm({ ...novoClienteForm, email: val })} />
                </Form.Group>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <Form.Group style={{ width: '100%', maxWidth: '300px' }}>
                  <Form.ControlLabel>Telefone / WhatsApp</Form.ControlLabel>
                  <Form.Control name="phone" accepter={Input} value={novoClienteForm.phone} onChange={(val) => setNovoClienteForm({ ...novoClienteForm, phone: val })} />
                </Form.Group>
              </div>

              <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                <Form.Group style={{ flex: 2, minWidth: '150px' }}>
                  <Form.ControlLabel>Rua / Residência</Form.ControlLabel>
                  <Form.Control name="street" accepter={Input} value={novoClienteForm.street} onChange={(val) => setNovoClienteForm({ ...novoClienteForm, street: val })} />
                </Form.Group>
                <Form.Group style={{ flex: 1, minWidth: '80px' }}>
                  <Form.ControlLabel>Número</Form.ControlLabel>
                  <Form.Control name="number" accepter={Input} value={novoClienteForm.number} onChange={(val) => setNovoClienteForm({ ...novoClienteForm, number: val })} />
                </Form.Group>
                <Form.Group style={{ flex: 1, minWidth: '150px' }}>
                  <Form.ControlLabel>Cidade</Form.ControlLabel>
                  <Form.Control name="city" accepter={Input} value={novoClienteForm.city} onChange={(val) => setNovoClienteForm({ ...novoClienteForm, city: val })} />
                </Form.Group>
              </div>
            </Form>
          </Modal.Body>
          <Modal.Footer>
            <Button appearance="primary" color="violet" onClick={salvarClienteRapido} loading={carregando}>
              Salvar e Continuar Agendamento
            </Button>
            <Button appearance="subtle" onClick={() => setModalClienteRapidoAberto(false)}>
              Cancelar
            </Button>
          </Modal.Footer>
        </Modal>

        {/* MODAL DE CONFIRMAÇÃO DE CANCELAMENTO */}
        <Modal open={modalCancelarAberto} onClose={() => setModalCancelarAberto(false)} size="xs">
          <Modal.Header><Modal.Title>Cancelar Agendamento</Modal.Title></Modal.Header>
          <Modal.Body>Tem certeza que deseja cancelar este agendamento?</Modal.Body>
          <Modal.Footer>
            <Button onClick={confirmarCancelamento} color="red" appearance="primary">Sim, cancelar</Button>
            <Button onClick={() => setModalCancelarAberto(false)} appearance="subtle">Não</Button>
          </Modal.Footer>
        </Modal>

      </div>
    </CustomProvider>
  );
}