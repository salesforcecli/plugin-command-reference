/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { join } from 'path';
import { JsonMap } from '@salesforce/ts-types';
import { Ditamap } from './ditamap';

export class TopicCommands extends Ditamap {
  public constructor(topic: string, topicMeta: JsonMap) {
    const filename = `cli_reference_${topic}_commands.xml`;
    // Set the data of topic and filenames
    super(filename, topicMeta);

    // Override destination to include topic and subtopic
    this.destination = join(Ditamap.outputDir, topic, filename);
  }

  public getTemplateFileName(): string {
    return 'cli_reference_topic_commands.hbs';
  }
}
