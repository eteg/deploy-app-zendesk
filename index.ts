import { readFileSync, writeFileSync } from "fs";
import { getInput, setFailed } from "@actions/core";
import { exec as _exec } from "@actions/exec";
import { echo } from "shelljs";
import { createApp } from "./src/uploadApps";
import * as github from "@actions/github";

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
    (param) => typeof auth[param] !== "string"
  );

  if (missingAuthParams.length)
    throw new Error(
      `Following authentication variables missing their values: ${missingAuthParams
        .map((param) => param)
        .join(", ")}`
    );
  
  return auth;
}

function getManifest(path: string): Manifest {
  const manifestPath = `${path}/dist/manifest.json`;
  const manifest = fileToJSON(manifestPath);
  if (!manifest) throw new Error(`Missing manifest file on ${manifestPath}`);
  return manifest;
}

function isEqual(a: string, b: string) {
  return a.toLowerCase() === b.toLowerCase();
}

function filterParams(params: Record<string, string>, path: string) {
  const paramsWithoutValue = Object.entries(params).filter(
    ([_, value]) => typeof value === "undefined"
  );

  if (paramsWithoutValue.length) {
    throw new Error(
      `Following secrets missing their values: ${paramsWithoutValue
        .map(([key]) => key)
        .join(", ")}`
    );
  }

  const manifest = getManifest(path);
  const manifestParams = manifest?.parameters ?? [];

  const requiredParamsNotFound = manifestParams.filter(
    (m) =>
      m?.required && !Object.keys(params).find((key) => isEqual(m.name, key))
  );

  if (requiredParamsNotFound.length) {
    throw new Error(
      `Missing following required parameters: ${requiredParamsNotFound
        .map((p) => p.name)
        .join(", ")}`
    );
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
      `🔎 The name of your branch is ${
        ref.split("/")?.[2] || "unknown"
      } and your repository is ${repository?.name || "unknown"}.`
    );

    const authenticate = getAuthenticateParams();
    const parameters = filterParams(params, path);

    const zcliConfigPath = `${path}/dist/zcli.apps.config.json`;
    const zendeskConfigPath = `${path}/zendesk.apps.config.json`;
    const zendeskConfig = fileToJSON(zendeskConfigPath);
    const ids = zendeskConfig?.ids;
    let appId = ids[env];

    if (appId) {
      echo(`🚀 Deploying an existing application...`);
      await _exec(`npx zcli apps:update ${path}/dist`);

    } else {
      echo(`🚀 Deploying a new application...`);

      appId = await createApp(
        authenticate,
        parameters,
        manifest,
        path
      );

      zendeskConfig.ids = { ...ids, [env]: appId };
      jsonToFile(zendeskConfigPath, zendeskConfig);
    }

    echo(`🚀 App ${appId} Deployed!`);

  } catch (error: any) {
    setFailed(error.message);
  }
}

deploy();
