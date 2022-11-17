import CommonApp from "./services/CommonApp"
import ZendeskAuthentication from "./services/ZendeskAuthentication"
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
  return "1"
  console.log("newAppUploadId", newAppUploadId);
  const appName = appConfig.name;
  console.log("appName", appName);
  const { job_id } = await commonApp.deployApp(newAppUploadId, appName, 'post');
  console.log("job_id", job_id);
  const { app_id: appIdFromJobStatus } = await commonApp.getUploadJobStatus(job_id);
  console.log("appIdFromJobStatus", appIdFromJobStatus);
  const { app_id } = await commonApp.updateProductInstallation(cleanParameters(parameters), appConfig, appIdFromJobStatus);
  console.log("app_id", app_id);
  return app_id;
}
