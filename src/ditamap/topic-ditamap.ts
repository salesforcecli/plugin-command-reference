/*
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { join } from 'path';
import { Ditamap } from './ditamap';

export class TopicDitamap extends Ditamap {
  public constructor(topic: string, subtopics: string[], commandNames: string[]) {
    const filename = `cli_reference_${topic}.ditamap`;
    // Set the data of topic and filenames
    super(filename, {
      topic,
      subtopics: subtopics.sort().map((subtopic) => ({ subtopic })),
      commands: commandNames.sort().map((command) => ({ command })),
    });

    // Override destination to include topic and subtopic
    this.destination = join(Ditamap.outputDir, topic, filename);
  }

  // eslint-disable-next-line class-methods-use-this
  public getTemplateFileName(): string {
    return 'topic_ditamap.hbs';
  }
}
