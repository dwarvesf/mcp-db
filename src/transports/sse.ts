import express, { Request, Response } from 'express';
import cors from 'cors';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

export interface SSETransportOptions {
  port?: number;
  host?: string;
}

export class SSETransport {
  private app = express();
  private transports: { [sessionId: string]: SSEServerTransport } = {};
  private options: SSETransportOptions;
  private server?: Server;

  constructor(options: SSETransportOptions = {}) {
    this.options = {
      port: options.port || 3001,
      host: options.host || 'localhost'
    };

    // Enable CORS with proper options
    this.app.use(cors({
      origin: true,
      credentials: true,
      methods: ['GET', 'POST'],
      allowedHeaders: ['Content-Type']
    }));

    // SSE endpoint
    this.app.get('/sse', (req: Request, res: Response) => {
      const transport = new SSEServerTransport('/messages', res);
      this.transports[transport.sessionId] = transport;
      
      res.on('close', () => {
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
    const host = this.options.host || 'localhost';
    
    return new Promise((resolve) => {
      this.app.listen(port, host, () => {
        console.error(`SSE server listening on http://${host}:${port}`);
        resolve();
      });
    });
  }
} 