/**
 * Minimal hand-authored OpenAPI surface used by the typed client.
 *
 * Regenerate the full document from the running API with:
 *   pnpm codegen   # openapi-typescript http://localhost:3000/api/docs-json
 *
 * Until then this stub keeps `openapi-fetch` fully typed for the endpoints the
 * shell actually calls.
 */

export interface AssetResponse {
  id: string;
  assetTag: string;
  type: string;
  status: string;
  manufacturer: string | null;
  model: string | null;
  serialNumber: string | null;
  assignedTo: string | null;
  createdAt: string;
}

export interface PageInfo {
  total: number;
  limit: number;
  offset: number;
  hasNextPage: boolean;
}

export interface PagedAssets {
  data: AssetResponse[];
  pageInfo: PageInfo;
}

export interface AuthResponse {
  accessToken: string;
  expiresIn: number;
}

export interface MeResponse {
  sub: string;
  email: string;
  name: string;
  roles: string[];
}

export interface paths {
  '/v1/auth/entra-login': {
    post: {
      requestBody: {
        content: {
          'application/json': { idToken: string };
        };
      };
      responses: {
        200: { content: { 'application/json': AuthResponse } };
      };
    };
  };
  '/v1/auth/dev-login': {
    post: {
      requestBody: {
        content: {
          'application/json': { email: string };
        };
      };
      responses: {
        200: { content: { 'application/json': AuthResponse } };
      };
    };
  };
  '/v1/auth/me': {
    get: {
      responses: {
        200: { content: { 'application/json': MeResponse } };
      };
    };
  };
  '/v1/auth/refresh': {
    post: {
      responses: {
        200: { content: { 'application/json': AuthResponse } };
        401: { content: { 'application/json': { message: string } } };
      };
    };
  };
  '/v1/auth/logout': {
    post: {
      responses: {
        204: { content: never };
        401: { content: { 'application/json': { message: string } } };
      };
    };
  };
  '/v1/assets': {
    get: {
      parameters: {
        query?: {
          status?: string;
          type?: string;
          search?: string;
          limit?: number;
          offset?: number;
        };
      };
      responses: {
        200: { content: { 'application/json': PagedAssets } };
      };
    };
  };
}
