/*
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { EOL } from 'os';
import { expect } from 'chai';
import { punctuate, mergeDeep } from '../../src/utils';

it('merge two shallow objects', () => {
  expect(mergeDeep({ a: 1 }, { b: 2 })).to.deep.equal({ a: 1, b: 2 });
});

it('merge two deeply nested objects', () => {
  expect(
    mergeDeep(
      {
        a: {
          b: 1,
          c: { d: 3 },
        },
      },
      {
        a: {
          c: { e: 4 },
        },
      }
    )
  ).to.deep.equal({
    a: {
      b: 1,
      c: {
        d: 3,
        e: 4,
      },
    },
  });
});

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
