/*
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as fs from 'fs';
import { join } from 'path';
import { expect } from 'chai';
import { exec } from 'shelljs';

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
  return fs.readFileSync(join(testFilesPath, path), 'utf8');
}

describe('merging several plugins together', () => {
  before(async () => {
    exec('./bin/dev commandreference:generate --plugins salesforce-alm,alias,signups --outputdir test/tmp/');

    try {
      await fs.promises.access(testFilesPath);
    } catch (e) {
      throw new Error('Could not read generated test docs. Ensure the "pretest" has run or run it manually.');
    }
  });

  after(async () => {
    await fs.promises.rm(testFilesPath, { recursive: true });
  });

  it('creates closed-pilot commands', () => {
    const dita = loadTestDitamapFile(join('force', 'org', 'cli_reference_force_org_snapshot_create.xml'));
    expect(/invitation-only\s+pilot\s+program/.test(dita)).to.be.true;
  });
  it.skip('creates beta commands', () => {
    const dita = loadTestDitamapFile(join('force', 'org', 'cli_reference_force_org_clone.xml'));
    expect(/a\s+beta\s+version\s+of\s+the/.test(dita)).to.be.true;
  });
  it.skip('creates open-pilot commands', () => {
    const dita = loadTestDitamapFile(join('force', 'package', 'cli_reference_force_package_hammertest_run.xml'));
    expect(/through\s+a\s+pilot\s+program\s+that\s+requires/.test(dita)).to.be.true;
  });
  it('creates with long description', () => {
    const dita = loadTestDitamapFile(join('force', 'source', 'cli_reference_force_source_legacy_push.xml'));
    expect(/shortdesc">Pushes changed/.test(dita)).to.be.true;
  });
  it('creates parameters', () => {
    const dita = loadTestDitamapFile(join('alias', 'cli_reference_alias_list.xml'));
    expect(/<title><ph>Parameters<\/ph><\/title>/.test(dita)).to.be.true;
  });
});
