// @ts-check
/* eslint-disable max-len */
import globals from 'globals';
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

// Identify names of mixin functions (that do not require explicit return types)
const srcDir = 'src';
const srcFiles = await readdir(srcDir);
const mixinNames = [];
for (const srcFile of srcFiles) {
    if (!/^(appliance|has)-\w+.ts$/.test(srcFile)) continue;
    const text = await readFile(path.join(srcDir, srcFile), 'utf8');
    const matches = [
        ...text.matchAll(/function\s+(\w+)\s*<TBase/g),
        ...text.matchAll(/const\s+(\w+)\s*=\s*<TBase/g)
    ];
    mixinNames.push(...matches.map(match => match[1]));
}

// ESLint options
export default tseslint.config(
    // ESLint recommended rules
    eslint.configs.recommended,
    // typescript-eslint strict and stylistic rules
    ...tseslint.configs.strictTypeChecked,
    ...tseslint.configs.stylisticTypeChecked,
    {
        files: ['**/*.ts', 'eslint.config.mjs'],
        languageOptions: {
            globals:        globals.node,
            ecmaVersion:    'latest',
            sourceType:     'module',
            parserOptions: {
                projectService:         true
            }
        },
        rules: {
            '@typescript-eslint/no-unused-vars':                ['error', { args: 'all', argsIgnorePattern: '^_', ignoreRestSiblings: true }],
            '@typescript-eslint/restrict-template-expressions': ['error', { allowBoolean: true, allowNullish: true, allowNumber: true}],
            'brace-style':                                      ['warn', '1tbs', { allowSingleLine: true }],
            'comma-dangle':                                     ['warn', 'never'],
            'comma-spacing':                                    ['error'],
            'curly':                                            ['off'],
            'eqeqeq':                                           ['warn'],
            'indent':                                           ['warn', 4, {
                SwitchCase:             0,
                FunctionDeclaration:    { parameters:   'first' },
                FunctionExpression:     { parameters:   'first' },
                CallExpression:         { arguments:    'first' },
                ImportDeclaration:      'first',
                ArrayExpression:        'first',
                ignoredNodes:           ['ConditionalExpression']
            }],
            'lines-between-class-members':                      ['warn', 'always', { exceptAfterSingleLine:  true }],
            'max-len':                                          ['warn', 140],
            'no-trailing-spaces':                               ['warn'],
            'prefer-arrow-callback':                            ['warn'],
            'quotes':                                           ['warn', 'single', { avoidEscape: true }],
            'semi':                                             ['warn'],
            // Special rules for this project
            '@typescript-eslint/no-require-imports':            ['error', { allow: ['/package\\.json$'] }],
            '@typescript-eslint/no-explicit-any':               ['error', { ignoreRestArgs: true }],
            '@typescript-eslint/explicit-function-return-type': ['error', { allowedNames: [...mixinNames] }],
            '@typescript-eslint/no-unnecessary-type-parameters':['off'],
            // Temporarily disable some rules until the code has been cleaned up
            '@typescript-eslint/no-misused-promises':           'off',
            '@typescript-eslint/no-floating-promises':          'off'
        }
    }, {
        files: ['**/*-types.ts'],
        rules: {
            '@typescript-eslint/consistent-indexed-object-style':   'off'
        }
    }, {
        ignores: [ '**/ti/' ]
    }
);