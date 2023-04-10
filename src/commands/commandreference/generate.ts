/*
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as os from 'os';
import * as path from 'path';
import { readJSON, pathExists } from 'fs-extra';
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
// we're doing introspective stuff with the oclif Command stuff here, using it as a type
// eslint-disable-next-line sf-plugin/no-oclif-flags-command-import
import { Interfaces, Command } from '@oclif/core';
import { Messages, SfError } from '@salesforce/core';
import { AnyJson, Dictionary, ensure, ensureString, JsonMap } from '@salesforce/ts-types';
import chalk = require('chalk');
import { Ditamap } from '../../ditamap/ditamap';
import { Docs } from '../../docs';
import { events, mergeDeep, CommandClass } from '../../utils';

// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
const uniqBy = require('lodash.uniqby');

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-command-reference', 'main');

export default class CommandReferenceGenerate extends SfCommand<AnyJson> {
  public static readonly summary = messages.getMessage('commandDescription');
  public static readonly description = messages.getMessage('commandDescription');

  public static readonly flags = {
    outputdir: Flags.string({
      char: 'd',
      summary: messages.getMessage('outputdirFlagDescription'),
      default: './tmp/root',
    }),
    plugins: Flags.string({
      char: 'p',
      summary: messages.getMessage('pluginFlagDescription'),
      multiple: true,
      exclusive: ['all'],
    }),
    all: Flags.boolean({
      char: 'a',
      summary: messages.getMessage('allFlagDescription'),
      exclusive: ['plugins'],
    }),
    'ditamap-suffix': Flags.string({
      char: 's',
      summary: messages.getMessage('ditamapSuffixFlagDescription'),
      default: Ditamap.SUFFIX,
    }),
    hidden: Flags.boolean({ summary: messages.getMessage('hiddenFlagDescription') }),
    erroronwarnings: Flags.boolean({ summary: messages.getMessage('erroronwarningFlagDescription') }),
  };

  public async run(): Promise<AnyJson> {
    const { flags } = await this.parse(CommandReferenceGenerate);

    Ditamap.suffix = flags['ditamap-suffix'];

    let pluginNames: string[];
    if (!flags.plugins && !flags.all) {
      const pJsonPath = path.join(process.cwd(), 'package.json');
      if (await pathExists(pJsonPath)) {
        const packageJson = (await readJSON(pJsonPath)) as unknown as { name: string };
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

    const warnings: string[] = [];
    events.on('warning', (msg: string) => {
      process.stderr.write(chalk.yellow(`> ${msg}\n`));
      warnings.push(msg);
    });

    await docs.build(await this.loadCommands());
    this.log(`\nWrote generated doc to ${Ditamap.outputDir}`);

    if (flags.erroronwarnings && warnings.length > 0) {
      throw new SfError(`Found ${warnings.length} warnings.`);
    }

    return { warnings };
  }

  private pluginMap(plugins: string[]): JsonMap {
    const pluginToParentPlugin: JsonMap = {};

    const resolveChildPlugins = (parentPlugin: Interfaces.Plugin) => {
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

  private async loadTopicMetadata() {
    const plugins: Dictionary<boolean> = {};
    const topicsMeta = {};

    for (const cmd of this.config.commands) {
      // Only load topics for each plugin once
      if (cmd.pluginName && !plugins[cmd.pluginName]) {
        // eslint-disable-next-line no-await-in-loop
        const commandClass = await loadCommand(cmd);

        if (commandClass.plugin?.pjson.oclif.topics) {
          mergeDeep(topicsMeta, commandClass.plugin.pjson.oclif.topics as Dictionary);
          plugins[commandClass.plugin.name] = true;
        }
      }
    }
    return topicsMeta;
  }

  private async loadCommands(): Promise<CommandClass[]> {
    const promises = this.config.commands.map(async (cmd) => {
      try {
        let commandClass = await loadCommand(cmd);
        let obj = Object.assign({} as JsonMap, cmd, commandClass, {
          flags: Object.assign({}, cmd.flags, commandClass.flags),
        });

        // Load all properties on all extending classes.
        while (commandClass !== undefined) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          commandClass = Object.getPrototypeOf(commandClass) ?? undefined;
          obj = Object.assign({}, commandClass, obj, {
            flags: Object.assign({}, commandClass?.flags, obj.flags),
          });
        }

        return obj;
      } catch (error) {
        return Object.assign({}, cmd);
      }
    });
    const commands = await Promise.all(promises);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return uniqBy(commands, 'id');
  }

  private loadCliMeta(): JsonMap {
    return {
      binary: this.config.pjson.oclif.bin ?? 'sfdx',
      topicSeparator: this.config.pjson.oclif.topicSeparator,
      state: this.config.pjson.oclif.state,
    };
  }
}

const loadCommand = (command: Command.Loadable): Promise<Command.Class> =>
  command.load.constructor.name === 'AsyncFunction' ? command.load() : command.load();
