/*
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Ditamap } from './ditamap';

export class CLIReference extends Ditamap {
  public constructor() {
    const filename = 'cli_reference.xml';

    super(filename, {
      cliVersion: Ditamap.cliVersion,
      pluginVersions: Ditamap.pluginVersions,
    });
  }

  // eslint-disable-next-line class-methods-use-this
  public getTemplateFileName(): string {
    return 'cli_reference_xml.hbs';
  }
}
