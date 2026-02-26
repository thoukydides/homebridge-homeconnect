// Homebridge plugin for Home Connect home appliances
// Copyright © 2024-2026 Alexander Thoukydides

import * as core from '@actions/core';
import * as github from '@actions/github';
import { RestEndpointMethodTypes } from '@octokit/plugin-rest-endpoint-methods';
import { readFile } from 'node:fs/promises';

// Possible outcomes
type Status = 'done' | 'updates' | 'invalid';
interface ContextList {
    count:                      number;
    keys_or_values:             string[];
}
interface Context {
    latest_release_version?:    string;
    user_reported_version?:     string;
    required_key_value_updates: {
        documented_in_api_docs: ContextList;
        undocumented:           ContextList;
    };
}

// Discrepancy report for one or more issues
interface IssueDiscrepancies {
    version?:       string;     // Reported plugin version (single issues only)
    valid:          number;     // Number of valid issues
    updates:        number;     // Number of issues requiring updates
    discrepancies:  APITypes;   // All identified API discrepancies
}

// Parsed API key/value types
type APIInterface   = Map<string, string>;
type APIInterfaces  = Map<string, APIInterface>;
type APILiteral     = Set<string>; // (string literal or enum)
type APILiterals    = Map<string, APILiteral>;
interface APITypes {
    interfaces: APIInterfaces;
    literals:   APILiterals;
}

// Issue description returned by GitHub REST API
type Issue = RestEndpointMethodTypes['issues']['get']['response']['data'];

// An API document
interface APIDocument {
    url:        string;
    title:      string;
    content:    string;
}

// Home Connect API documentation URLs
const API_DOCUMENTATION_URLS = [
    'https://api-docs.home-connect.com/programs-and-options/',
    'https://api-docs.home-connect.com/states/',
    'https://api-docs.home-connect.com/settings/',
    'https://api-docs.home-connect.com/events/',
    'https://api-docs.home-connect.com/commands/'
];

// Pattern to match API documentation anchor links
// eslint-disable-next-line max-len
const API_DOCUMENTATION_REGEXP = /<h\d>(?<title>(?:(?!<\/?h\d>).)*?)<a data-testid="LinkingSymbol-anchor" href="(?:[^"#]*)#(?<anchor>[^"#]*)" (?:(?!<\/?h\d>).)*?<\/h\d>/gs;

// Source file defining API types
const SOURCE_FILE = './src/api-value-types.ts';

// File containing the current plugin version
const PACKAGE_JSON_FILE = './package.json';

// Issue labels
const LABEL_KEY_VALUE = 'api keys/values';

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
debugLog(`Current plugin version: ${sourceVersion}`);

// Retrieve API documentation
const apiDocuments = await fetchAPIDocumentation(API_DOCUMENTATION_URLS);

// Action depends on whether a particular issue was specified
const issue_number = Number(process.env.ISSUE_NUMBER ?? '');
let result: IssueDiscrepancies;
if (issue_number) {
    // Triage mode (single issue)
    const issue = (await octokit.rest.issues.get({ ...repo, issue_number })).data;
    result = checkSingleIssue(issue);
} else {
    // Interactive use (batch mode)
    const issues = await octokit.paginate(octokit.rest.issues.listForRepo, {
        ...repo, labels: LABEL_KEY_VALUE, state: 'all', sort: 'created', direction: 'asc'
    });
    result = checkMultipleIssues(issues);
    core.info(`Processed ${result.valid} of ${issues.length} '${LABEL_KEY_VALUE}' issues`);
}

// Generate the comment and overall status
const apiDocumentation = findDocumentation(result.discrepancies);
const comment = makeComment(result, apiDocumentation.documents);
const status: Status = result.updates ? 'updates' : result.valid ? 'done' : 'invalid';
const contextList = (keys_or_values: string[]): ContextList => ({ count: keys_or_values.length, keys_or_values });
const context: Context = {
    latest_release_version:     sourceVersion,
    user_reported_version:      result.version,
    required_key_value_updates: {
        documented_in_api_docs: contextList(apiDocumentation.found),
        undocumented:           contextList(apiDocumentation.missing)
    }
};

// Output results for GitHub Actions workflow
core.setOutput('status',    status);
core.setOutput('context',   context);
core.setOutput('comment',   comment);
core.info(`Comment:\n${comment}`);

// Read the current source code version
async function getCurrentVersion(): Promise<string> {
    const packageText = await readFile(PACKAGE_JSON_FILE, 'utf-8');
    const packageJSON = JSON.parse(packageText) as { version: string };
    return packageJSON.version;
}

// Draft a comment for issue discrepancies
function makeComment(issueDiscrepancies: IssueDiscrepancies, documents: APIDocument[]): string {
    const { version, valid, discrepancies } = issueDiscrepancies;

    // First check whether the issue was a valid report
    if (!valid) {
        core.warning('⚠️ No API keys/values in log file');
        return '';
    }

    // Generate a comment for valid reports
    let comment = 'Thank you for taking the time to report this issue. 👍';
    comment += '\n\n---\n\n';

    // Check for discrepancies between the current source and the issue log
    if (0 < discrepancies.interfaces.size || 0 < discrepancies.literals.size) {
        core.notice('🔴 Updates required to API key/value types');
        comment += '🔴 The following key/value updates appear to be required:\n';
        if (discrepancies.interfaces.size) {
            comment += '\nInterface | Property | Type\n--- | --- | ---\n';
            for (const [interfaceName, fields] of sortMapByKey(discrepancies.interfaces)) {
                const sortedFields = sortMapByKey(fields);
                for (const [key, type] of sortedFields) {
                    comment += [interfaceName, key, type].map(v => `\`${v}\``).join(' | ') + '\n';
                }
            }
        }
        if (discrepancies.literals.size) {
            comment += '\nType | Literal\n--- | ---\n';
            for (const [typeName, values] of sortMapByKey(discrepancies.literals)) {
                const sortedValues = Array.from(values).sort((a, b) => a.localeCompare(b));
                for (const value of sortedValues) {
                    comment += [typeName, value].map(v => `\`${v}\``).join(' | ') + '\n';
                }
            }
        }

        // Check whether there is any relevant API documentation
        if (documents.length) {
            comment += '\nThe following Home Connect API documentation might be relevant:\n';
            for (const doc of documents) {
                comment += `* [${doc.title}](${doc.url})\n`;
            }
        } else {
            comment += '\nThe Home Connect API documentation does not appear to include anything relevant.\n';
        }
    } else {
        comment += '🟢 The current source code appears to include all required key/value updates.';
    }

    // Warn if the report is not for the current plugin version
    if (version && version !== sourceVersion) {
        core.warning(`💡 Not current plugin version (${version} ≠ ${sourceVersion})`);
        comment += '\n\n---\n\n';
        comment += '💡 This report is for an out-of-date version of the plugin.';
        comment += ` The current version is \`${sourceVersion}\`, but the issue is for \`${version}\`.`;
    }

    // Return the final comment
    return comment;
}

// Check multiple issues
function checkMultipleIssues(issues: Issue[]): IssueDiscrepancies {
    const interfaces = new Map<string, APIInterface>();
    const literals   = new Map<string, APILiteral>();
    let valid = 0, updates = 0;
    for (const issue of issues) {
        // Check this issue
        const issueData = checkSingleIssue(issue);

        // Merge the issue data into the overall discrepancies
        valid   += issueData.valid;
        updates += issueData.updates;
        for (const [interfaceName, fields] of issueData.discrepancies.interfaces) {
            const existing = interfaces.get(interfaceName) ?? new Map<string, string>();
            for (const [key, type] of fields) existing.set(key, type);
            interfaces.set(interfaceName, existing);
        }
        for (const [typeName, values] of issueData.discrepancies.literals) {
            const existing = literals.get(typeName) ?? new Set<string>();
            for (const value of values) existing.add(value);
            literals.set(typeName, existing);
        }
    }
    return { valid, updates, discrepancies: { interfaces, literals } };
}

// Check a single issue
function checkSingleIssue(issue: Issue): IssueDiscrepancies {
    const { number: issueNumber, html_url: issue_url, title, state, body } = issue;
    core.info(`Issue #${issueNumber}: ${title} [${state}]`);
    debugLog(issue_url);

    // Parse the issue into its component fields
    const issueFields = parseIssueBody(body ?? '');
    const issueTypes = parseTypes(`#${issueNumber}`, issueFields.get('Log File') ?? '');
    const version = issueFields.get('Plugin Version');
    const valid = (0 < issueTypes.interfaces.size || 0 < issueTypes.literals.size) ? 1 : 0;

    // Check for discrepancies between the current source and the issue log
    const discrepancies = checkDiscrepancies(sourceTypes, issueTypes);
    const updates = (0 < discrepancies.interfaces.size || 0 < discrepancies.literals.size) ? 1 : 0;
    return { version, valid, updates, discrepancies };
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
            core.info(`Ignoring line: ${line}`);
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
        debugLog(`Parsed interface '${interfaceName}': ${JSON.stringify(Object.fromEntries(properties))}`);
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
        debugLog(`Parsed literal-like '${typeName}': ${[...values].join(', ')}`);
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
                debugLog(`Parsed interface alias '${typeName}' = '${aliasName}'`);
            } else if (aliasLiteral) {
                literals.set(typeName, aliasLiteral);
                debugLog(`Parsed literal-like alias '${typeName}' = '${aliasName}'`);
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

// Attempt to find documents that include a particular string
function findDocumentation(discrepancies: APITypes): { documents: APIDocument[], found: string[], missing: string[] } {
    // Lists of keys/values to search for
    const interfaceKeys = [...discrepancies.interfaces.values()].flatMap(p => [...p.keys()]);
    const enumLiterals = [...discrepancies.literals.values()].flatMap(l => [...l]);
    const strippedValues = [...interfaceKeys, ...enumLiterals].map(l => l.replace(/^'|'$/g, ''));
    const uniqueValues = [...new Set(strippedValues)].sort();
    if (!uniqueValues.length) return { documents: [], found: [], missing: [] };

    // Build a regular expression and find matching documents
    const uniqueValuesRe = createIdentifierMatcher(uniqueValues);
    const documents = apiDocuments.filter(d => uniqueValuesRe.test(d.content));

    // Check whether an identifier occurs in any of the selected documents
    const isDocumented = (value: string): boolean => {
        const valueRe = createIdentifierMatcher([value]);
        return documents.some(d => valueRe.test(d.content));
    };

    // Return the results lexicographically sorted
    return {
        documents:  documents.sort((a, b) => a.title.localeCompare(b.title)),
        found:      uniqueValues.filter(v =>  isDocumented(v)).sort(),
        missing:    uniqueValues.filter(v => !isDocumented(v)).sort()
    };
}

// Create a regular expression to test whether identifiers are included
function createIdentifierMatcher(patterns: string[]): RegExp {
    if (!patterns.length) return /\b\B/; // (never match if no identifiers)
    const escaped = patterns.map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    return new RegExp(`\\b(${escaped.join('|')})\\b`);
}

// Retrieve the API documentation
async function fetchAPIDocumentation(urls: string[]): Promise<APIDocument[]> {
    const documents: APIDocument[] = [];
    for (const url of urls) {
        debugLog(`Fetching API documentation from ${url}...`);
        try {
            // Retrieve the page
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            const page = await response.text();

            // Split the page into sections by anchor
            const matches = [...page.matchAll(API_DOCUMENTATION_REGEXP)];
            if (matches.length) {
                matches.forEach((match, index) => {
                    const { title, anchor } = match.groups ?? {};
                    if (!title || !anchor) throw Error('Missing capture groups in API documentation regexp');
                    const startIndex = match.index + match.length;
                    const endIndex = matches[index + 1]?.index ?? page.length;
                    documents.push({
                        title,
                        url:        new URL(`#${anchor}`, url).href,
                        content:    page.substring(startIndex, endIndex)
                    });
                });
            } else {
                core.warning(`No anchors found in ${url}; treating entire page as a single document`);
                documents.push({
                    title:      new URL(url).pathname.split('/').filter(Boolean).pop() ?? url,
                    url,
                    content:    page
                });
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            core.error(`Failed to fetch API documentation from ${url}: ${message}`);
        }
    }
    core.info(`Retrieved ${documents.length} documents from ${urls.length} pages`);
    return documents;
}

// Debug logging
function debugLog(message: string): void {
    if (core.isDebug()) core.debug(message);
}