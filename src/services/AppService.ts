import ZendeskAPI from "../providers/ZendeskAPI";
import { fileToJSON } from "../utils/json";
import { isEqual } from "../utils/string";
import { echo } from "shelljs";
import AdmZip from "adm-zip";


export default class AppService {
    constructor(private zendeskApi: ZendeskAPI) {}

    async createApp(appLocation: AppLocation, parameters: Record<string, string>) {
        const appConfig = this.getManifest(appLocation);

        const { type, path } = appLocation;
        const appPath = type === 'dir' ? this.packageApp(path).outputFile : path;

        const { id } = await this.zendeskApi.uploadApp(appPath);
        const { job_id } = await this.zendeskApi.deployApp(id, appConfig.name);
        const { app_id } = await this.zendeskApi.getUploadJobStatus(job_id);

        const params = this.filterParameters(appConfig, parameters)

        const installation = await this.zendeskApi.createInstallation(
            this.cleanParameters(params),
            appConfig,
            app_id,
        );
        
        return { id: String(installation.app_id) }
    }

    async updateApp(appId: string, appLocation: AppLocation, parameters: Record<string, string>) {
        const appConfig = this.getManifest(appLocation);

        const { type, path } = appLocation;
        const appPath = type === 'dir' ? this.packageApp(path).outputFile : path;

        echo(`appPath: ${appPath}`);

        const { id: uploadId } = await this.zendeskApi.uploadApp(appPath);
        const { job_id } = await this.zendeskApi.deployExistingApp(uploadId, appConfig.name, appId);
        const { app_id } = await this.zendeskApi.getUploadJobStatus(job_id);
        const { installations } = await this.zendeskApi.getInstallations();

        const installation = installations.find(item => item.app_id === Number(app_id))

        if (!installation) throw new Error('Installation not found')

        const params = this.filterParameters(appConfig, parameters)

        const updatedInstallation = await this.zendeskApi.updateInstallation(
            this.cleanParameters(params), appConfig, appId, installation.id
            );

        return { id: String(updatedInstallation.app_id) };
    }

    packageApp(appDirPath: string) {
        const zip = new AdmZip()
        const outputFile = `${appDirPath}/app.zip`;

        zip.addLocalFolder(appDirPath);
        zip.writeZip(outputFile);

        return { outputFile };
    }

    getManifest(appLocation: AppLocation) {
        echo(`Getting manifest`);
        const { path, type } = appLocation;

        if (type === 'zip') {
            const zip = new AdmZip(path);
            zip.extractEntryTo('manifest.json', 'package', false, true)
        }

        const appPath = type === 'zip' ? 'package' : path

        const manifestPath = `${appPath}/manifest.json`;

        echo(`Manifest path: ${manifestPath}`);

        const manifest: Manifest = fileToJSON(manifestPath);

        if (!Object.keys(manifest).length) throw new Error(`Missing manifest file on ${manifestPath}`);

        return manifest;
    }

    private filterParameters(manifest: Manifest, params: Record<string, string>) {
        const paramsWithoutValue = Object.entries(params).filter(([_, value]) => typeof value === "undefined");

        if (paramsWithoutValue.length) {
            throw new Error(`Following secrets missing their values: ${paramsWithoutValue.map(([key]) => key).join(", ")}`);
        }

        const manifestParams = manifest?.parameters ?? [];
        const requiredParamsNotFound = manifestParams.filter(
            (m) => m?.required && !Object.keys(params).find((key) => isEqual(m.name, key))
        );

        if (requiredParamsNotFound.length) {
            throw new Error(`Missing following required parameters: ${requiredParamsNotFound.map((p) => p.name).join(", ")}`);
        }

        const paramaters = {};

        manifestParams.forEach(({ name }) => {
            const param = Object.entries(params).find(([key]) => isEqual(name, key));

            if (param) Object.assign(paramaters, { [name]: param[1] });
        });

        return paramaters;
    }

    private cleanParameters(parameters: Record<string, string>) {
        const entries = Object.entries(parameters);

        return Object.fromEntries(
            entries.map(([key, value]) => ([key.replace('PARAMS_', '').toLowerCase(), value]))
            )
    }
}
