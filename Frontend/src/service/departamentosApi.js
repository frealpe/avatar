import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/';
const API_URL = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL;

export const getDepartamentos = async () => {
    try {
        const resp = await axios.get(`${API_URL}/departamentos`);
        return resp.data;
    } catch (err) {
        console.error('API Error (getDepartamentos):', err);
        throw err;
    }
};
