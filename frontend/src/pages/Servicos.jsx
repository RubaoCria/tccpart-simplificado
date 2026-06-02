import { useState, useEffect } from 'react';
import { Form, Button, Table, Input, Message, useToaster, Stack, Loader, Modal } from 'rsuite';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { api } from '../services/api';
import BlurText from '../components/BlurText';

const { Column, HeaderCell, Cell } = Table;

// Esquema de validação com Zod
const schema = z.object({
  title: z.string().min(3, "O título é obrigatório"),
  price: z.string().min(1, "O valor é obrigatório"),
  durationMinutes: z.string().min(1, "A duração é obrigatória"),
  description: z.string().optional()
});

export default function Servicos() {
  const [servicos, setServicos] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  
  // Controle dos Modais
  const [modalFormAberto, setModalFormAberto] = useState(false);
  const [modalExcluirAberto, setModalExcluirAberto] = useState(false);
  const [servicoParaExcluir, setServicoParaExcluir] = useState(null);

  const toaster = useToaster();

  // Configuração do Hook Form
  const { control, handleSubmit, reset, setValue } = useForm({
    resolver: zodResolver(schema)
  });

  useEffect(() => {
    buscarServicos();
  }, []);

  const mostrarNotificacao = (type, text) => {
    toaster.push(<Message showIcon type={type} closable>{text}</Message>, { placement: 'topEnd' });
  };

  const buscarServicos = async () => {
    setCarregando(true);
    try {
      const dados = await api('/services', { method: 'GET' });
      setServicos(dados);
    } catch (err) {
      mostrarNotificacao('error', 'Erro ao carregar serviços.');
    } finally {
      setCarregando(false);
    }
  };

  const salvarServico = async (data) => {
    setCarregando(true);
    try {
      const dadosParaSalvar = {
        title: data.title,
        description: data.description || 'Serviço padrão',
        imageUrl: 'https://via.placeholder.com/150',
        priceInCents: Math.round(parseFloat(data.price.replace(',', '.')) * 100),
        durationMinutes: parseInt(data.durationMinutes, 10)
      };

      if (editandoId) {
        await api(`/services/${editandoId}`, { method: 'PATCH', body: JSON.stringify(dadosParaSalvar) });
        mostrarNotificacao('success', 'Serviço atualizado com sucesso!');
      } else {
        await api('/services', { method: 'POST', body: JSON.stringify(dadosParaSalvar) });
        mostrarNotificacao('success', 'Serviço cadastrado com sucesso!');
      }
      fecharModalForm();
      buscarServicos();
    } catch (err) {
      mostrarNotificacao('error', err.message);
    } finally {
      setCarregando(false);
    }
  };

  // Funções para gerenciar Modal de Formulário
  const abrirModalNovoServico = () => {
    setEditandoId(null);
    reset(); // Limpa o formulário do Zod
    setModalFormAberto(true);
  };

  const iniciarEdicao = (servico) => {
    setEditandoId(servico.id);
    setValue('title', servico.title);
    setValue('description', servico.description);
    setValue('price', String(servico.priceInCents / 100));
    setValue('durationMinutes', String(servico.durationMinutes));
    setModalFormAberto(true);
  };

  const fecharModalForm = () => {
    setModalFormAberto(false);
    setEditandoId(null);
    reset();
  };

  // Funções para gerenciar Modal de Exclusão
  const abrirModalExcluir = (servico) => {
    setServicoParaExcluir(servico);
    setModalExcluirAberto(true);
  };

  const confirmarExclusao = async () => {
    setCarregando(true);
    try {
      await api(`/services/${servicoParaExcluir.id}`, { method: 'DELETE' });
      mostrarNotificacao('success', 'Serviço removido com sucesso!');
      buscarServicos();
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
      
      {/* CABEÇALHO DA TELA COM O BOTÃO NOVO SERVIÇO */}
      <Stack justify="space-between" alignItems="center" style={{ marginBottom: 20 }}>
        <h3>
          <BlurText text="✂️ Gerenciar Serviços" delay={100} />
        </h3>
        <Button appearance="primary" color="violet" onClick={abrirModalNovoServico}>
          + Novo Serviço
        </Button>
      </Stack>

      {/* TABELA COMO ATRAÇÃO PRINCIPAL */}
      <div style={{ background: 'white', padding: 15, borderRadius: 8, border: '1px solid #eee' }}>
        <Table data={servicos} autoHeight bordered cellBordered>
          <Column flexGrow={2}><HeaderCell>Serviço</HeaderCell><Cell dataKey="title" /></Column>
          <Column flexGrow={1}><HeaderCell>Duração</HeaderCell><Cell>{rowData => `${rowData.durationMinutes} min`}</Cell></Column>
          <Column flexGrow={1}><HeaderCell>Valor (R$)</HeaderCell><Cell>{rowData => `R$ ${(rowData.priceInCents / 100).toFixed(2).replace('.', ',')}`}</Cell></Column>
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

      {/* MODAL 1: FORMULÁRIO DE CADASTRO/EDIÇÃO */}
      <Modal open={modalFormAberto} onClose={fecharModalForm} size="md">
        <Modal.Header>
          <Modal.Title><h5>{editandoId ? '✍️ Editar Serviço' : '✨ Novo Serviço'}</h5></Modal.Title>
        </Modal.Header>
        
        <Modal.Body style={{ paddingRight: 10 }}>
          <Form fluid id="form-servico" onSubmit={handleSubmit(salvarServico)}>
            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginBottom: '15px' }}>
              <Controller name="title" control={control} render={({ field, fieldState }) => (
                <Form.Group style={{ flex: 2, minWidth: '250px' }}>
                  <Form.ControlLabel>Nome do Serviço</Form.ControlLabel>
                  <Form.Control {...field} accepter={Input} errorMessage={fieldState.error?.message} />
                </Form.Group>
              )} />
              <Controller name="price" control={control} render={({ field, fieldState }) => (
                <Form.Group style={{ flex: 1, minWidth: '120px' }}>
                  <Form.ControlLabel>Valor (R$)</Form.ControlLabel>
                  <Form.Control {...field} accepter={Input} errorMessage={fieldState.error?.message} />
                </Form.Group>
              )} />
              <Controller name="durationMinutes" control={control} render={({ field, fieldState }) => (
                <Form.Group style={{ flex: 1, minWidth: '120px' }}>
                  <Form.ControlLabel>Duração (Min)</Form.ControlLabel>
                  <Form.Control {...field} accepter={Input} errorMessage={fieldState.error?.message} />
                </Form.Group>
              )} />
            </div>

            <Controller name="description" control={control} render={({ field }) => (
              <Form.Group>
                <Form.ControlLabel>Descrição Opcional</Form.ControlLabel>
                <Form.Control {...field} accepter={Input} />
              </Form.Group>
            )} />
          </Form>
        </Modal.Body>
        
        <Modal.Footer>
          <Button appearance="primary" color="violet" type="submit" form="form-servico">
            {editandoId ? 'Salvar Alterações' : 'Cadastrar Serviço'}
          </Button>
          <Button appearance="subtle" onClick={fecharModalForm}>
            Cancelar
          </Button>
        </Modal.Footer>
      </Modal>

      {/* MODAL 2: CONFIRMAÇÃO DE EXCLUSÃO */}
      <Modal open={modalExcluirAberto} onClose={() => setModalExcluirAberto(false)} size="xs">
        <Modal.Header><Modal.Title>Confirmar Exclusão</Modal.Title></Modal.Header>
        <Modal.Body>
          Tem certeza que deseja remover o serviço <b>{servicoParaExcluir?.title}</b>?
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={confirmarExclusao} color="red" appearance="primary">Sim, excluir</Button>
          <Button onClick={() => setModalExcluirAberto(false)} appearance="subtle">Cancelar</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}