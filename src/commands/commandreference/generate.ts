/*
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { IPlugin } from '@oclif/config';
import { flags, SfdxCommand } from '@salesforce/command';
import { fs, Messages, SfdxError } from '@salesforce/core';
import { AnyJson, Dictionary, ensure, getString, JsonMap } from '@salesforce/ts-types';
import chalk = require('chalk');
import * as os from 'os';
import * as path from 'path';
import { Ditamap } from '../../ditamap/ditamap';
import { Docs } from '../../docs';
import { events, mergeDeep } from '../../utils';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);

// Load the specific messages for this file. Messages from @salesforce/command, @salesforce/core,
// or any library that is using the messages framework can also be loaded this way.
const messages = Messages.loadMessages('@salesforce/plugin-command-reference', 'main');

export default class CommandReferenceGenerate extends SfdxCommand {
  public static description = messages.getMessage('commandDescription');

  public static args = [{ name: 'file' }];

  protected static flagsConfig = {
    outputdir: flags.string({
      char: 'd',
      description: messages.getMessage('outputdirFlagDescription'),
      default: './tmp/root'
    }),
    plugins: flags.array({
      char: 'p',
      description: messages.getMessage('pluginFlagDescription')
    }),
    'ditamap-suffix': flags.string({
      char: 'b',
      description: messages.getMessage('ditamapSuffixFlagDescription'),
      default: Ditamap.SUFFIX
    }),
    hidden: flags.boolean({ description: messages.getMessage('hiddenFlagDescription') }),
    erroronwarnings: flags.boolean({ description: messages.getMessage('erroronwarningFlagDescription') })
  };

  public async run(): Promise<AnyJson> {
    Ditamap.suffix = this.flags['ditamap-suffix'];

    let pluginNames: string[];
    if (!this.flags.plugins) {
      const pJsonPath = path.join(process.cwd(), 'package.json');
      if (await fs.fileExists(pJsonPath)) {
        const packageJson = await fs.readJson(pJsonPath);
        pluginNames = [getString(packageJson, 'name')];
      } else {
        throw new SfdxError(
          "No plugins provided. Provide the '--plugins' flag or cd into a directory that contains a valid oclif plugin."
        );
      }
    } else {
      pluginNames = this.flags.plugins;
    }

    const plugins = pluginNames
      .map(plugin => plugin.trim())
      .map(name => {
        let pluginName = name;
        let plugin = this.getPlugin(pluginName);

        if (!plugin) {
          pluginName = `@salesforce/plugin-${pluginName}`;
          plugin = this.getPlugin(pluginName);
          if (!plugin) {
            throw new SfdxError(`Plugin ${name} or ${pluginName} not found. Is it installed?`);
          }
        }
        return pluginName;
      });
    this.ux.log(
      `Generating command reference for the following plugins:${plugins.map(name => `${os.EOL}  - ${name}`)}`
    );
    Ditamap.outputDir = this.flags.outputdir;

    Ditamap.cliVersion = this.config.version.replace(/-[0-9a-zA-Z]+$/, '');
    Ditamap.plugins = this.pluginMap(plugins);
    Ditamap.pluginVersions = plugins.map(name => {
      const plugin = this.getPlugin(name);
      const version = plugin && plugin.version;
      if (!version) throw new Error(`No version found for plugin ${name}`);
      return { name, version };
    });

    const docs = new Docs(
      Ditamap.outputDir,
      Ditamap.plugins,
      this.flags.hidden,
      await this.loadTopicMetadata(),
      await this.loadCliMeta()
    );

    events.on('topic', ({ topic }) => {
      this.log(chalk.green(`Generating topic '${topic}'`));
    });

    const warnings = [];
    events.on('warning', msg => {
      process.stderr.write(chalk.yellow(`> ${msg}\n`));
      warnings.push(msg);
    });

    await docs.build(await this.loadCommands());
    this.log(`\nWrote generated doc to ${Ditamap.outputDir}`);

    if (this.flags.erroronwarnings && warnings.length > 0) {
      throw new SfdxError(`Found ${warnings.length} warnings.`);
    }

    return { warnings };
  }

  private pluginMap(plugins: string[]) {
    const pluginToParentPlugin: JsonMap = {};

    const resolveChildPlugins = (parentPlugin: IPlugin) => {
      for (const childPlugin of parentPlugin.pjson.oclif.plugins || []) {
        pluginToParentPlugin[childPlugin] = parentPlugin.name;
        resolveChildPlugins(ensure(this.getPlugin(childPlugin)));
      }
    };

    for (const plugin of plugins) {
      const masterPlugin = this.getPlugin(plugin);
      if (!masterPlugin) {
        throw new SfdxError(`Plugin ${plugin} not found. Is it installed?`);
      }
      pluginToParentPlugin[masterPlugin.name] = masterPlugin.name;
      resolveChildPlugins(masterPlugin);
    }
    return pluginToParentPlugin;
  }

  private getPlugin(pluginName: string) {
    return this.config.plugins.find(info => info.name === pluginName);
  }

  private async loadTopicMetadata() {
    const plugins: Dictionary<boolean> = {};
    const topicsMeta = {};

    for (const cmd of this.config.commands) {
      // Only load topics for each plugin once
      if (cmd.pluginName && !plugins[cmd.pluginName]) {
        const commandClass = await this.loadCommand(cmd);

        if (commandClass.plugin && commandClass.plugin.pjson.oclif.topics) {
          mergeDeep(topicsMeta, commandClass.plugin.pjson.oclif.topics as Dictionary);
          plugins[commandClass.plugin.name] = true;
        }
      }
    }
    return topicsMeta;
  }

  private async loadCommands() {
    const promises = this.config.commands.map(async cmd => {
      try {
        let commandClass = await this.loadCommand(cmd);
        let obj = Object.assign({} as JsonMap, cmd, commandClass, {
          flags: Object.assign({}, cmd.flags, commandClass.flags)
        });

        // Load all properties on all extending classes.
        while (commandClass !== undefined) {
          commandClass = Object.getPrototypeOf(commandClass) || undefined;
          obj = Object.assign({}, commandClass, obj, {
            flags: Object.assign({}, commandClass && commandClass.flags, obj.flags)
          });
        }

        return obj;
      } catch (error) {
        return Object.assign({} as JsonMap, cmd);
      }
    });
    return Promise.all(promises);
  }

  private async loadCommand(command) {
    return command.load.constructor.name === 'AsyncFunction' ? await command.load() : command.load();
  }

  private async loadCliMeta(): Promise<JsonMap> {
    const packageJson = await fs.readJson(path.join(process.cwd(), 'package.json'));
    return {
      binary: getString(packageJson, 'oclif.bin', 'sfdx'),
      topicSeparator: getString(packageJson, 'oclif.topicSeparator', ':'),
      state: getString(packageJson, 'oclif.state', null)
    };
  }
}
