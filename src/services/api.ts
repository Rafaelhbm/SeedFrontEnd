import axios from 'axios';

// URL do backend
const API_URL = 'https://seedbackend-l5dv.onrender.com';

// Cria a instância do axios
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL, 
});

// O Interceptor que anexa o token em todas as chamadas
api.interceptors.request.use(
  (config) => {
    // Pega o crachá do usuário (que tem o token)
    const sessionData = localStorage.getItem('user_session');
    
    if (sessionData) {
      const userData = JSON.parse(sessionData);
      if (userData.token) {
        // Anexa o token no cabeçalho
        config.headers.Authorization = `Bearer ${userData.token}`;
      }
    }
    
    return config; // Continua a requisição
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;