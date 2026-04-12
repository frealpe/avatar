import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/';
const API_URL = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL;

export const getUsuarios = async () => {
    try {
        const resp = await axios.get(`${API_URL}/usuarios`);
        return resp.data;
    } catch (err) {
        console.error('API Error (getUsuarios):', err);
        throw err;
    }
};

export const createUsuario = async (data) => {
    try {
        const resp = await axios.post(`${API_URL}/usuarios`, data);
        return resp.data;
    } catch (err) {
        console.error('API Error (createUsuario):', err);
        throw err;
    }
};

export const updateUsuario = async (id, data) => {
    try {
        const resp = await axios.put(`${API_URL}/usuarios/${id}`, data);
        return resp.data;
    } catch (err) {
        console.error('API Error (updateUsuario):', err);
        throw err;
    }
};

export const deleteUsuario = async (id) => {
    try {
        const resp = await axios.delete(`${API_URL}/usuarios/${id}`);
        return resp.data;
    } catch (err) {
        console.error('API Error (deleteUsuario):', err);
        throw err;
    }
};
