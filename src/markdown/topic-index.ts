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
import { CommandClass, commandLinkTarget, escapeAngleBrackets, punctuate, SfTopic, stateLabel } from '../utils.js';
import { MarkdownBase } from './markdown-base.js';

export class MarkdownTopicIndex extends MarkdownBase {
  public constructor(
    private topic: string,
    private commands: CommandClass[],
    private topicMeta: SfTopic,
    outputDir: string
  ) {
    const filename = MarkdownBase.file(`cli_reference_${topic}`);
    super(filename, outputDir);
    this.destination = join(outputDir, topic, filename);
  }

  protected generate(): Promise<string> {
    const lines: string[] = [];
    lines.push('<!-- prettier-ignore-start -->');
    lines.push('');
    lines.push(`# ${this.topic} Commands`);
    lines.push('');
    if (this.topicMeta.description) {
      lines.push(escapeAngleBrackets(this.topicMeta.description));
      lines.push('');
    }
    const sortedCommands = [...this.commands].sort((a, b) => a.id.localeCompare(b.id));
    for (const command of sortedCommands) {
      const id = command.id;
      const commandWithSpaces = id.replace(/:/g, ' ');
      const linkTarget = commandLinkTarget(id);
      const label = stateLabel(command.state, Boolean(command.deprecated));
      const commandDisplay = label ? `${commandWithSpaces} (${label})` : commandWithSpaces;
      const summary = punctuate(command.summary);
      if (summary) {
        lines.push(`- **[${commandDisplay}](./${linkTarget})**<br>`);
        lines.push(`  ${escapeAngleBrackets(summary)}`);
      } else {
        lines.push(`- **[${commandDisplay}](./${linkTarget})**`);
      }
    }
    lines.push('');
    lines.push('<!-- prettier-ignore-end -->');
    lines.push('');
    return Promise.resolve(lines.join('\n'));
  }
}
