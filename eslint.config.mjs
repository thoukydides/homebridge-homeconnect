// @ts-check
import globals from 'globals';
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

// ESLint options
export default tseslint.config(
    // ESLint recommended rules
    eslint.configs.recommended,
    // typescript-eslint strict and stylistic rules
    ...tseslint.configs.strict,
    //...tseslint.configs.strictTypeChecked,
    ...tseslint.configs.stylisticTypeChecked,
    {
        files: ['**/*.ts'],
        languageOptions: {
            globals:        globals.node,
            ecmaVersion:    'latest',
            sourceType:     'module',
            parserOptions: {
                projectService:         { allowDefaultProject: ['*.mjs', '*.ts'] },
                allowDefaultProject:    true
            }
        },
        rules: {
            //'@typescript-eslint/no-floating-promises':          ['error', {}],
            //'@typescript-eslint/no-misused-promises':           ['error', {}],
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

            '@typescript-eslint/no-explicit-any':               ['error', { ignoreRestArgs: true }],
            '@typescript-eslint/no-misused-promises':               'off',
            '@typescript-eslint/no-floating-promises':              'off',
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