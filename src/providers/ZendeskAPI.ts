import FormData from "form-data";
import fs from "fs";
import axios, { AxiosInstance } from "axios";


export default class ZendeskAPI {
  private api: AxiosInstance;

  constructor({ apiToken, email, subdomain }: AuthenticateZendesk) {
    this.api = axios.create({
      baseURL: `https://${subdomain}.zendesk.com/api/v2`,
      auth: {
        username: `${email}/token`,
        password: apiToken
      }
    });
  }

  async uploadApp(appFilePath: string) {
    const form = new FormData();

    form.append("uploaded_data", fs.createReadStream(appFilePath));

    const { data } = await this.api.post("/apps/uploads.json", form, { 
      headers: {
        ...form.getHeaders()
      }
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

    const { data } = await this.api.post("/apps.json", payload);

    return data;
  }

  async deployExistingApp(uploadId: string, appName: string, appId: string) {

    try {
      const { data } = await this.api.put(
        `/apps/${String(appId)}`,
        { upload_id: Number(uploadId), name: appName },
        { headers: { Accept: "*/*" } }
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

        if (data.status === "completed") {
          clearInterval(polling);

          resolve({
            status: data.status,
            message: data.message,
            app_id: data.app_id,
          });
        } else if (data.status === "failed") {
          clearInterval(polling);
          reject(data.message);
        }
      }, pollAfter);
    });
  }

  async updateApp(app_id: number, name: string, uploaded_id: number) {
    const { data } = await this.api.put(`/apps/${app_id}`, { name, uploaded_id });

    return data;
  }

  async createInstallation(
    parameters: Record<string, string>,
    manifest: Manifest,
    app_id: string,
  ): Promise<Installation> {
    const { data } = await this.api.post<Installation>("/apps/installations", {
      app_id,
      settings: {
        name: manifest.name,
        ...parameters
      }
    });

    return data;
  }

  async getInstallations(): Promise<{installations: Installation[]}> {
    const { data } = await this.api.get<{installations: Installation[]}>('/apps/installations.json');

    return data;
  }

  async updateInstallation(
    parameters: Record<string, string>,
    manifest: Manifest,
    app_id: string,
    installation_id: number
  ): Promise<Installation> {
    const { data } = await this.api.put<Installation>(`/apps/installations/${installation_id}`, {
      app_id,
      settings: {
        name: manifest.name,
        ...parameters
      }
    });

    return data;
  }
}