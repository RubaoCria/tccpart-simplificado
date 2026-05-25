import { useState, useEffect } from 'react';
import { Calendar, Badge, Panel, Stack, Divider, Button, Modal, Radio, RadioGroup } from 'rsuite';
import { api } from '../services/api';
import { FaWhatsapp } from 'react-icons/fa';
// Adicionei este ícone para o Sair
import { FaRightFromBracket } from 'react-icons/fa6'; 

// Sua Paleta Oficial
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
  const [dataSelecionada, setDataSelecionada] = useState(new Date());
  
  const [modalConcluirAberto, setModalConcluirAberto] = useState(false);
  const [agendamentoParaConcluir, setAgendamentoParaConcluir] = useState(null);
  const [metodoPagamento, setMetodoPagamento] = useState('dinheiro');

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

  // Lógica de Logout
  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.reload();
  };

  const agendamentosDoDia = agendamentos.filter(ag => {
    const dataAg = new Date(ag.scheduledAt || ag.date);
    return dataAg.toDateString() === dataSelecionada.toDateString();
  });

  const receitaPrevistaDoDia = agendamentosDoDia.reduce((acc, ag) => acc + (ag.chargedPriceInCents || 0), 0) / 100;

  const receitaConcluidaDoDia = agendamentosDoDia.reduce((acc, ag) => {
    const status = localStorage.getItem(`appt_status_${ag.id}`) || 'agendado';
    if (status === 'concluido') {
      return acc + (ag.chargedPriceInCents || 0);
    }
    return acc;
  }, 0) / 100;

  function renderCell(date) {
    const temServico = agendamentos.some(ag => new Date(ag.scheduledAt || ag.date).toDateString() === date.toDateString());
    if (temServico) return <Badge style={{ background: theme.primary }} />; 
    return null;
  }

  const enviarWhatsApp = (ag) => {
    const nome = ag.client?.name || 'Cliente';
    const telefoneBruto = ag.client?.phone || ag.client?.telefone;

    if (!telefoneBruto) {
      window.alert(`⚠️ O cliente ${nome} não tem um número de telefone cadastrado.`);
      return;
    }

    let telefoneFormatado = telefoneBruto.replace(/\D/g, '');
    if (telefoneFormatado.length === 10 || telefoneFormatado.length === 11) {
      telefoneFormatado = `55${telefoneFormatado}`;
    }

    const servico = ag.service?.title || 'serviço';
    const hora = new Date(ag.scheduledAt || ag.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const texto = `Olá, ${nome}! Passando para confirmar seu horário de *${servico}* hoje às *${hora}*. Te esperamos! ✂️`;
    
    window.open(`https://wa.me/${telefoneFormatado}?text=${encodeURIComponent(texto)}`, '_blank');
  };

  const handleCancelar = async (id) => {
    if (window.confirm('Tem certeza que deseja cancelar e remover este agendamento do sistema?')) {
      try {
        await api(`/appointments/${id}`, { method: 'DELETE' });
        localStorage.removeItem(`appt_status_${id}`);
        localStorage.removeItem(`appt_payment_${id}`);
        buscarAgendamentos();
      } catch (err) {
        window.alert('Erro ao cancelar agendamento: ' + err.message);
      }
    }
  };

  const handleEditarAviso = () => {
    window.alert('💡 Para editar de forma segura (evitando choques de horário), utilize a aba "Horários" no menu lateral.');
  };

  const abrirModalConcluir = (ag) => {
    setAgendamentoParaConcluir(ag);
    setMetodoPagamento('dinheiro');
    setModalConcluirAberto(true);
  };

  const salvarConclusaoPagamento = () => {
    if (agendamentoParaConcluir) {
      localStorage.setItem(`appt_status_${agendamentoParaConcluir.id}`, 'concluido');
      localStorage.setItem(`appt_payment_${agendamentoParaConcluir.id}`, metodoPagamento);
      setModalConcluirAberto(false);
      setAgendamentoParaConcluir(null);
      buscarAgendamentos(); 
    }
  };

  return (
    <div>
      {/* Cabeçalho com Título e Botão Sair */}
      <Stack justify="space-between" alignItems="center" style={{ marginBottom: 20 }}>
        <h3 style={{ color: theme.dark, margin: 0 }}>📅 Agenda de Atendimentos</h3>
        <Button 
          appearance="subtle" 
          color="red" 
          onClick={handleLogout}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}
        >
          <FaRightFromBracket /> Sair
        </Button>
      </Stack>

      <Stack spacing={20} style={{ marginBottom: 25, flexWrap: 'wrap' }}>
        <Panel shaded bordered style={{ flex: '1', minWidth: '200px', background: theme.light, borderLeft: `5px solid ${theme.primary}` }}>
          <div style={{ color: theme.muted, fontWeight: 'bold', fontSize: '12px' }}>CLIENTES NO DIA</div>
          <h2 style={{ margin: 0, color: theme.dark }}>{agendamentosDoDia.length}</h2>
        </Panel>
        
        <Panel shaded bordered style={{ flex: '1', minWidth: '200px', background: theme.light, borderLeft: `5px solid ${theme.dark}` }}>
          <div style={{ color: theme.muted, fontWeight: 'bold', fontSize: '12px' }}>RECEITA PREVISTA (TOTAL)</div>
          <h2 style={{ margin: 0, color: theme.dark }}>R$ {receitaPrevistaDoDia.toFixed(2).replace('.', ',')}</h2>
        </Panel>

        <Panel shaded bordered style={{ flex: '1', minWidth: '200px', background: theme.light, borderLeft: `5px solid ${theme.success}` }}>
          <div style={{ color: theme.muted, fontWeight: 'bold', fontSize: '12px' }}>DINHEIRO RECEBIDO (CAIXA)</div>
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
          
          {agendamentosDoDia.length === 0 ? (
            <p style={{ color: theme.muted, textAlign: 'center', marginTop: 50 }}>Nenhum horário marcado para este dia.</p>
          ) : (
            agendamentosDoDia.map(ag => {
              const statusAtual = localStorage.getItem(`appt_status_${ag.id}`) || 'agendado';
              const formaPagamentoSalva = localStorage.getItem(`appt_payment_${ag.id}`) || '';

              let corStatus = theme.muted; 
              let textoStatus = 'Agendado';
              if (statusAtual === 'concluido') { 
                corStatus = theme.success; 
                textoStatus = `Concluído (${formaPagamentoSalva.toUpperCase()})`; 
              }

              return (
                <Panel key={ag.id} shaded style={{ marginBottom: 15, borderLeft: `4px solid ${corStatus}`, background: theme.light }}>
                  <Stack justify="space-between" alignItems="flex-start">
                    <div>
                      <Stack spacing={10} alignItems="center">
                        <b style={{ fontSize: '1.2em', color: theme.dark }}>
                          {new Date(ag.scheduledAt || ag.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </b>
                        <span style={{ background: corStatus, color: theme.light, padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>
                          {textoStatus}
                        </span>
                      </Stack>
                      <div style={{ color: theme.dark, fontWeight: 'bold', marginTop: '6px', fontSize: '15px' }}>{ag.client?.name || 'Cliente'}</div>
                      <div style={{ color: theme.muted, fontSize: '13px', marginTop: '2px' }}>{ag.service?.title}</div>
                    </div>
                    
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: theme.dark, fontWeight: 'bold', fontSize: '1.2em', marginBottom: '8px' }}>
                        R$ {(ag.chargedPriceInCents / 100).toFixed(2).replace('.', ',')}
                      </div>
                      <Button size="xs" onClick={() => enviarWhatsApp(ag)} style={{ background: theme.success, color: theme.light, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <FaWhatsapp size={12} /> Avisar
                      </Button>
                    </div>
                  </Stack>

                  <Divider style={{ margin: '12px 0' }} />

                  <Stack spacing={6} wrap style={{ width: '100%' }}>
                    <Button size="xs" disabled={statusAtual === 'concluido'} onClick={handleEditarAviso} style={{ color: theme.dark, border: `1px solid ${theme.muted}` }}>
                      Editar
                    </Button>
                    
                    <Button size="xs" disabled={statusAtual === 'concluido'} onClick={() => abrirModalConcluir(ag)} style={{ background: theme.primary, color: theme.light }}>
                      Concluir Atendimento
                    </Button>
                    
                    <Button size="xs" onClick={() => handleCancelar(ag.id)} style={{ color: theme.danger, background: 'transparent' }}>
                      Cancelar
                    </Button>
                  </Stack>
                </Panel>
              );
            })
          )}
        </div>
      </div>

      <Modal size="xs" open={modalConcluirAberto} onClose={() => setModalConcluirAberto(false)}>
        <Modal.Header>
          <Modal.Title style={{ color: theme.dark }}>💳 Finalizar Atendimento</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: '10px 20px' }}>
          <p style={{ marginBottom: 15, color: theme.muted }}>Selecione a forma como o cliente efetuou o pagamento:</p>
          <RadioGroup name="paymentMethod" value={metodoPagamento} onChange={val => setMetodoPagamento(val)}>
            <Radio value="dinheiro">💵 Dinheiro (Espécie)</Radio>
            <Radio value="credito">💳 Cartão de Crédito</Radio>
            <Radio value="debito">🟦 Cartão de Débito</Radio>
            <Radio value="pix">💠 PIX</Radio>
          </RadioGroup>
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={salvarConclusaoPagamento} style={{ background: theme.success, color: theme.light }}>
            Confirmar Recebimento
          </Button>
          <Button onClick={() => setModalConcluirAberto(false)} appearance="subtle" style={{ color: theme.muted }}>
            Voltar
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}