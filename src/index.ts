import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { getInput, setFailed } from "@actions/core";
import * as github from "@actions/github";
import { exec as _exec } from "@actions/exec";
import { echo } from "shelljs";

interface IManifestParamProps {
  name: string;
  required?: boolean;
  secured?: boolean;
}

interface IParams {
  [key: string]: string;
}

const { 
  ref,
  eventName,
  payload: { repository }  
} = github.context;

const fileToJSON = (filePath: string) => {
  try {
    return JSON.parse(readFileSync(filePath, "utf-8"))
  } catch (error) {
    console.log(error);
    echo(`💡 Error: ${ error }`);
    return {} 
  }
};

const jsonToFile = (filePath: string, json: any) => {
  writeFileSync(filePath, JSON.stringify(json));
};

function getManifestParameters(path: string): IManifestParamProps[]{
  const manifestPath = `${path}/dist/manifest.json`;
  const manifest = fileToJSON(manifestPath);

  return manifest?.parameters || [];
}

function isEqual(a: string, b: string) {
  return a.toLowerCase() === b.toLowerCase();
}

function filterParams(params: IParams, path: string) {
  const paramsWithoutValue = Object.entries(params).filter(([_, value]) => typeof value === "undefined");

  if (paramsWithoutValue.length) {
    throw new Error(`Following secrets missing their values: ${paramsWithoutValue.map(([key]) => key).join(', ')}`);
  }

  const manifestParams = getManifestParameters(path);

  const requiredParamsNotFound = manifestParams.filter((m) => m.required && !Object.keys(params).find((key) => isEqual(m.name, key)));
  
  if (requiredParamsNotFound.length) {
    throw new Error(`Missing following required parameters: ${requiredParamsNotFound.map((p) => p.name).join(', ')}`);
  }

  const paramaters = {};
  manifestParams.forEach(({ name }) => {
    const param = Object.entries(params).find(([key]) => isEqual(name, key));
    
    if(param) 
      Object.assign(paramaters, { [name]: param[1] })
  });

  return paramaters;
}

async function deploy() {
  try {    
    const dateTime = new Date().toLocaleString("pt-BR");

    const env = getInput("env", { required: true });
    const path = getInput("path", { required: true }).replace(/(\/)$/g, "");
    const params = JSON.parse(getInput("params", { required: false }) || "{}"); // O default será {}

    echo(`💡 Job started at ${ dateTime }`);
    echo(`🎉 The job was automatically triggered by a ${ eventName } event.`)
    echo(`🔎 The name of your branch is ${ ref.split("/")?.[2] || "unknown" } and your repository is ${ repository?.name || "unknown" }.`)

    const parameters = filterParams(params, path);

    const zcliConfigPath = `${path}/dist/zcli.apps.config.json`;
    const zendeskConfigPath = `${path}/zendesk.apps.config.json`;
    const zendeskConfig = fileToJSON(zendeskConfigPath);
    const ids = zendeskConfig?.ids; 

    if (ids && ids[env]) {
      echo(`🚀 Deploying an existing application...`);
      const zcliConfig = { app_id: ids[env], parameters };
      jsonToFile(zcliConfigPath, zcliConfig);

      await _exec(`yarn zcli apps:update ${path}/dist`);
    } else {
      echo(`🚀 Deploying a new application...`);
      jsonToFile(zcliConfigPath, { parameters });

      await _exec(`yarn --ignore-scripts zcli apps:create ${path}/dist`);

      const appId = fileToJSON(zcliConfigPath).app_id;
      
      zendeskConfig.ids[env] = appId;
      jsonToFile(zendeskConfigPath, zendeskConfig);
    }
    echo(`🚀 Deployed!`);

    await _exec(`rm -rf ${path}/dist/zcli.apps.config.json`);
  } catch (error: any) {
    setFailed(error.message);
  }
}

deploy();
