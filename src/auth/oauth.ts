import express, { Request, Response, NextFunction, RequestHandler } from 'express';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

// Types
interface AuthorizationRequest {
  id: string;
  client_id: string;
  redirect_uri: string;
  state?: string;
  code_challenge: string;
  code_challenge_method: string;
  authorization_code: string;
  user_id?: string;
  scope?: string;
  is_used: boolean;
  expires_at: Date;
  created_at: Date;
}

interface AccessToken {
  id: string;
  token: string;
  user_id: string;
  client_id: string;
  scope: string;
  expires_at: Date;
  created_at: Date;
}

interface RefreshToken {
  id: string;
  token: string;
  access_token_id: string;
  user_id: string;
  client_id: string;
  is_revoked: boolean;
  expires_at: Date;
  created_at: Date;
}

interface OAuthClient {
  id: string;
  client_id: string;
  client_name: string;
  client_secret?: string;
  redirect_uris: string[];
  is_public: boolean;
  created_by?: string;
  created_at: Date;
  updated_at: Date;
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Helper functions for database operations
async function createAuthorizationRequest(
  clientId: string,
  redirectUri: string,
  codeChallenge: string,
  state?: string
): Promise<AuthorizationRequest> {
  const code = uuidv4();
  const result = await pool.query<AuthorizationRequest>(
    `INSERT INTO authorization_requests 
     (client_id, redirect_uri, state, code_challenge, authorization_code, expires_at)
     VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '10 minutes')
     RETURNING *`,
    [clientId, redirectUri, state, codeChallenge, code]
  );
  return result.rows[0];
}

async function validateAuthorizationCode(
  code: string,
  codeVerifier: string
): Promise<AuthorizationRequest | null> {
  const result = await pool.query<AuthorizationRequest>(
    `SELECT * FROM authorization_requests 
     WHERE authorization_code = $1 
     AND is_used = false 
     AND expires_at > NOW()`,
    [code]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const authRequest = result.rows[0];
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  if (codeChallenge !== authRequest.code_challenge) {
    return null;
  }

  // Mark the code as used
  await pool.query(
    `UPDATE authorization_requests 
     SET is_used = true 
     WHERE id = $1`,
    [authRequest.id]
  );

  return authRequest;
}

async function createAccessToken(
  userId: string,
  clientId: string,
  scope: string
): Promise<AccessToken> {
  const token = uuidv4();
  const result = await pool.query<AccessToken>(
    `INSERT INTO access_tokens 
     (token, user_id, client_id, scope, expires_at)
     VALUES ($1, $2, $3, $4, NOW() + INTERVAL '1 hour')
     RETURNING *`,
    [token, userId, clientId, scope]
  );
  return result.rows[0];
}

async function createRefreshToken(
  accessTokenId: string,
  userId: string,
  clientId: string
): Promise<RefreshToken> {
  const token = uuidv4();
  const result = await pool.query<RefreshToken>(
    `INSERT INTO refresh_tokens 
     (token, access_token_id, user_id, client_id, expires_at)
     VALUES ($1, $2, $3, $4, NOW() + INTERVAL '30 days')
     RETURNING *`,
    [token, accessTokenId, userId, clientId]
  );
  return result.rows[0];
}

async function validateAccessToken(token: string): Promise<AccessToken | null> {
  const result = await pool.query<AccessToken>(
    `SELECT * FROM access_tokens 
     WHERE token = $1 
     AND expires_at > NOW()`,
    [token]
  );
  return result.rows[0] || null;
}

// SSE connection endpoint implementation
const sseHandler: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const token = authHeader.substring(7);
    const accessToken = await validateAccessToken(token);

    if (!accessToken) {
      res.status(401).json({
        error: 'invalid_token',
        error_description: 'Token is invalid or expired'
      });
      return;
    }

    // Configure SSE connection headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Eliminate request timeout for persistent connection
    req.setTimeout(0);

    // Record the SSE session
    await pool.query(
      `INSERT INTO sse_sessions 
       (user_id, access_token_id, client_id, session_data)
       VALUES ($1, $2, $3, $4)`,
      [accessToken.user_id, accessToken.id, accessToken.client_id, { ip: req.ip }]
    );

    // Send connection confirmation event
    res.write(`data: ${JSON.stringify({ type: 'connection_established' })}\n\n`);

    // Handle connection termination
    req.on('close', async () => {
      await pool.query(
        `DELETE FROM sse_sessions 
         WHERE user_id = $1 AND access_token_id = $2`,
        [accessToken.user_id, accessToken.id]
      );
    });
  } catch (error) {
    next(error);
  }
};

// OAuth authorization endpoint implementation
const authorizeHandler: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { client_id, redirect_uri, code_challenge, code_challenge_method, state } = req.query;
    if (!client_id || !redirect_uri) {
      res.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    // Validate client and redirect URI
    const clientResult = await pool.query<OAuthClient>(
      `SELECT * FROM oauth_clients 
       WHERE client_id = $1 AND $2 = ANY(redirect_uris)`,
      [client_id, redirect_uri]
    );

    if (clientResult.rows.length === 0) {
      res.status(400).json({ error: 'invalid_client' });
      return;
    }

    // Create authorization request
    const authRequest = await createAuthorizationRequest(
      client_id as string,
      redirect_uri as string,
      code_challenge as string,
      state as string | undefined
    );

    // In production, you would render a login UI here
    // For this example, we'll auto-approve and redirect

    const redirectUrl = new URL(redirect_uri as string);
    redirectUrl.searchParams.append('code', authRequest.authorization_code);
    if (state) {
      redirectUrl.searchParams.append('state', state as string);
    }

    res.redirect(redirectUrl.toString());
  } catch (error) {
    next(error);
  }
};

// OAuth token endpoint implementation
const tokenHandler: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { grant_type, code, client_id, redirect_uri, code_verifier } = req.body;
    if (!grant_type || !code || !client_id || !redirect_uri) {
      res.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    // Validate authorization code
    const authRequest = await validateAuthorizationCode(code, code_verifier);
    if (!authRequest) {
      res.status(400).json({ error: 'invalid_grant' });
      return;
    }

    // Create access token
    const accessToken = await createAccessToken(
      authRequest.user_id || client_id,
      client_id,
      authRequest.scope || 'mcp'
    );

    // Create refresh token
    const refreshToken = await createRefreshToken(
      accessToken.id,
      authRequest.user_id || client_id,
      client_id
    );

    // Return OAuth token response
    res.json({
      access_token: accessToken.token,
      token_type: 'bearer',
      expires_in: 3600,
      refresh_token: refreshToken.token
    });
  } catch (error) {
    next(error);
  }
};

// OAuth discovery metadata endpoint
const discoveryHandler: RequestHandler = (req: Request, res: Response) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;

  res.json({
    issuer: baseUrl,
    authorization_endpoint: `${baseUrl}/authorize`,
    token_endpoint: `${baseUrl}/token`,
    registration_endpoint: `${baseUrl}/register`,
    scopes_supported: ['mcp'],
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    token_endpoint_auth_methods_supported: ['none'],
    code_challenge_methods_supported: ['S256']
  });
};

// Register routes
app.get('/sse', sseHandler);
app.get('/authorize', authorizeHandler);
app.post('/token', tokenHandler);
app.get('/.well-known/oauth-authorization-server', discoveryHandler);

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'server_error',
    error_description: 'An unexpected error occurred'
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`MCP OAuth Server running on port ${PORT}`);
}); 