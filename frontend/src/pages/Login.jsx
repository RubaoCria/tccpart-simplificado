import { useState } from 'react';
import { api } from '../services/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false); // 1. Estado de loading

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true); // 2. Ativa o loading

    try {
      const data = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      localStorage.setItem('token', data.access_token);
      window.location.href = '/'; 
    } catch (err) {
      setError(err.message);
      setLoading(false); // 3. Desativa o loading em caso de erro
    }
  };

  return (
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
              onChange={(e) => setEmail(e.target.value)} 
              required 
              disabled={loading} // Desabilita input durante o loading
              style={{ width: '100%', padding: '12px', marginTop: '8px', borderRadius: '6px', border: '1px solid #ccc' }}
              placeholder="admin@salao.com"
            />
          </div>
          <div>
            <label style={{ color: '#21232F', fontWeight: 'bold' }}>Senha:</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              disabled={loading} // Desabilita input durante o loading
              style={{ width: '100%', padding: '12px', marginTop: '8px', borderRadius: '6px', border: '1px solid #ccc' }}
              placeholder="••••••••"
            />
          </div>
          <button 
            type="submit" 
            disabled={loading} // 4. Impede cliques múltiplos
            style={{ 
              padding: '12px', 
              backgroundColor: loading ? '#b892dc' : '#7B2CBF', // Cor mais clara se estiver carregando
              color: 'white', 
              border: 'none', 
              borderRadius: '6px', 
              cursor: loading ? 'not-allowed' : 'pointer', 
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