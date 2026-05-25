import { useState, useEffect } from 'react';
import { Form, Button, Table, Message, useToaster, Stack, SelectPicker } from 'rsuite';
import { api } from '../services/api';

const { Column, HeaderCell, Cell } = Table;

export default function Horarios() {
  const [formData, setFormData] = useState({ clientId: '', serviceId: '', scheduledAt: '' });
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
      // Guardamos o preço original (priceInCents) escondido aqui para mandar na hora de salvar
      setServicos(dadosServicos.map(s => ({ label: s.title, value: s.id, originalPrice: s.priceInCents })));
    } catch (err) {
      mostrarNotificacao('error', 'Erro ao carregar dados: ' + err.message);
    } finally {
      setCarregando(false);
    }
  };

  const salvarAgendamento = async () => {
    if (!formData.clientId || !formData.serviceId || !formData.scheduledAt) {
      mostrarNotificacao('error', 'Por favor, preencha todos os campos do agendamento.');
      return;
    }
    
    setCarregando(true);

    // --- INÍCIO DA TRAVA DE CHOQUE DE HORÁRIOS ---
    // Só verifica choque se for um NOVO agendamento (não editando)
    if (!editandoId) {
      const dataDesejada = new Date(formData.scheduledAt).getTime();
      
      const temChoque = agendamentos.some(ag => {
        const dataExistente = new Date(ag.scheduledAt || ag.date).getTime();
        // Calcula a diferença de tempo entre os horários em minutos
        const diferencaEmMinutos = Math.abs(dataExistente - dataDesejada) / (1000 * 60);
        
        // Bloqueia se a diferença for menor que 30 minutos
        return diferencaEmMinutos < 30;
      });

      if (temChoque) {
        // Alerta nativo do navegador! Bloqueia a tela.
        window.alert('⚠️ ALERTA DE CHOQUE: Não é possível marcar dois clientes no mesmo horário! Por favor, escolha um horário com pelo menos 30 minutos de diferença.');
        setCarregando(false);
        return; // Interrompe o salvamento e não envia pro banco!
      }
    }
    // --- FIM DA TRAVA ---

    try {
      // Procura o serviço que foi selecionado para extrair o preço dele em centavos
      const servicoSelecionado = servicos.find(s => s.value === formData.serviceId);

      // O pacote perfeito que passa nas regras do DTO
      const dadosParaSalvar = {
        clientId: Number(formData.clientId), // Garante que é número
        serviceId: Number(formData.serviceId), // Garante que é número
        scheduledAt: new Date(formData.scheduledAt).toISOString(), // Formato ISO da data
        chargedPriceInCents: servicoSelecionado ? servicoSelecionado.originalPrice : 0 // Envia o preço obrigatório
      };

      if (editandoId) {
        await api(`/appointments/${editandoId}`, {
          method: 'PATCH',
          body: JSON.stringify(dadosParaSalvar)
        });
        mostrarNotificacao('success', 'Agendamento atualizado com sucesso!');
      } else {
        await api('/appointments', {
          method: 'POST',
          body: JSON.stringify(dadosParaSalvar)
        });
        mostrarNotificacao('success', 'Agendamento realizado com sucesso!');
      }

      cancelarEdicao();
      buscarTodosOsDados();
    } catch (err) {
      mostrarNotificacao('error', 'Erro ao salvar: ' + err.message);
    } finally {
      setCarregando(false);
    }
  };

  const cancelarAgendamentoBanco = async (id) => {
    if (!confirm('Tem certeza que deseja cancelar este horário?')) return;
    try {
      await api(`/appointments/${id}`, { method: 'DELETE' });
      mostrarNotificacao('success', 'Horário cancelado com sucesso!');
      buscarTodosOsDados();
    } catch (err) {
      mostrarNotificacao('error', 'Erro ao cancelar: ' + err.message);
    }
  };

  const iniciarEdicao = (ag) => {
    setEditandoId(ag.id);
    const dataReal = ag.scheduledAt || ag.date; // Previne erros caso a API retorne diferente
    const dataLocal = dataReal ? new Date(dataReal).toISOString().slice(0, 16) : '';
    setFormData({
      clientId: ag.clientId,
      serviceId: ag.serviceId,
      scheduledAt: dataLocal
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelarEdicao = () => {
    setEditandoId(null);
    setFormData({ clientId: '', serviceId: '', scheduledAt: '' });
  };

  const mostrarNotificacao = (type, text) => {
    toaster.push(<Message showIcon type={type} closable>{text}</Message>, { placement: 'topEnd' });
  };

  return (
    <div>
      <h3 style={{ marginBottom: 20 }}>📅 Gerenciar Horários</h3>

      <div style={{ background: '#f9f9f9', padding: 20, borderRadius: 8, marginBottom: 30, border: '1px solid #eee' }}>
        <h5>{editandoId ? '✍️ Editar Agendamento' : '✨ Agendar Novo Horário'}</h5>
        <br />
        <Form fluid>
          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <Form.Group style={{ flex: 1, minWidth: '200px' }}>
              <Form.ControlLabel>Selecione o Cliente</Form.ControlLabel>
              <SelectPicker 
                data={clientes} 
                block 
                placeholder="Escolha o cliente"
                value={formData.clientId}
                onChange={(val) => setFormData({ ...formData, clientId: val })}
              />
            </Form.Group>

            <Form.Group style={{ flex: 1, minWidth: '200px' }}>
              <Form.ControlLabel>Selecione o Serviço</Form.ControlLabel>
              <SelectPicker 
                data={servicos} 
                block 
                placeholder="Escolha o serviço"
                value={formData.serviceId}
                onChange={(val) => setFormData({ ...formData, serviceId: val })}
              />
            </Form.Group>

            <Form.Group style={{ flex: 1, minWidth: '200px' }}>
              <Form.ControlLabel>Data e Horário</Form.ControlLabel>
              <input 
                type="datetime-local" 
                className="rs-input"
                value={formData.scheduledAt}
                onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                style={{ height: '36px' }}
              />
            </Form.Group>
          </div>

          <Stack spacing={10} style={{ marginTop: 20 }}>
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
        <Column width={160}>
          <HeaderCell>Data e Hora</HeaderCell>
          <Cell>
            {rowData => {
              const dataExibir = rowData.scheduledAt || rowData.date;
              return dataExibir ? new Date(dataExibir).toLocaleString('pt-BR', { 
                day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' 
              }) : '-';
            }}
          </Cell>
        </Column>

        <Column flexGrow={2}>
          <HeaderCell>Cliente</HeaderCell>
          <Cell>{rowData => rowData.client?.name || `ID: ${rowData.clientId}`}</Cell>
        </Column>

        <Column flexGrow={2}>
          <HeaderCell>Serviço</HeaderCell>
          <Cell>{rowData => rowData.service?.title || 'Serviço não informado'}</Cell>
        </Column>

        <Column flexGrow={1}>
          <HeaderCell>Valor Cobrado</HeaderCell>
          <Cell>{rowData => rowData.chargedPriceInCents ? `R$ ${(rowData.chargedPriceInCents / 100).toFixed(2).replace('.', ',')}` : '-'}</Cell>
        </Column>

        <Column width={150} align="center" fixed="right">
          <HeaderCell>Ações</HeaderCell>
          <Cell>
            {rowData => (
              <Stack spacing={5} justify="center">
                <Button color="blue" appearance="link" size="xs" onClick={() => iniciarEdicao(rowData)}>
                  Editar
                </Button>
                <Button color="red" appearance="link" size="xs" onClick={() => cancelarAgendamentoBanco(rowData.id)}>
                  Cancelar
                </Button>
              </Stack>
            )}
          </Cell>
        </Column>
      </Table>
    </div>
  );
}