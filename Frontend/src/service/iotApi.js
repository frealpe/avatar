import axios from 'axios';

const API_BASE = (typeof window !== 'undefined' && window.location.hostname !== 'localhost') 
    ? `http://${window.location.hostname}:8080` 
    : 'http://localhost:8080';

const API_URL = `${API_BASE}/api/avatar`;

const iotApi = {
    generateAvatar: async (imageBase64, userId, target = 'both') => {
        try {
            const response = await axios.post(`${API_URL}/generate`, { imageBase64, userId, target });
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

    recalculateAvatar: async (betas, gender = 'neutral', poseType = 't-pose') => {
        try {
            const response = await axios.post(`${API_URL}/recalculate`, { betas, gender, poseType });
            return response.data;
        } catch (error) {
            console.error('Error recalculating avatar', error);
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
    getPredefinedAvatars: async () => {
        try {
            const response = await axios.get(`${API_URL}/predefined`);
            return response.data;
        } catch (error) {
            console.error('Error fetching predefined avatars', error);
            throw error;
        }
    }
};

export default iotApi;
