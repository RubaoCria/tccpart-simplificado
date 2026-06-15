/*Aqui está o código completo, já com a correção do `defaultValues` aplicada e com todos os comentários explicativos para você brilhar na sua apresentação.

É só copiar tudo aqui embaixo, apagar o que está no seu arquivo `Servicos.jsx` e colar!

```javascript */
/* Importações do React para gerenciar estado e ciclo de vida */
import { useState, useEffect } from 'react';

/* Importações dos componentes visuais da biblioteca RSuite */
import { Form, Button, Table, Input, Message, useToaster, Stack, Loader, Modal } from 'rsuite';

/* Importações do React Hook Form (para gerenciar o formulário) e Zod (para validação) */
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

/* Importação da sua configuração de API e componentes customizados */
import { api } from '../services/api';
import BlurText from '../components/BlurText';

/* Desestruturando os componentes da Tabela para não precisar escrever Table.Column toda hora */
const { Column, HeaderCell, Cell } = Table;

/* 
 * Esquema de validação com Zod. 
 * Usamos required_error para garantir mensagens em português caso o campo venha vazio.
 */
const schema = z.object({
  title: z.string({ required_error: "O título é obrigatório" }).min(3, "O título precisa ter no mínimo 3 letras"),
  price: z.string({ required_error: "O valor é obrigatório" }).min(1, "O valor é obrigatório"),
  durationMinutes: z.string({ required_error: "A duração é obrigatória" }).min(1, "A duração é obrigatória"),
  description: z.string().optional()
});

export default function Servicos() {
  /* ESTADOS DA APLICAÇÃO (A "memória" da sua tela) */
  const [servicos, setServicos] = useState([]); /* Guarda a lista de serviços vindos do banco */
  const [carregando, setCarregando] = useState(false); /* Controla se o ícone de carregamento aparece ou não */
  const [editandoId, setEditandoId] = useState(null); /* Guarda o ID do serviço se estivermos editando algum */
  
  /* ESTADOS DOS MODAIS (Controlam se as janelinhas estão abertas ou fechadas) */
  const [modalFormAberto, setModalFormAberto] = useState(false);
  const [modalExcluirAberto, setModalExcluirAberto] = useState(false);
  const [servicoParaExcluir, setServicoParaExcluir] = useState(null);

  /* Ferramenta do RSuite para disparar os balões de aviso (sucesso/erro) na tela */
  const toaster = useToaster();

  /* 
   * Configuração do React Hook Form acoplado com o Zod.
   * O defaultValues garante que os campos comecem como textos vazios (""), 
   * evitando o erro "expected string, received undefined" do Zod.
   */
  const { control, handleSubmit, reset, setValue } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      price: '',
      durationMinutes: '',
      description: ''
    }
  });

  /* Executa a função buscarServicos automaticamente assim que a tela abre pela primeira vez */
  useEffect(() => {
    buscarServicos();
  }, []);

  /* Função auxiliar para criar as notificações (balõezinhos verdes ou vermelhos) no canto da tela */
  const mostrarNotificacao = (type, text) => {
    toaster.push(<Message showIcon type={type} closable>{text}</Message>, { placement: 'topEnd' });
  };

  /* Função que bate no Backend (GET /services) para pegar a lista de serviços e atualizar a tabela */
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

  /* 
   * Função executada quando o usuário clica em "Salvar".
   * O parâmetro 'data' já vem validado pelo Zod com as informações dos inputs.
   */
  const salvarServico = async (data) => {
    setCarregando(true);
    try {
      /* Formata os dados para o padrão que o banco de dados espera (ex: transformando preço em centavos) */
      const dadosParaSalvar = {
        title: data.title,
        description: data.description || 'Serviço padrão',
        imageUrl: 'https://via.placeholder.com/150',
        priceInCents: Math.round(parseFloat(data.price.replace(',', '.')) * 100),
        durationMinutes: parseInt(data.durationMinutes, 10)
      };

      /* Se tiver um 'editandoId', faz um PATCH (Atualização). Se não tiver, faz um POST (Criação) */
      if (editandoId) {
        await api(`/services/${editandoId}`, { method: 'PATCH', body: JSON.stringify(dadosParaSalvar) });
        mostrarNotificacao('success', 'Serviço atualizado com sucesso!');
      } else {
        await api('/services', { method: 'POST', body: JSON.stringify(dadosParaSalvar) });
        mostrarNotificacao('success', 'Serviço cadastrado com sucesso!');
      }
      
      /* Fecha a janelinha e atualiza a tabela chamando o banco de novo */
      fecharModalForm();
      buscarServicos();
    } catch (err) {
      mostrarNotificacao('error', err.message);
    } finally {
      setCarregando(false);
    }
  };

  /* Prepara a tela para cadastrar um serviço novo (Limpa formulário e abre a janela) */
  const abrirModalNovoServico = () => {
    setEditandoId(null);
    reset(); /* Como definimos defaultValues, o reset volta tudo para "" */
    setModalFormAberto(true);
  };

  /* Prepara a tela para editar um serviço existente (Preenche os inputs com os dados antigos e abre a janela) */
  const iniciarEdicao = (servico) => {
    setEditandoId(servico.id);
    setValue('title', servico.title);
    setValue('description', servico.description);
    setValue('price', String(servico.priceInCents / 100));
    setValue('durationMinutes', String(servico.durationMinutes));
    setModalFormAberto(true);
  };

  /* Fecha a janela do formulário e zera todas as informações preenchidas nela */
  const fecharModalForm = () => {
    setModalFormAberto(false);
    setEditandoId(null);
    reset();
  };

  /* Abre a janelinha de confirmação antes de excluir, guardando quem o usuário quer deletar */
  const abrirModalExcluir = (servico) => {
    setServicoParaExcluir(servico);
    setModalExcluirAberto(true);
  };

  /* Vai no backend (DELETE /services/:id) e remove definitivamente o serviço do banco de dados */
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

  /* 
   * RETORNO DO COMPONENTE:
   * Aqui fica a estrutura visual da página (o HTML/JSX) que vai aparecer na tela.
   */
  return (
    <div>
      {/* Se o estado 'carregando' for true, exibe o ícone de load travando a tela */}
      {carregando && <Loader center backdrop content="Processando..." vertical size="md" />}
      
      {/* CABEÇALHO: Título da tela e botão de adicionar */}
      <Stack justify="space-between" alignItems="center" style={{ marginBottom: 20 }}>
        <h3>
          <BlurText text="✂️ Gerenciar Serviços" delay={100} />
        </h3>
        <Button appearance="primary" color="violet" onClick={abrirModalNovoServico}>
          + Novo Serviço
        </Button>
      </Stack>

      {/* TABELA: Onde os serviços carregados do banco são listados */}
      <div style={{ background: 'white', padding: 15, borderRadius: 8, border: '1px solid #eee' }}>
        <Table data={servicos} autoHeight bordered cellBordered>
          <Column flexGrow={2}><HeaderCell>Serviço</HeaderCell><Cell dataKey="title" /></Column>
          <Column flexGrow={1}><HeaderCell>Duração</HeaderCell><Cell>{rowData => `${rowData.durationMinutes} min`}</Cell></Column>
          <Column flexGrow={1}><HeaderCell>Valor (R$)</HeaderCell><Cell>{rowData => `R$ ${(rowData.priceInCents / 100).toFixed(2).replace('.', ',')}`}</Cell></Column>
          
          {/* Coluna de Ações (Botões Editar e Excluir) */}
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

      {/* MODAL DE FORMULÁRIO: Janela oculta que abre para criar ou editar serviços */}
      <Modal open={modalFormAberto} onClose={fecharModalForm} size="md">
        <Modal.Header>
          <Modal.Title><h5>{editandoId ? '✍️ Editar Serviço' : '✨ Novo Serviço'}</h5></Modal.Title>
        </Modal.Header>
        
        <Modal.Body style={{ paddingRight: 10 }}>
          {/* Formulário acoplado à função handleSubmit. Se o Zod aprovar, ele chama o salvarServico */}
          <Form fluid id="form-servico" onSubmit={handleSubmit(salvarServico)}>
            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginBottom: '15px' }}>
              
              {/* O Controller conecta os inputs do RSuite com as validações do React Hook Form/Zod */}
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
        
        {/* Rodapé do modal com botões de ação */}
        <Modal.Footer>
          <Button appearance="primary" color="violet" type="submit" form="form-servico">
            {editandoId ? 'Salvar Alterações' : 'Cadastrar Serviço'}
          </Button>
          <Button appearance="subtle" onClick={fecharModalForm}>
            Cancelar
          </Button>
        </Modal.Footer>
      </Modal>

      {/* MODAL DE CONFIRMAÇÃO: Janela simples para evitar exclusões acidentais */}
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
