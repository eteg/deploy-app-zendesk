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

  const { job_id } = await commonApp.deployApp(newAppUploadId, appConfig.name);

  const { app_id: appIdFromJobStatus } = await commonApp.getUploadJobStatus(
    job_id
  );
  
  const { app_id } = await commonApp.createInstallation(
    cleanParameters(parameters),
    appConfig,
    appIdFromJobStatus,
  );

  return String(app_id);
}