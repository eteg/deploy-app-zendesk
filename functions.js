const fs = require("fs");
const path = require("path");

const fileToJSON = (filePath) => {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
};

const jsonToFile = (filePath, json) => {
  fs.writeFileSync(filePath, JSON.stringify(json));
};

module.exports = { fileToJSON, jsonToFile };
