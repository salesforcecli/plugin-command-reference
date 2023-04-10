/*
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Ditamap } from './ditamap';

export class BaseDitamap extends Ditamap {
  public constructor(topics: string[]) {
    // Set the data of topic and filenames
    super(Ditamap.file('cli_reference', 'ditamap'), {
      namespaceDitamapFiles: topics.sort().map((topic) => Ditamap.file(`${topic}/cli_reference_${topic}`, 'ditamap')),
    });
  }

  // eslint-disable-next-line class-methods-use-this
  public getTemplateFileName(): string {
    return 'base_ditamap.hbs';
  }
}
