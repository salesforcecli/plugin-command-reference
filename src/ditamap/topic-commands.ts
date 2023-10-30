/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { join } from 'node:path';
import { SfTopic } from '../utils';
import { Ditamap } from './ditamap';

export class TopicCommands extends Ditamap {
  public constructor(topic: string, topicMeta: SfTopic) {
    const filename = Ditamap.file(`cli_reference_${topic}_commands`, 'xml');
    // Set the data of topic and filenames
    super(filename, topicMeta);

    // Override destination to include topic and subtopic
    this.destination = join(Ditamap.outputDir, topic, filename);
  }

  // eslint-disable-next-line class-methods-use-this
  public getTemplateFileName(): string {
    return 'cli_reference_topic_commands.hbs';
  }
}
