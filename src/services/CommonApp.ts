import FormData from "form-data";
import fs from "fs";
import AdmZip from "adm-zip";
import axios, { AxiosInstance, AxiosError } from "axios";

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

  async deployApp(uploadId: string, name: string): Promise<{ job_id: string }> {
    const payload: { upload_id: string; name?: string } = {
      upload_id: uploadId,
    };
    if (name) {
      payload.name = name;
    }
    console.log("payload", payload);

    const { data } = await this._apiAuthentication["post"](
      "api/v2/apps.json",
      payload
    );
    console.log("data", data);

    return data;
  }

  async deployExistingApp(
    uploadId: string,
    appName: string,
    appId: string
  ): Promise<{ job_id: string }> {
    try {
      console.log({ appId });
      console.log({ upload_id: Number(uploadId), name: appName });

      const url = `api/v2/apps/${String(appId)}`;
      console.log({ url });

      // const { data, headers } = await this._apiAuthentication.put(url, {
      //   upload_id: Number(uploadId),
      //   name: appName,
      // });

      var data = JSON.stringify({
        upload_id: 2103035,
        name: "app-mt-deploy",
      });

      var config = {
        method: "put",
        url: "https://d3vetegteste1612456441.zendesk.com/api/v2/apps/882851",
        headers: {
          Authorization:
            "Basic ZGV2LXplbmRlc2tAZXRlZy5jb20uYnIvdG9rZW46MzRZcUpjWjFMUWx0aG5kVHY3TE1WOHdGeEc2TnM4dEFKVndKWTNqQw==",
          "Content-Type": "application/json",
          Cookie:
            "__cfruid=2b168a8cd41ea29913e6bedc0b67a59600de5e0c-1669916047; _app_market_session=S3k4eE5jUzBNbzY0V3FCcE1vTlVyK3B4ZzBpRE9QclF6ZVFYOXZLVzFhQ0krdG9XWTkwKytDVU1EbWdTRU0wOXdhR1Vra0JGSXJHWG9tQXA0eEFLeDljdXlKNnJSb1RwWGJFOVpRRzRMSVJ3OTJUd0hCeVpFVHhSbDhhamxFU2ZxRUo4VlBiYzI1K1l2ekhhdjhxODlRPT0tLXV0RmpmaVR0bFpzcXRXOWw2V2hQQnc9PQ%3D%3D--b0e0fb16a84680d597f9b7a08d0a3bdbef8d0db0; _zdsession_app-market=04e59cc302278260caa1bad525753b87",
        },
        data: data,
      };

      const { data: responseData, headers } = await axios(config);

      console.log({ headers });
      console.log("data", responseData);

      return responseData;
    } catch (error) {
      if (error instanceof AxiosError) {
        console.log(
          "request headers",
          JSON.stringify(error.request?.headers, undefined, 2)
        );
        console.log(
          "request body",
          JSON.stringify(error?.request?.body, undefined, 2)
        );
        console.log(
          "request data",
          JSON.stringify(error?.request?.data, undefined, 2)
        );
        console.log(
          "response headers",
          JSON.stringify(error.response?.headers, undefined, 2)
        );
      }
      throw error;
    }
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
