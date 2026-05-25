const API_URL = 'http://localhost:3000';

export async function api(path, options = {}) {
  const token = localStorage.getItem('token');
  
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401) {
    localStorage.removeItem('token');
    window.location.href = '/'; 
    throw new Error('Sessão expirada. Faça login novamente.');
  }

  if (!res.ok) {
    const errorData = await res.json();
    const errorMessage = Array.isArray(errorData.message)
      ? errorData.message[0]
      : errorData.message || 'Erro na requisição';
    throw new Error(errorMessage);
  }

  return res.status === 204 ? null : res.json();
}