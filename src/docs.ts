/*
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { join } from 'path';
import * as fs from 'fs';
import {
  asString,
  Dictionary,
  ensure,
  ensureArray,
  ensureJsonMap,
  ensureString,
  isArray,
  JsonMap,
} from '@salesforce/ts-types';
import * as OclifCommand from '@oclif/command';
import * as chalk from 'chalk';
import { BaseDitamap } from './ditamap/base-ditamap';
import { CLIReference } from './ditamap/cli-reference';
import { CLIReferenceTopic } from './ditamap/cli-reference-topic';
import { Command } from './ditamap/command';
import { MainTopicIntro } from './ditamap/main-topic-intro';
import { SubTopicDitamap } from './ditamap/subtopic-ditamap';
import { TopicDitamap } from './ditamap/topic-ditamap';
import { copyStaticFile, events, punctuate } from './utils';

const templatesDir = join(__dirname, '..', 'templates');

type CommandClass = OclifCommand.Command & {
  topic: string;
  subtopic: string;
  plugin: JsonMap & { name: string };
} & JsonMap;

export class Docs {
  public constructor(
    private outputDir: string,
    private plugins: JsonMap,
    private hidden: boolean,
    private topicMeta: JsonMap
  ) {}

  public async build(commands: CommandClass[]): Promise<void> {
    // Create if doesn't exist
    await fs.promises.mkdir(this.outputDir, { recursive: true });

    await this.populateTemplate(commands);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async populateTopic(topic: string, subtopics: Dictionary<Dictionary | Dictionary[]>): Promise<any[]> {
    const topicMeta = ensureJsonMap(
      this.topicMeta[topic],
      `No topic meta for ${topic} - add this topic to the oclif section of the package.json.`
    );
    let description = asString(topicMeta.longDescription);
    if (!description && !topicMeta.external) {
      // Punctuate the description in place of longDescription
      description = punctuate(asString(topicMeta.description));
      if (!description) {
        events.emit(
          'warning',
          `No description for topic ${chalk.bold(
            topic
          )}. Skipping until topic owner adds topic metadata, that includes longDescription, in the oclif section in the package.json file within their plugin.`
        );
        return;
      }
    }
    await new CLIReferenceTopic(topic, description).write();

    const subTopicNames: string[] = [];
    const commandNames: string[] = [];
    for (const subtopic of Object.keys(subtopics)) {
      const subtopicOrCommand = subtopics[subtopic];
      try {
        if (!isArray(subtopicOrCommand)) {
          // If it is not subtopic (array) it is a command in the top-level topic
          const command = subtopicOrCommand;
          const commandMeta = this.resolveCommandMeta(ensureString(command.id), command, 1);
          // eslint-disable-next-line no-await-in-loop
          await this.populateCommand(topic, null, command, commandMeta);
          commandNames.push(subtopic);
          continue;
        }

        const subTopicsMeta = ensureJsonMap(topicMeta.subtopics);

        if (!subTopicsMeta[subtopic]) {
          const fullTopicPath = `${topic}:${subtopic}`;
          events.emit(
            'warning',
            `No metadata for topic ${chalk.bold(
              fullTopicPath
            )}. That topic owner must add topic metadata in the oclif section in the package.json file within their plugin.`
          );
          continue;
        }

        const subtopicMeta = ensureJsonMap(subTopicsMeta[subtopic]);

        // The intro doc for this topic
        // eslint-disable-next-line no-await-in-loop
        await new MainTopicIntro(topic, subtopic, subtopicMeta).write();

        subTopicNames.push(subtopic);

        // Commands within the sub topic
        const filenames: string[] = [];
        for (const command of subtopicOrCommand) {
          const fullTopic = ensureString(command.id).replace(/:\w+$/, '');
          const commandsInFullTopic = subtopicOrCommand.filter((cmd) => ensureString(cmd.id).startsWith(fullTopic));
          const commandMeta = this.resolveCommandMeta(ensureString(command.id), command, commandsInFullTopic.length);

          // eslint-disable-next-line no-await-in-loop
          filenames.push(await this.populateCommand(topic, subtopic, command, commandMeta));
        }
        // eslint-disable-next-line no-await-in-loop
        await new SubTopicDitamap(topic, subtopic, filenames).write();
      } catch (error) {
        events.emit('warning', `Can't create topic for ${topic}:${subtopic}: ${error.message}\n`);
      }
    }

    // The topic ditamap with all of the subtopic links.
    events.emit('subtopics', topic, subTopicNames);
    await new TopicDitamap(topic, subTopicNames, commandNames).write();
    return subTopicNames;
  }

  /**
   * Group all commands by the top level topic and then subtopic. e.g. force, analytics, evergreen, etc
   * then org, apex, etc within the force namespace.
   *
   * @param commands - The entire set of command data.
   * @returns The commands grouped by topics/subtopic/commands.
   */
  private groupTopicsAndSubtopics(commands: CommandClass[]): Dictionary<Dictionary<CommandClass | CommandClass[]>> {
    const topLevelTopics: Dictionary<Dictionary<CommandClass | CommandClass[]>> = {};

    for (const command of commands) {
      if (command.hidden && !this.hidden) {
        continue;
      }
      const commandParts = ensureString(command.id).split(':');
      const topLevelTopic = commandParts[0];

      const plugin = command.plugin;

      if (this.plugins[plugin.name]) {
        // Also include the namespace on the commands so we don't need to do the split at other times in the code.
        command.topic = topLevelTopic;

        const topics = topLevelTopics[topLevelTopic] || {};

        if (commandParts.length === 1) {
          // This is a top-level topic that is also a command
          topics[commandParts[0]] = command;
        } else if (commandParts.length === 2) {
          // This is a command directly under the top-level topic
          topics[commandParts[1]] = command;
        } else {
          const subtopic = commandParts[1];

          try {
            const topicMeta = ensureJsonMap(this.topicMeta[topLevelTopic]);
            const subTopicsMeta = ensureJsonMap(topicMeta.subtopics);
            if (subTopicsMeta.hidden && !this.hidden) {
              continue;
            }
          } catch (e) {
            // It means no meta so it isn't hidden, although it should always fail before here with no meta found
          }

          command.subtopic = subtopic;

          const existingSubTopics = topics[subtopic];
          let subtopicCommands = [];
          if (existingSubTopics) {
            subtopicCommands = isArray(existingSubTopics) ? existingSubTopics : [existingSubTopics];
          }
          ensureArray(subtopicCommands);
          subtopicCommands.push(command);
          topics[subtopic] = subtopicCommands;
        }

        topLevelTopics[topLevelTopic] = topics;
      }
    }

    return topLevelTopics;
  }

  private async populateTemplate(commands: CommandClass[]): Promise<void> {
    const topicsAndSubtopics = this.groupTopicsAndSubtopics(commands);

    await new CLIReference().write();
    await copyStaticFile(this.outputDir, templatesDir, 'cli_reference_help.xml');

    const topics = Object.keys(topicsAndSubtopics);

    // Generate one base file with all top-level topics.
    await new BaseDitamap(topics).write();

    await Promise.all(
      topics.map((topic) => {
        events.emit('topic', { topic });
        const subtopics = ensure(topicsAndSubtopics[topic]);
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        return this.populateTopic(topic, subtopics);
      })
    );
  }

  private resolveCommandMeta(commandId: string, command, commandsInTopic: number): JsonMap {
    const commandMeta: JsonMap & { longDescription?: string; description?: string } = {};
    // Remove top level topic, since the topic meta is already for that topic
    const commandParts = commandId.split(':');
    let part: string;
    try {
      let currentMeta: JsonMap | undefined;
      for (part of commandParts) {
        if (currentMeta) {
          const subtopics = ensureJsonMap(currentMeta.subtopics);
          currentMeta = ensureJsonMap(subtopics[part]);
        } else {
          currentMeta = ensureJsonMap(this.topicMeta[part]);
        }

        // Collect all tiers of the meta, so the command will also pick up the topic state (isPilot, etc) if applicable
        Object.assign(commandMeta, currentMeta);
      }
    } catch (error) {
      if (commandId.endsWith(part)) {
        // This means there wasn't meta information going all the way down to the command, which is ok.
        return commandMeta;
      } else if (commandsInTopic !== 1) {
        events.emit('warning', `subtopic "${part}" meta not found for command ${commandId}`);
      } else if (!commandMeta.description) {
        // Since there is no command meta, just use the command description since that is what oclif does.
        commandMeta.description = command.description;
        commandMeta.longDescription = command.longDescription ?? punctuate(command.description as string);
      }
    }
    return commandMeta;
  }

  private async populateCommand(
    topic: string,
    subtopic: string,
    command: Dictionary,
    commandMeta: JsonMap
  ): Promise<string> {
    // If it is a hidden command - abort
    if (command.hidden && !this.hidden) {
      return '';
    }

    const commandDitamap = new Command(topic, subtopic, command, commandMeta);
    await commandDitamap.write();
    return commandDitamap.getFilename();
  }
}
