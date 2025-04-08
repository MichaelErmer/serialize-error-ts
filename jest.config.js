"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config = {
    preset: 'ts-jest/presets/default-esm', // Use this if you're working with ESM
    testEnvironment: 'node',
    transform: {
        '^.+\\.ts$': ['ts-jest', {
                tsconfig: "tsconfig.test.json",
            }],
    },
    extensionsToTreatAsEsm: ['.ts'],
    moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1', // Strip `.js` extension in ESM imports
    },
};
exports.default = config;
//# sourceMappingURL=jest.config.js.map