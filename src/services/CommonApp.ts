import FormData from "form-data";
import fs from "fs";
import AdmZip from "adm-zip";
import { AxiosInstance } from "axios";

export default class CommonApp {
  private _apiAuthentication: AxiosInstance;

  constructor(apiAuthentication: AxiosInstance) {
    this._apiAuthentication = apiAuthentication;
  }

  async uploadApp(appPath: string) {
    const compress = new AdmZip();
    const outputFile = `${appPath}/app.zip`;

    try {
      compress.addLocalFolder(appPath);
      compress.writeZip(outputFile);
    } catch (error) {
      throw new Error(`Some error: ${error}`);
    }

    const form = new FormData();

    form.append("uploaded_data", fs.createReadStream(outputFile));

    const { data } = await this._apiAuthentication.post("api/v2/apps/uploads.json", form, { 
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

    const { data } = await this._apiAuthentication.post("api/v2/apps.json", payload);

    return data;
  }

  async deployExistingApp(uploadId: string, appName: string, appId: string) {

    try {
      const { data } = await this._apiAuthentication.put(
        `api/v2/apps/${String(appId)}`,
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

        const { data } = await this._apiAuthentication.get(`api/v2/apps/job_statuses/${job_id}`);

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
    const { data } = await this._apiAuthentication.put(`api/v2/apps/${app_id}`, { name, uploaded_id });

    return data;
  }

  async createInstallation(
    parameters: Record<string, string>,
    manifest: Manifest,
    app_id: string,
  ): Promise<Installation> {
    const { data } = await this._apiAuthentication.post<Installation>("api/v2/apps/installations", {
      app_id,
      settings: {
        name: manifest.name,
        ...parameters
      }
    });

    return data;
  }

  async getInstallations(): Promise<{installations: Installation[]}> {
    const { data } = await this._apiAuthentication.get<{installations: Installation[]}>('api/v2/apps/installations.json');

    return data;
  }

  async updateInstallation(
    parameters: Record<string, string>,
    manifest: Manifest,
    app_id: string,
    installation_id: number
  ): Promise<Installation> {
    const { data } = await this._apiAuthentication.put<Installation>(`api/v2/apps/installations/${installation_id}`, {
      app_id,
      settings: {
        name: manifest.name,
        ...parameters
      }
    });

    return data;
  }
}
