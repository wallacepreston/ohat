import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type { ProcessedOfficeHours } from '@/types/salesforce';

export function useSocket(onOfficeHoursUpdate: (data: ProcessedOfficeHours) => void) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Initialize socket connection
    socketRef.current = io({
      path: '/socket.io',
      transports: ['websocket']
    });

    // Set up event listeners
    socketRef.current.on('connect', () => {
      console.log('Connected to Socket.IO server');
    });

    socketRef.current.on('officeHoursUpdate', (data: ProcessedOfficeHours) => {
      console.log('Received office hours update:', data);
      onOfficeHoursUpdate(data);
    });

    socketRef.current.on('disconnect', () => {
      console.log('Disconnected from Socket.IO server');
    });

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [onOfficeHoursUpdate]);

  return socketRef.current;
} 