/*
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as fs from 'fs/promises';
import { existsSync } from 'fs';
import * as os from 'os';
import * as path from 'path';
import { SfCommand } from '@salesforce/sf-plugins-core';
import { Command, Flags, Interfaces } from '@oclif/core';
import { Messages, SfError } from '@salesforce/core';
import { AnyJson, ensure, ensureString, JsonMap } from '@salesforce/ts-types';
import chalk = require('chalk');
import { parseJsonMap } from '@salesforce/kit';
import { Ditamap } from '../../ditamap/ditamap';
import { Docs } from '../../docs';
import { CommandClass, events } from '../../utils';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-command-reference', 'main');

export default class CommandReferenceGenerate extends SfCommand<AnyJson> {
  public static description = messages.getMessage('commandDescription');

  public static flags = {
    outputdir: Flags.string({
      char: 'd',
      description: messages.getMessage('outputdirFlagDescription'),
      default: './tmp/root',
    }),
    plugins: Flags.string({
      char: 'p',
      description: messages.getMessage('pluginFlagDescription'),
      multiple: true,
      exclusive: ['all'],
    }),
    all: Flags.boolean({
      char: 'a',
      description: messages.getMessage('allFlagDescription'),
      exclusive: ['plugins'],
    }),
    'ditamap-suffix': Flags.string({
      char: 's',
      description: messages.getMessage('ditamapSuffixFlagDescription'),
      default: Ditamap.SUFFIX,
    }),
    hidden: Flags.boolean({ description: messages.getMessage('hiddenFlagDescription') }),
    erroronwarnings: Flags.boolean({ description: messages.getMessage('erroronwarningFlagDescription') }),
  };

  public async run(): Promise<AnyJson> {
    const { flags } = await this.parse(CommandReferenceGenerate);

    Ditamap.suffix = flags['ditamap-suffix'];

    let pluginNames: string[];
    if (!flags.plugins && !flags.all) {
      const pJsonPath = path.join(process.cwd(), 'package.json');
      if (existsSync(pJsonPath)) {
        const packageJson = parseJsonMap(await fs.readFile(pJsonPath, 'utf-8'));
        pluginNames = [ensureString(packageJson.name)];
      } else {
        throw new SfError(
          "No plugins provided. Provide the '--plugins' flag or cd into a directory that contains a valid oclif plugin."
        );
      }
    } else if (flags.all) {
      const ignore = [
        /@oclif/,
        /@salesforce\/cli/,
        /@salesforce\/plugin-dev/,
        /@salesforce\/plugin-telemetry/,
        /@salesforce\/plugin-command-reference/,
      ];
      pluginNames = this.config.plugins.map((p) => p.name).filter((p) => !ignore.some((i) => i.test(p)));
    } else {
      pluginNames = flags.plugins ?? [];
    }

    const plugins = pluginNames
      .map((plugin) => plugin.trim())
      .map((name) => {
        let pluginName = name;
        let plugin = this.getPlugin(pluginName);

        if (!plugin) {
          pluginName = `@salesforce/plugin-${pluginName}`;
          plugin = this.getPlugin(pluginName);
          if (!plugin) {
            throw new SfError(`Plugin ${name} or ${pluginName} not found. Is it installed?`);
          }
        }
        return pluginName;
      });
    this.log(
      `Generating command reference for the following plugins:${plugins
        .map((name) => `${os.EOL}  - ${name}`)
        .join(', ')}`
    );
    Ditamap.outputDir = flags.outputdir;

    Ditamap.cliVersion = this.config.version.replace(/-[0-9a-zA-Z]+$/, '');
    Ditamap.plugins = this.pluginMap(plugins);
    Ditamap.pluginVersions = plugins.map((name) => {
      const plugin = this.getPlugin(name);
      const version = plugin?.version;
      if (!version) throw new Error(`No version found for plugin ${name}`);
      return { name, version };
    });

    const docs = new Docs(
      Ditamap.outputDir,
      Ditamap.plugins,
      flags.hidden,
      await this.loadTopicMetadata(),
      this.loadCliMeta()
    );

    events.on('topic', ({ topic }: { topic: string }) => {
      this.log(chalk.green(`Generating topic '${topic}'`));
    });

    const warnings: AnyJson[] = [];
    events.on('warning', (msg: AnyJson) => {
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      process.stderr.write(chalk.yellow(`> ${msg}\n`));
      warnings.push(msg);
    });

    const cmnds = await this.loadCommands();
    await docs.build(cmnds);
    this.log(`\nWrote generated doc to ${Ditamap.outputDir}`);

    if (flags.erroronwarnings && warnings.length > 0) {
      throw new SfError(`Found ${warnings.length} warnings.`);
    }

    return { warnings };
  }

  private pluginMap(plugins: string[]): Record<string, unknown> {
    const pluginToParentPlugin: Record<string, unknown> = {};

    const resolveChildPlugins = (parentPlugin: Interfaces.Plugin): void => {
      for (const childPlugin of parentPlugin.pjson.oclif.plugins ?? []) {
        pluginToParentPlugin[childPlugin] = parentPlugin.name;
        resolveChildPlugins(ensure(this.getPlugin(childPlugin)));
      }
    };

    for (const plugin of plugins) {
      const masterPlugin = this.getPlugin(plugin);
      if (!masterPlugin) {
        throw new SfError(`Plugin ${plugin} not found. Is it installed?`);
      }
      pluginToParentPlugin[masterPlugin.name] = masterPlugin.name;
      resolveChildPlugins(masterPlugin);
    }
    return pluginToParentPlugin;
  }

  private getPlugin(pluginName: string): Interfaces.Plugin | undefined {
    return this.config.plugins.find((info) => info.name === pluginName);
  }

  private async loadTopicMetadata(): Promise<JsonMap> {
    const plugins: JsonMap = {};
    const topicsMeta: JsonMap = {};

    for (const cmd of this.config.commands) {
      // Only load topics for each plugin once
      if (cmd.pluginName && !plugins[cmd.pluginName]) {
        // eslint-disable-next-line no-await-in-loop
        const commandClass = await this.loadCommand(cmd);

        if (commandClass.plugin?.pjson.oclif.topics) {
          Object.assign(topicsMeta, commandClass.plugin.pjson.oclif.topics);
          plugins[commandClass.plugin.name] = true;
        }
      }
    }
    return topicsMeta;
  }

  private async loadCommands(): Promise<CommandClass[]> {
    const promises = this.config.commands.map(async (cmd): Promise<CommandClass> => {
      try {
        let commandClass: Command.Class = await this.loadCommand(cmd);
        let obj = Object.assign({}, cmd, commandClass, {
          flags: Object.assign({}, cmd.flags, commandClass.flags),
        });

        // Load all properties on all extending classes.
        while (commandClass !== undefined) {
          commandClass = (Reflect.getPrototypeOf(commandClass) as Command.Class) || undefined;
          obj = Object.assign({}, commandClass, obj, {
            flags: Object.assign({}, commandClass?.flags, obj.flags),
          });
        }

        return obj as unknown as CommandClass;
      } catch (error) {
        return cmd as unknown as CommandClass;
      }
    });
    const commands = await Promise.all(promises);
    return Array.from(
      commands
        .reduce((acc: Map<string, CommandClass>, cmd: CommandClass) => {
          acc.set(cmd.id, cmd);
          return acc;
        }, new Map<string, CommandClass>())
        .values()
    );
  }

  // eslint-disable-next-line class-methods-use-this
  private async loadCommand(command: Command.Loadable): Promise<Command.Class> {
    // eslint-disable-next-line @typescript-eslint/return-await
    return command.load.constructor.name === 'AsyncFunction' ? await command.load() : command.load();
  }

  private loadCliMeta(): JsonMap {
    return {
      binary: this.config.pjson.oclif.bin ?? 'sfdx',
      topicSeparator: this.config.pjson.oclif.topicSeparator,
      state: this.config.pjson.oclif.state,
    };
  }
}
