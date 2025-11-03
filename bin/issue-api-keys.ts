// Homebridge plugin for Home Connect home appliances
// Copyright © 2024-2025 Alexander Thoukydides

import * as core from '@actions/core';
import * as github from '@actions/github';
import { components } from '@octokit/openapi-types';
import { readFile } from 'node:fs/promises';

// Parsed API key/value types
type APIInterface = Map<string, string>;
type APIInterfaces = Map<string, APIInterface>;
type APILiteral = Set<string>; // (string literal or enum)
type APILiterals = Map<string, APILiteral>;
interface APITypes {
    interfaces: APIInterfaces;
    literals:   APILiterals;
}

// Issue description returned by GitHub REST API
type Issue = Omit<components['schemas']['issue'], 'performed_via_github_app'>;

// Source file defining API types
const SOURCE_FILE = './src/api-value-types.ts';

// File containing the current plugin version
const PACKAGE_JSON_FILE = './package.json';

// Issue labels
const LABEL_KEY_VALUE = 'api keys/values';
const LABEL_INVALID = 'invalid';

// API values and types to ignore when reported (they are likely to be spurious)
const IGNORE_VALUES: string[] = [
    'Espresso',
    'Micha: Caffè Grande',
    'number | string',
    'unknown',
    "''",
    "'Micha: Caffè Grande'",
    'DoorStates' // (reported instead of DoorState*)
];

// Prepare an Octokit client
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
if (!GITHUB_TOKEN) throw new Error('GITHUB_TOKEN environment variable not set');
const octokit = github.getOctokit(GITHUB_TOKEN);
const { repo } = github.context; // (uses env.GITHUB_REPOSITORY)

// Parse the source code
const sourceFile = await readFile(SOURCE_FILE, 'utf8');
const sourceTypes = parseTypes(SOURCE_FILE, sourceFile);
const sourceVersion = await getCurrentVersion();
core.info(`Current plugin version: ${sourceVersion}`);

// Action depends on whether a particular issue was specified
const issue_number = github.context.issue.number as number | undefined;
if (issue_number === undefined) {
    // Check all issues with the appropriate label, but do not comment on them
    const summary: string[] = [];
    for await (const response of octokit.paginate.iterator(octokit.rest.issues.listForRepo, {
        ...repo, labels: LABEL_KEY_VALUE, state: 'all', sort: 'created', direction: 'asc'
    })) {
        for (const issue of response.data) {
            const { number, state } = issue;
            core.startGroup(`Issue #${number}`);
            const issueSummary = await reviewIssue(issue, false);
            if (issueSummary) {
                summary.push(...issueSummary.map(line => `${line} // #${number} [${state}]`));
            }
            core.endGroup();
        }
    }

    // Display a final summary
    core.info('='.repeat(80));
    if (summary.length) {
        core.info(`🔴 ${summary.length} key/value updates required:`);
        for (const line of summary.sort()) core.info(line);
    } else {
        core.notice('🟢 No updates required');
    }
} else {
    // Check a single issue and add a comment
    const { data } = await octokit.rest.issues.get({ ...repo, issue_number });
    reviewIssue(data, true);
}

// Read the current source code version
async function getCurrentVersion(): Promise<string> {
    const packageText = await readFile(PACKAGE_JSON_FILE, 'utf-8');
    const packageJSON = JSON.parse(packageText) as { version: string };
    return packageJSON.version;
}

// Review a single issue
async function reviewIssue(issue: Issue, addComment = false): Promise<string[] | undefined> {
    const { number: issue_number, html_url, title, state, body } = issue;
    core.info(`Issue #${issue_number}: ${title} [${state}]`);
    core.info(html_url);

    // Parse the issue into its component fields
    const issueFields = parseIssueBody(body ?? '');
    core.info(`Appliance(s): ${issueFields.get('Home Connect Appliance(s)') ?? '(not specified)'}`);

    // Parse the types from the provided log file
    const issueTypes = parseTypes(`#${issue_number}`, issueFields.get('Log File') ?? '');
    const countTypes = (types: APITypes): number => types.interfaces.size + types.literals.size;
    if (!countTypes(issueTypes)) {
        core.warning(`⚠️ No API keys/values in log file: ${html_url}`);
        if (addComment) {
            /* eslint-disable max-len */
            const body =
`⚠️ **This does not appear to be an API key/value report.**

The supplied log file does not contain any API types that the plugin has identified as unrecognised or mismatched. Reports filed using this template are processed automatically for API schema updates only. Therefore, this issue will be closed automatically.

If appropriate, please open a new issue using one of the templates below:
* **🐞 [Bug Report](https://github.com/thoukydides/homebridge-homeconnect/issues/new?template=bug_report.yml)** for anything not working as expected
* **🚧 [Feature Request](https://github.com/thoukydides/homebridge-homeconnect/issues/new?template=feature_request.yml)** for proposed improvements or new functionality

Using the correct template ensures your issue includes the information required for a timely response and resolution.`;
            /* eslint-enable max-len */
            await octokit.rest.issues.createComment({ ...repo, issue_number, body });
            await octokit.rest.issues.update({ ...repo, issue_number, state: 'closed', labels: [LABEL_INVALID] });
        }
        return;
    }

    // Generate a comment to add to the issue
    let comment = 'Thank you for taking the time to report this issue. 👍';
    comment += '\n\n---\n\n';

    // Check for discrepancies between the current source and the issue log
    const discrepancies = checkDiscrepancies(sourceTypes, issueTypes);
    let summary: string[] | undefined;
    if (countTypes(discrepancies)) {
        core.notice(`🔴 Updates required to API key/value types: ${html_url}`);
        comment += '🔴 The following key/value updates appear to be required:\n';
        summary = [];
        if (discrepancies.interfaces.size) {
            comment += '\nInterface | Property | Type\n--- | --- | ---\n';
            for (const [interfaceName, fields] of sortMapByKey(discrepancies.interfaces)) {
                const sortedFields = sortMapByKey(fields);
                for (const [key, type] of sortedFields) {
                    summary.push(`interface ${interfaceName} { ${key}?: ${type}; }`);
                    comment += [interfaceName, key, type].map(v => `\`${v}\``).join(' | ') + '\n';
                }
            }
        }
        if (discrepancies.literals.size) {
            comment += '\nType | Literal\n--- | ---\n';
            for (const [typeName, values] of sortMapByKey(discrepancies.literals)) {
                const sortedValues = Array.from(values).sort((a, b) => a.localeCompare(b));
                for (const value of sortedValues) {
                    summary.push(`enum ${typeName} = ${value}`);
                    comment += [typeName, value].map(v => `\`${v}\``).join(' | ') + '\n';
                }
            }
        }
        comment += '\nThese should be included in the next release.';
    } else {
        comment += '🟢 The current source code appears to include all required key/value updates.';
    }

    // Warn if the report is not for the current plugin version
    const issueVersion = issueFields.get('Plugin Version');
    if (issueVersion && issueVersion !== sourceVersion) {
        core.info(`Not current plugin version (${issueVersion} ≠ ${sourceVersion})`);
        comment += '\n\n---\n\n';
        comment += '💡 This report is for an out-of-date version of the plugin.';
        comment += ` The current version is \`${sourceVersion}\`, but the issue is for \`${issueVersion}\`.`;
    }

    // Add a comment to the issue, if required
    core.info(`Comment:\n${comment.replace(/^/gm, '    ')}`);
    if (addComment) {
        await octokit.rest.issues.createComment({ ...repo, issue_number, body: comment });
    }
    return summary;
}

// Parse the issue body
function parseIssueBody(body: string): Map<string, string> {
    const fields = new Map<string, string[]>();
    let currentValue: string[] | undefined;

    const HEADING_REGEX = /^### (.*?)$/;
    for (const line of body.split(/\r?\n/)) {
        const match = HEADING_REGEX.exec(line);
        if (match) {
            currentValue = [];
            fields.set(match[1].trim(), currentValue);
        } else if (currentValue) {
            currentValue.push(line);
        } else {
            core.debug(`Ignoring line: ${line}`);
        }
    }

    return new Map(Array.from(fields.entries(),
                              ([key, value]) => [key, value.join('\n').trim()]));
}

// Extract interface and literal definitions from the source file or issue log
function parseTypes(description: string, source: string): APITypes {
    const interfaces = new Map<string, APIInterface>();
    const literals   = new Map<string, APILiteral>();

    // Remove all log file prefixes and line comments
    source = source.replace(/^.*] /gm, '').replace(/\/\/.*$/gm, '');

    // Regular expressions to match different type definitions
    const interfaceRegex = /export\s+interface\s+(\w.*?\w)(?:\s+extends\s+(\w+(?:\s*,\s*\w+)*))?\s*\{([^}]+?)\}/gs;
    const literalRegex   = /export\s+type\s+(\w.*?\w)\s*=\s*([^;]+?);/gs;
    const enumRegex      = /export\s+enum\s+(\w.*?\w)\s*\{([^}]+?)\}/gs;

    // Parse interface type definitions
    for (const match of source.matchAll(interfaceRegex)) {
        const [, interfaceName, interfaceExtends, interfaceBody] = match;
        const properties = new Map<string, string>();
        if (interfaceExtends) {
            for (const base of interfaceExtends.split(',')) {
                const baseProperties = interfaces.get(base.trim());
                baseProperties?.forEach((value, key) => properties.set(key, value));
            }
        }
        for (const property of interfaceBody.split(';')) {
            const [key, type] = property.split('?:');
            if (key && type) properties.set(key.trim(), type.trim());
        }
        if (properties.size) interfaces.set(interfaceName, properties);
        if (core.isDebug()) core.debug(`Parsed interface '${interfaceName}': ${JSON.stringify(Object.fromEntries(properties))}`);
    }

    // Process literal-like type definitions
    const processLiteralType = (match: RegExpMatchArray, separator: string): void => {
        const [, typeName, typeBody] = match;
        const values = new Set(typeBody
            .split(separator)
            .map(value => value.replace(/^.*=/s, '').trim())
            .filter(Boolean)
        );
        if (values.size) literals.set(typeName, values);
        if (core.isDebug()) core.debug(`Parsed literal-like '${typeName}': ${[...values].join(', ')}`);
    };

    // Parse enum type definitions (treating them as string literals)
    for (const match of source.matchAll(enumRegex)) {
        processLiteralType(match, ',');
    }

    // Parse string literal type definitions
    for (const match of source.matchAll(literalRegex)) {
        const [, typeName, aliasName] = match;
        if (/^\w+$/.test(aliasName)) {
            // Special case for type aliases
            const aliasInterface = interfaces.get(aliasName);
            const aliasLiteral = literals.get(aliasName);
            if (aliasInterface) {
                interfaces.set(typeName, aliasInterface);
                if (core.isDebug()) core.debug(`Parsed interface alias '${typeName}' = '${aliasName}'`);
            } else if (aliasLiteral) {
                literals.set(typeName, aliasLiteral);
                if (core.isDebug()) core.debug(`Parsed literal-like alias '${typeName}' = '${aliasName}'`);
            }
        } else {
            processLiteralType(match, '|');
        }
    }

    // Return the parsed types
    core.info(`Parsed ${description}: ${interfaces.size} interfaces and ${literals.size} literal types`);
    return { interfaces, literals };
}

// Identify all updates required to the source code
function checkDiscrepancies(sourceTypes: APITypes, issueTypes: APITypes): APITypes {
    const interfaces = new Map<string, APIInterface>();
    const literals   = new Map<string, APILiteral>();

    // Check the interface types
    for (const [interfaceName, issueProperties] of issueTypes.interfaces) {
        const sourceProperties = sourceTypes.interfaces.get(interfaceName);
        if (!sourceProperties) {
            // The whole interface type is missing
            interfaces.set(interfaceName, issueProperties);
        } else {
            // Check that individual properties exist and include the right type
            const mismatched = [...issueProperties].filter(([key, type]) =>
                !IGNORE_VALUES.includes(type)
                && !sourceProperties.get(key)?.includes(type));
            if (mismatched.length) {
                interfaces.set(interfaceName, new Map(mismatched));
            }
        }
    }

    // Check the string literal and enum types
    const sourceLiterals = new Set(
        [...sourceTypes.literals.values()].flatMap(values => [...values])
    );
    for (const [literalName, issueValues] of issueTypes.literals) {
        // Only check the values; the type names do not need to match
        const missing = [...issueValues].filter(value =>
            !IGNORE_VALUES.includes(value) && !sourceLiterals.has(value));
        if (missing.length) {
            literals.set(literalName, new Set(missing));
        }
    }

    // Return the discrepancies
    core.info(`Discrepancies: ${interfaces.size} interfaces and ${literals.size} literal types`);
    return { interfaces, literals };
}

// Convert a Map to entries and sort lexicographically by key
function sortMapByKey<T>(map: Map<string, T>): [string, T][] {
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}