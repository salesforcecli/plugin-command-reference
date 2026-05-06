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

import { MarkdownBase } from './markdown-base.js';

export class MarkdownCliReference extends MarkdownBase {
  public constructor(
    private cliVersion: string,
    private pluginVersions: Array<{ name: string; version: string }>,
    private topics: string[],
    outputDir: string
  ) {
    super(MarkdownBase.file('cli_reference'), outputDir);
  }

  protected generate(): Promise<string> {
    const lines: string[] = [];
    lines.push('# Salesforce CLI Command Reference');
    lines.push('');
    lines.push(
      'This command reference contains information about the Salesforce CLI commands and their flags.' +
        '  Use these commands to build Agentforce agents, manage Salesforce DX projects, create and manage' +
        ' scratch orgs and sandboxes, synchronize source to and from orgs, create and install packages, and more.'
    );
    lines.push('');
    lines.push(`Salesforce CLI version: \`${this.cliVersion}\`.`);
    lines.push('');
    if (this.pluginVersions.length > 0) {
      lines.push('## Plugin Versions');
      lines.push('');
      lines.push('| Plugin | Version |');
      lines.push('|--------|---------|');
      for (const { name, version } of this.pluginVersions) {
        lines.push(`| \`${name}\` | \`${version}\` |`);
      }
      lines.push('');
    }
    if (this.topics.length > 0) {
      lines.push('## Command Topic Index');
      lines.push('');
      for (const topic of this.topics.sort()) {
        lines.push(`- [${topic}](./${topic}/cli_reference_${topic}.md)`);
      }
      lines.push('');
    }
    return Promise.resolve(lines.join('\n'));
  }
}
