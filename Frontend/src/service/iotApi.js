import axios from 'axios';

const API_URL = 'http://localhost:8080/api/avatar';

const iotApi = {
    generateAvatar: async (imageBase64, userId) => {
        try {
            const response = await axios.post(`${API_URL}/generate`, { imageBase64, userId });
            return response.data;
        } catch (error) {
            console.error('Error generating avatar', error);
            throw error;
        }
    },

    uploadAvatar: async (formData) => {
        try {
            const response = await axios.post(`${API_URL}/upload`, formData);
            return response.data;
        } catch (error) {
            console.error('Error uploading avatar', error);
            throw error;
        }
    },

    getAvatarById: async (id) => {
        try {
            const response = await axios.get(`${API_URL}/${id}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching avatar by ID', error);
            throw error;
        }
    },

    getClothesCatalog: async () => {
        try {
            const response = await axios.get(`${API_URL}/clothes`);
            return response.data;
        } catch (error) {
            console.error('Error fetching catalog', error);
            throw error;
        }
    },

    tryOnClothes: async (avatarId, prendaId) => {
        try {
            const response = await axios.post(`${API_URL}/try-on`, { avatarId, prendaId });
            return response.data;
        } catch (error) {
            console.error('Error trying on clothes', error);
            throw error;
        }
    },

    // Modificar parámetros de prenda vía texto (Text-to-Fit)
    modifyFitWithText: async (prompt, garmentParams) => {
        try {
            const response = await fetch(`${API_URL}/api/patterns/text-to-fit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, garmentParams })
            });
            return await response.json();
        } catch (error) {
            console.error('Error Modify Fit:', error);
            throw error;
        }
    }
};

export default iotApi;
