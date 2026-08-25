import { Server as SocketIOServer } from 'socket.io';

let ioInstance: SocketIOServer | null = null;

export function setSocketIO(io: SocketIOServer) {
  ioInstance = io;
  console.log('[Socket.IO] Global Socket.IO instance attached successfully');
}

export function getSocketIO(): SocketIOServer | null {
  return ioInstance;
}

export function emitRealtimeEvent(event: string, data?: any) {
  if (ioInstance) {
    try {
      ioInstance.emit(event, data);
    } catch (err) {
      console.error(`[Socket.IO] Failed to emit event '${event}':`, err);
    }
  } else {
    console.warn(`[Socket.IO Warning] Attempted to emit '${event}' before socket instance was initialized.`);
  }
}
