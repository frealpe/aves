import { useEffect, useState, useCallback } from 'react';
import NetInfo from '@react-native-community/netinfo';
import useDeviceStore from '../store/useDeviceStore';
import useChatStore from '../store/useChatStore';

const MAX_RECONNECT_ATTEMPTS = 3;
const INITIAL_RECONNECT_INTERVAL_MS = 2000;
const FALLBACK_POLLING_INTERVAL_MS = 10000;

// Central WebSocket Manager (Singleton Pattern)
class WebSocketManager {
    constructor() {
        this.ws = null;
        this.url = null;
        this.reconnectTimer = null;
        this.pollingTimer = null;
        this.reconnectAttempts = 0;
        this.isNetworkConnected = true;
        this.isFallbackMode = false;

        // Listeners for component reactivity
        this.listeners = new Set();

        // Subscribe to network changes globally
        NetInfo.addEventListener(state => {
            this.isNetworkConnected = state.isConnected;
            this.notifyListeners();

            if (state.isConnected && this.isFallbackMode) {
                // If network returns and we were in fallback, try connecting again
                if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
                    this.reconnectAttempts = 0;
                }
                this.connect();
            } else if (!state.isConnected) {
                this.isFallbackMode = true;
                this.startHttpFallbackPolling();
                this.notifyListeners();
            }
        });
    }

    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    notifyListeners() {
        this.listeners.forEach(listener => listener({
            isFallbackMode: this.isFallbackMode,
            isNetworkConnected: this.isNetworkConnected,
            isConnected: this.ws && this.ws.readyState === WebSocket.OPEN
        }));
    }

    setUrl(url) {
        if (this.url !== url) {
            this.url = url;
            this.reconnectAttempts = 0;
            this.connect();
        }
    }

    connect() {
        if (!this.url || !this.isNetworkConnected || this.isFallbackMode) return;

        if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
            return; // Already connected or connecting
        }

        console.log(`[WS Manager] Intentando conectar a ${this.url}... Intento: ${this.reconnectAttempts + 1}`);
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
            console.log('[WS Manager] App WebSocket Conectado');

            // Update Global Stores directly
            useDeviceStore.getState().setConnectionStatus(true);
            useChatStore.getState().setWsConnectionStatus(true);

            this.isFallbackMode = false;
            this.reconnectAttempts = 0;

            if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
            if (this.pollingTimer) clearInterval(this.pollingTimer);

            this.notifyListeners();
        };

        this.ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);

                // Route message to appropriate store based on type/action
                if (message.type === 'data' || (message.type === 'event' && message.action === 'telemetry_data')) {
                   useDeviceStore.getState().setTelemetry(message.payload || message.v);
                }

                // Add more routing logic here (e.g. for chat, booking updates, etc.)

            } catch (error) {
                console.error('[WS Manager] Error procesando mensaje WS:', error);
            }
        };

        this.ws.onclose = () => {
            console.log('[WS Manager] App WebSocket Desconectado');

            useDeviceStore.getState().setConnectionStatus(false);
            useChatStore.getState().setWsConnectionStatus(false);
            this.ws = null;
            this.notifyListeners();

            // Exponential Backoff
            if (this.url && this.isNetworkConnected && this.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                const timeout = INITIAL_RECONNECT_INTERVAL_MS * Math.pow(2, this.reconnectAttempts);
                this.reconnectTimer = setTimeout(() => this.connect(), timeout);
                this.reconnectAttempts += 1;
            } else if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS || !this.isNetworkConnected) {
                console.warn('[WS Manager] Max reconnect attempts reached or network lost. Falling back to HTTP polling.');
                this.isFallbackMode = true;
                this.startHttpFallbackPolling();
                this.notifyListeners();
            }
        };

        this.ws.onerror = (error) => {
            console.error('[WS Manager] WebSocket Error:', error);
            // close() triggers onclose which handles reconnection
            if (this.ws) this.ws.close();
        };
    }

    startHttpFallbackPolling() {
        if (this.pollingTimer) return;

        console.log("[WS Manager] Iniciando modo fallback: Long Polling HTTP cada 10s");
        this.pollingTimer = setInterval(async () => {
             if (!this.isNetworkConnected) return;

             try {
                // Mock HTTP fallback fetch logic
                console.log("[WS Manager] HTTP Fallback Polling Ejecutado");

                // If polling succeeds and network is up, attempt WS connection again eventually
                if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
                    this.reconnectAttempts = 0; // Reset to allow connect() to proceed
                    this.isFallbackMode = false; // Temporarily unset to allow connection attempt
                    this.connect();
                }
             } catch (error) {
                 console.error("[WS Manager] HTTP Fallback Error:", error);
             }
        }, FALLBACK_POLLING_INTERVAL_MS);
    }

    sendMessage(type, source, target, action, payload = {}) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
             const msg = {
                 type,
                 source,
                 target,
                 action,
                 payload,
                 timestamp: Date.now()
             };
             this.ws.send(JSON.stringify(msg));
             return true;
         } else {
             console.warn('[WS Manager] No se puede enviar mensaje, el socket no está conectado.');
             return false;
         }
    }
}

// Create the single instance
export const wsManager = new WebSocketManager();

// The Hook for React Components
export const useAppWebSocket = (url) => {
    // Sync local state with manager for reactivity
    const [managerState, setManagerState] = useState({
        isFallbackMode: wsManager.isFallbackMode,
        isNetworkConnected: wsManager.isNetworkConnected,
        isConnected: wsManager.ws ? wsManager.ws.readyState === WebSocket.OPEN : false
    });

    useEffect(() => {
        if (url) {
            wsManager.setUrl(url);
        }

        const unsubscribe = wsManager.subscribe(setManagerState);
        return unsubscribe;
    }, [url]);

    const sendCommand = useCallback((deviceId, action, payload = {}) => {
         return new Promise((resolve, reject) => {
             const success = wsManager.sendMessage('event', 'mobile', deviceId, action, payload);
             if (success) {
                 // In a real implementation, you'd want to wait for an ACK from the device
                 resolve();
             } else {
                 reject(new Error('WebSocket no conectado.'));
             }
         });
     }, []);

    return {
        sendMessage: wsManager.sendMessage.bind(wsManager),
        sendCommand,
        isOnline: useDeviceStore(state => state.isConnected), // Reactive from global store
        isFallbackMode: managerState.isFallbackMode,
        isNetworkConnected: managerState.isNetworkConnected
    };
};

export default useAppWebSocket;
