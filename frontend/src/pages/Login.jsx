import { useState } from 'react';
import { api } from '../services/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault(); // SUA LÓGICA ORIGINAL MANTIDA
    setError(null);

    try {
      const data = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      localStorage.setItem('token', data.access_token);
      window.location.href = '/'; 
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      background: '#21232F' // Cor DARK da sua paleta
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
              style={{ width: '100%', padding: '12px', marginTop: '8px', borderRadius: '6px', border: '1px solid #ccc' }}
              placeholder="••••••••"
            />
          </div>
          <button 
            type="submit" 
            style={{ 
              padding: '12px', 
              backgroundColor: '#7B2CBF', // Sua cor PRIMARY
              color: 'white', 
              border: 'none', 
              borderRadius: '6px', 
              cursor: 'pointer', 
              fontSize: '16px',
              fontWeight: 'bold',
              marginTop: '10px'
            }}
          >
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}