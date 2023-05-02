/*
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { join } from 'path';
import { Ditamap } from './ditamap';

export class CLIReferenceTopic extends Ditamap {
  public constructor(topic: string, longDescription: string) {
    const filename = Ditamap.file(`cli_reference_${topic}`, 'xml');
    // Set the data of topic and filenames
    super(filename, {
      topic,
      longDescription,
    });

    // Override destination to include topic and subtopic
    this.destination = join(Ditamap.outputDir, topic, filename);
  }

  public getTemplateFileName(): string {
    return 'cli_reference_topic.hbs';
  }
}
