import { useState, useCallback } from 'react';
import useDeviceStore from '../store/useDeviceStore';
import { useAppWebSocket } from './useAppWebSocket';

export const useDeviceControl = (deviceId) => {
    const isOnline = useDeviceStore((state) => state.isConnected);
    const { sendCommand } = useAppWebSocket('ws://<REPLACE_WITH_ESP32_IP>:81/ws'); // Should use config/env
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const executeAction = useCallback(async (action, payload = {}) => {
        if (!isOnline) {
            const err = new Error('El ESP32 está desconectado.');
            setError(err);
            console.warn(err.message);
            // In a real app, show a Toast/Alert here
            return false;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Promesa con timeout
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Timeout - Dispositivo no respondió')), 5000)
            );

            // Execute the command via WebSocket and wait for acknowledgment
            // (Assuming sendCommand resolves when an ACK is received in a full implementation)
            const commandPromise = sendCommand(deviceId, action, payload);

            await Promise.race([commandPromise, timeoutPromise]);

            setIsLoading(false);
            return true;

        } catch (err) {
            console.error('Action failed:', err);
            setError(err);
            setIsLoading(false);
            // Show toast for error
            return false;
        }
    }, [isOnline, sendCommand, deviceId]);

    return {
        isOnline,
        isLoading,
        error,
        executeAction,
    };
};

export default useDeviceControl;
