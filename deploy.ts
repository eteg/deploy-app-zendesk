import core from '@actions/core';
import github from '@actions/github';
import exec from '@actions/exec';
import shell from 'shelljs'
import { fileToJSON, jsonToFile, rootPath } from "./functions";

require("dotenv").config();
interface IManifestParamProps {
  name: string;
  required?: boolean;
  secured?: boolean;
}

interface IParams {
  [key: string]: string;
}

function getManifestParameters(): IManifestParamProps[] {
  const manifestPath = rootPath("manifest.json");
  const manifest = fileToJSON(manifestPath);

  return manifest?.parameters || [];
}

function isEqual(a: string, b: string) {
  return a.toLowerCase() === b.toLowerCase();
}

function filterParams(params: IParams) {
  const paramsWithoutValue = Object.entries(params).filter(([_, value]) => typeof value === "undefined");

  if (paramsWithoutValue.length) {
    throw new Error(`Following secrets missing their values: ${paramsWithoutValue.map(([key]) => key).join(', ')}`);
  }

  const manifestParams = getManifestParameters();

  const requiredParamsNotFound = manifestParams.filter((m) => m.required && !Object.keys(params).find((key) => isEqual(m.name, key)));
  
  if (requiredParamsNotFound.length) {
    throw new Error(`Missing following required parameters: ${requiredParamsNotFound.map((p) => p.name).join(', ')}`);
  }

  const paramaters: IParams = {};
  manifestParams.forEach(({ name }) => {
    const param = Object.entries(params).find(([key]) => isEqual(name, key));
    
    if(param) 
      Object.assign(paramaters, { [name]: param[1] })
  });

  return paramaters;
}

async function deploy() {
  try {    
    const env = core.getInput('ENV');
    const params = JSON.parse(core.getInput('PARAMS')) as IParams; // O default será {}

    const parameters = filterParams(params);

    const zcliConfigPath = rootPath("zcli.apps.config.json");
    const idPath = rootPath("app_ids.json");
    const ids = fileToJSON(idPath);

    if (ids[env]) {
      const zCliConfig = { app_id: ids[env] };
      jsonToFile(zcliConfigPath, zCliConfig);

      await exec.exec("yarn deploy");
    } else {
      jsonToFile(zcliConfigPath, { parameters }); // {pou: 'jogo'}

      await exec.exec("yarn create-app");

      const appId = fileToJSON(zcliConfigPath).app_id;

      jsonToFile(idPath, { ...ids, [env]: appId });
    }

    await exec.exec("rm -rf zcli.apps.config.json");
  } catch (error) {
    core.setFailed(error.message);
  }
}

deploy();
