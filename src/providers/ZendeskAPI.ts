import FormData from 'form-data';
import fs from 'fs';
import axios, { AxiosInstance } from 'axios';

export default class ZendeskAPI {
  private api: AxiosInstance;

  constructor({ apiToken, email, subdomain }: AuthenticateZendesk) {
    this.api = axios.create({
      baseURL: `https://${subdomain}.zendesk.com/api/v2`,
      auth: {
        username: `${email}/token`,
        password: apiToken,
      },
    });
  }

  async uploadApp(appFilePath: string) {
    const form = new FormData();

    form.append('uploaded_data', fs.createReadStream(appFilePath));

    const { data } = await this.api.post('/apps/uploads.json', form, {
      headers: {
        ...form.getHeaders(),
      },
    });

    return data;
  }

  async deployApp(uploadId: string, name: string): Promise<{ job_id: string }> {
    const payload: { upload_id: string; name?: string } = {
      upload_id: uploadId,
    };

    if (name) {
      payload.name = name;
    }

    const { data } = await this.api.post('/apps.json', payload);

    return data;
  }

  async deployExistingApp(uploadId: number, appName: string, appId: number) {
    try {
      const { data } = await this.api.put(
        `/apps/${appId}`,
        { upload_id: uploadId, name: appName },
        { headers: { Accept: '*/*' } },
      );

      return data;
    } catch (error: any) {
      console.log(error.response);
    }
  }

  async getUploadJobStatus(job_id: string, pollAfter = 1000): Promise<any> {
    return new Promise((resolve, reject) => {
      const polling = setInterval(async () => {
        const { data } = await this.api.get(`/apps/job_statuses/${job_id}`);

        if (data.status === 'completed') {
          clearInterval(polling);

          resolve({
            status: data.status,
            message: data.message,
            app_id: data.app_id,
          });
        } else if (data.status === 'failed') {
          clearInterval(polling);
          reject(data.message);
        }
      }, pollAfter);
    });
  }

  async updateApp(app_id: number, name: string, uploaded_id: number) {
    const { data } = await this.api.put(`/apps/${app_id}`, {
      name,
      uploaded_id,
    });

    return data;
  }

  async createInstallation({
    appId,
    settings,
  }: CreateInstallation): Promise<Installation> {
    const { data } = await this.api.post<Installation>('/apps/installations', {
      app_id: appId,
      settings,
    });

    return data;
  }

  async getInstallations(): Promise<{ installations: Installation[] }> {
    const { data } = await this.api.get<{ installations: Installation[] }>(
      '/apps/installations.json',
    );

    return data;
  }

  async updateInstallation({
    installationId,
    appId,
    settings,
  }: UpdateInstallation): Promise<Installation> {
    const { data } = await this.api.put<Installation>(
      `/apps/installations/${installationId}`,
      {
        app_id: appId,
        settings,
      },
    );

    return data;
  }
}
