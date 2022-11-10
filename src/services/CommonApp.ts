import FormData from 'form-data'
import fs from 'fs'
import { AxiosInstance } from 'axios'

export default class CommonApp {
  private _apiAuthentication: AxiosInstance

  constructor(apiAuthentication: AxiosInstance) {
    this._apiAuthentication = apiAuthentication;
  }

  async uploadApp(appPath: string): Promise<{ id: string }> {
    const payload = new FormData();
    const appBuffer = fs.createReadStream(appPath);

    payload.append('uploaded_data', appBuffer);

    const { data } = await this._apiAuthentication
      .post('api/v2/apps/uploads.json', payload);

    return data;
  }

  async deployApp(uploadId: string, name: string, httpMethod: 'post' | 'put'): Promise<{ job_id: string }> {
    const payload: { upload_id: string, name?: string } = { upload_id: uploadId };

    if (name) {
      payload.name = name;
    }

    const { data } = await this._apiAuthentication
    [httpMethod]('api/v2/apps.json', payload);

    return data;
  }

  //Check job status and return the app_id
  async getUploadJobStatus(job_id: string, pollAfter = 1000): Promise<any> {
    return new Promise((resolve, reject) => {
      const polling = setInterval(async () => {
        const { data } = await this._apiAuthentication
          .get(`api/v2/apps/job_statuses/${job_id}`);

        if (data.status === 'completed') {
          clearInterval(polling)
          resolve({ status: data.status, message: data.message, app_id: data.app_id })
        } else if (data.status === 'failed') {
          clearInterval(polling)
          reject(data.message)
        }
      }, pollAfter);
    })
  }

  async updateProductInstallation(parameters: Record<string, string>, manifest: Manifest, app_id: string): Promise<{ app_id: string }> {
    const installationResp = await this._apiAuthentication
      .get(`/api/support/apps/installations.json`);

    const installations = installationResp.data;
    const installation_id = installations.installations.filter((i: Installation) => i.app_id === app_id)[0].id

    const { data } = await this._apiAuthentication.put(`/api/support/apps/installations/${installation_id}.json`, {
      settings: { name: manifest.name, ...parameters }
    });

    return data;
  }
}
