import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/';
const API_URL = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL;

export const getProyectos = async () => {
    try {
        const resp = await axios.get(`${API_URL}/proyectos`);
        return resp.data;
    } catch (err) {
        console.error('API Error (getProyectos):', err);
        throw err;
    }
};

export const createProyecto = async (data) => {
    try {
        const resp = await axios.post(`${API_URL}/proyectos`, data);
        return resp.data;
    } catch (err) {
        console.error('API Error (createProyecto):', err);
        throw err;
    }
};

export const updateProyecto = async (id, data) => {
    try {
        const resp = await axios.put(`${API_URL}/proyectos/${id}`, data);
        return resp.data;
    } catch (err) {
        console.error('API Error (updateProyecto):', err);
        throw err;
    }
};

export const deleteProyecto = async (id) => {
    try {
        const resp = await axios.delete(`${API_URL}/proyectos/${id}`);
        return resp.data;
    } catch (err) {
        console.error('API Error (deleteProyecto):', err);
        throw err;
    }
};
