import useDeviceStore from '../store/useDeviceStore';

class WebSocketManager {
    constructor() {
        this.socket = null;
        this.url = '';
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
    }

    connect(ip) {
        if (this.socket) {
            this.socket.close();
        }

        this.url = `ws://${ip}/ws`;
        console.log(`Establishing link with ${this.url}...`);
        
        try {
            this.socket = new WebSocket(this.url);

            this.socket.onopen = () => {
                console.log('IO_LINK_ESTABLISHED');
                useDeviceStore.getState().setIsOnline(true);
                this.reconnectAttempts = 0;
            };

            this.socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleMessage(data);
                } catch (e) {
                    console.warn('Malformed packet received:', event.data);
                }
            };

            this.socket.onclose = () => {
                console.warn('IO_LINK_TERMINATED');
                useDeviceStore.getState().setIsOnline(false);
                this.attemptReconnect();
            };

            this.socket.onerror = (error) => {
                console.error('IO_LINK_ERROR:', error);
                this.socket.close();
            };
        } catch (error) {
            console.error('Failed to initiate connection:', error);
        }
    }

    handleMessage(message) {
        const { t, v } = message;
        
        switch (t) {
            case 'data':
                useDeviceStore.getState().setDeviceData({
                    voltage: v.bat / 20, // Example mapping if bat is percentage or raw
                    rssi: v.signal,
                    battery: v.bat
                });
                break;
            case 'info':
                console.log('NODE_INFO:', v);
                break;
            case 'event':
                if (message.action === 'audio_features') {
                    useDeviceStore.getState().setAudioFeatures(message.payload);
                } else if (message.action === 'telemetry_data') {
                    useDeviceStore.getState().setDeviceData({
                        voltage: message.payload.bat / 20,
                        rssi: message.payload.signal,
                        battery: message.payload.bat
                    });
                }
                break;
            default:
                console.log('UNHANDLED_PACKET:', t, v);
        }
    }

    sendCommand(type, value) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            const packet = JSON.stringify({ t: type, v: value });
            this.socket.send(packet);
            console.log('PACKET_DISPATCHED:', packet);
        } else {
            console.warn('CANNOT_DISPATCH: Link offline');
        }
    }

    attemptReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Attempting link restoration (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
            setTimeout(() => this.connect(this.url.replace('ws://', '').replace('/ws', '')), 3000);
        }
    }

    disconnect() {
        if (this.socket) {
            this.socket.close();
        }
    }
}

const wsManager = new WebSocketManager();
export default wsManager;
