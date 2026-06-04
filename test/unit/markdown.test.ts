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

import { access, rm } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect } from 'chai';

/**
 * Tests for markdown output generation. These tests verify that the markdown
 * format is generated correctly for the plugin-auth and plugin-user plugins.
 */

const testFilesPath = './test/tmp-md';

function loadMarkdownFile(path: string) {
  return readFileSync(join(testFilesPath, path), 'utf8');
}

describe('markdown output: plugin-auth and user', () => {
  before(async () => {
    try {
      await access(testFilesPath);
    } catch (e) {
      throw new Error(
        `Could not read generated markdown test docs from ${testFilesPath}. Ensure the "pretest" has run or run it manually.`
      );
    }
  });
  after(async () => {
    await rm(testFilesPath, { recursive: true });
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
