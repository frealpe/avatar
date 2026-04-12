import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080/api';

const authApi = {
    login: async (correo, password) => {
        try {
            const response = await axios.post(`${API_BASE}/auth/login`, { correo, password });
            return response.data;
        } catch (error) {
            console.error('Error in login service:', error);
            throw error.response?.data || { msg: 'Error de conexión' };
        }
    }
};

export default authApi;
