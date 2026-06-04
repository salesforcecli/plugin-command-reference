/*
 * Copyright 2026, Salesforce, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { rm } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect } from 'chai';

const execAsync = promisify(exec);

/**
 * Tests for markdown output generation. These tests are self-contained:
 * they generate the markdown files, test them, then clean up.
 */

const testFilesPath = './test/tmp-md';

function loadMarkdownFile(path: string) {
  return readFileSync(join(testFilesPath, path), 'utf8');
}

describe('markdown output: plugin-auth and user', () => {
  before(async function () {
    // Increase timeout for file generation
    this.timeout(60000);

    // Generate markdown files for testing
    await execAsync(
      'node --loader ts-node/esm --no-warnings=ExperimentalWarning "./bin/dev.js" commandreference generate --plugins auth --plugins user --output-format markdown --output-dir test/tmp-md'
    );
  });

  after(async () => {
    // Clean up generated files
    await rm(testFilesPath, { recursive: true, force: true });
  });

  it('produces no [object Object] nonsense for default flags', () => {
    const md = loadMarkdownFile(join('org', 'cli_reference_org_create_user.md'));
    expect(md.includes('[object Object]')).to.be.false;
  });

  it('creates with spaced commands', () => {
    const md = loadMarkdownFile(join('org', 'cli_reference_org_login_jwt.md'));
    expect(md.includes('# org login jwt')).to.be.true;
  });

  it('creates with summary', () => {
    const md = loadMarkdownFile(join('org', 'cli_reference_org_login_jwt.md'));
    expect(md.includes('Log in to a Salesforce org using a JSON web token (JWT).')).to.be.true;
  });

  it('creates parameters', () => {
    const md = loadMarkdownFile(join('org', 'cli_reference_org_login_jwt.md'));
    expect(md.includes('## Flags')).to.be.true;
  });
});
