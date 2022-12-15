import CommonApp from "./services/CommonApp";
import ZendeskAuthentication from "./services/ZendeskAuthentication";
import { cleanParameters } from "./utils/index";

export async function createApp(
  authenticate: AuthenticateZendesk,
  parameters: Record<string, string>,
  appConfig: Manifest,
  distPath: string
): Promise<AppId> {
  const { api } = new ZendeskAuthentication(authenticate);

  const commonApp = new CommonApp(api);

  const { id: newAppUploadId } = await commonApp.uploadApp(distPath);
  const appName = appConfig.name;
  const { job_id } = await commonApp.deployApp(newAppUploadId, appName);
  const { app_id: appIdFromJobStatus } = await commonApp.getUploadJobStatus(
    job_id
  );
  console.log(appIdFromJobStatus, "appIdFromJobStatus");
  //TODO: Erro nessa função de baixo
  const { app_id } = await commonApp.updateProductInstallation(
    cleanParameters(parameters),
    appConfig,
    appIdFromJobStatus,
    "post"
  );
  return app_id;
}
