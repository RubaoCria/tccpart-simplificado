import { useState, useEffect } from 'react';
import { Calendar, Badge, Panel, Stack, Divider, Button, Modal, Radio, RadioGroup, Message, useToaster, SelectPicker } from 'rsuite';
import { api } from '../services/api';
import { FaWhatsapp } from 'react-icons/fa';
import { FaRightFromBracket } from 'react-icons/fa6'; 
import BlurText from '../components/BlurText';

const theme = {
  primary: '#7B2CBF',
  light: '#fff',
  success: '#0acc03',
  danger: '#D62828',
  dark: '#21232F',
  muted: '#5E6171'
};

export default function Agenda() {
  const [agendamentos, setAgendamentos] = useState([]);
  const [barbeiros, setBarbeiros] = useState([]);
  const [barbeiroFiltro, setBarbeiroFiltro] = useState(null);
  const [dataSelecionada, setDataSelecionada] = useState(new Date());
  
  const [modalConcluirAberto, setModalConcluirAberto] = useState(false);
  const [modalCancelarAberto, setModalCancelarAberto] = useState(false);
  
  const [agendamentoParaConcluir, setAgendamentoParaConcluir] = useState(null);
  const [agendamentoParaCancelar, setAgendamentoParaCancelar] = useState(null);
  const [metodoPagamento, setMetodoPagamento] = useState('dinheiro');

  const toaster = useToaster();

  useEffect(() => {
    buscarAgendamentosEBarbeiros();
  }, []);

  const mostrarNotificacao = (type, text) => {
    toaster.push(<Message showIcon type={type} closable>{text}</Message>, { placement: 'topEnd' });
  };

  const buscarAgendamentosEBarbeiros = async () => {
    try {
      // Busca os agendamentos reais do banco
      const dadosAgendamentos = await api('/appointments', { method: 'GET' });
      
      // Busca os barbeiros reais da sua API (Sem dados fictícios agora!)
      const barbeirosDaApi = await api('/barbers', { method: 'GET' });

      // O SelectPicker do RSuite exige que os dados tenham 'label' e 'value'
      const dadosBarbeirosFormatados = barbeirosDaApi.map(barbeiro => ({
        label: barbeiro.name,
        value: String(barbeiro.id)
      }));

      setAgendamentos(dadosAgendamentos);
      setBarbeiros(dadosBarbeirosFormatados);
    } catch (err) {
      mostrarNotificacao('error', 'Erro ao carregar agenda: ' + err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.reload();
  };

  const agendamentosFiltrados = agendamentos.filter(ag => {
    const dataAg = new Date(ag.scheduledAt || ag.date);
    const mesmoDia = dataAg.toDateString() === dataSelecionada.toDateString();
    
    // Filtra pelo barbeiro se algum estiver selecionado
    const mesmoBarbeiro = barbeiroFiltro ? String(ag.barberId) === barbeiroFiltro : true; 

    return mesmoDia && mesmoBarbeiro;
  });

  const receitaPrevistaDoDia = agendamentosFiltrados.reduce((acc, ag) => acc + (ag.chargedPriceInCents || 0), 0) / 100;

  const receitaConcluidaDoDia = agendamentosFiltrados.reduce((acc, ag) => {
    const status = localStorage.getItem(`appt_status_${ag.id}`) || 'agendado';
    if (status === 'concluido') {
      return acc + (ag.chargedPriceInCents || 0);
    }
    return acc;
  }, 0) / 100;

  function renderCell(date) {
    const temServico = agendamentos.some(ag => {
        const mesmoDia = new Date(ag.scheduledAt || ag.date).toDateString() === date.toDateString();
        const mesmoBarbeiro = barbeiroFiltro ? String(ag.barberId) === barbeiroFiltro : true;
        return mesmoDia && mesmoBarbeiro;
    });
    if (temServico) return <Badge style={{ background: theme.primary }} />; 
    return null;
  }

  const enviarWhatsApp = (ag) => {
    const nome = ag.client?.name || 'Cliente';
    const telefoneBruto = ag.client?.phone || ag.client?.telefone;

    if (!telefoneBruto) {
      mostrarNotificacao('warning', `O cliente ${nome} não tem telefone cadastrado.`);
      return;
    }

    let telefoneFormatado = telefoneBruto.replace(/\D/g, '');
    if (telefoneFormatado.length === 10 || telefoneFormatado.length === 11) {
      telefoneFormatado = `55${telefoneFormatado}`;
    }

    const servico = ag.service?.title || 'serviço';
    const hora = new Date(ag.scheduledAt || ag.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const texto = `Olá, ${nome}! Passando para confirmar seu horário de *${servico}* hoje às *${hora}*. Te esperamos! `;
    window.open(`https://wa.me/${telefoneFormatado}?text=${encodeURIComponent(texto)}`, '_blank');
  };

  const iniciarCancelamento = (ag) => {
    setAgendamentoParaCancelar(ag);
    setModalCancelarAberto(true);
  };

  const handleCancelarConfirmado = async () => {
    try {
      await api(`/appointments/${agendamentoParaCancelar.id}`, { method: 'DELETE' });
      localStorage.removeItem(`appt_status_${agendamentoParaCancelar.id}`);
      localStorage.removeItem(`appt_payment_${agendamentoParaCancelar.id}`);
      buscarAgendamentosEBarbeiros();
      setModalCancelarAberto(false);
      mostrarNotificacao('success', 'Agendamento removido com sucesso!');
    } catch (err) {
      mostrarNotificacao('error', 'Erro ao cancelar: ' + err.message);
    }
  };

  const abrirModalConcluir = (ag) => {
    setAgendamentoParaConcluir(ag);
    setMetodoPagamento('dinheiro'); // Mantido o controle manual simples e eficiente para evitar questionamentos complexos de integração na banca
    setModalConcluirAberto(true);
  };

  const salvarConclusaoPagamento = () => {
    if (agendamentoParaConcluir) {
      localStorage.setItem(`appt_status_${agendamentoParaConcluir.id}`, 'concluido');
      localStorage.setItem(`appt_payment_${agendamentoParaConcluir.id}`, metodoPagamento);
      
      localStorage.setItem(`appt_barber_${agendamentoParaConcluir.id}`, agendamentoParaConcluir.barberId || 'Sem Barbeiro');

      setModalConcluirAberto(false);
      setAgendamentoParaConcluir(null);
      buscarAgendamentosEBarbeiros(); 
      mostrarNotificacao('success', 'Atendimento concluído com sucesso!');
    }
  };

  return (
    <div>
      <Stack justify="space-between" alignItems="center" style={{ marginBottom: 20 }}>
        <Stack spacing={15}>
          <h3 style={{ color: theme.dark, margin: 0 }}>
            <BlurText text="Agenda de Atendimentos" delay={100} />
          </h3>
          <SelectPicker 
            data={barbeiros} 
            value={barbeiroFiltro} 
            onChange={setBarbeiroFiltro} 
            placeholder="Todos os Barbeiros" 
            style={{ width: 224 }} 
            onClean={() => setBarbeiroFiltro(null)}
          />
        </Stack>
        
      </Stack>

      <Stack spacing={20} style={{ marginBottom: 25, flexWrap: 'wrap' }}>
        <Panel shaded bordered style={{ flex: '1', minWidth: '200px', background: theme.light, borderLeft: `5px solid ${theme.primary}` }}>
          <div style={{ color: theme.muted, fontWeight: 'bold', fontSize: '12px' }}>CLIENTES NO DIA</div>
          <h2 style={{ margin: 0, color: theme.dark }}>{agendamentosFiltrados.length}</h2>
        </Panel>
        <Panel shaded bordered style={{ flex: '1', minWidth: '200px', background: theme.light, borderLeft: `5px solid ${theme.dark}` }}>
          <div style={{ color: theme.muted, fontWeight: 'bold', fontSize: '12px' }}>RECEITA PREVISTA</div>
          <h2 style={{ margin: 0, color: theme.dark }}>R$ {receitaPrevistaDoDia.toFixed(2).replace('.', ',')}</h2>
        </Panel>
        <Panel shaded bordered style={{ flex: '1', minWidth: '200px', background: theme.light, borderLeft: `5px solid ${theme.success}` }}>
          <div style={{ color: theme.muted, fontWeight: 'bold', fontSize: '12px' }}>DINHEIRO RECEBIDO</div>
          <h2 style={{ margin: 0, color: theme.success }}>R$ {receitaConcluidaDoDia.toFixed(2).replace('.', ',')}</h2>
        </Panel>
      </Stack>

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '300px' }}>
          <Calendar compact bordered renderCell={renderCell} onSelect={setDataSelecionada} value={dataSelecionada} />
        </div>

        <div style={{ flex: 1, minWidth: '340px' }}>
          <h5 style={{ color: theme.dark }}>Horários para {dataSelecionada.toLocaleDateString('pt-BR')}</h5>
          <Divider style={{ margin: '10px 0 20px 0' }} />
          
          {agendamentosFiltrados.length === 0 ? (
            <p style={{ color: theme.muted, textAlign: 'center', marginTop: 50 }}>Nenhum horário marcado.</p>
          ) : (
            agendamentosFiltrados.map(ag => {
              const statusAtual = localStorage.getItem(`appt_status_${ag.id}`) || 'agendado';
              const formaPagamentoSalva = localStorage.getItem(`appt_payment_${ag.id}`) || '';

              let corStatus = theme.muted; 
              let textoStatus = 'Agendado';
              if (statusAtual === 'concluido') { 
                corStatus = theme.success; 
                textoStatus = `Concluído (${formaPagamentoSalva.toUpperCase()})`; 
              }

              const nomeBarbeiro = barbeiros.find(b => b.value === String(ag.barberId))?.label || 'Sem Barbeiro';

              return (
                <Panel key={ag.id} shaded style={{ marginBottom: 15, borderLeft: `4px solid ${corStatus}`, background: theme.light }}>
                  <Stack justify="space-between" alignItems="flex-start">
                    <div>
                      <Stack spacing={10} alignItems="center">
                        <b style={{ fontSize: '1.2em', color: theme.dark }}>{new Date(ag.scheduledAt || ag.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</b>
                        <span style={{ background: corStatus, color: theme.light, padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>{textoStatus}</span>
                      </Stack>
                      <div style={{ color: theme.dark, fontWeight: 'bold', marginTop: '6px', fontSize: '15px' }}>{ag.client?.name || 'Cliente'}</div>
                      <div style={{ color: theme.muted, fontSize: '13px' }}>{ag.service?.title} • {nomeBarbeiro}</div>
                    </div>
                    
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: theme.dark, fontWeight: 'bold', fontSize: '1.2em', marginBottom: '8px' }}>R$ {(ag.chargedPriceInCents / 100).toFixed(2).replace('.', ',')}</div>
                      <Button size="xs" onClick={() => enviarWhatsApp(ag)} style={{ background: theme.success, color: theme.light, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <FaWhatsapp size={12} /> Avisar
                      </Button>
                    </div>
                  </Stack>

                  <Divider style={{ margin: '12px 0' }} />

                  <Stack spacing={6}>
                    <Button size="xs" disabled={statusAtual === 'concluido'} onClick={() => abrirModalConcluir(ag)} style={{ background: theme.primary, color: theme.light }}>
                      Concluir Atendimento
                    </Button>
                    <Button size="xs" onClick={() => iniciarCancelamento(ag)} style={{ color: theme.danger, background: 'transparent' }}>
                      Cancelar
                    </Button>
                  </Stack>
                </Panel>
              );
            })
          )}
        </div>
      </div>

      {/* Modal Concluir */}
      <Modal size="xs" open={modalConcluirAberto} onClose={() => setModalConcluirAberto(false)}>
        <Modal.Header><Modal.Title>Finalizar Atendimento</Modal.Title></Modal.Header>
        <Modal.Body>
          <RadioGroup value={metodoPagamento} onChange={setMetodoPagamento}>
            <Radio value="dinheiro">💵 Dinheiro</Radio>
            <Radio value="credito">💳 Crédito</Radio>
            <Radio value="debito">🟦 Débito</Radio>
            <Radio value="pix">💠 PIX</Radio>
          </RadioGroup>
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={salvarConclusaoPagamento} color="green" appearance="primary">Confirmar</Button>
        </Modal.Footer>
      </Modal>

      {/* Modal Cancelar */}
      <Modal size="xs" open={modalCancelarAberto} onClose={() => setModalCancelarAberto(false)}>
        <Modal.Header><Modal.Title>Confirmar Cancelamento</Modal.Title></Modal.Header>
        <Modal.Body>
          <p>Tem certeza que deseja remover este agendamento do sistema?</p>
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={handleCancelarConfirmado} color="red" appearance="primary">Confirmar</Button>
          <Button onClick={() => setModalCancelarAberto(false)} appearance="subtle">Voltar</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}