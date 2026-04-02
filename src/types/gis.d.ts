// Type declarations for Google Identity Services (GIS) OAuth2
declare namespace google.accounts.oauth2 {
  interface TokenResponse {
    access_token: string;
    error?: string;
    error_description?: string;
    expires_in: number;
    scope: string;
    token_type: string;
  }

  interface TokenClientConfig {
    client_id: string;
    scope: string;
    callback: (response: TokenResponse) => void;
    error_callback?: (error: { type: string; message: string }) => void;
  }

  interface TokenClient {
    requestAccessToken(opts?: { prompt?: string }): void;
  }

  function initTokenClient(config: TokenClientConfig): TokenClient;
  function revoke(token: string, callback: () => void): void;
}
