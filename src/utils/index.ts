import * as path from 'path'
import * as fs from 'fs'
import core from "@actions/core"


export const setConfig = async (json: any, appPath: string) => {
  fs.writeFileSync(`${appPath}/apps_id.json`, JSON.stringify(json));
}

const validatePath = (path: string) => {
  if (!fs.existsSync(path)) {
    core.error(`Invalid path: ${path}`);
  }
}

export const getManifestFile = (appPath: string): any => {
  const manifestFilePath = path.join(appPath, 'manifest.json')
  validatePath(manifestFilePath)

  const manifest = fs.readFileSync(manifestFilePath, 'utf8')
  return JSON.parse(manifest)
}

export const getManifestAppName = (appPath: string): string => {
  return getManifestFile(appPath).name
}

export const cleanParameters = (environment: Record<string, string>): Record<string, string> => {
  const keysEnv = Object.keys(environment);

  const parameters: any = {};

  keysEnv.forEach((item: string) => {
    parameters[item.replace('PARAMS_', '').toLowerCase()] = environment[item];
  });

  return parameters;
}
