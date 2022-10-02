/*
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { join } from 'path';
import * as fs from 'fs';
import { Plugin } from '@oclif/config';
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

export class Docs {
  public constructor(
    private outputDir: string,
    private plugins: JsonMap,
    private hidden: boolean,
    private topicMeta: JsonMap
  ) {}

  public async build(commands: JsonMap[]): Promise<void> {
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

    const subTopicNames = [];
    const commandNames = [];
    for (const subtopic of Object.keys(subtopics)) {
      const subtopicOrCommand = subtopics[subtopic];
      try {
        if (!isArray(subtopicOrCommand)) {
          // If it is not subtopic (array) it is a command in the top-level topic
          const command = subtopicOrCommand;
          const commandMeta = this.resolveCommandMeta(ensureString(command.id), command, 1);
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
        await new MainTopicIntro(topic, subtopic, subtopicMeta).write();

        subTopicNames.push(subtopic);

        // Commands within the sub topic
        const filenames: string[] = [];
        for (const command of subtopicOrCommand) {
          const fullTopic = ensureString(command.id).replace(/:\w+$/, '');
          const commandsInFullTopic = subtopicOrCommand.filter((cmd) => ensureString(cmd.id).startsWith(fullTopic));
          const commandMeta = this.resolveCommandMeta(ensureString(command.id), command, commandsInFullTopic.length);

          filenames.push(await this.populateCommand(topic, subtopic, command, commandMeta));
        }
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
  private groupTopicsAndSubtopics(
    commands: JsonMap[]
  ): Dictionary<Dictionary<Dictionary<unknown> | Array<Dictionary<unknown>>>> {
    const topLevelTopics: Dictionary<Dictionary<Dictionary | Dictionary[]>> = {};

    for (const command of commands) {
      if (command.hidden && !this.hidden) {
        continue;
      }
      const commandParts = ensureString(command.id).split(':');
      if (commandParts.length === 1) {
        continue; // Top level topic command. Just ignore for as it is usually help for the topic.
      }

      const topLevelTopic = commandParts[0];

      const plugin = command.plugin as unknown as Plugin;
      if (this.plugins[plugin.name]) {
        // Also include the namespace on the commands so we don't need to do the split at other times in the code.
        command.topic = topLevelTopic;

        const topics = topLevelTopics[topLevelTopic] || {};

        if (commandParts.length === 2) {
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
          if (isArray(existingSubTopics)) {
            subtopicCommands = existingSubTopics;
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

  private async populateTemplate(commands: JsonMap[]): Promise<void> {
    const topicsAndSubtopics = this.groupTopicsAndSubtopics(commands);

    await new CLIReference().write();
    await copyStaticFile(this.outputDir, templatesDir, 'cli_reference_help.xml');

    const topics = Object.keys(topicsAndSubtopics);

    // Generate one base file with all top-level topics.
    await new BaseDitamap(topics).write();

    for (const topic of topics) {
      events.emit('topic', { topic });
      const subtopics = ensure(topicsAndSubtopics[topic]);
      await this.populateTopic(topic, subtopics);
    }
  }

  private resolveCommandMeta(commandId: string, command, commandsInTopic: number): JsonMap {
    const commandMeta: JsonMap = {};
    // Remove top level topic, since the topic meta is already for that topic
    const commandParts = commandId.split(':');
    let part;
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
        } else {
          // Since there is no command meta, just use the command description since that is what oclif does.
          if (!commandMeta.description) {
            commandMeta.description = command.description;
            commandMeta.longDescription = command.longDescription || punctuate(command.description);
          }
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
