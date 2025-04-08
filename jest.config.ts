import type { Config } from 'jest';

const config: Config = {
    preset: 'ts-jest/presets/default-esm', // Use this if you're working with ESM
    testEnvironment: 'node',
    transform: {
        '^.+\\.ts$': ['ts-jest',{
            tsconfig: "tsconfig.test.json",
        }],
    },
    extensionsToTreatAsEsm: ['.ts'],
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1', // Strip `.js` extension in ESM imports
    },
};

export default config;
