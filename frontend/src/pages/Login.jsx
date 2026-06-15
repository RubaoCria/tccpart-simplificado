/* Importação do React: o useState serve para criar "variáveis" que atualizam a tela em tempo real */
import { useState } from 'react';

/* Importação da nossa ponte de comunicação com o backend (o arquivo que faz as requisições HTTP) */
import { api } from '../services/api';

export default function Login() {
  /* ESTADOS (A memória temporária da tela de Login) */
  /* Guarda o e-mail que o usuário digita no input */
  const [email, setEmail] = useState('');
  
  /* Guarda a senha que o usuário digita no input */
  const [password, setPassword] = useState('');
  
  /* Guarda mensagens de erro vindas do backend (ex: "Senha incorreta") para mostrar na tela */
  const [error, setError] = useState(null);
  
  /* Controla se o sistema está processando o login (trava o botão para evitar que o usuário clique 2x) */
  const [loading, setLoading] = useState(false); 

  /* * Função principal executada quando o usuário aperta o botão "Entrar" ou dá "Enter".
   * O 'e.preventDefault()' impede que a aba do navegador recarregue (o que é padrão do HTML), 
   * mantendo o aplicativo fluido (conceito de SPA - Single Page Application).
   */
  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null); /* Limpa erros anteriores antes de tentar logar novamente */
    setLoading(true); /* Ativa o estado de carregamento (muda o texto do botão) */

    try {
      /* Fazendo o pedido POST para a rota de login no Backend */
      const data = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }), /* Transforma o e-mail e a senha em formato JSON para o servidor entender */
      });

      /* * DESTAQUE PARA A BANCA: 
       * Se o login der certo, o backend devolve um 'access_token' (a credencial de acesso).
       * Nós salvamos esse token no 'localStorage' (a memória de longo prazo do navegador).
       * Assim, nas próximas páginas, o Frontend envia esse token para provar que o usuário tem permissão.
       */
      localStorage.setItem('token', data.access_token);
      
      /* Redireciona o usuário direto para a página inicial (Dashboard) após o sucesso */
      window.location.href = '/'; 
    } catch (err) {
      /* Se o backend devolver erro (ex: e-mail não existe), capturamos aqui e colocamos na variável 'error' */
      setError(err.message);
      setLoading(false); /* Desativa o carregamento para o usuário poder tentar digitar de novo */
    }
  };

  /* * RETORNO VISUAL (O HTML/JSX que desenha a tela de login)
   */
  return (
    /* Fundo da tela escuro: ocupa 100% da altura (100vh) e centraliza o quadrado branco no meio */
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      background: '#21232F'
    }}>
      
      
      <div style={{ 
        width: '400px', 
        background: '#fff', 
        padding: '40px', 
        borderRadius: '12px', 
        boxShadow: '0 10px 25px rgba(0,0,0,0.2)' 
      }}>
        
        
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h2 style={{ color: '#7B2CBF', margin: 0 }}>EasyCut</h2>
          <p style={{ color: '#5E6171' }}>Acesse seu painel administrativo</p>
        </div>

        
        {error && (
          <p style={{ color: '#D62828', backgroundColor: '#fee', padding: '10px', borderRadius: '5px', marginBottom: '15px', fontSize: '14px' }}>
            {error}
          </p>
        )}

        
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
         
          <div>
            <label style={{ color: '#21232F', fontWeight: 'bold' }}>E-mail:</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} /* Pega o que o usuário digita e joga no estado 'email' */
              required 
              disabled={loading} /* Se estiver carregando, bloqueia a digitação */
              style={{ width: '100%', padding: '12px', marginTop: '8px', borderRadius: '6px', border: '1px solid #ccc' }}
              placeholder="admin@salao.com"
            />
          </div>
          
         
          <div>
            <label style={{ color: '#21232F', fontWeight: 'bold' }}>Senha:</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} /* Pega o que o usuário digita e joga no estado 'password' */
              required 
              disabled={loading} /* Se estiver carregando, bloqueia a digitação */
              style={{ width: '100%', padding: '12px', marginTop: '8px', borderRadius: '6px', border: '1px solid #ccc' }}
              placeholder="••••••••"
            />
          </div>
          
          
          <button 
            type="submit" 
            disabled={loading} /* Impede de clicar várias vezes e sobrecarregar o servidor */
            style={{ 
              padding: '12px', 
              backgroundColor: loading ? '#b892dc' : '#7B2CBF', /* Muda a cor para um tom mais fraco se estiver carregando */
              color: 'white', 
              border: 'none', 
              borderRadius: '6px', 
              cursor: loading ? 'not-allowed' : 'pointer', /* Muda a setinha do mouse para o símbolo de "proibido" se estiver carregando */
              fontSize: '16px',
              fontWeight: 'bold',
              marginTop: '10px',
              transition: 'background-color 0.3s'
            }}
          >
            
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}