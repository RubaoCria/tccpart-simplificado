import { useState, useEffect } from 'react';
import { Form, Button, Table, Input, Message, useToaster, Schema, Stack } from 'rsuite';
import { api } from '../services/api';

const { Column, HeaderCell, Cell } = Table;
const { StringType } = Schema.Types;

// Validação atualizada com o campo de endereço
const model = Schema.Model({
  name: StringType().isRequired('O nome é obrigatório.'),
  email: StringType().isEmail('Insira um e-mail válido.').isRequired('O e-mail é obrigatório.'),
  phone: StringType().isRequired('O telefone é obrigatório.'),
  address: StringType().isRequired('O endereço é obrigatório.')
});

export default function Clientes() {
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', address: '' });
  const [clientes, setClientes] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [editandoId, setEditandoId] = useState(null); // Guarda o ID do cliente que está sendo editado
  const toaster = useToaster();

  useEffect(() => {
    buscarClientes();
  }, []);

  const buscarClientes = async () => {
    try {
      const dados = await api('/clients', { method: 'GET' });
      setClientes(dados);
    } catch (err) {
      mostrarNotificacao('error', 'Erro ao carregar clientes: ' + err.message);
    }
  };

  const salvarCliente = async (valid) => {
    if (!valid) return;
    setCarregando(true);

    try {
      if (editandoId) {
        // Modo Edição: Faz um PUT ou PATCH para atualizar o cliente existente
        await api(`/clients/${editandoId}`, {
          method: 'PATCH', // ou 'PUT', dependendo de como está na sua API NestJS
          body: JSON.stringify(formData)
        });
        mostrarNotificacao('success', 'Cliente atualizado com sucesso!');
      } else {
        // Modo Cadastro: Faz um POST normal
        await api('/clients', {
          method: 'POST',
          body: JSON.stringify(formData)
        });
        mostrarNotificacao('success', 'Cliente cadastrado com sucesso!');
      }

      cancelarEdicao();
      buscarClientes(); // Atualiza a lista da tabela
    } catch (err) {
      mostrarNotificacao('error', err.message);
    } finally {
      setCarregando(false);
    }
  };

  const excluirCliente = async (id) => {
    if (!confirm('Tem certeza que deseja excluir este cliente?')) return;

    try {
      await api(`/clients/${id}`, { method: 'DELETE' });
      mostrarNotificacao('success', 'Cliente removido com sucesso!');
      buscarClientes();
    } catch (err) {
      mostrarNotificacao('error', 'Erro ao excluir: ' + err.message);
    }
  };

  const iniciarEdicao = (cliente) => {
    setEditandoId(cliente.id);
    setFormData({
      name: cliente.name,
      email: cliente.email,
      phone: cliente.phone,
      address: cliente.address || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Sobe a tela suavemente para o formulário
  };

  const cancelarEdicao = () => {
    setEditandoId(null);
    setFormData({ name: '', email: '', phone: '', address: '' });
  };

  const mostrarNotificacao = (type, text) => {
    toaster.push(
      <Message showIcon type={type} closable>
        {text}
      </Message>,
      { placement: 'topEnd' }
    );
  };

  return (
    <div>
      <h3 style={{ marginBottom: 20 }}>👥 Cadastro de Clientes</h3>

      {/* Formulário de Cadastro / Edição */}
      <div style={{ background: '#f9f9f9', padding: 20, borderRadius: 8, marginBottom: 30, border: '1px solid #eee' }}>
        <h5>{editandoId ? '✍️ Editar Cliente' : '✨ Novo Cliente'}</h5>
        <br />
        <Form 
          fluid 
          formValue={formData} 
          onChange={setFormData} 
          model={model}
          onSubmit={(valid) => salvarCliente(valid)}
        >
          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginBottom: '15px' }}>
            <Form.Group style={{ flex: 1, minWidth: '200px' }}>
              <Form.ControlLabel>Nome Completo</Form.ControlLabel>
              <Form.Control name="name" accepter={Input} placeholder="Ex: João Silva" />
            </Form.Group>

            <Form.Group style={{ flex: 1, minWidth: '200px' }}>
              <Form.ControlLabel>E-mail</Form.ControlLabel>
              <Form.Control name="email" accepter={Input} type="email" placeholder="joao@email.com" />
            </Form.Group>
          </div>

          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
            <Form.Group style={{ flex: 1, minWidth: '200px' }}>
              <Form.ControlLabel>Telefone / WhatsApp</Form.ControlLabel>
              <Form.Control name="phone" accepter={Input} placeholder="(44) 99999-9999" />
            </Form.Group>

            <Form.Group style={{ flex: 2, minWidth: '300px' }}>
              <Form.ControlLabel>Endereço Residencial</Form.ControlLabel>
              <Form.Control name="address" accepter={Input} placeholder="Rua, Número, Bairro, Cidade" />
            </Form.Group>
          </div>

          <Stack spacing={10} style={{ marginTop: 20 }}>
            <Button appearance="primary" color="violet" type="submit" loading={carregando}>
              {editandoId ? 'Salvar Alterações' : 'Salvar Cliente'}
            </Button>
            
            {editandoId && (
              <Button appearance="subtle" onClick={cancelarEdicao}>
                Cancelar
              </Button>
            )}
          </Stack>
        </Form>
      </div>

      {/* Tabela de Listagem */}
      <h5>Clientes Cadastrados</h5>
      <br />
      <Table data={clientes} autoHeight bordered cellBordered>
        <Column width={60} align="center">
          <HeaderCell>ID</HeaderCell>
          <Cell dataKey="id" />
        </Column>

        <Column flexGrow={2}>
          <HeaderCell>Nome</HeaderCell>
          <Cell dataKey="name" />
        </Column>

        <Column flexGrow={2}>
          <HeaderCell>E-mail</HeaderCell>
          <Cell dataKey="email" />
        </Column>

        <Column flexGrow={1}>
          <HeaderCell>Telefone</HeaderCell>
          <Cell dataKey="phone" />
        </Column>

        <Column flexGrow={2}>
          <HeaderCell>Endereço</HeaderCell>
          <Cell dataKey="address" />
        </Column>

        {/* Coluna Nova de Ações */}
        <Column width={150} align="center" fixed="right">
          <HeaderCell>Ações</HeaderCell>
          <Cell>
            {rowData => (
              <Stack spacing={5} justify="center">
                <Button color="blue" appearance="link" size="xs" onClick={() => iniciarEdicao(rowData)}>
                  Editar
                </Button>
                <Button color="red" appearance="link" size="xs" onClick={() => excluirCliente(rowData.id)}>
                  Excluir
                </Button>
              </Stack>
            )}
          </Cell>
        </Column>
      </Table>
    </div>
  );
}