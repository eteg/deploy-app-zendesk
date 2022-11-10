import CommonApp from "./services/CommonApp"
import ZendeskAuthentication from "./services/ZendeskAuthentication"
import { cleanParameters } from "./utils";

export async function createApp(
  authenticate: AuthenticateZendesk,
  parameters: Record<string, string>,
  appConfig: Manifest,
  distPath: string
): Promise<AppId> {

  console.log({ authenticate });
  console.log({ parameters });
  console.log({ appConfig });
  console.log({ distPath });

  const { api } = new ZendeskAuthentication(authenticate);

  console.log({ api });

  const commonApp = new CommonApp(api);

  const { id: newAppUploadId } = await commonApp.uploadApp(distPath);

  console.log({ newAppUploadId });

  const appName = appConfig.name;

  console.log({ appName });

  const { job_id } = await commonApp.deployApp(newAppUploadId, appName, 'post');

  console.log({ job_id });

  const { app_id: appIdFromJobStatus } = await commonApp.getUploadJobStatus(job_id);

  console.log({ appIdFromJobStatus });

  const { app_id } = await commonApp.updateProductInstallation(cleanParameters(parameters), appConfig, appIdFromJobStatus);

  console.log({ app_id });

  return app_id;
}
