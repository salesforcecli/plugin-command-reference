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

import { EOL } from 'node:os';
import { expect } from 'chai';
import { punctuate } from '../../src/utils.js';

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
