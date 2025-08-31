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

import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { Messages } from '@salesforce/core';
import chalk from 'chalk';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@salesforce/plugin-command-reference', 'jit.install');

export default class JitInstall extends SfCommand<void> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    'dry-run': Flags.boolean({
      char: 'd',
      summary: messages.getMessage('flags.dry-run.summary'),
    }),
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(JitInstall);

    this.styledHeader(`Install all JIT Plugins${flags['dry-run'] ? ' (dry-run)' : ''}`);
    for (const [plugin, version] of Object.entries(this.config.pjson.oclif.jitPlugins ?? {})) {
      this.log(`• ${plugin} ${chalk.dim(version)}`);
      if (flags['dry-run']) continue;
      try {
        // eslint-disable-next-line no-await-in-loop
        await this.config.runCommand('plugins:install', [`${plugin}@${version}`]);
      } catch {
        this.log(`Failed to install ${plugin} ${chalk.dim(version)}.`);
      }
    }
  }
}
