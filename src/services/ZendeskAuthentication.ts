import axios, { AxiosInstance } from 'axios';

export default class ZendeskAuthentication {
  api: AxiosInstance;

  constructor({ apiToken, email, subdomain }: AuthenticateZendesk) {
    const authorization = this._createBasicAuthToken(email, apiToken);

    this.api = axios.create({ baseURL: subdomain, headers: { authorization } });
  }

  _createBasicAuthToken(email: string, apiToken: string): string {
    const plainToken = Buffer.from(`${email}:${apiToken}`);
    return `Basic ${plainToken.toString('base64')}`;
  }
}
