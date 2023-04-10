/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { Messages } from '@salesforce/core';
import * as chalk from 'chalk';

Messages.importMessagesDirectory(__dirname);
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
    for (const [plugin, version] of Object.entries(this.config.pjson.oclif.jitPlugins ?? [])) {
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
