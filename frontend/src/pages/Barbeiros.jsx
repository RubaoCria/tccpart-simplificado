import { useState, useEffect } from 'react';
import { Form, Button, Table, Input, Message, useToaster, Stack, Modal, Loader } from 'rsuite';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { api } from '../services/api';
import BlurText from '../components/BlurText';

const { Column, HeaderCell, Cell } = Table;

// ATUALIZADO: Substituído o campo "address" único pelos três campos separados
const schema = z.object({
  name: z.string().min(3, "O nome do profissional é obrigatório"),
  phone: z.string().min(10, "Telefone inválido").optional().or(z.literal('')),
  email: z.string().email("E-mail inválido").optional().or(z.literal('')),
  street: z.string().optional().or(z.literal('')),
  number: z.string().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal(''))
});

export default function Barbeiros() {
  const [barbeiros, setBarbeiros] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  
  const [modalFormAberto, setModalFormAberto] = useState(false);
  const [modalExcluirAberto, setModalExcluirAberto] = useState(false);
  const [barbeiroParaExcluir, setBarbeiroParaExcluir] = useState(null);

  const toaster = useToaster();

  // ATUALIZADO: Default values refletindo os novos campos
  const { control, handleSubmit, reset, setValue } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: '', phone: '', email: '', street: '', number: '', city: '' }
  });

  useEffect(() => {
    buscarBarbeiros();
  }, []);

  const mostrarNotificacao = (type, text) => {
    toaster.push(<Message showIcon type={type} closable>{text}</Message>, { placement: 'topEnd' });
  };

  const buscarBarbeiros = async () => {
    setCarregando(true);
    try {
      const dados = await api('/barbers', { method: 'GET' });
      setBarbeiros(dados);
    } catch (err) {
      mostrarNotificacao('error', 'Erro ao carregar a equipe.');
    } finally {
      setCarregando(false);
    }
  };

  const salvarBarbeiro = async (data) => {
    setCarregando(true);
    try {
      if (editandoId) {
        await api(`/barbers/${editandoId}`, { method: 'PATCH', body: JSON.stringify(data) });
        mostrarNotificacao('success', 'Dados do profissional atualizados!');
      } else {
        await api('/barbers', { method: 'POST', body: JSON.stringify(data) });
        mostrarNotificacao('success', 'Profissional cadastrado com sucesso!');
      }
      fecharModalForm();
      buscarBarbeiros();
    } catch (err) {
      mostrarNotificacao('error', 'Erro: ' + err.message);
    } finally {
      setCarregando(false);
    }
  };

  const confirmarExclusao = async () => {
    setCarregando(true);
    try {
      await api(`/barbers/${barbeiroParaExcluir.id}`, { method: 'DELETE' });
      mostrarNotificacao('success', 'Profissional removido da equipe!');
      buscarBarbeiros();
    } catch (err) {
      mostrarNotificacao('error', 'Erro ao excluir: ' + err.message);
    } finally {
      setModalExcluirAberto(false);
      setCarregando(false);
    }
  };

  const abrirModalNovo = () => {
    setEditandoId(null);
    reset();
    setModalFormAberto(true);
  };

  const fecharModalForm = () => {
    setModalFormAberto(false);
    setEditandoId(null);
    reset();
  };

  const iniciarEdicao = (barbeiro) => {
    setEditandoId(barbeiro.id);
    setValue('name', barbeiro.name);
    setValue('phone', barbeiro.phone || '');
    setValue('email', barbeiro.email || '');
    // ATUALIZADO: Puxando os novos campos na hora de editar
    setValue('street', barbeiro.street || '');
    setValue('number', barbeiro.number || '');
    setValue('city', barbeiro.city || '');
    setModalFormAberto(true);
  };

  const abrirModalExcluir = (barbeiro) => {
    setBarbeiroParaExcluir(barbeiro);
    setModalExcluirAberto(true);
  };

  return (
    <div>
      {carregando && <Loader center backdrop content="Processando..." vertical size="md" />}

      <Stack justify="space-between" alignItems="center" style={{ marginBottom: 20 }}>
        <h3>
          <BlurText text="💈 Gerenciar Equipe" delay={100} />
        </h3>
        <Button appearance="primary" color="violet" onClick={abrirModalNovo}>
          + Novo Profissional
        </Button>
      </Stack>

      <div style={{ background: 'white', padding: 15, borderRadius: 8, border: '1px solid #eee' }}>
        <Table data={barbeiros} autoHeight bordered cellBordered>
          <Column width={60} align="center"><HeaderCell>ID</HeaderCell><Cell dataKey="id" /></Column>
          <Column flexGrow={2}><HeaderCell>Nome</HeaderCell><Cell dataKey="name" /></Column>
          <Column flexGrow={1}><HeaderCell>Telefone</HeaderCell><Cell dataKey="phone" /></Column>
          
          {/* ATUALIZADO: Montando o endereço completo na tabela */}
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
            <Cell>{rowData => (
              <Stack spacing={5} justify="center">
                <Button color="blue" appearance="link" size="xs" onClick={() => iniciarEdicao(rowData)}>Editar</Button>
                <Button color="red" appearance="link" size="xs" onClick={() => abrirModalExcluir(rowData)}>Excluir</Button>
              </Stack>
            )}</Cell>
          </Column>
        </Table>
      </div>

      <Modal open={modalFormAberto} onClose={fecharModalForm} size="sm">
        <Modal.Header><Modal.Title>{editandoId ? '✍️ Editar Profissional' : '✨ Cadastrar Profissional'}</Modal.Title></Modal.Header>
        <Modal.Body style={{ paddingRight: 10 }}>
          <Form fluid id="form-barbeiro" onSubmit={handleSubmit(salvarBarbeiro)}>
            <Controller name="name" control={control} render={({ field, fieldState }) => (
              <Form.Group>
                <Form.ControlLabel>Nome Completo</Form.ControlLabel>
                <Form.Control {...field} accepter={Input} errorMessage={fieldState.error?.message} />
              </Form.Group>
            )} />
            <Controller name="phone" control={control} render={({ field, fieldState }) => (
              <Form.Group>
                <Form.ControlLabel>Telefone / WhatsApp</Form.ControlLabel>
                <Form.Control {...field} accepter={Input} errorMessage={fieldState.error?.message} />
              </Form.Group>
            )} />
            <Controller name="email" control={control} render={({ field, fieldState }) => (
              <Form.Group>
                <Form.ControlLabel>E-mail</Form.ControlLabel>
                <Form.Control {...field} accepter={Input} errorMessage={fieldState.error?.message} />
              </Form.Group>
            )} />
            
            {/* ATUALIZADO: Campos de Endereço Separados */}
            <Controller name="street" control={control} render={({ field, fieldState }) => (
              <Form.Group>
                <Form.ControlLabel>Rua / Residência</Form.ControlLabel>
                <Form.Control {...field} accepter={Input} errorMessage={fieldState.error?.message} placeholder="Ex: Av. Souza Naves" />
              </Form.Group>
            )} />
            
            <div style={{ display: 'flex', gap: '15px' }}>
              <Controller name="number" control={control} render={({ field, fieldState }) => (
                <Form.Group style={{ flex: 1 }}>
                  <Form.ControlLabel>Número</Form.ControlLabel>
                  <Form.Control {...field} accepter={Input} errorMessage={fieldState.error?.message} placeholder="Ex: 123" />
                </Form.Group>
              )} />

              <Controller name="city" control={control} render={({ field, fieldState }) => (
                <Form.Group style={{ flex: 2 }}>
                  <Form.ControlLabel>Cidade</Form.ControlLabel>
                  <Form.Control {...field} accepter={Input} errorMessage={fieldState.error?.message} placeholder="Ex: Cianorte" />
                </Form.Group>
              )} />
            </div>

          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button appearance="primary" color="violet" type="submit" form="form-barbeiro">
            {editandoId ? 'Salvar Alterações' : 'Cadastrar'}
          </Button>
          <Button appearance="subtle" onClick={fecharModalForm}>Cancelar</Button>
        </Modal.Footer>
      </Modal>

      <Modal open={modalExcluirAberto} onClose={() => setModalExcluirAberto(false)} size="xs">
        <Modal.Header><Modal.Title>Confirmar Exclusão</Modal.Title></Modal.Header>
        <Modal.Body>Tem certeza que deseja remover <b>{barbeiroParaExcluir?.name}</b> da equipe?</Modal.Body>
        <Modal.Footer>
          <Button onClick={confirmarExclusao} color="red" appearance="primary">Sim, remover</Button>
          <Button onClick={() => setModalExcluirAberto(false)} appearance="subtle">Cancelar</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}