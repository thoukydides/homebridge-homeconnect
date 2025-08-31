// Homebridge plugin for Home Connect home appliances
// Copyright © 2024-2025 Alexander Thoukydides

import * as core from '@actions/core';
import assert from 'node:assert';
import { spawn, ChildProcessWithoutNullStreams } from 'node:child_process';
import { once } from 'node:events';

// Command to use to launch Homebridge
const SPAWN_COMMAND = 'homebridge';
const SPAWN_ARGS = '-C -D -I -P .. --strict-plugin-resolution'.split(' ');

// Log messages indicating success or failure
type Tests = Record<string, RegExp>;
const SUCCESS_TESTS: Tests = {
    // eslint-disable-next-line max-len
    'Startup':      /\[HomeConnect\] (Please authorise access to your appliances(.*) using the associated Home Connect or SingleKey ID email address by visiting:|Starting events stream for all appliances)/
};
const FAILURE_TESTS: Tests = {};

// Regular expression to split into lines (allowing CRLF, CR, or LF)
const LINE_SPLIT_REGEX = /\r\n|(?<!\r)\n|\r(?!\n)/;

// Match ANSI colour codes so that they can be stripped
// eslint-disable-next-line no-control-regex
const ANSI_ESCAPE = /\x1B\[[0-9;]*[msuK]/g;

// ANSI colour codes used for warnings and errors (ignoring Homebridge 2.0 info)
// eslint-disable-next-line no-control-regex
const ANSI_WARNING = /\x1B\[3[13]m.*\S.*\x1B/;
const HOMEBRIDGE2_WARNING = /^(> |NOTICE TO USERS AND PLUGIN DEVELOPERS)/;

// Length of time to wait
const TIMEOUT_HOMEBRIDGE_MS = 15 * 1000; // 15 seconds

// Run the plugin test
async function testPlugin(): Promise<void> {
    // Launch Homebridge, piping stdout and stderr for monitoring
    const child = spawn(SPAWN_COMMAND, SPAWN_ARGS, { stdio: 'pipe' });
    const timeout = setTimeout(() => { child.kill('SIGTERM'); }, TIMEOUT_HOMEBRIDGE_MS);

    // Monitor stdout and stderr until they close
    let successTests = Object.keys(SUCCESS_TESTS);
    const failureTests = new Set<string>();
    const testOutputStream = async (
        child: ChildProcessWithoutNullStreams,
        streamName: 'stdout' | 'stderr'
    ): Promise<void> => {
        const stream = child[streamName];
        stream.setEncoding('utf8');

        const currentWarning: string[] = [];
        const flushWarning = (): void => {
            if (currentWarning.length) {
                failureTests.add(`Log warning: ${currentWarning.join('\n')}`);
                currentWarning.length = 0;
            }
        };

        for await (const chunk of stream) {
            assert(typeof chunk === 'string');
            for (const line of chunk.split(LINE_SPLIT_REGEX)) {
                if (line.trim().length) console.log(line);

                // Check for any of the success or failure log messages
                const cleanLine = line.replace(ANSI_ESCAPE, '');
                if ((ANSI_WARNING.test(line) || streamName === 'stderr') && !HOMEBRIDGE2_WARNING.test(cleanLine)) {
                    currentWarning.push(cleanLine);
                } else flushWarning();
                Object.entries(FAILURE_TESTS).filter(([, regexp]) => regexp.test(cleanLine))
                    .forEach(([name]) => failureTests.add(`${name}: ${cleanLine}`));
                successTests = successTests.filter(name => !SUCCESS_TESTS[name].test(cleanLine));
                if (successTests.length === 0) child.kill('SIGTERM');
            }
        }
        flushWarning();
    };
    await Promise.all([
        testOutputStream(child, 'stdout'),
        testOutputStream(child, 'stderr'),
        once(child, 'exit')
    ]);
    clearTimeout(timeout);

    // Check whether the test was successful
    const errors: string[] = [];
    // (Don't check exitCode; SIGTERM causes Homebridge to exit with non-zero)
    //if (child.exitCode) errors.push(`Process exited with code ${child.exitCode}`);
    errors.push(...failureTests);
    errors.push(...successTests.map(test => `Missing: ${test} (expected /${SUCCESS_TESTS[test].source}/)`));
    if (errors.length) throw new AggregateError(errors, 'Test failed');
}

// Run the test
void (async (): Promise<void> => {
    try {

        // Run the test
        await core.group(
            '🔍 Running Homebridge plugin test...',
            testPlugin);

        // If this point is reached, the test was successful
        console.log('🟢 Test successful');

    } catch (err) {

        // The test failed so log the command output
        console.error('🔴 Test failed');

        // Extract and log the individual error messages
        const errs = err instanceof AggregateError ? err.errors : [err];
        const messages = errs.map(e => e instanceof Error ? e.message : String(e));
        for (const message of messages) core.error(message);

        // Return a non-zero exit code
        process.exitCode = 1;
    }
})();