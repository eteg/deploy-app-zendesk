const core = require("@actions/core");

(async function main() {
  const CommonApp = require("./services/CommonApp");
  const ZendeskAuthentication = require("./services/ZendeskAuthentication");
  const { getManifestAppName, cleanParameters, setConfig } = require("./utils/index")

  // Get variables
  const env = core.getInput('env', { required: true });
  const path = core.getInput("path", { required: true });
  const parameters = core.getInput("params", { required: true });

  const api = new ZendeskAuthentication(parameters.EMAIL, parameters.API_TOKEN, parameters.SUBDOMAIN);

  const appConfig = getManifestFile(path);

  const commonApp = new CommonApp(api);

  const newAppUploadId = await commonApp.uploadApp(path);

  const appName = getManifestAppName(path);

  const { job_id } = await commonApp.deployApp(newAppUploadId, appName, 'post');

  const { app_id : appIdFromJobStatus } = await commonApp.getUploadJobStatus(job_id, path);

  const { app_id } = await commonApp.updateProductInstallation(cleanParameters(parameters), appConfig, appIdFromJobStatus )

  //Save app ID on file
  setConfig( { [env]: app_id }, path);
})()
