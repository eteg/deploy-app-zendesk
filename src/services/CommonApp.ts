import FormData from "form-data";
import fs from "fs";
import AdmZip from "adm-zip";
import { AxiosInstance } from "axios";

export default class CommonApp {
  private _apiAuthentication: AxiosInstance;

  constructor(apiAuthentication: AxiosInstance) {
    this._apiAuthentication = apiAuthentication;
  }

  async uploadApp(appPath: string): Promise<{ id: string }> {
    const compress = new AdmZip();
    const outputFile = `${appPath}/app.zip`;

    try {
      compress.addLocalFolder(appPath);
      compress.writeZip(outputFile);
      console.log(`Created ${outputFile} successfully`);
    } catch (error) {
      throw new Error(`Some error: ${error}`);
    }

    const form = new FormData();

    form.append("uploaded_data", fs.createReadStream(outputFile));

    // const formData = {
    //   name: '',
    //   file: {
    //     value: fs.createReadStream(`${outputFile}`),
    //     options: {
    //       filename: outputFile,
    //       contentType: 'application/zip'
    //     }
    //   }
    // };

    const { data } = await this._apiAuthentication.post(
      "api/v2/apps/uploads.json",
      form
    );

    console.log({ data });

    return data;
  }

  async deployApp(
    uploadId: string,
    name: string,
    httpMethod: "post" | "put"
  ): Promise<{ job_id: string }> {
    const payload: { upload_id: string; name?: string } = {
      upload_id: uploadId,
    };
    if (name) {
      payload.name = name;
    }
    console.log("payload", payload);

    const { data } = await this._apiAuthentication[httpMethod](
      "api/v2/apps.json",
      payload
    );
    console.log("data", data);

    return data;
  }

  //Check job status and return the app_id
  async getUploadJobStatus(job_id: string, pollAfter = 1000): Promise<any> {
    return new Promise((resolve, reject) => {
      const polling = setInterval(async () => {
        const { data } = await this._apiAuthentication.get(
          `api/v2/apps/job_statuses/${job_id}`
        );

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

  async updateProductInstallation(
    parameters: Record<string, string>,
    manifest: Manifest,
    app_id: string
  ): Promise<{ app_id: string }> {
    //TODO: Verificar se o app_id está certo

    console.log({ app_id, settings: parameters }, "aq1uuui");

    await this._apiAuthentication.post(`/api/support/apps/installations.json`, {
      app_id,
      settings: {
        name: manifest.name,
        ...parameters,
      },
    });

    const installationResp = await this._apiAuthentication.get(
      `/api/support/apps/installations.json`
    );
    console.log(installationResp, "installationResp TODAS AS INSTALAÇÕES");

    const { installations } = installationResp.data;
    console.log(
      "LINGUICETA",
      JSON.stringify(installations, null, 2),
      "LINGUICETA"
    );

    const installation_id = installations.find(
      (i: Installation) => String(i.app_id) === String(app_id)
    )?.id;
    console.log({ installation_id }, "achou algo?");

    const { data } = await this._apiAuthentication.put(
      `/api/support/apps/installations/${installation_id}.json`,
      {
        settings: { name: manifest.name, ...parameters },
      }
    );

    return data;
  }
}
