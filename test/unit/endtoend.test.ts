/*
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { access, rm } from 'fs/promises';
import { readFileSync } from 'fs';
import { join } from 'path';
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

describe('plugin-login', () => {
  before(async () => {
    try {
      await access(testFilesPath);
    } catch (e) {
      throw new Error('Could not read generated test docs. Ensure the "pretest" has run or run it manually.');
    }
  });
  after(async () => {
    await rm(testFilesPath, { recursive: true });
  });
  it('creates with spaced commands', async () => {
    const dita = loadTestDitamapFile(join('login', 'cli_reference_login_org_jwt_unified.xml'));
    expect(dita.includes('<title><codeph otherprops="nolang">login org jwt')).to.be.true;
  });
  it('creates with summary', async () => {
    const dita = loadTestDitamapFile(join('login', 'cli_reference_login_org_jwt_unified.xml'));
    expect(/shortdesc">\r?\n(\s.*)Log in to a Salesforce org using a JSON web token \(JWT\)./.test(dita)).to.be.true;
  });
  it('creates parameters', async () => {
    const dita = loadTestDitamapFile(join('login', 'cli_reference_login_org_jwt_unified.xml'));
    expect(dita.includes('title><ph>Flags</ph></title>')).to.be.true;
  });
});
