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
import { SfTopic } from '../utils.js';
import { MarkdownBase } from './markdown-base.js';

export class MarkdownTopicIndex extends MarkdownBase {
  public constructor(
    private topic: string,
    private commandIds: string[],
    private topicMeta: SfTopic,
    outputDir: string
  ) {
    const filename = MarkdownBase.file(`cli_reference_${topic}`);
    super(filename, outputDir);
    this.destination = join(outputDir, topic, filename);
  }

  protected generate(): Promise<string> {
    const lines: string[] = [];
    lines.push(`# ${this.topic} Commands`);
    lines.push('');
    if (this.topicMeta.description) {
      lines.push(this.topicMeta.description);
      lines.push('');
    }
    for (const id of [...this.commandIds].sort()) {
      const commandWithUnderscores = id.replace(/:/g, '_');
      const commandWithSpaces = id.replace(/:/g, ' ');
      const isTopicLevelCommand = !id.includes(':');
      const linkTarget = isTopicLevelCommand
        ? `cli_reference_${commandWithUnderscores}_command.md`
        : `cli_reference_${commandWithUnderscores}.md`;
      lines.push(`- [${commandWithSpaces}](./${linkTarget})`);
    }
    lines.push('');
    return Promise.resolve(lines.join('\n'));
  }
}
