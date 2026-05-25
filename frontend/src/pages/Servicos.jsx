import { useState, useEffect } from 'react';
import { Form, Button, Table, Input, Message, useToaster, Schema, Stack } from 'rsuite';
import { api } from '../services/api';

const { Column, HeaderCell, Cell } = Table;
const { StringType } = Schema.Types;

// Validação atualizada para bater com o seu DTO
const model = Schema.Model({
  title: StringType().isRequired('O título do serviço é obrigatório.'),
  price: StringType().isRequired('O valor é obrigatório.'),
  durationMinutes: StringType().isRequired('A duração é obrigatória.')
});

export default function Servicos() {
  const [formData, setFormData] = useState({ title: '', description: '', imageUrl: '', price: '', durationMinutes: '' });
  const [servicos, setServicos] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const toaster = useToaster();

  useEffect(() => {
    buscarServicos();
  }, []);

  const buscarServicos = async () => {
    try {
      const dados = await api('/services', { method: 'GET' });
      setServicos(dados);
    } catch (err) {
      mostrarNotificacao('error', 'Erro ao carregar serviços: ' + err.message);
    }
  };

  const salvarServico = async (valid) => {
    if (!valid) return;
    setCarregando(true);

    try {
      // A mágica acontece aqui: O React adapta o visual para o que o NestJS exige
      const dadosParaSalvar = {
        title: formData.title,
        description: formData.description || 'Serviço padrão do salão', // Evita erro se você não preencher
        imageUrl: formData.imageUrl || 'https://via.placeholder.com/150', // Imagem falsa genérica
        priceInCents: Math.round(parseFloat(formData.price.replace(',', '.')) * 100), // R$ 45.50 vira 4550
        durationMinutes: parseInt(formData.durationMinutes, 10)
      };

      if (editandoId) {
        await api(`/services/${editandoId}`, {
          method: 'PATCH',
          body: JSON.stringify(dadosParaSalvar)
        });
        mostrarNotificacao('success', 'Serviço atualizado com sucesso!');
      } else {
        await api('/services', {
          method: 'POST',
          body: JSON.stringify(dadosParaSalvar)
        });
        mostrarNotificacao('success', 'Serviço cadastrado com sucesso!');
      }

      cancelarEdicao();
      buscarServicos();
    } catch (err) {
      mostrarNotificacao('error', err.message);
    } finally {
      setCarregando(false);
    }
  };

  const excluirServico = async (id) => {
    if (!confirm('Tem certeza que deseja excluir este serviço?')) return;
    try {
      await api(`/services/${id}`, { method: 'DELETE' });
      mostrarNotificacao('success', 'Serviço removido com sucesso!');
      buscarServicos();
    } catch (err) {
      mostrarNotificacao('error', 'Erro ao excluir: ' + err.message);
    }
  };

  const iniciarEdicao = (servico) => {
    setEditandoId(servico.id);
    setFormData({
      title: servico.title,
      description: servico.description,
      imageUrl: servico.imageUrl,
      price: String(servico.priceInCents / 100), // Traz os centavos de volta para R$
      durationMinutes: String(servico.durationMinutes)
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelarEdicao = () => {
    setEditandoId(null);
    setFormData({ title: '', description: '', imageUrl: '', price: '', durationMinutes: '' });
  };

  const mostrarNotificacao = (type, text) => {
    toaster.push(<Message showIcon type={type} closable>{text}</Message>, { placement: 'topEnd' });
  };

  return (
    <div>
      <h3 style={{ marginBottom: 20 }}>✂️ Cadastro de Serviços</h3>

      <div style={{ background: '#f9f9f9', padding: 20, borderRadius: 8, marginBottom: 30, border: '1px solid #eee' }}>
        <h5>{editandoId ? '✍️ Editar Serviço' : '✨ Novo Serviço'}</h5>
        <br />
        <Form fluid formValue={formData} onChange={setFormData} model={model} onSubmit={(valid) => salvarServico(valid)}>
          
          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginBottom: '15px' }}>
            <Form.Group style={{ flex: 2, minWidth: '250px' }}>
              <Form.ControlLabel>Nome do Serviço</Form.ControlLabel>
              <Form.Control name="title" accepter={Input} placeholder="Ex: Corte Degradê..." />
            </Form.Group>

            <Form.Group style={{ flex: 1, minWidth: '120px' }}>
              <Form.ControlLabel>Valor (R$)</Form.ControlLabel>
              <Form.Control name="price" accepter={Input} placeholder="Ex: 45.00" />
            </Form.Group>

            <Form.Group style={{ flex: 1, minWidth: '120px' }}>
              <Form.ControlLabel>Duração (Min)</Form.ControlLabel>
              <Form.Control name="durationMinutes" accepter={Input} placeholder="Ex: 30" />
            </Form.Group>
          </div>

          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
            <Form.Group style={{ flex: 2, minWidth: '250px' }}>
              <Form.ControlLabel>Descrição Opcional</Form.ControlLabel>
              <Form.Control name="description" accepter={Input} placeholder="Detalhes do corte..." />
            </Form.Group>

            <Form.Group style={{ flex: 2, minWidth: '250px' }}>
              <Form.ControlLabel>Link da Imagem Opcional</Form.ControlLabel>
              <Form.Control name="imageUrl" accepter={Input} placeholder="https://..." />
            </Form.Group>
          </div>

          <Stack spacing={10} style={{ marginTop: 20 }}>
            <Button appearance="primary" color="violet" type="submit" loading={carregando}>
              {editandoId ? 'Salvar Alterações' : 'Salvar Serviço'}
            </Button>
            {editandoId && <Button appearance="subtle" onClick={cancelarEdicao}>Cancelar</Button>}
          </Stack>
        </Form>
      </div>

      <h5>Serviços Disponíveis</h5>
      <br />
      <Table data={servicos} autoHeight bordered cellBordered>
        <Column flexGrow={2}>
          <HeaderCell>Serviço</HeaderCell>
          <Cell dataKey="title" />
        </Column>

        <Column flexGrow={1}>
          <HeaderCell>Duração</HeaderCell>
          <Cell>{rowData => `${rowData.durationMinutes} min`}</Cell>
        </Column>

        <Column flexGrow={1}>
          <HeaderCell>Valor (R$)</HeaderCell>
          <Cell>{rowData => `R$ ${(rowData.priceInCents / 100).toFixed(2).replace('.', ',')}`}</Cell>
        </Column>

        <Column width={150} align="center" fixed="right">
          <HeaderCell>Ações</HeaderCell>
          <Cell>
            {rowData => (
              <Stack spacing={5} justify="center">
                <Button color="blue" appearance="link" size="xs" onClick={() => iniciarEdicao(rowData)}>Editar</Button>
                <Button color="red" appearance="link" size="xs" onClick={() => excluirServico(rowData.id)}>Excluir</Button>
              </Stack>
            )}
          </Cell>
        </Column>
      </Table>
    </div>
  );
}