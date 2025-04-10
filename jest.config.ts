import type { Config } from "@jest/types";

const config: Config.InitialOptions = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src/", "<rootDir>/tests/"],
  testMatch: [
    "**/__tests__/**/*.ts?(x)",
    "**/?(*.)+(spec|test).ts?(x)",
    "<rootDir>/tests/**/*.ts"
  ],
  transform: {
    "^.+\\.tsx?$": "ts-jest"
  },
  collectCoverageFrom: ["src/**/*.{ts,tsx}", "!src/**/*.d.ts"],
  verbose: true
};

export default config;
