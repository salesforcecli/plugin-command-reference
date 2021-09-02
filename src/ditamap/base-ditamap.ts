/*
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Ditamap } from './ditamap';

export class BaseDitamap extends Ditamap {
  constructor(topics: string[]) {
    // Set the data of topic and filenames
    super(Ditamap.getFileName(), {
      namespaceDitamapFiles: topics.sort().map(topic => `${topic}/cli_reference_${topic}.ditamap`)
    });
  }

  public getTemplateFileName(): string {
    return 'base_ditamap.hbs';
  }
}
