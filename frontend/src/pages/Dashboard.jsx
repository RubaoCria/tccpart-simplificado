import { useState, useEffect } from 'react';
import { Badge, Panel, Stack, Divider, Button, Progress, ButtonGroup, SelectPicker } from 'rsuite'; 
import { api } from '../services/api';
import { FaMoneyBillWave, FaCreditCard, FaPix } from 'react-icons/fa6';
import { FaRegCreditCard, FaBan } from 'react-icons/fa'; 
import BlurText from '../components/BlurText';

import { DateRange } from 'react-date-range';
import { ptBR } from 'date-fns/locale'; 
import 'react-date-range/dist/styles.css'; 
import 'react-date-range/dist/theme/default.css'; 

const theme = {
  primary: '#7B2CBF',
  light: '#fff',
  success: '#0acc03',
  danger: '#D62828',
  dark: '#21232F',
  muted: '#5E6171'
};

export default function Dashboard() {
  // ========================================================================
  // 1. AQUI GUARDA OS DADOS NA MEMÓRIA DA TELA (Variáveis de Estado)
  // ========================================================================
  const [agendamentos, setAgendamentos] = useState([]);
  const [totalClientes, setTotalClientes] = useState(0);
  const [barbeiros, setBarbeiros] = useState([]);
  const [barbeiroSelecionado, setBarbeiroSelecionado] = useState('todos');

  const [selectionRange, setSelectionRange] = useState({
    startDate: new Date(),
    endDate: new Date(),
    key: 'selection',
  }); 

  // ========================================================================
  // 2. AQUI DISPARA A BUSCA NO BANCO DE DADOS (Assim que a tela abre)
  // ========================================================================
  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      const [clientesApi, agendamentosApi, barbeirosApi] = await Promise.all([
        api('/clients', { method: 'GET' }),
        api('/appointments', { method: 'GET' }),
        api('/barbers', { method: 'GET' })
      ]);

      setTotalClientes(clientesApi.length);
      setAgendamentos(agendamentosApi);
      
      setBarbeiros(barbeirosApi.map(b => ({
        label: b.name,
        value: String(b.id)
      })));
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
    }
  };

  // ========================================================================
  // 3. AQUI MUDA A DATA DO CALENDÁRIO (Botões de Atalho: Dia, Semana, Mês)
  // ========================================================================
  const aplicarAtalho = (tipo) => {
    const hoje = new Date();
    let inicio = new Date();
    let fim = new Date();

    if (tipo === 'dia') {
      // Mantém hoje
    } else if (tipo === 'semana') {
      inicio.setDate(hoje.getDate() - hoje.getDay());
      fim.setDate(inicio.getDate() + 6);
    } else if (tipo === 'mes') {
      inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    }

    setSelectionRange({ startDate: inicio, endDate: fim, key: 'selection' });
  };

  // ========================================================================
  // 4. AQUI FILTRA OS AGENDAMENTOS (Pela Data e Pelo Barbeiro Selecionado)
  // ========================================================================
  const agendamentosFiltrados = agendamentos.filter(ag => {
    if (!ag.scheduledAt && !ag.date) return false;

    const dataAg = new Date(ag.scheduledAt || ag.date);
    const inicio = new Date(selectionRange.startDate);
    inicio.setHours(0, 0, 0, 0);
    const fim = new Date(selectionRange.endDate);
    fim.setHours(23, 59, 59, 999);
    
    const dataValida = dataAg >= inicio && dataAg <= fim;

    const barbeiroIdSalvo = localStorage.getItem(`appt_barber_${ag.id}`) || String(ag.barberId);
    const barbeiroValido = barbeiroSelecionado === 'todos' || barbeiroIdSalvo === barbeiroSelecionado;

    return dataValida && barbeiroValido;
  });

  // ========================================================================
  // 5. AQUI PREPARA AS VARIÁVEIS ZERADAS PARA COMEÇAR A SOMAR O DINHEIRO
  // ========================================================================
  let faturamentoDinheiro = 0;
  let faturamentoCredito = 0;
  let faturamentoDebito = 0;
  let faturamentoPix = 0;
  let historicoTransacoes = [];
  
  let faturamentoPorBarbeiro = {};
  barbeiros.forEach(b => {
    faturamentoPorBarbeiro[b.value] = { nome: b.label, total: 0 };
  });
  faturamentoPorBarbeiro['Sem Barbeiro'] = { nome: 'Sem Barbeiro', total: 0 };

  // ========================================================================
  // 6. AQUI FAZ A SOMA DO FATURAMENTO (O Loop Principal dos Concluídos)
  // ========================================================================
  agendamentosFiltrados.forEach(ag => {
    const status = localStorage.getItem(`appt_status_${ag.id}`);
    const pagamento = localStorage.getItem(`appt_payment_${ag.id}`);
    const barbeiroIdSalvo = localStorage.getItem(`appt_barber_${ag.id}`) || String(ag.barberId);
    
    const valor = (ag.chargedPriceInCents || 0) / 100;

    if (status === 'concluido') {
      if (pagamento === 'dinheiro') faturamentoDinheiro += valor;
      if (pagamento === 'credito') faturamentoCredito += valor;
      if (pagamento === 'debito') faturamentoDebito += valor;
      if (pagamento === 'pix') faturamentoPix += valor;

      if (faturamentoPorBarbeiro[barbeiroIdSalvo]) {
        faturamentoPorBarbeiro[barbeiroIdSalvo].total += valor;
      } else {
        faturamentoPorBarbeiro['Sem Barbeiro'].total += valor;
      }

      historicoTransacoes.push({
        id: ag.id,
        cliente: ag.client?.name || 'Cliente',
        servico: ag.service?.title || 'Serviço',
        barbeiro: barbeiros.find(b => b.value === barbeiroIdSalvo)?.label || 'Sem Barbeiro',
        hora: new Date(ag.scheduledAt || ag.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        valor: valor,
        metodo: pagamento
      });
    }
  });

  // ========================================================================
  // 6.5 AQUI RESGATA O HISTÓRICO DOS CANCELADOS DA MEMÓRIA
  // ========================================================================
  const canceladosSalvos = JSON.parse(localStorage.getItem('historico_cancelados') || '[]');
  
  const historicoCancelados = canceladosSalvos.filter(c => {
    // Aplica as mesmas regras de data e barbeiro para os cancelados
    const dataC = new Date(c.dataHora);
    const inicio = new Date(selectionRange.startDate); inicio.setHours(0, 0, 0, 0);
    const fim = new Date(selectionRange.endDate); fim.setHours(23, 59, 59, 999);
    const dataValida = dataC >= inicio && dataC <= fim;
    const barbeiroValido = barbeiroSelecionado === 'todos' || String(c.barbeiroId) === barbeiroSelecionado;
    return dataValida && barbeiroValido;
  }).map(c => ({
    hora: new Date(c.dataHora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    cliente: c.cliente,
    servico: c.servico,
    barbeiro: barbeiros.find(b => b.value === String(c.barbeiroId))?.label || 'Sem Barbeiro'
  }));

  // ========================================================================
  // 7. AQUI GERA O TOTAL GERAL (Soma todas as caixinhas de pagamento)
  // ========================================================================
  const totalArrecadado = faturamentoDinheiro + faturamentoCredito + faturamentoDebito + faturamentoPix;
  
  const barbeirosComReceita = Object.values(faturamentoPorBarbeiro).filter(b => b.total > 0);

  const opcoesSelectBarbeiros = [
    { label: '✨ Todos os Profissionais', value: 'todos' },
    ...barbeiros
  ];

  // ========================================================================
  // 8. AQUI DESENHA A TELA COM O HTML (E injeta os valores calculados)
  // ========================================================================
  return (
    <div style={{ padding: '10px' }}>
      <Stack justify="space-between" style={{ marginBottom: '25px', flexWrap: 'wrap' }}>
        <h3>
          <BlurText text="📊 Painel de Controle" delay={100} />
        </h3>
      </Stack>
      
      {/* AQUI MOSTRA O TOTAL DE CLIENTES DA BARBEARIA */}
      <div style={{ marginBottom: '30px', background: theme.light, padding: '20px', borderRadius: '10px', border: `1px solid ${theme.muted}`, display: 'inline-block', minWidth: '220px' }}>
        <h5 style={{ color: theme.muted, margin: 0, fontSize: '13px' }}>👥 Total de Clientes Cadastrados</h5>
        <h2 style={{ margin: '10px 0 0 0', color: theme.primary }}>{totalClientes}</h2>
      </div>

      <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
        
        {/* COLUNA ESQUERDA: Calendário e Filtros */}
        <div style={{ flex: '1', minWidth: '340px', maxWidth: '400px' }}>
          <h5 style={{ marginBottom: '15px', color: theme.dark }}>Filtrar por Profissional:</h5>
          <div style={{ marginBottom: '25px' }}>
            <SelectPicker
              data={opcoesSelectBarbeiros}
              value={barbeiroSelecionado}
              onChange={setBarbeiroSelecionado}
              cleanable={false}
              searchable={false}
              style={{ width: '100%' }}
            />
          </div>

          <h5 style={{ marginBottom: '15px', color: theme.dark }}>Período de Auditoria:</h5>
          <div style={{ background: theme.light, border: `1px solid ${theme.muted}`, borderRadius: '8px', padding: '15px', overflowX: 'auto' }}>
            
            <ButtonGroup style={{ marginBottom: '15px', width: '100%', display: 'flex' }}>
              <Button style={{ flex: 1 }} appearance="primary" color="violet" onClick={() => aplicarAtalho('dia')}>Dia</Button>
              <Button style={{ flex: 1 }} appearance="primary" color="violet" onClick={() => aplicarAtalho('semana')}>Semana</Button>
              <Button style={{ flex: 1 }} appearance="primary" color="violet" onClick={() => aplicarAtalho('mes')}>Mês</Button>
            </ButtonGroup>

            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <DateRange
                ranges={[selectionRange]}
                onChange={item => setSelectionRange(item.selection)}
                rangeColors={[theme.primary]} 
                months={1}
                direction="horizontal"
                showSelectionPreview={true}
                moveRangeOnFirstSelection={false}
                locale={ptBR}
              />
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA: Valores em Dinheiro e Tabelas */}
        <div style={{ flex: '2', minWidth: '350px' }}>
          <Stack justify="space-between" alignItems="center">
            <h4 style={{ color: theme.dark }}> 
              De {selectionRange.startDate.toLocaleDateString('pt-BR')} até {selectionRange.endDate.toLocaleDateString('pt-BR')}
            </h4>
            {/* AQUI MOSTRA O TOTAL GERAL ARRECADADO */}
            <div style={{ background: theme.light, padding: '6px 15px', borderRadius: '20px', border: `2px solid ${theme.success}`, color: theme.success, fontWeight: 'bold' }}>
              Total: R$ {totalArrecadado.toFixed(2).replace('.', ',')}
            </div>
          </Stack>
          
          <Divider style={{ margin: '15px 0 25px 0' }} />

          {/* AQUI MOSTRA OS 4 QUADRADINHOS DE FATURAMENTO (Dinheiro, Crédito, Débito, Pix) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '15px', marginBottom: '30px' }}>
            <div style={{ background: theme.light, padding: '15px', borderRadius: '8px', border: `1px solid ${theme.muted}`, borderLeft: `4px solid ${theme.success}` }}>
              <Stack spacing={10} alignItems="center">
                <FaMoneyBillWave style={{ color: theme.success }} size={16} />
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: theme.muted }}>DINHEIRO</span>
              </Stack>
              <h4 style={{ margin: '10px 0 0 0', color: theme.dark }}>R$ {faturamentoDinheiro.toFixed(2).replace('.', ',')}</h4>
            </div>

            <div style={{ background: theme.light, padding: '15px', borderRadius: '8px', border: `1px solid ${theme.muted}`, borderLeft: `4px solid ${theme.primary}` }}>
              <Stack spacing={10} alignItems="center">
                <FaCreditCard style={{ color: theme.primary }} size={16} />
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: theme.muted }}>CRÉDITO</span>
              </Stack>
              <h4 style={{ margin: '10px 0 0 0', color: theme.dark }}>R$ {faturamentoCredito.toFixed(2).replace('.', ',')}</h4>
            </div>

            <div style={{ background: theme.light, padding: '15px', borderRadius: '8px', border: `1px solid ${theme.muted}`, borderLeft: `4px solid ${theme.dark}` }}>
              <Stack spacing={10} alignItems="center">
                <FaRegCreditCard style={{ color: theme.dark }} size={16} />
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: theme.muted }}>DÉBITO</span>
              </Stack>
              <h4 style={{ margin: '10px 0 0 0', color: theme.dark }}>R$ {faturamentoDebito.toFixed(2).replace('.', ',')}</h4>
            </div>

            <div style={{ background: theme.light, padding: '15px', borderRadius: '8px', border: `1px solid ${theme.muted}`, borderLeft: `4px solid ${theme.success}` }}>
              <Stack spacing={10} alignItems="center">
                <FaPix style={{ color: theme.success }} size={16} />
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: theme.muted }}>PIX</span>
              </Stack>
              <h4 style={{ margin: '10px 0 0 0', color: theme.dark }}>R$ {faturamentoPix.toFixed(2).replace('.', ',')}</h4>
            </div>
          </div>

          {/* AQUI MOSTRA A BARRA DE PROGRESSO DE QUANTO CADA BARBEIRO FEZ */}
          <h5 style={{ color: theme.dark, marginBottom: 15 }}>✂️ Faturamento por Profissional</h5>
          <div style={{ background: theme.light, padding: '20px', borderRadius: '8px', border: `1px solid ${theme.muted}`, marginBottom: '30px' }}>
            {barbeirosComReceita.length === 0 ? (
               <p style={{ color: theme.muted, fontSize: '0.9em', margin: 0 }}>Nenhum serviço concluído neste período.</p>
            ) : (
              barbeirosComReceita.map((barbeiro, index) => {
                const porcentagem = ((barbeiro.total / totalArrecadado) * 100).toFixed(0);
                return (
                  <div key={index} style={{ marginBottom: index !== barbeirosComReceita.length - 1 ? '15px' : '0' }}>
                    <Stack justify="space-between" style={{ marginBottom: '5px' }}>
                      <strong style={{ color: theme.dark }}>{barbeiro.nome}</strong>
                      <strong style={{ color: theme.primary }}>R$ {barbeiro.total.toFixed(2).replace('.', ',')}</strong>
                    </Stack>
                    <Progress.Line percent={Number(porcentagem)} strokeColor={theme.primary} showInfo={true} />
                  </div>
                )
              })
            )}
          </div>

          {/* AQUI MOSTRA A LISTA VERDE DOS AGENDAMENTOS PAGOS */}
          <h5 style={{ color: theme.dark }}>✅ Histórico de Entradas</h5>
          <Divider style={{ margin: '10px 0' }} />
          
          {historicoTransacoes.length === 0 ? (
            <p style={{ color: theme.muted, textAlign: 'center', marginTop: 30, fontSize: '0.95em' }}>Nenhum recebimento registrado para este período.</p>
          ) : (
            historicoTransacoes.map((t, index) => (
              <Panel key={index} bordered style={{ background: theme.light, marginBottom: '8px', padding: '5px 10px', borderColor: theme.muted }}>
                <Stack justify="space-between" alignItems="center">
                  <div>
                    <span style={{ color: theme.primary, fontWeight: 'bold', marginRight: '10px' }}>{t.hora}</span>
                    <strong style={{ color: theme.dark }}>{t.cliente}</strong>
                    <div style={{ color: theme.muted, fontSize: '12px' }}>{t.servico} • <span style={{ fontWeight: 'bold' }}>{t.barbeiro}</span></div>
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

          {/* AQUI MOSTRA A LISTA VERMELHA DOS AGENDAMENTOS CANCELADOS */}
          <h5 style={{ color: theme.danger, marginTop: 40, marginBottom: 10 }}>
             Horários Cancelados
          </h5>
          <Divider style={{ margin: '10px 0', borderColor: '#fca5a5' }} />
          
          {historicoCancelados.length === 0 ? (
            <p style={{ color: theme.muted, textAlign: 'center', marginTop: 30, fontSize: '0.95em' }}>
              Nenhum cancelamento registrado para este período. Excelente!
            </p>
          ) : (
            historicoCancelados.map((c, index) => (
              <Panel key={index} bordered style={{ background: '#fef2f2', marginBottom: '8px', padding: '5px 10px', borderColor: '#fca5a5' }}>
                <Stack justify="space-between" alignItems="center">
                  <div>
                    <span style={{ color: theme.danger, fontWeight: 'bold', marginRight: '10px' }}>{c.hora}</span>
                    <strong style={{ color: theme.dark, textDecoration: 'line-through', opacity: 0.7 }}>{c.cliente}</strong>
                    <div style={{ color: theme.muted, fontSize: '12px' }}>{c.servico} • <span style={{ fontWeight: 'bold' }}>{c.barbeiro}</span></div>
                  </div>
                  <Stack spacing={15} alignItems="center">
                    <span style={{ color: theme.danger, fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <FaBan /> CANCELADO
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