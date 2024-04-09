import ZendeskAPI from '../providers/ZendeskAPI';
import { fileToJSON, isDefinedAndIsNotArray } from '../utils/json';
import { isEqual } from '../utils/string';
import AdmZip from 'adm-zip';

export default class AppService {
  constructor(
    private zendeskApi: ZendeskAPI,
    private inputs: AppInputs,
  ) {}

  private appIdUploaded: string | null = null;

  async createApp(
    appLocation: AppLocation,
    parameters: InstallationParameters,
    roleRestrictions?: RoleRestrictions,
  ) {
    const appConfig = this.getManifest(appLocation);

    const { type, path } = appLocation;
    const appPath = type === 'dir' ? this.packageApp(path).outputFile : path;

    const { id } = await this.zendeskApi.uploadApp(appPath);
    const { job_id: jobId } = await this.zendeskApi.deployApp(
      id,
      appConfig.name,
    );
    const { app_id: appId } = await this.zendeskApi.getUploadJobStatus(jobId);

    const params = this.filterParameters(appConfig, parameters);

    const installation = await this.zendeskApi.createInstallation({
      appId,
      settings: {
        name: appConfig.name,
        role_restrictions: roleRestrictions,
        ...this.cleanParameters(params),
      },
    });

    this.appIdUploaded = String(installation.app_id);

    return { id: String(installation.app_id) };
  }

  async updateApp(
    appId: number,
    appLocation: AppLocation,
    parameters: InstallationParameters,
    roleRestrictions?: RoleRestrictions,
  ) {
    const appConfig = this.getManifest(appLocation);

    const { type, path } = appLocation;
    const appPath = type === 'dir' ? this.packageApp(path).outputFile : path;

    const { id: uploadId } = await this.zendeskApi.uploadApp(appPath);
    const { job_id: jobId } = await this.zendeskApi.deployExistingApp(
      uploadId,
      appConfig.name,
      appId,
    );
    const { app_id: uploadedAppId } =
      await this.zendeskApi.getUploadJobStatus(jobId);
    const { installations } = await this.zendeskApi.getInstallations();

    const installation = installations.find(
      (item) => item.app_id === Number(uploadedAppId),
    );

    if (!installation) throw new Error('Installation not found');

    const params = this.filterParameters(appConfig, parameters);

    const updatedInstallation = await this.zendeskApi.updateInstallation({
      installationId: installation.id,
      appId,
      settings: {
        name: appConfig.name,
        role_restrictions: roleRestrictions,
        ...this.cleanParameters(params),
      },
    });

    this.appIdUploaded = String(updatedInstallation.app_id);

    return { id: String(updatedInstallation.app_id) };
  }

  packageApp(appDirPath: string) {
    const zip = new AdmZip();
    const outputFile = `${appDirPath}/app.zip`;

    zip.addLocalFolder(appDirPath);
    zip.writeZip(outputFile);

    return { outputFile };
  }

  getManifest(appLocation: AppLocation) {
    const { path, type } = appLocation;

    if (type === 'zip') {
      try {
        const zip = new AdmZip(path);
        zip.extractEntryTo('manifest.json', 'package', false, true);
      } catch (error) {
        throw new Error(`Cannot extract manifest.json from .zip file`);
      }
    }

    const appPath = type === 'zip' ? 'package' : path;

    const manifestPath = `${appPath}/manifest.json`;

    const manifest: Manifest = fileToJSON(manifestPath);

    if (!Object.keys(manifest).length)
      throw new Error(`Missing manifest file on ${manifestPath}`);

    return manifest;
  }

  private filterParameters(manifest: Manifest, params: InstallationParameters) {
    const paramsWithoutValue = Object.entries(params).filter(
      ([_, value]) => typeof value === 'undefined',
    );

    if (paramsWithoutValue.length) {
      throw new Error(
        `Following secrets missing their values: ${paramsWithoutValue
          .map(([key]) => key)
          .join(', ')}`,
      );
    }

    const manifestParams = manifest?.parameters ?? [];
    const requiredParamsNotFound = manifestParams.filter(
      (m) =>
        m?.required && !Object.keys(params).find((key) => isEqual(m.name, key)),
    );

    if (requiredParamsNotFound.length) {
      throw new Error(
        `Missing following required parameters: ${requiredParamsNotFound
          .map((p) => p.name)
          .join(', ')}`,
      );
    }

    const parameters = {};

    manifestParams.forEach(({ name }) => {
      const param = Object.entries(params).find(([key]) => isEqual(name, key));

      if (param) Object.assign(parameters, { [name]: param[1] });
    });

    return parameters;
  }

  private cleanParameters(parameters: InstallationParameters) {
    const entries = Object.entries(parameters);

    return Object.fromEntries(
      entries.map(([key, value]) => [
        key.replace('PARAMS_', '').toLowerCase(),
        value,
      ]),
    );
  }

  public defineToCreateOrUpdateApp(zendeskAppConfig: ZendeskAppsConfig) {
    const { appId, env, allowMultipleApps } = this.inputs;
    const { ids } = zendeskAppConfig;

    if (appId || (isDefinedAndIsNotArray(ids[env]) && !allowMultipleApps))
      return 'UPDATE';

    if (allowMultipleApps || !ids[env]) return 'CREATE';
  }

  public incrementAppIdToConfig(zendeskAppConfig: ZendeskAppsConfig) {
    const { appId, env, allowMultipleApps } = this.inputs;

    if (!this.appIdUploaded)
      throw new Error("Application wasn't uploaded yet.");

    if (!allowMultipleApps && !zendeskAppConfig.ids[env])
      zendeskAppConfig.ids = {
        ...zendeskAppConfig.ids,
        [env]: this.appIdUploaded,
      };
    else if (
      !appId &&
      allowMultipleApps &&
      isDefinedAndIsNotArray(zendeskAppConfig.ids[env])
    )
      Object.assign(zendeskAppConfig.ids, {
        [env]: [zendeskAppConfig.ids[env], this.appIdUploaded],
      });
    else if (allowMultipleApps && !zendeskAppConfig.ids[env])
      Object.assign(zendeskAppConfig.ids, {
        [env]: [this.appIdUploaded],
      });
    else if (
      Array.isArray(zendeskAppConfig.ids[env]) &&
      !(zendeskAppConfig.ids[env] as string[]).includes(this.appIdUploaded)
    )
      (zendeskAppConfig.ids[env] as string[]).push(this.appIdUploaded);
  }
}
