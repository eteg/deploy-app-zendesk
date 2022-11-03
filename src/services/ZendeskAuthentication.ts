const axios = require('axios');

export default class ZendeskAuthentication {
  _api;

  constructor(email, apiToken, subdomain) {
    const authorization = this._createBasicAuthToken(email, apiToken);

    return this._api = axios.create({ baseURL: subdomain, headers: { authorization } });
  }

  _createBasicAuthToken(email, apiToken) {
    const plainToken = Buffer.from(`${email}:${apiToken}`)
    return `Basic ${plainToken.toString('base64')}`
  }
}
