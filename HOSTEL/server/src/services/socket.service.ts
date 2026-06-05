import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { logger } from '../middleware/logger';
import { StaffRole } from '@hostel/shared';

export class SocketService {
  private static io: Server | null = null;

  static initialize(ioServer: Server): void {
    this.io = ioServer;

    // Authentication Middleware for Sockets
    this.io.use((socket: Socket, next) => {
      try {
        const token = socket.handshake.auth?.token || socket.handshake.query?.token;
        if (!token) {
          return next(new Error('Authentication required'));
        }

        const decoded = jwt.verify(token as string, env.JWT_SECRET) as any;
        socket.data.user = decoded; // Store decoded payload (id, role, department, etc.)
        next();
      } catch (err) {
        logger.error(err as Error, 'Socket authentication failed');
        next(new Error('Authentication failed'));
      }
    });

    this.io.on('connection', (socket: Socket) => {
      const { id, role, department, type } = socket.data.user;

      logger.info(`[SOCKET CONNECTED] ID: ${socket.id}, UserID: ${id}, Role: ${role}`);

      const isStudentUser = role === 'STUDENT' || type === 'student';

      // Room Management
      if (isStudentUser) {
        // Students join their specific student ID room
        socket.join(`student:${id}`);
      } else {
        // Staff join their individual user ID room and role-specific rooms
        socket.join(`staff:${id}`);
        
        if (role === StaffRole.WARDEN || role === StaffRole.ADMIN) {
          socket.join('role:warden');
        }

        if (role === StaffRole.SECURITY) {
          socket.join('role:security');
        }
      }

      socket.on('disconnect', () => {
        logger.info(`[SOCKET DISCONNECTED] ID: ${socket.id}, UserID: ${id}`);
      });
    });
  }

  /**
   * Broadcast an event and payload to a specific room.
   */
  static sendToRoom(room: string, event: string, payload: any): void {
    if (!this.io) {
      logger.error('[SOCKET ERROR] Socket.io not initialized.');
      return;
    }
    
    this.io.to(room).emit(event, payload);
    logger.info(`[SOCKET BROADCAST] Room: ${room}, Event: ${event}`);
  }
}

export function initializeSocket(httpServer: any): void {
  const io = new Server(httpServer, {
    cors: {
      origin: env.CORS_ORIGIN,
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }
  });
  SocketService.initialize(io);
}

