import { iotApi } from "../../api/iotApi";

class AgentService {
    static sendChatMessage = async (message) => {
        try {
            const resp = await iotApi.post('/agent/chat', { message });
            return { ok: true, data: resp.data };
        } catch (error) {
            console.error("Error sending chat message:", error);
            return { ok: false, error: error.response?.data?.error || error.message };
        }
    };
}

export default AgentService;
