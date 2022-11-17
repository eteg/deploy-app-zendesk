import { readFileSync, writeFileSync } from "fs";
import { getInput, setFailed } from "@actions/core";
import { exec as _exec } from "@actions/exec";
import { echo } from "shelljs";
import { createApp } from "./src/createApp";
import { updateApp } from "./src/updateApp";
import * as github from "@actions/github";
import * as relativePath from 'path';

const {
  ref,
  eventName,
  payload: { repository },
} = github.context;

const fileToJSON = (filePath: string) => {
  try {
    return JSON.parse(readFileSync(filePath, "utf-8"));
  } catch (error) {
    echo(`🔎 No file found in path ${filePath}`);
    return {};
  }
};

const jsonToFile = (filePath: string, json: any) => {
  writeFileSync(filePath, JSON.stringify(json));
};

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

function getManifest(path: string): Manifest {
  const manifestPath = `${path}/manifest.json`;
  const manifest = fileToJSON(manifestPath);
  if (!Object.keys(manifest).length) throw new Error(`Missing manifest file on ${manifestPath}`);
  return manifest;
}

function isEqual(a: string, b: string) {
  return a.toLowerCase() === b.toLowerCase();
}

function filterParams(manifest: Manifest, params: Record<string, string>) {
  const paramsWithoutValue = Object.entries(params).filter(([_, value]) => typeof value === "undefined");

  if (paramsWithoutValue.length) {
    throw new Error(`Following secrets missing their values: ${paramsWithoutValue.map(([key]) => key).join(", ")}`);
  }

  const manifestParams = manifest?.parameters ?? [];
  const requiredParamsNotFound = manifestParams.filter(
    (m) => m?.required && !Object.keys(params).find((key) => isEqual(m.name, key))
  );

  if (requiredParamsNotFound.length) {
    throw new Error(`Missing following required parameters: ${requiredParamsNotFound.map((p) => p.name).join(", ")}`);
  }

  const paramaters = {};
  manifestParams.forEach(({ name }) => {
    const param = Object.entries(params).find(([key]) => isEqual(name, key));

    if (param) Object.assign(paramaters, { [name]: param[1] });
  });

  return paramaters;
}

async function deploy() {
  try {
    const dateTime = new Date().toLocaleString("pt-BR");

    const env = getInput("env", { required: true });
    const path = getInput("path", { required: true }).replace(/(\/)$/g, "");
    const params = JSON.parse(getInput("params", { required: false }) || "{}"); // O default será {}

    echo(`💡 Job started at ${dateTime}`);
    echo(`🎉 The job was automatically triggered by a ${eventName} event.`);
    echo(
      `🔎 The name of your branch is ${ref.split("/")?.[2] || "unknown"} and your repository is ${repository?.name || "unknown"
      }.`
    );

    echo(`🔐 
    checking if all credentials for authentications are here.`);
    const authenticate = getAuthenticateParams();

    echo(`📖 looking for manifest file.`);
    const manifest = getManifest(path);

    echo(`🔎 Validating parameters.`);
    const parameters = filterParams(manifest, params);

    echo(`🗄️ looking for existing applications`);
    const zendeskConfigPath = relativePath.normalize(`${path}/../zendesk.apps.config.json`);
    const zendeskConfig: ZendeskAppsConfig = fileToJSON(zendeskConfigPath);
    const ids = zendeskConfig?.ids || {};
    let appId: AppId | undefined = ids[env];

    if (appId) {
      echo(`📌 Updating an existing application with appId ${appId}...`);
      await updateApp(authenticate, parameters, manifest, path);
    } else {
      echo(`✨ Deploying a new application...`);

      appId = await createApp(authenticate, parameters, manifest, path);

      zendeskConfig.ids = { ...ids, [env]: appId };
      jsonToFile(zendeskConfigPath, zendeskConfig);
    }

    echo(`🚀 App ${manifest.name} with appId ${appId} Deployed!`);
  } catch (error: any) {
    setFailed(error);
  }
}

deploy();
