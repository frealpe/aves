import { useState, useEffect, useRef, useCallback } from 'react';

const RECONNECT_INTERVAL_MS = 5000;

export const useWebSocket = (url) => {
    const [isConnected, setIsConnected] = useState(false);
    const [telemetry, setTelemetry] = useState(null);
    const [info, setInfo] = useState('');
    const wsRef = useRef(null);
    const reconnectTimerRef = useRef(null);

    const connect = useCallback(() => {
        if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
            return;
        }

        console.log(`Intentando conectar a ${url}...`);
        const ws = new WebSocket(url);

        ws.onopen = () => {
            console.log('WebSocket Conectado');
            setIsConnected(true);
            if (reconnectTimerRef.current) {
                clearTimeout(reconnectTimerRef.current);
                reconnectTimerRef.current = null;
            }
        };

        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                // Nuevo protocolo: { type, source, target, action, payload, timestamp }
                if (message.type === 'info') {
                    setInfo(message.payload?.message || JSON.stringify(message));
                } else if (message.type === 'event' && message.action === 'telemetry_data') {
                    setTelemetry(message.payload);
                }
            } catch (error) {
                console.error('Error procesando mensaje:', error);
            }
        };

        ws.onclose = () => {
            console.log('WebSocket Desconectado');
            setIsConnected(false);
            wsRef.current = null;
            // Intentar reconectar si la URL está definida
            if (url) {
                reconnectTimerRef.current = setTimeout(connect, RECONNECT_INTERVAL_MS);
            }
        };

        ws.onerror = (error) => {
            console.error('WebSocket Error:', error);
            ws.close();
        };

        wsRef.current = ws;
    }, [url]);

    const sendMessage = useCallback((type, source, target, action, payload = {}) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            const msg = {
                type,
                source,
                target,
                action,
                payload,
                timestamp: Date.now()
            };
            wsRef.current.send(JSON.stringify(msg));
        } else {
            console.warn('No se puede enviar mensaje, el socket no está conectado.');
        }
    }, []);

    useEffect(() => {
        if (url) {
            connect();
        }
        return () => {
            if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [connect, url]);

    // Heartbeat cada 5 segundos
    useEffect(() => {
        let heartbeatInterval;
        if (isConnected) {
            heartbeatInterval = setInterval(() => {
                sendMessage('event', 'mobile', 'device', 'heartbeat', {});
            }, 5000);
        }
        return () => {
            if (heartbeatInterval) clearInterval(heartbeatInterval);
        };
    }, [isConnected, sendMessage]);

    const sendAnimation = useCallback((animType) => {
        sendMessage('event', 'mobile', 'avatar', animType, {});
    }, [sendMessage]);

    const requestTelemetry = useCallback(() => {
        sendMessage('event', 'mobile', 'device', 'GET_TELEMETRY', {});
    }, [sendMessage]);

    const controlLed = useCallback((on) => {
        sendMessage('event', 'mobile', 'device', on ? 'led_on' : 'led_off', {});
    }, [sendMessage]);

    return {
        isConnected,
        telemetry,
        info,
        sendMessage,
        sendAnimation,
        requestTelemetry,
        controlLed
    };
};
