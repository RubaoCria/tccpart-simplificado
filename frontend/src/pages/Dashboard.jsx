import { useState, useEffect } from 'react';
import { Calendar, Badge, Panel, Stack, Divider } from 'rsuite';
import { api } from '../services/api';
import { FaMoneyBillWave, FaCreditCard, FaPix } from 'react-icons/fa6';
import { FaRegCreditCard } from 'react-icons/fa';

// Sua Paleta Oficial
const theme = {
  primary: '#7B2CBF',
  light: '#fff',
  success: '#0acc03',
  danger: '#D62828',
  dark: '#21232F',
  muted: '#5E6171'
};

export default function Dashboard() {
  const [agendamentos, setAgendamentos] = useState([]);
  const [totalClientes, setTotalClientes] = useState(0);
  const [dataSelecionada, setDataSelecionada] = useState(new Date());

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      const [clientes, dadosAgendamentos] = await Promise.all([
        api('/clients', { method: 'GET' }),
        api('/appointments', { method: 'GET' })
      ]);

      setTotalClientes(clientes.length);
      setAgendamentos(dadosAgendamentos);
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
    }
  };

  const agendamentosDoDia = agendamentos.filter(ag => {
    if (!ag.scheduledAt && !ag.date) return false;
    const dataAg = new Date(ag.scheduledAt || ag.date);
    return dataAg.toDateString() === dataSelecionada.toDateString();
  });

  let faturamentoDinheiro = 0;
  let faturamentoCredito = 0;
  let faturamentoDebito = 0;
  let faturamentoPix = 0;
  let historicoTransacoes = [];

  agendamentosDoDia.forEach(ag => {
    const status = localStorage.getItem(`appt_status_${ag.id}`);
    const pagamento = localStorage.getItem(`appt_payment_${ag.id}`);
    const valor = (ag.chargedPriceInCents || 0) / 100;

    if (status === 'concluido') {
      if (pagamento === 'dinheiro') faturamentoDinheiro += valor;
      if (pagamento === 'credito') faturamentoCredito += valor;
      if (pagamento === 'debito') faturamentoDebito += valor;
      if (pagamento === 'pix') faturamentoPix += valor;

      historicoTransacoes.push({
        id: ag.id,
        cliente: ag.client?.name || 'Cliente',
        servico: ag.service?.title || 'Serviço',
        hora: new Date(ag.scheduledAt || ag.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        valor: valor,
        metodo: pagamento
      });
    }
  });

  const totalDoDia = faturamentoDinheiro + faturamentoCredito + faturamentoDebito + faturamentoPix;

  function renderCell(date) {
    const temConcluido = agendamentos.some(ag => {
      const dataAg = new Date(ag.scheduledAt || ag.date);
      const status = localStorage.getItem(`appt_status_${ag.id}`);
      return dataAg.toDateString() === date.toDateString() && status === 'concluido';
    });
    
    if (temConcluido) return <Badge style={{ background: theme.primary }} />;
    return null;
  }

  return (
    <div style={{ padding: '10px' }}>
      <h3 style={{ marginBottom: '25px', color: theme.dark }}>📊 Painel de Controle e Caixa</h3>
      
      <div style={{ marginBottom: '30px', background: theme.light, padding: '20px', borderRadius: '10px', border: `1px solid ${theme.muted}`, display: 'inline-block', minWidth: '220px' }}>
        <h5 style={{ color: theme.muted, margin: 0, fontSize: '13px' }}>👥 Total de Clientes Cadastrados</h5>
        <h2 style={{ margin: '10px 0 0 0', color: theme.primary }}>{totalClientes}</h2>
      </div>

      <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
        
        <div style={{ flex: '1', minWidth: '320px', maxWidth: '400px' }}>
          <h5 style={{ marginBottom: '15px', color: theme.dark }}>Selecione o Dia para Auditoria:</h5>
          <div style={{ background: theme.light, border: `1px solid ${theme.muted}`, borderRadius: '8px', padding: '10px' }}>
            <Calendar compact bordered renderCell={renderCell} value={dataSelecionada} onSelect={setDataSelecionada} />
          </div>
        </div>

        <div style={{ flex: '2', minWidth: '350px' }}>
          <Stack justify="space-between" alignItems="center">
            <h4 style={{ color: theme.dark }}>📅 Movimentação de {dataSelecionada.toLocaleDateString('pt-BR')}</h4>
            <div style={{ background: theme.light, padding: '6px 15px', borderRadius: '20px', border: `2px solid ${theme.success}`, color: theme.success, fontWeight: 'bold' }}>
              Total Arrecadado: R$ {totalDoDia.toFixed(2).replace('.', ',')}
            </div>
          </Stack>
          
          <Divider style={{ margin: '15px 0 25px 0' }} />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '15px', marginBottom: '30px' }}>
            
            <div style={{ background: theme.light, padding: '15px', borderRadius: '8px', border: `1px solid ${theme.muted}`, borderLeft: `4px solid ${theme.success}` }}>
              <Stack spacing={10} alignItems="center">
                <FaMoneyBillWave style={{ color: theme.success }} size={18} />
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: theme.muted }}>DINHEIRO</span>
              </Stack>
              <h4 style={{ margin: '10px 0 0 0', color: theme.dark }}>R$ {faturamentoDinheiro.toFixed(2).replace('.', ',')}</h4>
            </div>

            <div style={{ background: theme.light, padding: '15px', borderRadius: '8px', border: `1px solid ${theme.muted}`, borderLeft: `4px solid ${theme.primary}` }}>
              <Stack spacing={10} alignItems="center">
                <FaCreditCard style={{ color: theme.primary }} size={18} />
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: theme.muted }}>CRÉDITO</span>
              </Stack>
              <h4 style={{ margin: '10px 0 0 0', color: theme.dark }}>R$ {faturamentoCredito.toFixed(2).replace('.', ',')}</h4>
            </div>

            <div style={{ background: theme.light, padding: '15px', borderRadius: '8px', border: `1px solid ${theme.muted}`, borderLeft: `4px solid ${theme.dark}` }}>
              <Stack spacing={10} alignItems="center">
                <FaRegCreditCard style={{ color: theme.dark }} size={18} />
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: theme.muted }}>DÉBITO</span>
              </Stack>
              <h4 style={{ margin: '10px 0 0 0', color: theme.dark }}>R$ {faturamentoDebito.toFixed(2).replace('.', ',')}</h4>
            </div>

            <div style={{ background: theme.light, padding: '15px', borderRadius: '8px', border: `1px solid ${theme.muted}`, borderLeft: `4px solid ${theme.success}` }}>
              <Stack spacing={10} alignItems="center">
                <FaPix style={{ color: theme.success }} size={18} />
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: theme.muted }}>PIX</span>
              </Stack>
              <h4 style={{ margin: '10px 0 0 0', color: theme.dark }}>R$ {faturamentoPix.toFixed(2).replace('.', ',')}</h4>
            </div>

          </div>

          <h5 style={{ color: theme.dark }}>📝 Histórico de Entradas</h5>
          <Divider style={{ margin: '10px 0' }} />
          
          {historicoTransacoes.length === 0 ? (
            <p style={{ color: theme.muted, textAlign: 'center', marginTop: 30, fontSize: '0.95em' }}>Nenhum recebimento registrado para este dia.</p>
          ) : (
            historicoTransacoes.map((t, index) => (
              <Panel key={index} bordered style={{ background: theme.light, marginBottom: '8px', padding: '5px 10px', borderColor: theme.muted }}>
                <Stack justify="space-between" alignItems="center">
                  <div>
                    <span style={{ color: theme.primary, fontWeight: 'bold', marginRight: '10px' }}>{t.hora}</span>
                    <strong style={{ color: theme.dark }}>{t.cliente}</strong>
                    <div style={{ color: theme.muted, fontSize: '12px' }}>{t.servico}</div>
                  </div>
                  <Stack spacing={15} alignItems="center">
                    <span style={{ border: `1px solid ${theme.muted}`, color: theme.muted, padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                      {t.metodo === 'dinheiro' ? '💵 Espécie' : t.metodo === 'credito' ? '💳 Crédito' : t.metodo === 'debito' ? '🟦 Débito' : '💠 PIX'}
                    </span>
                    <span style={{ color: theme.success, fontWeight: 'bold' }}>
                      + R$ {t.valor.toFixed(2).replace('.', ',')}
                    </span>
                  </Stack>
                </Stack>
              </Panel>
            ))
          )}

        </div>
      </div>
    </div>
  );
}