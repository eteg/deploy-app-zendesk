import { getInput, setFailed } from "@actions/core";
import { exec as _exec } from "@actions/exec";
import { echo } from "shelljs";
import * as github from "@actions/github";
import { normalize } from "path";
import { isZipFile } from "./utils/file";
import { fileToJSON, jsonToFile } from "./utils/json";
import ZendeskAPI from "./providers/ZendeskAPI";
import AppService from "./services/AppService";


const {
  ref,
  eventName,
  payload: { repository },
} = github.context;


function getAuthenticateParams(): AuthenticateZendesk {
  const subdomain = getInput("zendesk_subdomain", { required: true });
  const email = getInput("zendesk_email", { required: true });
  const apiToken = getInput("zendesk_api_token", { required: true });

  const auth: AuthenticateZendesk = {
    subdomain,
    email,
    apiToken,
  };

  const missingAuthParams = Object.keys(auth).filter(
    (param) => typeof auth[param as keyof AuthenticateZendesk] !== "string"
  );

  if (missingAuthParams.length)
    throw new Error(
      `Following authentication variables missing their values: ${missingAuthParams.map((param) => param).join(", ")}`
    );

  return auth;
}

async function deploy() {
  try {
    const dateTime = new Date().toLocaleString("pt-BR");

    const env = getInput("env", { required: true });

    const appPath = getInput("path").replace(/(\/)$/g, "");
    const appPackage = getInput("package").replace(/(\/)$/g, "");
    const zendeskAppsConfigPath = getInput("zendesk_apps_config_path").replace(/(\/)$/g, "");

    if (!appPath && !appPackage) {
      throw new Error("Parameters validation: 'path' or 'package' parameter need to be filled.")
    }

    if (appPath && appPackage) {
      throw new Error("Parameters validation: You can't fill both 'path' and 'package' parameters.")
    }

    if (appPackage && !isZipFile(appPackage)) {
      throw new Error("Parameters validation: 'package' parameter must to be a .zip file.")
    }

    const appLocation: AppLocation = {
      path: appPath || appPackage,
      type: appPath ? 'dir' : 'zip'
    }

    const params = JSON.parse(getInput("params", { required: false }) || "{}"); // O default será {}

    echo(`💡 Job started at ${dateTime}`);
    echo(`🎉 This job was automatically triggered by a ${eventName} event.`);
    echo(
      `🔎 The name of your branch is ${ref.split("/")?.[2] || "unknown"} and your repository is ${
        repository?.name || "unknown"
      }.`
    );

    echo(`🔐 
    checking if all credentials for authentications are here.`);
    const authenticate = getAuthenticateParams();

    echo(`🗄️ looking for existing applications`);
    const zendeskConfigPath = normalize(`${zendeskAppsConfigPath}/zendesk.apps.config.json`);
    
    const zendeskConfig: ZendeskAppsConfig = fileToJSON(zendeskConfigPath);

    const ids = zendeskConfig?.ids || {};
    const appId: AppId | undefined = ids[env];

    const zendeskAPI = new ZendeskAPI(authenticate)
    const appService = new AppService(zendeskAPI)

    if (appId) {
      echo(`📌 Updating an existing application with appId ${appId}...`);
      await appService.updateApp(appId, appLocation, params);
    } else {
      echo(`✨ Deploying a new application...`);

      const app = await appService.createApp(appLocation, params);

      zendeskConfig.ids = { ...ids, [env]: app.id };
      jsonToFile(zendeskConfigPath, zendeskConfig);
    }
  } catch (error: any) {
    setFailed(error);
  }
}

deploy();
