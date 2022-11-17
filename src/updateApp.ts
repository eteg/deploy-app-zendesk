import ZendeskAuthentication from "./services/ZendeskAuthentication";
import CommonApp from "./services/CommonApp";
import { cleanParameters } from "./utils";

export async function updateApp(
  authenticate: AuthenticateZendesk,
  parameters: Record<string, string>,
  appConfig: Manifest,
  distPath: string
): Promise<AppId> {
  const { api } = new ZendeskAuthentication(authenticate);
  const commonApp = new CommonApp(api);

  const { id: newAppUploadId } = await commonApp.uploadApp(distPath);

  const appName = appConfig.name;

  const { job_id: instalationId } = await commonApp.deployApp(newAppUploadId, appName, "put");

  const { app_id: appIdJobStatus } = await commonApp.getUploadJobStatus(instalationId);

  const { app_id } = await commonApp.updateProductInstallation(cleanParameters(parameters), appConfig, appIdJobStatus);

  return app_id;
}
