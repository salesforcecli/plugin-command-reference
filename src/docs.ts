/*
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as fs from 'fs/promises';
import {
  AnyJson,
  asString,
  Dictionary,
  ensure,
  ensureArray,
  ensureJsonMap,
  ensureObject,
  ensureString,
  isArray,
  JsonMap,
} from '@salesforce/ts-types';
import * as chalk from 'chalk';
import { BaseDitamap } from './ditamap/base-ditamap';
import { CLIReference } from './ditamap/cli-reference';
import { Command } from './ditamap/command';
import { TopicCommands } from './ditamap/topic-commands';
import { TopicDitamap } from './ditamap/topic-ditamap';
import { CommandClass, events, punctuate } from './utils';
import { HelpReference } from './ditamap/help-reference';

function emitNoTopicMetadataWarning(topic: string): void {
  events.emit(
    'warning',
    `No metadata for topic ${chalk.bold(
      topic
    )}. That topic owner must add topic metadata in the oclif section in the package.json file within their plugin.`
  );
}

export class Docs {
  public constructor(
    private outputDir: string,
    private plugins: Record<string, unknown>,
    private hidden: boolean,
    private topicMeta: Record<string, unknown>,
    private cliMeta: Record<string, unknown>
  ) {}

  public async build(commands: CommandClass[]): Promise<void> {
    // Create if doesn't exist
    await fs.mkdir(this.outputDir, { recursive: true });

    await this.populateTemplate(commands);
  }

  public async populateTopic(topic: string, subtopics: Dictionary<CommandClass | CommandClass[]>): Promise<AnyJson[]> {
    if (!this.topicMeta?.[topic]) {
      throw new Error(`No topic meta for ${topic} - add this topic to the oclif section of the package.json.`);
    }

    const topicMeta: JsonMap = (this.topicMeta[topic] ?? {}) as JsonMap;

    let description = asString(topicMeta.description);
    if (!description && !topicMeta.external) {
      // TODO: check why the same property is used again when it is already used above
      description = punctuate(asString(topicMeta.description));
      if (!description) {
        events.emit(
          'warning',
          `No description for topic ${chalk.bold(
            topic
          )}. Skipping until topic owner adds topic metadata in the oclif section in the package.json file within their plugin.`
        );
        return [];
      }
    }

    const subTopicNames = [];
    const commandIds = [];

    for (const subtopic of Object.keys(subtopics)) {
      const subtopicOrCommand = isArray(subtopics[subtopic])
        ? Object.assign([], subtopics[subtopic])
        : Object.assign({}, subtopics[subtopic]);

      try {
        if (!isArray(subtopicOrCommand)) {
          // If it is not subtopic (array) it is a command in the top-level topic
          const command = Object.assign({}, subtopicOrCommand);
          const commandMeta = this.resolveCommandMeta(ensureString(command.id), command, 1);
          // eslint-disable-next-line no-await-in-loop
          await this.populateCommand(topic, null, command, commandMeta);
          commandIds.push(command.id);
          continue;
        }

        const subTopicsMeta = ensureJsonMap(topicMeta.subtopics);

        if (!subTopicsMeta[subtopic]) {
          emitNoTopicMetadataWarning(`${topic}:${subtopic}`);
          continue;
        }

        subTopicNames.push(subtopic);

        // Commands within the sub topic
        for (const command of subtopicOrCommand) {
          const fullTopic = ensureString(command.id).replace(/:\w+$/, '');
          const commandsInFullTopic = subtopicOrCommand.filter((cmd) => ensureString(cmd.id).startsWith(fullTopic));
          const commandMeta = this.resolveCommandMeta(ensureString(command.id), command, commandsInFullTopic.length);

          // eslint-disable-next-line no-await-in-loop
          await this.populateCommand(topic, subtopic, command, commandMeta);
          commandIds.push(command.id);
        }
      } catch (error) {
        const err =
          error instanceof Error ? error : typeof error === 'string' ? new Error(error) : new Error('Unknown error');
        if (err.name === 'UnexpectedValueTypeError') {
          emitNoTopicMetadataWarning(`${topic}:${subtopic}`);
        } else {
          events.emit('warning', `Can't create topic for ${topic}:${subtopic}: ${err.message}\n`);
        }
      }
    }

    // The topic ditamap with all of the subtopic links.
    events.emit('subtopics', topic, subTopicNames);

    await new TopicCommands(topic, topicMeta).write();
    await new TopicDitamap(topic, commandIds).write();
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
      if (plugin && this.plugins[plugin.name]) {
        // Also include the namespace on the commands so we don't need to do the split at other times in the code.
        command.topic = topLevelTopic;

        const topics = topLevelTopics[topLevelTopic] ?? {};

        if (commandParts.length === 1) {
          // This is a top-level topic that is also a command
          topics[commandParts[0]] = command;
        } else if (commandParts.length === 2) {
          // This is a command directly under the top-level topic
          topics[commandParts[1]] = command;
        } else {
          const subtopic = commandParts[1];

          try {
            const topicMeta = ensureObject<Record<string, unknown>>(this.topicMeta[topLevelTopic]);
            const subTopicsMeta = ensureObject<Record<string, unknown>>(topicMeta.subtopics);
            if (subTopicsMeta.hidden && !this.hidden) {
              continue;
            }
          } catch (e) {
            // It means no meta so it isn't hidden, although it should always fail before here with no meta found
          }

          command.subtopic = subtopic;

          const existingSubTopics = topics[subtopic];
          let subtopicCommands: CommandClass[] = [];
          if (existingSubTopics) {
            subtopicCommands = ensureArray(existingSubTopics);
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
    await new HelpReference().write();

    const topics = Object.keys(topicsAndSubtopics);

    // Generate one base file with all top-level topics.
    await new BaseDitamap(topics).write();

    for (const topic of topics) {
      events.emit('topic', { topic });
      const subtopics = ensure(topicsAndSubtopics[topic]);
      // eslint-disable-next-line no-await-in-loop
      await this.populateTopic(topic, subtopics);
    }
  }

  private resolveCommandMeta(
    commandId: string,
    command: CommandClass,
    commandsInTopic: number
  ): Record<string, unknown> {
    const commandMeta = Object.assign({}, this.cliMeta);
    // Remove top level topic, since the topic meta is already for that topic
    const commandParts = commandId.split(':');
    let part;
    try {
      let currentMeta: Record<string, unknown> | undefined;
      for (part of commandParts) {
        if (currentMeta) {
          const subtopics = ensureObject<Record<string, unknown>>(currentMeta.subtopics);
          currentMeta = ensureObject<Record<string, unknown>>(subtopics[part]);
        } else {
          currentMeta = ensureObject<Record<string, unknown>>(this.topicMeta[part]);
        }

        // Collect all tiers of the meta, so the command will also pick up the topic state (isPilot, etc) if applicable
        Object.assign({}, commandMeta, currentMeta);
      }
    } catch (error) {
      // @ts-expect-error: part may be undefined
      if (commandId.endsWith(part)) {
        // This means there wasn't meta information going all the way down to the command, which is ok.
        return commandMeta;
      } else if (commandsInTopic !== 1) {
        events.emit('warning', `subtopic "${part}" meta not found for command ${commandId}`);
      } else if (!commandMeta.description) {
        commandMeta.description = command.description;
        commandMeta.longDescription = (
          command.longDescription ? command.longDescription : punctuate(command.description)
        ) as AnyJson;
      }
    }
    return commandMeta;
  }

  private async populateCommand(
    topic: string,
    subtopic: string | null,
    command: CommandClass,
    commandMeta: Record<string, unknown>
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
