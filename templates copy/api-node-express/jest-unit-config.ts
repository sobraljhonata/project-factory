const config = require("./jest.config.ts");
config.testMatch = ["**/*.spec.ts"];
config.transform = {
  "^.+\\.ts?$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.spec.json" }], // 👈 novo
};
module.exports = config;