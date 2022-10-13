const core = require("@actions/core");
const exec = require("@actions/exec");
const shell = require("shelljs");
import { fileToJSON, jsonToFile } from "./functions";

require("dotenv").config();

function getManifestParameters(){
  const manifestPath = rootPath("manifest.json");
  const manifest = fileToJSON(manifestPath);

  return manifest?.parameters || [];
}

function isEqual(a, b) {
  return a.toLowerCase() === b.toLowerCase();
}

function filterParams(params) {
  const paramsWithoutValue = Object.entries(params).filter(([_, value]) => typeof value === "undefined");

  if (paramsWithoutValue.length) {
    throw new Error(`Following secrets missing their values: ${paramsWithoutValue.map(([key]) => key).join(', ')}`);
  }

  const manifestParams = getManifestParameters();

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

    const env = core.getInput("env", { required: true });
    const path = core.getInput("path", { required: true });
    const params = JSON.parse(core.getInput("params", { required: true })); // O default será {}

    shell.echo(`💡 Job started at ${dateTime}`);

    const parameters = filterParams(params);

    const zcliConfigPath = `${path}/dist/zcli.apps.config.json`
    const zendeskConfigPath = `${path}/zendesk.apps.config.json`;
    const zendeskConfig = fileToJSON(zendeskConfigPath);
    const ids = zendeskConfig?.ids;

    if (ids && ids[env]) {
      shell.echo(`🚀 Deploying an existing application...`);
      const zcliConfig = { app_id: ids[env], parameters };
      jsonToFile(zcliConfigPath, zcliConfig);

      await exec.exec(`zcli apps:update ${path}/dist`);
    } else {
      shell.echo(`🚀 Deploying a new application...`);
      jsonToFile(zcliConfigPath, { parameters });

      await exec.exec(`zcli apps:create ${path}/dist`);

      const appId = fileToJSON(zcliConfigPath).app_id;
      
      zendeskConfig.ids[env] = appId;
      jsonToFile(zendeskConfigPath, zendeskConfig);
    }

    await exec.exec(`rm -rf ${path}/zcli.apps.config.json`);
  } catch (error) {
    core.setFailed(error.message);
  }
}

deploy();
