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

import { TocTopicEntry } from '../generator-factory.js';
import { MarkdownBase } from './markdown-base.js';

const STATE_LABELS: Record<string, string> = {
  beta: 'Beta',
  preview: 'Developer Preview',
  closedPilot: 'Closed Pilot',
  openPilot: 'Open Pilot',
  deprecated: 'Deprecated',
};

export class MarkdownToc extends MarkdownBase {
  public constructor(private topicEntries: TocTopicEntry[], outputDir: string) {
    super('sfclireference-toc.yml', outputDir);
  }

  public static override file(): string {
    return 'sfclireference-toc.yml';
  }

  // eslint-disable-next-line class-methods-use-this
  protected generate(): Promise<string> {
    const lines: string[] = [
      '- title: Salesforce CLI Command Reference',
      '  link: cli_reference.md',
      '- title: Release Notes',
      '  link: cli_reference_release_notes.md',
      '- title: Deprecation Policy',
      '  link: cli_reference_deprecation.md',
    ];

    const sorted = [...this.topicEntries].sort((a, b) => a.topic.localeCompare(b.topic));

    for (const { topic, commandIds } of sorted) {
      lines.push(`- title: ${topic} Commands`);
      lines.push(`  link: ${topic}/cli_reference_${topic}.md`);
      lines.push('  topics:');
      for (const { id, state, deprecated } of [...commandIds].sort((a, b) => a.id.localeCompare(b.id))) {
        const commandWithUnderscores = id.replace(/:/g, '_');
        const commandWithSpaces = id.replace(/:/g, ' ');
        const stateLabel = deprecated
          ? ' (Deprecated)'
          : state && STATE_LABELS[state]
          ? ` (${STATE_LABELS[state]})`
          : '';
        const isTopicLevelCommand = !id.includes(':');
        const linkTarget = isTopicLevelCommand
          ? `cli_reference_${commandWithUnderscores}_command.md`
          : `cli_reference_${commandWithUnderscores}.md`;
        lines.push(`    - title: ${commandWithSpaces}${stateLabel}`);
        lines.push(`      link: ${topic}/${linkTarget}`);
      }
    }

    lines.push('');
    return Promise.resolve(lines.join('\n'));
  }
}
