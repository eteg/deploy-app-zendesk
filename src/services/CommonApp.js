import * as FormData from 'form-data'

export default class CommonApp {
  _apiAuthentication

  constructor(apiAuthentication) {
    this._apiAuthentication = apiAuthentication;
  }

  async uploadApp(appPath) {
    const payload = new FormData();
    const appBuffer = fs.createReadStream(appPath);

    payload.append('uploaded_data', appBuffer);

    const { data } = await this._apiAuthentication
      .post('api/v2/apps/uploads.json', payload);

    return data;
  }

  async deployApp(uploadId, name, httpMethod) {
    const payload = { upload_id: uploadId };

    if (name) {
      payload.name = name;
    }

    const { data } = await this._apiAuthentication
      [httpMethod]('api/v2/apps.json', payload);

    return data;
  }

  //Check job status and return the app_id
  async getUploadJobStatus (job_id, appPath, pollAfter = 1000) {
    return new Promise((resolve, reject) => {
      const polling = setInterval(async () => {
        const { data } = await this._apiAuthentication
          .get(`api/v2/apps/job_statuses/${job_id}`);
  
        if (data.status === 'completed') {
          clearInterval(polling)
          resolve({ status: data.status, message: data.message, app_id })
        } else if (data.status === 'failed') {
          clearInterval(polling)
          reject(message)
        }
      }, pollAfter);
    })
  }

  async updateProductInstallation(parameters, manifest, app_id) {
    const installationResp = await this._apiAuthentication
      .get(`/api/support/apps/installations.json`);

    const installations = installationResp.data;
    const installation_id = installations.installations.filter(i => i.app_id === app_id)[0].id
  
    const updated = await this._apiAuthentication.put(`/api/support/apps/installations/${installation_id}.json`, {
      settings: { name: manifest.name, ...parameters }
    });
  
    return updated.status === 201 || updated.status === 200;
  }
}
