
export enum ConnectionStatus {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  WAITING = 'WAITING',
  ERROR = 'ERROR'
}

export enum ConnectionMode {
  USB = 'USB',
  WIRELESS = 'WIRELESS'
}

export enum AppRole {
  HOST = 'HOST',   // The Mac (Sender)
  CLIENT = 'CLIENT' // The Tablet (Receiver)
}

export interface StreamMetrics {
  latency: number;
  bandwidth: number;
  fps: number;
  resolution: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}
