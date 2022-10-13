const axios = require('axios');

class ZendeskApi {
  _api;

  constructor(email, apiToken) {
    const authorization = this.createBasicAuthToken(email, apiToken);

    this._api = axios.create({ headers: { authorization } });
  }

  createBasicAuthToken(email, apiToken) {
    const plainToken = Buffer.from(`${email}:${apiToken}`)
    return `Basic ${plainToken.toString('base64')}`
  }
}

