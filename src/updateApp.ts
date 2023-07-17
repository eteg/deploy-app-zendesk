import ZendeskAuthentication from "./services/ZendeskAuthentication";
import CommonApp from "./services/CommonApp";
import { cleanParameters } from "./utils";

export async function updateApp(
  authenticate: AuthenticateZendesk,
  parameters: Record<string, string>,
  appConfig: Manifest,
  distPath: string,
  appId: string
): Promise<AppId> {
  const { api } = new ZendeskAuthentication(authenticate);

  const commonApp = new CommonApp(api);

  const { id: uploadId } = await commonApp.uploadApp(distPath);
  
  const { job_id } = await commonApp.deployExistingApp(uploadId, appConfig.name, appId);

  const { app_id: appIdJobStatus } = await commonApp.getUploadJobStatus(job_id);

  const {installations} = await commonApp.getInstallations();

  const installation = installations.find(item => item.app_id === Number(appIdJobStatus))

  if (!installation) throw new Error('Installation not found')

  const { app_id } = await commonApp.updateInstallation(cleanParameters(parameters),appConfig, appId, installation.id);

  return String(app_id);
}