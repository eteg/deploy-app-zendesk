import * as path from 'path'
import * as fs from 'fs-extra'
import core from "@actions/core"


export const setConfig = async (json, appPath) => {
  fs.writeFileSync(`${appPath}/apps_id.json`, JSON.stringify(json));
}

const validatePath = (path) => {
  if (!fs.existsSync(path)) {
    core.error(`Invalid path: ${path}`);
  }
}

export const getManifestFile = (appPath) => {
  const manifestFilePath = path.join(appPath, 'manifest.json')
  validatePath(manifestFilePath)

  const manifest = fs.readFileSync(manifestFilePath, 'utf8')
  return JSON.parse(manifest)
}

export const getManifestAppName = (appPath) => {
  return getManifestFile(appPath).name
}

export const cleanParameters = (environment) => {
  const keysEnv = Object.keys(environment);

  const parameters = { };

  keysEnv.forEach((item) => {
    parameters[item.replace('PARAMS_', '').toLowerCase()] = environment[item];
  });

  return parameters;
}
