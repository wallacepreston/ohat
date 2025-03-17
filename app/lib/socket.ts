import { Server as SocketIOServer } from 'socket.io';
import type { ProcessedOfficeHours } from '@/types/salesforce';

// Use a global variable to ensure the Socket.IO instance is shared
declare global {
  var io: SocketIOServer | undefined;
}

export function initializeSocket(server: any) {
  if (!global.io) {
    global.io = new SocketIOServer(server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      },
      path: '/socket.io'
    });

    global.io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);
      
      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });

    console.log('Socket.IO initialized successfully');
  }
  return global.io;
}

export function emitOfficeHoursUpdate(data: ProcessedOfficeHours) {
  if (!global.io) {
    console.error('Socket.IO not initialized. Cannot emit office hours update.');
    return;
  }

  try {
    global.io.emit('officeHoursUpdate', data);
    console.log('Successfully emitted office hours update');
  } catch (error) {
    console.error('Failed to emit Socket.IO event:', error);
  }
}

export function getIO() {
  if (!global.io) {
    throw new Error('Socket.IO not initialized. Call initializeSocket() first.');
  }
  return global.io;
}
