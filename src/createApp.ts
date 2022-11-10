import CommonApp from "./services/CommonApp"
import ZendeskAuthentication from "./services/ZendeskAuthentication"
import { cleanParameters } from "./utils";

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

  const { job_id } = await commonApp.deployApp(newAppUploadId, appName, 'post');

  const { app_id: appIdFromJobStatus } = await commonApp.getUploadJobStatus(job_id);

  const { app_id } = await commonApp.updateProductInstallation(cleanParameters(parameters), appConfig, appIdFromJobStatus);

  return app_id;
}
