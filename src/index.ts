import { getInput, setFailed } from '@actions/core';
import { echo } from 'shelljs';
import * as github from '@actions/github';
import { normalize } from 'path';
import { isZipFile } from './utils/file';
import { fileToJSON, isDefinedAndIsNotArray, jsonToFile } from './utils/json';
import ZendeskAPI from './providers/ZendeskAPI';
import AppService from './services/AppService';

const {
  ref,
  eventName,
  payload: { repository },
} = github.context;

function getAuthenticateParams(): AuthenticateZendesk {
  const subdomain = getInput('zendesk_subdomain', { required: true });
  const email = getInput('zendesk_email', { required: true });
  const apiToken = getInput('zendesk_api_token', { required: true });

  const auth: AuthenticateZendesk = {
    subdomain,
    email,
    apiToken,
  };

  const missingAuthParams = Object.keys(auth).filter(
    (param) => typeof auth[param as keyof AuthenticateZendesk] !== 'string',
  );

  if (missingAuthParams.length)
    throw new Error(
      `Following authentication variables missing their values: ${missingAuthParams
        .map((param) => param)
        .join(', ')}`,
    );

  return auth;
}

function getAppInput() {
  const env = getInput('environment', { required: true });

  const appPath = getInput('path').replace(/(\/)$/g, '');
  const appPackage = getInput('package').replace(/(\/)$/g, '');
  const zendeskAppsConfigPath =
    getInput('zendesk_apps_config_path').replace(/(\/)$/g, '') || '';
  const appId = getInput('app_id');
  const allowMultipleApps = getInput('allow_multiple_apps') || false;

  if (appPath && appPackage) {
    throw new Error(
      "Parameters validation: You can't fill both 'path' and 'package' parameters.",
    );
  }

  if (appPackage && !isZipFile(appPackage)) {
    throw new Error(
      "Parameters validation: 'package' parameter must to be a .zip file.",
    );
  }

  const params = JSON.parse(getInput('params', { required: false })) || {};

  return {
    env,
    appPath,
    appPackage,
    zendeskAppsConfigPath,
    params,
    appId,
    allowMultipleApps,
  };
}

async function deploy(
  ids: Record<string, any>,
  inputs: ReturnType<typeof getAppInput>,
  authenticate: AuthenticateZendesk,
) {
  const { env, allowMultipleApps, appId, appPath, appPackage, params } = inputs;

  const zendeskAPI = new ZendeskAPI(authenticate);
  const appService = new AppService(zendeskAPI);

  const appLocation: AppLocation = {
    path: appPath || appPackage || '',
    type: appPath ? 'dir' : 'zip',
  };

  if (appId || (isDefinedAndIsNotArray(ids[env]) && !allowMultipleApps)) {
    const id = appId || ids[env];
    echo(`📌 Updating an existing application with appId ${id}...`);

    return appService.updateApp(id, appLocation, params);
  }

  if (allowMultipleApps || !ids[env]) {
    echo(`✨ Deploying a new application...`);

    return appService.createApp(appLocation, params);
  }

  throw new Error(
    'There is already an app for this environment. Enable "allow_multiple_apps" to create a new one.',
  );
}

async function run() {
  try {
    const dateTime = new Date().toLocaleString('pt-BR');
    echo(`💡 Job started at ${dateTime}`);
    echo(`🎉 This job was automatically triggered by a ${eventName} event.`);
    echo(
      `🔎 The name of your branch is ${
        ref.split('/')?.[2] || 'unknown'
      } and your repository is ${repository?.name || 'unknown'}.`,
    );

    echo(
      `🔐 Checking if all credentials for authentications and required inputs are here.`,
    );
    const authenticate = getAuthenticateParams();
    const inputs = getAppInput();
    const { zendeskAppsConfigPath, allowMultipleApps } = inputs;

    echo(`🗄️ Looking for existing applications`);
    const zendeskConfigPath = normalize(
      `${zendeskAppsConfigPath}/zendesk.apps.config.json`,
    );

    const zendeskConfig: ZendeskAppsConfig = fileToJSON(zendeskConfigPath);
    if (!zendeskConfig?.ids) Object.assign(zendeskConfig, { ids: {} });

    const ids = zendeskConfig.ids;

    const app = await deploy(ids, inputs, authenticate);

    if (!allowMultipleApps && !ids[inputs.env])
      zendeskConfig.ids = { ...ids, [inputs.env]: app.id };
    else if (
      !inputs.appId &&
      allowMultipleApps &&
      isDefinedAndIsNotArray(zendeskConfig.ids[inputs.env])
    )
      Object.assign(zendeskConfig.ids, {
        [inputs.env]: [ids[inputs.env], app.id],
      });
    else if (allowMultipleApps && !zendeskConfig.ids[inputs.env])
      Object.assign(zendeskConfig.ids, {
        [inputs.env]: [app.id],
      });
    else if (
      Array.isArray(zendeskConfig.ids[inputs.env]) &&
      !(zendeskConfig.ids[inputs.env] as string[]).includes(app.id)
    )
      (zendeskConfig.ids[inputs.env] as string[]).push(app.id);

    jsonToFile(zendeskConfigPath, zendeskConfig);

    echo(`🚀 App deployed successfully!`);
  } catch (error: unknown) {
    setFailed(error as Error);
  }
}

run();
