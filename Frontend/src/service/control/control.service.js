import { iotApi } from "../../api/iotApi";

class ControlService {
    static getCaracterizacion = async () => {
        try {
            const resp = await iotApi.get('/data/caracterizacion');
            return { ok: true, data: resp.data };
        } catch (error) {
            console.error("Error fetching caracterizacion:", error);
            return { ok: false, error: error.message };
        }
    };

    static getComparacion = async () => {
        try {
            const resp = await iotApi.get('/data/comparacion');
            return { ok: true, data: resp.data };
        } catch (error) {
            console.error("Error fetching comparacion:", error);
            return { ok: false, error: error.message };
        }
    };

    static getDatalogger = async () => {
        try {
            const resp = await iotApi.get('/data/datalogger');
            return { ok: true, data: resp.data };
        } catch (error) {
            console.error("Error fetching datalogger:", error);
            return { ok: false, error: error.message };
        }
    };

    static getAnomalias = async (device_uid = null, startDate = null, endDate = null) => {
        try {
            const params = {};
            if (device_uid) params.device_uid = device_uid;
            if (startDate) params.startDate = startDate;
            if (endDate) params.endDate = endDate;
            
            const resp = await iotApi.get('/data/anomalias', { params });
            return { ok: true, data: resp.data };
        } catch (error) {
            console.error("Error fetching anomalias:", error);
            return { ok: false, error: error.message };
        }
    };

    static getDeviceLogs = async (device_uid, startDate = null, endDate = null) => {
        try {
            const params = {};
            if (startDate) params.startDate = startDate;
            if (endDate) params.endDate = endDate;
            
            const resp = await iotApi.get(`/data/device-logs/${device_uid}`, { params });
            return { ok: true, data: resp.data };
        } catch (error) {
            console.error("Error fetching device logs:", error);
            return { ok: false, error: error.message };
        }
    };

    static getRecentLogs = async (limit = 500, device_uid = null) => {
        try {
            const params = { limit };
            if (device_uid) params.device_uid = device_uid;
            
            const resp = await iotApi.get('/data/recent-logs', { params });
            return { ok: true, data: resp.data };
        } catch (error) {
            console.error("Error fetching recent logs:", error);
            return { ok: false, error: error.message };
        }
    };

    static getDevices = async () => {
        try {
            const resp = await iotApi.get('/data/devices');
            return { ok: true, data: resp.data };
        } catch (error) {
            console.error("Error fetching devices:", error);
            return { ok: false, error: error.message };
        }
    };

    static getLogsByDevices = async (devices) => {
        try {
            const resp = await iotApi.post('/data/logs-by-devices', { devices });
            return { ok: true, data: resp.data };
        } catch (error) {
            console.error("Error fetching logs by devices:", error);
            return { ok: false, error: error.message };
        }
    };

    static getTrainedModels = async (deviceUid = null) => {
        try {
            const url = deviceUid ? `/data/trained-models?device_uid=${deviceUid}` : '/data/trained-models';
            const resp = await iotApi.get(url);
            return { ok: true, data: resp.data };
        } catch (error) {
            console.error("Error fetching trained models:", error);
            return { ok: false, error: error.message };
        }
    };

    static activateModel = async (modelId) => {
        try {
            const resp = await iotApi.put(`/data/trained-models/${modelId}/activate`);
            return { ok: true, data: resp.data };
        } catch (error) {
            console.error("Error activating model:", error);
            return { ok: false, error: error.message };
        }
    };

    static deleteModel = async (modelId) => {
        try {
            const resp = await iotApi.delete(`/data/trained-models/${modelId}`);
            return { ok: true, data: resp.data };
        } catch (error) {
            console.error("Error deleting model:", error);
            return { ok: false, error: error.message };
        }
    };

    static startManualTraining = async ({ device_uid, max_samples, batches_required }) => {
        try {
            const resp = await iotApi.post('/data/train-model', {
                device_uid,
                max_samples,
                batches_required
            });
            return { ok: true, data: resp.data };
        } catch (error) {
            console.error("Error starting manual training:", error);
            throw error;
        }
    };

    static getAllDevices = async () => {
        try {
            const resp = await iotApi.get('/data/devices/all');
            return { ok: true, data: resp.data };
        } catch (error) {
            console.error("Error fetching all devices:", error);
            return { ok: false, error: error.message };
        }
    };

    static createDevice = async (device) => {
        try {
            const resp = await iotApi.post('/data/devices', device);
            return { ok: true, data: resp.data };
        } catch (error) {
            console.error("Error creating device:", error);
            return { ok: false, error: error.response?.data?.msg || error.message };
        }
    };

    static updateDevice = async (id, device) => {
        try {
            const resp = await iotApi.put(`/data/devices/${id}`, device);
            return { ok: true, data: resp.data };
        } catch (error) {
            console.error("Error updating device:", error);
            return { ok: false, error: error.response?.data?.msg || error.message };
        }
    };

    static toggleDevice = async (id, isActive) => {
        try {
            const resp = await iotApi.put(`/data/devices/${id}`, { isActive });
            return { ok: true, data: resp.data };
        } catch (error) {
            console.error("Error toggling device:", error);
            return { ok: false, error: error.response?.data?.msg || error.message };
        }
    };

    static deleteDevice = async (id) => {
        try {
            const resp = await iotApi.delete(`/data/devices/${id}`);
            return { ok: true, data: resp.data };
        } catch (error) {
            console.error("Error deleting device:", error);
            return { ok: false, error: error.message };
        }
    };

    static getTrajectories = async () => {
        try {
            const resp = await iotApi.get('/data/trajectories');
            return { ok: true, data: resp.data };
        } catch (error) {
            console.error("Error fetching trajectories:", error);
            return { ok: false, error: error.message };
        }
    };

    static saveTrajectory = async (trajectory) => {
        try {
            const resp = await iotApi.post('/data/trajectories', trajectory);
            return { ok: true, data: resp.data };
        } catch (error) {
            console.error("Error saving trajectory:", error);
            return { ok: false, error: error.response?.data?.msg || error.message };
        }
    };

    static updateTrajectory = async (id, data) => {
        try {
            const resp = await iotApi.put(`/data/trajectories/${id}`, data);
            return { ok: true, data: resp.data };
        } catch (error) {
            console.error("Error updating trajectory:", error);
            return { ok: false, error: error.response?.data?.msg || error.message };
        }
    };

    static deleteTrajectory = async (id) => {
        try {
            const resp = await iotApi.delete(`/data/trajectories/${id}`);
            return { ok: true, data: resp.data };
        } catch (error) {
            console.error("Error deleting trajectory:", error);
            return { ok: false, error: error.message };
        }
    };

    // ─── Mission Control (GeoBoard_03) ────────────────────────────────────────

    static getHomeBases = async () => {
        try {
            const resp = await iotApi.get('/mission/bases');
            return { ok: true, data: resp.data.data };
        } catch (error) {
            return { ok: false, error: error.message };
        }
    };

    static setHomeBase = async (droneMac, droneId, x, y, z) => {
        try {
            const resp = await iotApi.post('/mission/bases', { droneMac, droneId, x, y, z });
            return { ok: true, data: resp.data.data };
        } catch (error) {
            return { ok: false, error: error.response?.data?.msg || error.message };
        }
    };

    static startMission = async (waypoints, droneIds) => {
        try {
            const resp = await iotApi.post('/mission/start', { waypoints, droneIds });
            return { ok: true, data: resp.data };
        } catch (error) {
            return { ok: false, error: error.response?.data?.msg || error.message };
        }
    };

    static stopMission = async () => {
        try {
            const resp = await iotApi.post('/mission/stop');
            return { ok: true, data: resp.data };
        } catch (error) {
            return { ok: false, error: error.message };
        }
    };

    static getMissionState = async () => {
        try {
            const resp = await iotApi.get('/mission/state');
            return { ok: true, data: resp.data.data };
        } catch (error) {
            return { ok: false, error: error.message };
        }
    };

    // ─── Calibración de Sensores BNO055 ───────────────────────────────────────

    static calculateCalibration = async (droneId, sampleSize = 200) => {
        try {
            const resp = await iotApi.post(`/drones/${droneId}/calibration/calculate`, { sampleSize });
            return { ok: true, data: resp.data.data };
        } catch (error) {
            console.error('Error calculating calibration:', error);
            return { ok: false, error: error.response?.data?.error || error.message };
        }
    };

    static getCalibrationHistory = async (mac, limit = 20) => {
        try {
            const resp = await iotApi.get(`/data/devices/${encodeURIComponent(mac)}/calibrations`, { params: { limit } });
            return { ok: true, data: resp.data.data || [] };
        } catch (error) {
            return { ok: false, error: error.message, data: [] };
        }
    };
}

export default ControlService;
