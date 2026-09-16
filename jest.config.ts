import type { Config } from 'jest';

const config: Config = {
    preset: 'ts-jest',
    testEnvironment: 'jest-environment-jsdom',
    testEnvironmentOptions: {
        customExportConditions: ['require', 'default'],
    },
    roots: ['<rootDir>/tests/unit'],
    testMatch: ['**/*.test.ts', '**/*.test.tsx'],
    transform: {
        '^.+\\.(ts|tsx)$': [
            'ts-jest',
            {
                tsconfig: './tsconfig.jest.json',
            },
        ],
    },
    // Allow ts-jest to process ESM packages from node_modules that can't be left as-is
    transformIgnorePatterns: [
        '/node_modules/(?!(preact|@preact|@testing-library)/)',
    ],
    // Map ESM entry points to their CJS equivalents
    moduleNameMapper: {
        '^preact/test-utils$': '<rootDir>/node_modules/preact/test-utils/dist/testUtils.js',
        '^preact/hooks$': '<rootDir>/node_modules/preact/hooks/dist/hooks.js',
        '^preact/jsx-runtime$': '<rootDir>/node_modules/preact/jsx-runtime/dist/jsxRuntime.js',
        '^preact/compat$': '<rootDir>/node_modules/preact/compat/dist/compat.js',
        '^preact$': '<rootDir>/node_modules/preact/dist/preact.js',
        '^@preact/signals$': '<rootDir>/node_modules/@preact/signals/dist/signals.js',
        '^@preact/signals-core$': '<rootDir>/node_modules/@preact/signals-core/dist/signals-core.js',
        // Preact compat for any react imports
        '^react$': '<rootDir>/node_modules/preact/compat/dist/compat.js',
        '^react-dom$': '<rootDir>/node_modules/preact/compat/dist/compat.js',
    },
    setupFilesAfterEnv: ['<rootDir>/tests/unit/setup.ts'],
    passWithNoTests: true,
};

export default config;
