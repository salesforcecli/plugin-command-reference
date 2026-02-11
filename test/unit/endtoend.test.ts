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
 * This plugin was primarily made to generate command reference docs for
 * salesforcedx. Generate actual docs and ensure some of the files are generated
 * correctly. If there is new code added to fix a new bug that relies on a new
 * version of salesforcedx, updated it in the package.json. To add test for other
 * plugins, it would probably be best to create a base test to generate the docs
 * for the test cases to reference.
 */

const testFilesPath = './test/tmp';

function loadTestDitamapFile(path: string) {
  return readFileSync(join(testFilesPath, path), 'utf8');
}

describe('plugin-auth and user', () => {
  before(async () => {
    try {
      await access(testFilesPath);
    } catch (e) {
      throw new Error(
        `Could not read generated test docs from ${testFilesPath}. Ensure the "pretest" has run or run it manually.`
      );
    }
  });
  after(async () => {
    await rm(testFilesPath, { recursive: true });
  });
  it('produces no [object Object] nonsense for default flags', () => {
    const dita = loadTestDitamapFile(join('org', 'cli_reference_org_create_user_unified.xml'));
    expect(dita.includes('[object Object]')).to.be.false;
  });
  it('creates with spaced commands', async () => {
    const dita = loadTestDitamapFile(join('org', 'cli_reference_org_login_jwt_unified.xml'));
    expect(dita.includes('<title><codeph otherprops="nolang">org login jwt')).to.be.true;
  });
  it('creates with summary', async () => {
    const dita = loadTestDitamapFile(join('org', 'cli_reference_org_login_jwt_unified.xml'));
    expect(/shortdesc">\r?\n(\s.*)Log in to a Salesforce org using a JSON web token \(JWT\)./.test(dita)).to.be.true;
  });
  it('creates parameters', async () => {
    const dita = loadTestDitamapFile(join('org', 'cli_reference_org_login_jwt_unified.xml'));
    expect(dita.includes('title><ph>Flags</ph></title>')).to.be.true;
  });
});
