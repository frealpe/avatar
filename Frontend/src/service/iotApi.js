import axios from 'axios';

const API_BASE = (typeof window !== 'undefined' && window.location.hostname !== 'localhost') 
    ? `http://${window.location.hostname}:8080` 
    : 'http://localhost:8080';

const API_URL = `${API_BASE}/api/avatar`;

const iotApi = {
    API_BASE,
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

    recalculateAvatar: async (betas, gender = 'neutral', poseType = 't-pose', poseParams = {}) => {
        try {
            const response = await axios.post(`${API_URL}/recalculate`, { 
                betas, 
                gender, 
                poseType,
                ...poseParams 
            });
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

    getAvatarByUser: async (userId) => {
        try {
            const response = await axios.get(`${API_URL}/user/${userId}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching avatar by User ID', error);
            throw error;
        }
    },

    ensureAvatar: async (avatarData) => {
        try {
            const response = await axios.post(`${API_URL}/ensure`, avatarData);
            return response.data;
        } catch (error) {
            console.error('Error ensuring avatar', error);
            throw error;
        }
    },

    updateAvatar: async (id, data) => {
        try {
            const response = await axios.patch(`${API_URL}/${id}`, data);
            return response.data;
        } catch (error) {
            console.error('Error updating avatar', error);
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
    },

    // --- Pose Persistence ---
    savePose: async (avatarId, name, poseData, isDefault = false) => {
        try {
            const response = await axios.post(`${API_BASE}/api/pose`, { avatarId, name, poseData, isDefault });
            return response.data;
        } catch (error) {
            console.error('Error saving pose', error);
            throw error;
        }
    },

    getPosesByAvatar: async (avatarId) => {
        try {
            const response = await axios.get(`${API_BASE}/api/pose/avatar/${avatarId}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching poses', error);
            throw error;
        }
    },

    deletePose: async (id) => {
        try {
            const response = await axios.delete(`${API_BASE}/api/pose/${id}`);
            return response.data;
        } catch (error) {
            console.error('Error deleting its pose', error);
            throw error;
        }
    },

    setDefaultPose: async (id) => {
        try {
            const response = await axios.patch(`${API_BASE}/api/pose/default/${id}`);
            return response.data;
        } catch (error) {
            console.error('Error setting default pose', error);
            throw error;
        }
    },

    analyzeGarmentGlb: async (glbBase64, userId) => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.post(`${API_URL}/analyze-garment`, { glbBase64, userId }, {
                headers: { 'x-token': token }
            });
            return response.data;
        } catch (error) {
            console.error('Error analyzing garment GLB', error);
            throw error;
        }
    }
};

export default iotApi;
