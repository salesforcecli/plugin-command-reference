/*
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Ditamap } from './ditamap.js';

export class HelpReference extends Ditamap {
  public constructor() {
    // Set the data of topic and filenames
    const filename = Ditamap.file('cli_reference_help', 'xml');
    super(filename, {
      id: filename.replace('.xml', ''),
    });
  }

  // eslint-disable-next-line class-methods-use-this
  public getTemplateFileName(): string {
    return 'cli_reference_help.hbs';
  }
}
