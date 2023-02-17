/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { Messages } from '@salesforce/core';

Messages.importMessagesDirectory(__dirname);
const messages = Messages.load('@salesforce/plugin-command-reference', 'jit.install', [
  'summary',
  'examples',
  'flags.dry-run.summary',
]);

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
    const plugins = this.config.plugins
      .find((p) => p.name === this.config.pjson.name)
      .commands.reduce((result, current) => {
        if (current.pluginType !== 'jit') return result;
        return result.includes(current.pluginName) ? result : [...result, current.pluginName];
      }, []);

    if (flags['dry-run']) {
      this.styledHeader('Install all JIT Plugins (dry-run)');
      for (const plugin of plugins) this.log(`• ${plugin}`);
    } else {
      this.styledHeader('Install all JIT Plugins');
      for (const plugin of plugins) {
        this.log(`• ${plugin}`);
        await this.config.runCommand(`plugins:install ${plugin}`);
      }
    }
  }
}
