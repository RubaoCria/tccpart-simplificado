import { useState, useEffect } from 'react';
import { Form, Button, Table, Input, Message, useToaster, Schema, Stack, Modal, Loader } from 'rsuite';
import { api } from '../services/api';
import BlurText from '../components/BlurText';


const { Column, HeaderCell, Cell } = Table;
const { StringType } = Schema.Types;

// ATUALIZADO: Substituído o 'address' por street, number e city
const model = Schema.Model({
  name: StringType().isRequired('O nome é obrigatório.'),
  email: StringType().isEmail('Insira um e-mail válido.').isRequired('O e-mail é obrigatório.'),
  phone: StringType().isRequired('O telefone é obrigatório.'),
  street: StringType(),
  number: StringType(),
  city: StringType()
});

export default function Clientes() {
  // ATUALIZADO: Estado inicial com os novos campos
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', street: '', number: '', city: '' });
  const [clientes, setClientes] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  
  const [modalFormAberto, setModalFormAberto] = useState(false);
  const [modalExcluirAberto, setModalExcluirAberto] = useState(false);
  const [clienteParaExcluir, setClienteParaExcluir] = useState(null);

  const toaster = useToaster();

  useEffect(() => {
    buscarClientes();
  }, []);

  const mostrarNotificacao = (type, text) => {
    toaster.push(
      <Message showIcon type={type} closable>{text}</Message>,
      { placement: 'topEnd' }
    );
  };

  const buscarClientes = async () => {
    setCarregando(true);
    try {
      const dados = await api('/clients', { method: 'GET' });
      setClientes(dados);
    } catch (err) {
      mostrarNotificacao('error', 'Erro ao carregar clientes.');
    } finally {
      setCarregando(false);
    }
  };

  const salvarCliente = async (valid) => {
    if (!valid) return;
    setCarregando(true);

    try {
      if (editandoId) {
        await api(`/clients/${editandoId}`, { method: 'PATCH', body: JSON.stringify(formData) });
        mostrarNotificacao('success', 'Você editou seu cliente com sucesso!');
      } else {
        await api('/clients', { method: 'POST', body: JSON.stringify(formData) });
        mostrarNotificacao('success', 'Você cadastrou seu cliente com sucesso!');
      }
      fecharModalForm(); 
      buscarClientes();
    } catch (err) {
      mostrarNotificacao('error', 'Erro: ' + err.message);
    } finally {
      setCarregando(false);
    }
  };

  const abrirModalNovoCliente = () => {
    setEditandoId(null);
    setFormData({ name: '', email: '', phone: '', street: '', number: '', city: '' }); 
    setModalFormAberto(true);
  };

  const iniciarEdicao = (cliente) => {
    setEditandoId(cliente.id);
    // ATUALIZADO: Carregando os campos divididos na edição
    setFormData({ 
      name: cliente.name, 
      email: cliente.email, 
      phone: cliente.phone, 
      street: cliente.street || '', 
      number: cliente.number || '', 
      city: cliente.city || '' 
    });
    setModalFormAberto(true); 
  };

  const fecharModalForm = () => {
    setModalFormAberto(false);
    setEditandoId(null);
    setFormData({ name: '', email: '', phone: '', street: '', number: '', city: '' });
  };

  const abrirModalExcluir = (cliente) => {
    setClienteParaExcluir(cliente);
    setModalExcluirAberto(true);
  };

  const confirmarExclusao = async () => {
    setCarregando(true);
    try {
      await api(`/clients/${clienteParaExcluir.id}`, { method: 'DELETE' });
      mostrarNotificacao('success', 'Cliente removido com sucesso!');
      buscarClientes();
    } catch (err) {
      mostrarNotificacao('error', 'Erro ao excluir: ' + err.message);
    } finally {
      setModalExcluirAberto(false);
      setCarregando(false);
    }
  };

  return (
    <div>
      {carregando && <Loader center backdrop content="Processando..." vertical size="md" />}

      <Stack justify="space-between" alignItems="center" style={{ marginBottom: 20 }}>
        <h3>
          <BlurText text="👥 Cadastro de Clientes" delay={100} />
        </h3>
        <Button appearance="primary" color="violet" onClick={abrirModalNovoCliente}>
          + Novo Cliente
        </Button>
      </Stack>

      <div style={{ background: 'white', padding: 15, borderRadius: 8, border: '1px solid #eee' }}>
        <Table data={clientes} autoHeight bordered cellBordered>
          <Column width={60} align="center"><HeaderCell>ID</HeaderCell><Cell dataKey="id" /></Column>
          <Column flexGrow={2}><HeaderCell>Nome</HeaderCell><Cell dataKey="name" /></Column>
          <Column flexGrow={2}><HeaderCell>E-mail</HeaderCell><Cell dataKey="email" /></Column>
          <Column flexGrow={1}><HeaderCell>Telefone</HeaderCell><Cell dataKey="phone" /></Column>
          
          {/* ATUALIZADO: Formatação visual do endereço na tabela */}
          <Column flexGrow={2}>
            <HeaderCell>Endereço</HeaderCell>
            <Cell>
              {rowData => {
                const temRuaNum = rowData.street || rowData.number;
                const ruaNumStr = [rowData.street, rowData.number].filter(Boolean).join(', ');
                if (temRuaNum && rowData.city) return `${ruaNumStr} - ${rowData.city}`;
                if (temRuaNum) return ruaNumStr;
                if (rowData.city) return rowData.city;
                return '-';
              }}
            </Cell>
          </Column>

          <Column width={150} align="center" fixed="right">
            <HeaderCell>Ações</HeaderCell>
            <Cell>
              {rowData => (
                <Stack spacing={5} justify="center">
                  <Button color="blue" appearance="link" size="xs" onClick={() => iniciarEdicao(rowData)}>Editar</Button>
                  <Button color="red" appearance="link" size="xs" onClick={() => abrirModalExcluir(rowData)}>Excluir</Button>
                </Stack>
              )}
            </Cell>
          </Column>
        </Table>
      </div>

      <Modal open={modalFormAberto} onClose={fecharModalForm} size="md">
        <Modal.Header>
          <Modal.Title><h5>{editandoId ? '✍️ Editar Cliente' : '✨ Novo Cliente'}</h5></Modal.Title>
        </Modal.Header>
        
        <Modal.Body style={{ paddingRight: 10 }}>
          <Form fluid formValue={formData} onChange={setFormData} model={model} id="form-cliente" onSubmit={(valid) => salvarCliente(valid)}>
            
            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginBottom: '15px' }}>
              <Form.Group style={{ flex: 1, minWidth: '200px' }}>
                <Form.ControlLabel>Nome Completo</Form.ControlLabel>
                <Form.Control name="name" accepter={Input} />
              </Form.Group>
              <Form.Group style={{ flex: 1, minWidth: '200px' }}>
                <Form.ControlLabel>E-mail</Form.ControlLabel>
                <Form.Control name="email" accepter={Input} type="email" />
              </Form.Group>
            </div>
            
            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginBottom: '15px' }}>
              <Form.Group style={{ flex: 1, minWidth: '200px' }}>
                <Form.ControlLabel>Telefone / WhatsApp</Form.ControlLabel>
                <Form.Control name="phone" accepter={Input} />
              </Form.Group>
            </div>

            {/* ATUALIZADO: Inputs de Endereço separados */}
            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
              <Form.Group style={{ flex: 2, minWidth: '200px' }}>
                <Form.ControlLabel>Rua / Residência</Form.ControlLabel>
                <Form.Control name="street" accepter={Input} placeholder="Ex: Av. Souza Naves" />
              </Form.Group>
              
              <Form.Group style={{ flex: 1, minWidth: '100px' }}>
                <Form.ControlLabel>Número</Form.ControlLabel>
                <Form.Control name="number" accepter={Input} placeholder="Ex: 123" />
              </Form.Group>
              
              <Form.Group style={{ flex: 1, minWidth: '150px' }}>
                <Form.ControlLabel>Cidade</Form.ControlLabel>
                <Form.Control name="city" accepter={Input} placeholder="Ex: Cianorte" />
              </Form.Group>
            </div>

          </Form>
        </Modal.Body>
        
        <Modal.Footer>
          <Button appearance="primary" color="violet" type="submit" form="form-cliente">
            {editandoId ? 'Salvar Alterações' : 'Cadastrar Cliente'}
          </Button>
          <Button appearance="subtle" onClick={fecharModalForm}>
            Cancelar
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal open={modalExcluirAberto} onClose={() => setModalExcluirAberto(false)} size="xs">
        <Modal.Header><Modal.Title>Confirmar Exclusão</Modal.Title></Modal.Header>
        <Modal.Body>
          Tem certeza que deseja remover o cliente <b>{clienteParaExcluir?.name}</b>?
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={confirmarExclusao} color="red" appearance="primary">Sim, excluir</Button>
          <Button onClick={() => setModalExcluirAberto(false)} appearance="subtle">Cancelar</Button>
        </Modal.Footer>
      </Modal>

    </div>
  );
}