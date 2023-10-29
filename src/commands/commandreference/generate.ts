/*
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as os from 'node:os';
import { resolve } from 'node:path';
import { Flags, SfCommand } from '@salesforce/sf-plugins-core';
// eslint-disable-next-line sf-plugin/no-oclif-flags-command-import
import { Command, Config, Interfaces } from '@oclif/core';
import { Messages, SfError } from '@salesforce/core';
import { AnyJson, ensure } from '@salesforce/ts-types';
import chalk = require('chalk');
import { PJSON } from '@oclif/core/lib/interfaces';
import { Ditamap } from '../../ditamap/ditamap';
import { Docs } from '../../docs';
import { CliMeta, CommandClass, events, SfTopic, SfTopics } from '../../utils';

// Initialize Messages with the current plugin directory
Messages.importMessagesDirectory(__dirname);
const messages = Messages.loadMessages('@salesforce/plugin-command-reference', 'main');

export type CommandReferenceGenerateResults = {
  warnings: AnyJson[];
};

export default class CommandReferenceGenerate extends SfCommand<CommandReferenceGenerateResults> {
  public static readonly summary = messages.getMessage('commandSummary');
  public static readonly description = messages.getMessage('commandDescription');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    'output-dir': Flags.string({
      char: 'd',
      summary: messages.getMessage('flags.output-dir.summary'),
      aliases: ['outputdir'],
      deprecateAliases: true,
      default: './tmp/root',
    }),
    plugins: Flags.string({
      char: 'p',
      summary: messages.getMessage('flags.plugins.summary'),
      multiple: true,
      exclusive: ['all'],
    }),
    all: Flags.boolean({
      char: 'a',
      summary: messages.getMessage('flags.all.summary'),
      exclusive: ['plugins'],
    }),
    'ditamap-suffix': Flags.string({
      char: 's',
      summary: messages.getMessage('flags.ditamap-suffix.summary'),
      default: Ditamap.SUFFIX,
    }),
    hidden: Flags.boolean({ summary: messages.getMessage('flags.hidden.summary') }),
    'error-on-warnings': Flags.boolean({
      summary: messages.getMessage('flags.error-on-warnings.summary'),
      aliases: ['erroronwarnings'],
      deprecateAliases: true,
    }),
    'config-path': Flags.directory({
      summary: messages.getMessage('flags.config-path.summary'),
      char: 'c',
    }),
  };

  private loadedConfig!: Interfaces.Config;

  public async run(): Promise<CommandReferenceGenerateResults> {
    const { flags } = await this.parse(CommandReferenceGenerate);

    Ditamap.suffix = flags['ditamap-suffix'];

    this.loadedConfig = flags['config-path'] ? await Config.load(resolve(flags['config-path'])) : this.config;

    let pluginNames: string[];
    if (!flags.plugins && !flags.all) {
      pluginNames = this.loadedConfig.plugins.filter((p) => p.type !== 'dev').map((p) => p.name);
    } else if (flags.all) {
      const ignore = [
        /@oclif/,
        /@salesforce\/cli/,
        /@salesforce\/plugin-dev/,
        /@salesforce\/plugin-telemetry/,
        /@salesforce\/plugin-command-reference/,
      ];
      pluginNames = this.loadedConfig.plugins.map((p) => p.name).filter((p) => !ignore.some((i) => i.test(p)));
    } else {
      pluginNames = flags.plugins ?? [];
    }

    if (pluginNames.length === 0) {
      throw new SfError(
        "No plugins provided. Provide the '--plugins' flag or cd into a directory that contains a valid oclif plugin."
      );
    }

    const plugins = pluginNames
      .map((name) => name.trim())
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

    Ditamap.outputDir = flags['output-dir'];

    Ditamap.cliVersion = this.loadedConfig.version.replace(/-[0-9a-zA-Z]+$/, '');
    Ditamap.plugins = this.pluginMap(plugins);
    Ditamap.pluginVersions = plugins.map((name) => {
      const plugin = this.getPlugin(name);
      const version = plugin?.version;
      if (!version) throw new Error(`No version found for plugin ${name}`);
      return { name, version };
    });
    const commands = await this.loadCommands(plugins);
    const topicMetadata = this.loadTopicMetadata(commands);
    const cliMeta = this.loadCliMeta();
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const docs = new Docs(Ditamap.outputDir, flags.hidden, topicMetadata, cliMeta);

    events.on('topic', ({ topic }: { topic: string }) => {
      this.log(chalk.green(`Generating topic '${topic}'`));
    });

    const warnings: AnyJson[] = [];
    events.on('warning', (msg: AnyJson) => {
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      process.stderr.write(chalk.yellow(`> ${msg}\n`));
      warnings.push(msg);
    });

    await docs.build(commands);
    this.log(`\nWrote generated doc to ${Ditamap.outputDir}`);

    if (flags.erroronwarnings && warnings.length > 0) {
      throw new SfError(`Found ${warnings.length} warnings.`);
    }

    return { warnings };
  }

  private pluginMap(plugins: string[]): Record<string, string> {
    const pluginToParentPlugin: Record<string, string> = {};

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
    return this.loadedConfig.plugins.find((info) => info.name === pluginName);
  }

  // eslint-disable-next-line class-methods-use-this
  private loadTopicMetadata(commands: CommandClass[]): SfTopics | undefined {
    const finishedPlugins = new Set<string>();
    const output = new Map<string, SfTopic>();
    commands
      .flatMap((commandClass): SfTopics | undefined => {
        // Only load topics for each plugin once
        if (commandClass.pluginName && !finishedPlugins.has(commandClass.pluginName)) {
          if (commandClass.plugin?.pjson.oclif.topics) {
            finishedPlugins.add(commandClass.plugin.name);
            return objectTopicsToMap(commandClass.plugin.pjson.oclif.topics);
          }
        }
        return undefined;
      })
      .filter((x): x is SfTopics => Boolean(x))
      // we might have the same topic in different plugins, so we need to merge those to avoid Object.fromEntries "last wins" algo
      .map((sfTopics) => {
        sfTopics.forEach((topicInfo, topic) => {
          const existing = output.get(topic);
          if (existing) {
            // merge the topic objects, merge the subtopic maps
            output.set(topic, {
              ...existing,
              ...topicInfo,
              // TODO: this might need to be recursive if keys collide at lower levels
              subtopics:
                existing.subtopics || topicInfo.subtopics
                  ? new Map([...(existing.subtopics ?? []), ...(topicInfo.subtopics ?? [])])
                  : undefined,
            });
          } else {
            output.set(topic, topicInfo);
          }
        });
      });
    return output;
  }

  private async loadCommands(plugins: string[]): Promise<CommandClass[]> {
    const promises = this.loadedConfig.commands
      .filter((cmd) => plugins.includes(cmd.pluginName ?? ''))
      .map(async (cmd): Promise<CommandClass> => {
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

  private loadCliMeta(): CliMeta {
    return {
      binary: this.loadedConfig.pjson.oclif.bin ?? 'sf',
      topicSeparator: this.loadedConfig.pjson.oclif.topicSeparator,
      state: this.loadedConfig.pjson.oclif.state,
    };
  }
}

/** recursively convert the oclif style topics to the command reference topic SfTopicStructure */
const objectTopicsToMap = (pjsonTopics: PJSON.Plugin['oclif']['topics']): SfTopics =>
  new Map<string, SfTopic>(
    Object.entries(pjsonTopics ?? {}).map(([topic, topicInfo]) => {
      if (topicInfo.subtopics) {
        // TODO
        return [topic, { ...topicInfo, name: topic, subtopics: objectTopicsToMap(topicInfo.subtopics) }];
      }
      return [topic, { ...topicInfo, name: topic, subtopics: undefined }];
    })
  );
