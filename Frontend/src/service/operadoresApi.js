import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/';
// Asegurar que no termine en slash para que la concatenación sea siempre /recurso
const API_URL = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL;

export const getOperadores = async () => {
    try {
        const resp = await axios.get(`${API_URL}/operadores`);
        return resp.data;
    } catch (err) {
        console.error('API Error (getOperadores):', err);
        throw err;
    }
};

export const createOperador = async (data) => {
    try {
        const resp = await axios.post(`${API_URL}/operadores`, data);
        return resp.data;
    } catch (err) {
        console.error('API Error (createOperador):', err);
        throw err;
    }
};

export const updateOperador = async (id, data) => {
    try {
        const resp = await axios.put(`${API_URL}/operadores/${id}`, data);
        return resp.data;
    } catch (err) {
        console.error('API Error (updateOperador):', err);
        throw err;
    }
};

export const deleteOperador = async (id) => {
    try {
        const resp = await axios.delete(`${API_URL}/operadores/${id}`);
        return resp.data;
    } catch (err) {
        console.error('API Error (deleteOperador):', err);
        throw err;
    }
};
