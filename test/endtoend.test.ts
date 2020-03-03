/*
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { fs } from '@salesforce/core';
import { expect } from 'chai';
import { readFileSync } from 'fs';
import { join } from 'path';

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

describe('salesforcedx', () => {
  before(async () => {
    await require('@oclif/command').run([
      'commandreference:generate',
      '--plugins',
      'salesforcedx',
      '--outputdir',
      testFilesPath
    ]);
  });
  after(async () => {
    await fs.remove(testFilesPath);
  });

  it('creates closed-pilot commands', async () => {
    const dita = loadTestDitamapFile(join('force', 'org', 'cli_reference_force_org_shape_create.xml'));
    expect(/invitation-only\s+pilot\s+program/.test(dita)).to.be.true;
  });
  it('creates beta commands', async () => {
    const dita = loadTestDitamapFile(join('force', 'org', 'cli_reference_force_org_clone.xml'));
    expect(/a\s+beta\s+version\s+of\s+the/.test(dita)).to.be.true;
  });
  it('creates open-pilot commands', async () => {
    const dita = loadTestDitamapFile(join('force', 'package', 'cli_reference_force_package_hammertest_run.xml'));
    expect(/through\s+a\s+pilot\s+program\s+that\s+requires/.test(dita)).to.be.true;
  });
  it('creates with long description', async () => {
    const dita = loadTestDitamapFile(join('force', 'source', 'cli_reference_force_source_push.xml'));
    expect(/shortdesc">Pushes changed/.test(dita)).to.be.true;
  });
});
