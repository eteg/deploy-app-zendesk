const core = require("@actions/core");
const exec = require("@actions/exec");
const shell = require("shelljs");
const { fileToJSON, jsonToFile } = require("./functions");

(async function main() {
  try {
    const dateTime = new Date().toLocaleString("pt-BR");

    const env = core.getInput("env", { required: true });
    const params = core.getInput("params", { required: true });
    const path = core.getInput("path", { required: true });

    shell.echo(`💡 Job started at ${dateTime}`);

    const envParams = {};
    const scriptParams = {};
    const secureParams = [];
    const zcliParams = {};

    const secretParams = JSON.parse(params);

    const keysParams = Object.keys(secretParams).filter((item) =>
      item.includes("PARAMS_")
    );

    const manifest = fileToJSON(`${path}/manifest.json`);
    const manifestParams = manifest?.params || [];

    manifestParams.map((parameter) => {
      if (parameter.secure) secureParams.push(parameter.name.toUpperCase());
    });

    // Check the env params with secret prefix
    keysParams.forEach((keyParams) => {
      const key = keyParams.replace("PARAMS_", ""); // remove secrets prefix
      const requestedManifestParams = manifestParams.find(
        (it) => it.name.toLowerCase() === key.toLowerCase()
      );
      // set all requested manifest params
      if (requestedManifestParams) {
        const { name, secure } = requestedManifestParams;
        zCliParams[name] = secretParams[keyParams];
        // check if is not a sensitive param
        // to set on .env without secret prefix
        if (!secure) envParams[key] = secretParams[keyParams];
      } else {
        envParams[key] = secretParams[keyParams];
      }
      // set all params from secrets withou the prefix
      // to use only in this script file
      scriptParams[key] = secretParams[keyParams];
    });
    const idsPath = `${path}/app_ids.json`;
    const ids = fileToJSON(idsPath);
    shell.echo(ids);

    if (manifestParams.length) {
      const missigParams = manifestParams.filter((param) => {
        return param.required && typeof zCliParams[param.name] === "undefined";
      });
      if (missigParams.length) {
        const missigParamsName = missigParams
          .map((it) => `"${it.name}"`)
          .join(", ");
        throw new Error(`All parameters ${missigParamsName} must have values`);
      }
    }

    const zcliConfigPath = `${path}/zcli.apps.config.json`;

    if (ids[env]) {
      shell.echo(`🚀 Deploying an existing application...`);
      const zcliConfig = { app_id: ids[env] };
      jsonToFile(zcliConfigPath, zcliConfig);
      await exec.exec("yarn deploy");
    } else {
      shell.echo(`🚀 Deploying a new application...`);
      jsonToFile(zcliConfigPath, { parameters: zcliParams });
      //execute yarn create-app
      await exec.exec("yarn create-app");
      const appId = fileToJSON(zcliConfigPath).app_id;
      jsonToFile(idsPath, { ...ids, [env]: appId });
      shell.echo({ ...ids, [env]: appId });
    }

    await exec.exec("rm -rf zcli.apps.config.json");

    shell.echo(`🎉 Job has been finished`);
  } catch (error) {
    core.setFailed(error.message);
  }
})();
