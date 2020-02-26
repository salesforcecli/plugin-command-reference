/*
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {join} from 'path';
import {Ditamap} from './ditamap';

export class SubTopicDitamap extends Ditamap {
  constructor(topic: string, subtopic: string, commandFileNames: string[]) {
    const filename = `cli_reference_${topic}_${subtopic}.ditamap`;
    // Set the data of topic and filenames
    super(filename, {
      topic,
      subtopic,
      commandFileNames
    });

    // Override destination to include topic and subtopic
    this.destination = join(Ditamap.outputDir, topic, subtopic, filename);
  }

  public getTemplateFileName(): string {
    return 'subtopic_ditamap.hbs';
  }
}
