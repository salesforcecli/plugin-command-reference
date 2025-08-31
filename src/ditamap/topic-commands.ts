/*
 * Copyright 2025, Salesforce, Inc.
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

import { join } from 'node:path';
import { SfTopic } from '../utils.js';
import { Ditamap } from './ditamap.js';

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
