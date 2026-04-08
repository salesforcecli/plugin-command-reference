/*
 * Copyright 2026, Salesforce, Inc.
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
import { Markdoc } from './markdoc.js';

export class TopicIndex extends Markdoc {
  public constructor(topic: string, commands: string[]) {
    const filename = 'README.md';
    const data = {
      topic,
      commands: commands.map((command) => ({ command })),
    };
    super(filename, data);

    // Override destination to include topic
    this.destination = join(Markdoc.outputDir, topic, filename);
  }

  // eslint-disable-next-line class-methods-use-this
  public getTemplateFileName(): string {
    return 'topic_index.hbs';
  }
}
