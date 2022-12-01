import axios, { AxiosInstance } from "axios";

export default class ZendeskAuthentication {
  api: AxiosInstance;

  constructor({ apiToken, email, subdomain }: AuthenticateZendesk) {
    const authorization = this._createBasicAuthToken(email, apiToken);
    const baseURL = `https://${subdomain}.zendesk.com`;

    this.api = axios.create({
      baseURL,
      headers: { authorization, accept: "*/*" },
    });
  }

  _createBasicAuthToken(email: string, apiToken: string): string {
    const plainToken = Buffer.from(`${email}/token:${apiToken}`);
    return `Basic ${plainToken.toString("base64")}`;
  }
}
