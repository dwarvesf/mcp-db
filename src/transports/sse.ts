import express, { Request, Response } from 'express';
import cors from 'cors';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

export interface SSETransportOptions {
  port?: number;
  host?: string;
  keepAliveInterval?: number; // Interval in ms to send keep-alive pings
  timeout?: number; // Request timeout in milliseconds
}

export class SSETransport {
  private app = express();
  private transports: { [sessionId: string]: SSEServerTransport } = {};
  private options: SSETransportOptions;
  private server?: Server;
  private keepAliveIntervals: { [sessionId: string]: NodeJS.Timeout } = {};

  constructor(options: SSETransportOptions = {}) {
    this.options = {
      port: options.port || 3001,
      host: options.host || '0.0.0.0', // Changed from localhost to 0.0.0.0
      keepAliveInterval: options.keepAliveInterval || 30000, // Default: 30 seconds
      timeout: options.timeout || 300000 // Default: 5 minutes
    };

    // Enable CORS with proper options
    this.app.use(cors({
      origin: true,
      credentials: true,
      methods: ['GET', 'POST'],
      allowedHeaders: ['Content-Type']
    }));

    // Health check endpoint
    this.app.get('/healthz', (_req: Request, res: Response) => {
      res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString()
      });
    });

    // SSE endpoint
    this.app.get('/sse', (req: Request, res: Response) => {
      // Set response timeout if configured
      if (this.options.timeout) {
        req.setTimeout(this.options.timeout);
        res.setTimeout(this.options.timeout);
      }
      
      const transport = new SSEServerTransport('/messages', res);
      this.transports[transport.sessionId] = transport;
      
      // Set up keep-alive ping
      if (this.options.keepAliveInterval) {
        this.keepAliveIntervals[transport.sessionId] = setInterval(() => {
          // Send an empty comment as a keep-alive ping
          res.write(':\n\n');
        }, this.options.keepAliveInterval);
      }
      
      res.on('close', () => {
        // Clear keep-alive interval when connection is closed
        if (this.keepAliveIntervals[transport.sessionId]) {
          clearInterval(this.keepAliveIntervals[transport.sessionId]);
          delete this.keepAliveIntervals[transport.sessionId];
        }
        delete this.transports[transport.sessionId];
      });

      if (this.server) {
        this.server.connect(transport).catch(error => {
          console.error('Failed to connect transport:', error);
        });
      }
    });

    // Message endpoint
    this.app.post('/messages', async (req: Request, res: Response) => {
      // Set response timeout if configured
      if (this.options.timeout) {
        req.setTimeout(this.options.timeout);
        res.setTimeout(this.options.timeout);
      }
      
      const sessionId = req.query.sessionId as string;
      if (!sessionId) {
        res.status(400).send('Missing sessionId parameter');
        return;
      }

      const transport = this.transports[sessionId];
      if (!transport) {
        res.status(400).send('No transport found for sessionId');
        return;
      }

      try {
        await transport.handlePostMessage(req, res);
      } catch (error) {
        console.error('Error handling message:', error);
        res.status(500).send('Internal server error');
      }
    });
  }

  async start(server: Server): Promise<void> {
    this.server = server;
    const port = this.options.port || 3001;
    const host = this.options.host || '0.0.0.0'; // Changed from localhost to 0.0.0.0
    
    // Apply server timeout
    if (this.options.timeout) {
      this.app.set('timeout', this.options.timeout);
    }
    
    return new Promise((resolve) => {
      this.app.listen(port, host, () => {
        console.error(`SSE server listening on http://${host}:${port}`);
        resolve();
      });
    });
  }
}
