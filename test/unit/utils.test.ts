/*
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { EOL } from 'os';
import { expect } from 'chai';
import { punctuate } from '../../src/utils';

describe('punctuate', () => {
  it('description to longDescription', () => {
    expect(punctuate('lowercase oclif description')).to.equal('Lowercase oclif description.');
  });

  it('multi line descriptions to longDescriptions', () => {
    expect(punctuate(`lowercase oclif description${EOL}${EOL}some other stuff`)).to.equal(
      'Lowercase oclif description.'
    );
  });

  it('does not add additional punctuation', () => {
    expect(punctuate('Uppercase longDescription.')).to.equal('Uppercase longDescription.');
  });
});
