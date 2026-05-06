/*
 * Copyright 2026, Salesforce, Inc.
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

import fs from 'node:fs/promises';
import { AnyJson, ensureString } from '@salesforce/ts-types';
import chalk from 'chalk';
import { CliMeta, events, punctuate, SfTopic, SfTopics, CommandClass } from './utils.js';
import {
  DitaGeneratorFactory,
  GeneratorFactory,
  MarkdownGeneratorFactory,
  OutputFormat,
  TocTopicEntry,
} from './generator-factory.js';

type TopicsByTopicsByTopLevel = Map<string, Map<string, CommandClass[]>>;

function emitNoTopicMetadataWarning(topic: string): void {
  events.emit(
    'warning',
    `No metadata for topic ${chalk.bold(
      topic
    )}. That topic owner must add topic metadata in the oclif section in the package.json file within their plugin.`
  );
}

export class Docs {
  private factory: GeneratorFactory;

  public constructor(
    private outputDir: string,
    outputFormat: OutputFormat,
    private hidden: boolean,
    private topicMeta: SfTopics,
    private cliMeta: CliMeta
  ) {
    this.factory = outputFormat === 'markdown' ? new MarkdownGeneratorFactory(outputDir) : new DitaGeneratorFactory();
  }

  public async build(commands: CommandClass[]): Promise<void> {
    // Create if doesn't exist
    await fs.mkdir(this.outputDir, { recursive: true });

    await this.populateTemplate(commands);
  }

  public async populateTopic(topic: string, subtopics: Map<string, CommandClass[]>): Promise<AnyJson[]> {
    const topicMeta = this.topicMeta.get(topic);
    if (!topicMeta) {
      throw new Error(`No topic meta for ${topic} - add this topic to the oclif section of the package.json.`);
    }

    let description = topicMeta.description;
    if (!description && !topicMeta.external) {
      // TODO: check why the same property is used again when it is already used above
      description = punctuate(topicMeta.description);
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

    for (const [subtopic, classes] of subtopics.entries()) {
      try {
        subTopicNames.push(subtopic);

        // Commands within the sub topic
        for (const command of classes) {
          const fullTopic = ensureString(command.id).replace(/:\w+$/, '');
          const commandsInFullTopic = classes.filter((cmd) => ensureString(cmd.id).startsWith(fullTopic));
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

    await this.factory.createTopicCommands(topic, topicMeta).write();
    await this.factory.createTopicIndex(topic, commandIds).write();
    return subTopicNames;
  }

  /**
   * Group all commands by the top level topic and then subtopic. e.g. force, analytics, evergreen, etc
   * then org, apex, etc within the force namespace.
   *
   * @param commands - The entire set of command data.
   * @returns The commands grouped by topics/subtopic/commands.
   */
  private groupTopicsAndSubtopics(commands: CommandClass[]): TopicsByTopicsByTopLevel {
    const topLevelTopics = new Map<string, Map<string, CommandClass[]>>();

    for (const command of commands) {
      if (command.hidden && !this.hidden) {
        continue;
      }
      const commandParts = ensureString(command.id).split(':');
      const topLevelTopic = commandParts[0];

      const plugin = command.plugin;
      if (plugin) {
        command.topic = topLevelTopic;

        const existingTopicsForTopLevel = topLevelTopics.get(topLevelTopic) ?? new Map<string, CommandClass[]>();

        if (commandParts.length === 1) {
          const existingTarget = existingTopicsForTopLevel.get(commandParts[0]) ?? [];
          existingTopicsForTopLevel.set(commandParts[0], [...existingTarget, command]);
        } else if (commandParts.length === 2) {
          const existingTarget = existingTopicsForTopLevel.get(commandParts[1]) ?? [];
          existingTopicsForTopLevel.set(commandParts[1], [...existingTarget, command]);
        } else {
          const subtopic = commandParts[1];

          try {
            const topicMeta = this.topicMeta.get(topLevelTopic);
            const subTopicsMeta = topicMeta?.subtopics?.get(subtopic);
            if (subTopicsMeta?.hidden && !this.hidden) {
              continue;
            }
          } catch (e) {
            // It means no meta so it isn't hidden, although it should always fail before here with no meta found
          }

          command.subtopic = subtopic;

          const subtopicCommands = existingTopicsForTopLevel.get(subtopic) ?? [];
          existingTopicsForTopLevel.set(subtopic, [...subtopicCommands, command]);
        }

        topLevelTopics.set(topLevelTopic, existingTopicsForTopLevel);
      }
    }

    return topLevelTopics;
  }

  private async populateTemplate(commands: CommandClass[]): Promise<void> {
    const topicsAndSubtopics = this.groupTopicsAndSubtopics(commands);

    await this.factory.createCliReference(Array.from(topicsAndSubtopics.keys())).write();

    const helpReference = this.factory.createHelpReference();
    if (helpReference) await helpReference.write();

    const rootIndex = this.factory.createRootIndex(Array.from(topicsAndSubtopics.keys()));
    if (rootIndex) await rootIndex.write();

    const tocEntries: TocTopicEntry[] = [];
    for (const [topic, subtopics] of topicsAndSubtopics.entries()) {
      events.emit('topic', { topic });
      // eslint-disable-next-line no-await-in-loop
      await this.populateTopic(topic, subtopics);
      const commandIds = [...subtopics.values()]
        .flat()
        .filter((cmd) => !cmd.hidden || this.hidden)
        .map((cmd) => ({ id: ensureString(cmd.id), state: cmd.state }));
      tocEntries.push({ topic, commandIds });
    }

    const toc = this.factory.createToc(tocEntries);
    if (toc) await toc.write();
  }

  private resolveCommandMeta(
    commandId: string,
    command: CommandClass,
    commandsInTopic: number
  ): Record<string, unknown> {
    const commandMeta = Object.assign({}, this.cliMeta);
    // Remove top level topic, since the topic meta is already for that topic
    const commandParts = commandId.split(':');
    let part: string | undefined;
    try {
      let currentMeta: SfTopic | undefined;
      for (part of commandParts) {
        if (currentMeta) {
          const subtopics = currentMeta.subtopics;
          currentMeta = subtopics?.get(part);
        } else {
          currentMeta = this.topicMeta.get(part);
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

    const commandGenerator = this.factory.createCommand(topic, subtopic, command, commandMeta);
    await commandGenerator.write();
    return commandGenerator.getFilename();
  }
}
