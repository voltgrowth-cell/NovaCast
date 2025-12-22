
export enum ConnectionStatus {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR'
}

export enum ConnectionMode {
  USB = 'USB',
  WIRELESS = 'WIRELESS'
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
