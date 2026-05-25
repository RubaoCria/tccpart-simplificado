import { useState } from 'react';
import { api } from '../services/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      // Faz o POST usando nosso serviço centralizado
      const data = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      // Salva o token e redireciona para a agenda
      localStorage.setItem('token', data.access_token);
      window.location.href = '/agenda';

    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={{ padding: '50px', maxWidth: '400px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h2>Login do Salão</h2>
      
      {error && (
        <p style={{ color: 'red', backgroundColor: '#fee', padding: '10px', borderRadius: '5px' }}>
          {error}
        </p>
      )}
      
      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div>
          <label>E-mail:</label><br />
          <input 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
            style={{ width: '100%', padding: '8px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc' }}
            placeholder="admin@salao.local"
          />
        </div>
        <div>
          <label>:</label><br />
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
            style={{ width: '100%', padding: '8px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc' }}
            placeholder="••••••••"
          />
        </div>
        <button 
          type="submit" 
          style={{ padding: '10px', backgroundColor: '#007BFF', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '16px' }}
        >
          Entrar
        </button>
      </form>
    </div>
  );
}