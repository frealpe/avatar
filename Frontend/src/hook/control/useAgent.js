import { useState, useRef, useEffect } from 'react';
import AgentService from '../../service/control/agent.service';

export const useAgent = () => {
    const [messages, setMessages] = useState([
        { sender: 'agent', text: 'Hola, soy tu IA de control. ¿A dónde quieres enviar los drones?' }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    
    // Referencia para hacer scroll al último mensaje
    const endOfMessagesRef = useRef(null);

    const scrollToBottom = () => {
        endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMessage = input.trim();
        setMessages(prev => [...prev, { sender: 'user', text: userMessage }]);
        setInput('');
        setLoading(true);

        const response = await AgentService.sendChatMessage(userMessage);

        if (response.ok && response.data.currentStatus === 'success') {
            setMessages(prev => [...prev, { sender: 'agent', text: response.data.response }]);
        } else {
            setMessages(prev => [...prev, { sender: 'agent', text: `Error: ${response.error}` }]);
        }

        setLoading(false);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') handleSend();
    };

    return {
        messages,
        input,
        setInput,
        loading,
        handleSend,
        handleKeyPress,
        endOfMessagesRef
    };
};
