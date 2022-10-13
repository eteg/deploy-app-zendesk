const process = require("process");
const cp = require("child_process");
const path = require("path");

test("test runs", () => {
  process.env["INPUT_MILLISECONDS"] = 100;
  const ip = path.join(__dirname, "index.js");
  const result = cp.exec(`node ${ip}`, { env: process.env }).toString();
  console.dir(JSON.stringify(result));

  console.log(`node ${ip}`, { env: process.env });
});
