import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { getInput, setFailed } from "@actions/core";
import { event_name, ref, repository } from "@actions/github";
import { exec as _exec } from "@actions/exec";
import { echo } from "shelljs";

const fileToJSON = (filePath) => {
  return JSON.parse(readFileSync(filePath, "utf-8"));
};

const jsonToFile = (filePath, json) => {
  writeFileSync(filePath, JSON.stringify(json));
};

const rootPath = (fileName) => {
  return join(__dirname, "..", fileName);
};

function getManifestParameters(path){
  const manifestPath = `${path}/dist/manifest.json`;
  const manifest = fileToJSON(manifestPath);

  return manifest?.parameters || [];
}

function isEqual(a, b) {
  return a.toLowerCase() === b.toLowerCase();
}

function filterParams(params, path) {
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
    const path = getInput("path", { required: true });
    const params = JSON.parse(getInput("params", { required: false }) || "{}"); // O default será {}

    echo(`💡 Job started at ${ dateTime }`);
    echo(`🎉 The job was automat ically triggered by a ${ event_name } event.`)
    echo(`🔎 The name of your branch is ${ ref } and your repository is ${ repository }.`)

    const parameters = filterParams(params, path);

    const zcliConfigPath = `${path}/dist/zcli.apps.config.json`;
    const zendeskConfigPath = `${path}/zendesk.apps.config.json`;
    const zendeskConfig = fileToJSON(zendeskConfigPath);
    const ids = zendeskConfig?.ids;

    if (ids && ids[env]) {
      echo(`🚀 Deploying an existing application...`);
      const zcliConfig = { app_id: ids[env], parameters };
      jsonToFile(zcliConfigPath, zcliConfig);

      await _exec(`zcli apps:update ${path}/dist`);
    } else {
      echo(`🚀 Deploying a new application...`);
      jsonToFile(zcliConfigPath, { parameters });

      await _exec(`zcli apps:create ${path}/dist`);

      const appId = fileToJSON(zcliConfigPath).app_id;
      
      zendeskConfig.ids[env] = appId;
      jsonToFile(zendeskConfigPath, zendeskConfig);
    }
    echo(`🚀 Deployed!`);

    await _exec(`rm -rf ${path}/zcli.apps.config.json`);
  } catch (error) {
    setFailed(error.message);
  }
}

deploy();
