export type MediaRole = 'viewer' | 'publisher';

export interface MediaWsClientOptions {
    url: string;
    onBinaryFrame?: (data: ArrayBuffer) => void;
    onJsonMessage?: (msg: any) => void;
    onOpen?: () => void;
    onClose?: (code?: number, reason?: string) => void;
    onError?: (err: any) => void;
    maxRetries?: number;
}

export class MediaWsClient {
    private ws: WebSocket | null = null;
    private options: MediaWsClientOptions;
    private retries = 0;
    private reconnectTimer: any = null;

    constructor(options: MediaWsClientOptions) {
        this.options = { ...options, maxRetries: options.maxRetries ?? 5 };
    }

    connect() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) return;

        try {
            this.ws = new WebSocket(this.options.url);
            // @ts-ignore React Native supports binaryType but types may be missing
            this.ws.binaryType = 'arraybuffer';

            this.ws.onopen = () => {
                this.retries = 0;
                this.options.onOpen?.();
            };

            this.ws.onmessage = (event: any) => {
                if (typeof event.data === 'string') {
                    try {
                        const msg = JSON.parse(event.data as string);
                        this.options.onJsonMessage?.(msg);
                    } catch (_) {
                        // ignore
                    }
                } else if (event.data instanceof ArrayBuffer) {
                    this.options.onBinaryFrame?.(event.data as ArrayBuffer);
                }
            };

            this.ws.onclose = (ev: any) => {
                this.options.onClose?.(ev.code, ev.reason);
                this.scheduleReconnect();
            };

            this.ws.onerror = (err: any) => {
                this.options.onError?.(err);
            };
        } catch (err) {
            this.options.onError?.(err);
            this.scheduleReconnect();
        }
    }

    sendJson(message: any) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        }
    }

    close() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        if (this.ws) {
            try { this.ws.close(); } catch (_) { }
            this.ws = null;
        }
    }

    private scheduleReconnect() {
        if (this.retries >= (this.options.maxRetries ?? 5)) return;
        const delay = Math.min(2000 * Math.pow(2, this.retries), 30000) + Math.random() * 1000;
        this.reconnectTimer = setTimeout(() => {
            this.retries += 1;
            this.connect();
        }, delay);
    }
} 