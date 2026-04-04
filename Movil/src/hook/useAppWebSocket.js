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
        if (!this.standaloneLogged) {
            console.log('[WS Manager] SISTEMA EN MODO STANDALONE: Red desactivada.');
            this.standaloneLogged = true;
        }
        return;
    }

    startHttpFallbackPolling() {
        return;
    }

    sendMessage() {
        return false;
    }
}

export const wsManager = new WebSocketManager();

export const useAppWebSocket = () => {
    return {
        sendMessage: () => false,
        sendCommand: () => Promise.resolve(),
        isOnline: false,
        isFallbackMode: true,
        isNetworkConnected: true
    };
};

export default useAppWebSocket;
