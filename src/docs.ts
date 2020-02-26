/*
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {Plugin} from '@oclif/config';
import {fs} from '@salesforce/core';
import {asString, Dictionary, ensure, ensureJsonMap, ensureString, JsonMap, ensureArray, isArray} from '@salesforce/ts-types';
import * as chalk from 'chalk';
import {BaseDitamap} from './ditamap/base-ditamap';
import { CLIReference } from './ditamap/cli-reference';
import {CLIReferenceTopic} from './ditamap/cli-reference-topic';
import {Command} from './ditamap/command';
import {MainTopicIntro} from './ditamap/main-topic-intro';
import {SubTopicDitamap} from './ditamap/subtopic-ditamap';
import {TopicDitamap} from './ditamap/topic-ditamap';
import {copyStaticFile, events} from './utils';

const templatesDir = 'templates';

export class Docs {
  public constructor(
    private outputDir: string,
    private plugins: JsonMap,
    private hidden: boolean,
    private topicMeta: JsonMap
  ) {}

  /**
   * Take CLI help json output and transform into dita map format
   * @param options - array of command line options (args)
   */
  public async build(commands: JsonMap[]) {
    // Create if doesn't exist
    await fs.mkdirp(this.outputDir);

    await this.populateTemplate(commands);
  }

  /**
   * Create the descriptor xml file for the main level topic
   * @param namespace
   * @param results
   * @param rootOutputDir
   */
  public async populateTopic(topic: string, subtopics: Dictionary<Dictionary | Dictionary[]>) {
    const topicMeta = ensureJsonMap(this.topicMeta[topic]);
    const description = asString(topicMeta.longDescription);
    if (!description) {
      events.emit('warning', chalk.yellow(`> No longDescription for topic ${chalk.bold(topic)}. That topic owner must add topic metadata, that includes longDescription, in the oclif section in the package.json file within their plugin.\n`));
      return;
    }
    await (new CLIReferenceTopic(topic, description).write());

    const subTopicNames = [];
    const commandNames = [];
    for (const subtopic of Object.keys(subtopics)) {
      const subtopicOrCommand = subtopics[subtopic];
      try {
        if (!isArray(subtopicOrCommand)) {
          // If it is not subtopic (array) it is a command in the top-level topic
          const command = subtopicOrCommand;
          const commandMeta = this.resolveCommandMeta(ensureString(command.id));
          await this.populateCommand(topic, null, command, commandMeta);
          commandNames.push(subtopic);
          continue;
        }

        const subTopicsMeta = ensureJsonMap(topicMeta.subtopics);

        if (!subTopicsMeta[subtopic]) {
          const fullTopicPath = `${topic}:${subtopic}`;
          events.emit('warning', chalk.yellow(`> No metadata for topic ${chalk.bold(fullTopicPath)}. That topic owner must add topic metadata in the oclif section in the package.json file within their plugin.\n`));
          continue;
        }

        const subtopicMeta = ensureJsonMap(subTopicsMeta[subtopic]);

        // The intro doc for this topic
        await (new MainTopicIntro(topic, subtopic, subtopicMeta)).write();

        subTopicNames.push(subtopic);

        // Commands within the sub topic
        const filenames: string[] = [];
        for (const command of subtopicOrCommand) {
          const commandMeta = this.resolveCommandMeta(ensureString(command.id));

          filenames.push(await this.populateCommand(topic, subtopic, command, commandMeta));
        }
        await new SubTopicDitamap(topic, subtopic, filenames).write();
      } catch (error) {
        events.emit('warning', chalk.yellow(`> Can't create topic for ${topic}:${subtopic}: ${error.message}\n`));
      }
    }

    // The topic ditamap with all of the subtopic links.
    events.emit('subtopics', topic, subTopicNames);
    await (new TopicDitamap(topic, subTopicNames, commandNames)).write();

    // TODO just include it in the upper loop?
    // await this.populateSubTopics(topic, subtopics)
    return subTopicNames;
  }

  /**
   * Group all commands by the top level topic and then subtopic. e.g. force, analytics, evergreen, etc
   * then org, apex, etc within the force namespace.
   * @param commands - The entire set of command data.
   * @returns The commands grouped by namespace grouped by topics/commands.
   */
  private groupTopicsAndSubtopics(commands: JsonMap[]) {
    const topLevelTopics: Dictionary<Dictionary<Dictionary | Dictionary[]>> = {};

    for (const command of commands) {
      const commandParts = ensureString(command.id).split(':');
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

  /**
   * Given help data in json convert it to ditamap format
   * @param outputdir - directory for ditamap format results
   * @param showhidden - include hidden parameters in converted help
   * @param parsedData - {object} containing CLI help
   */
  private async populateTemplate(commands: JsonMap[]) {
    const topicsAndSubtopics = this.groupTopicsAndSubtopics(commands);

    await (new CLIReference()).write();
    await copyStaticFile(this.outputDir, templatesDir, 'cli_reference_help.xml');

    const topics = Object.keys(topicsAndSubtopics);

    // Generate one base file with all top-level topics.
    await (new BaseDitamap(topics)).write();

    for (const topic of topics) {
      events.emit('topic', {topic});
      const subtopics = ensure(topicsAndSubtopics[topic]);
      await this.populateTopic(topic, subtopics);
    }
  }

  private resolveCommandMeta(commandId: string) {
    const commandMeta: JsonMap = {};
    // Remove top level topic, since the topic meta is already for that topic
    const commandParts = commandId.split(':');

    try {
      let currentMeta: JsonMap | undefined;
      for (const part of commandParts) {
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
      // This means there wasn't meta information going all the way down to the command, which is ok.
      return commandMeta;
    }
    return commandMeta;
  }

  private async populateCommand(topic: string, subtopic: string, command: Dictionary, commandMeta: JsonMap) {
    // If it is a hidden command - abort
    if (command.hidden && !this.hidden) {
      return '';
    }

    const commandDitamap = new Command(topic, subtopic, command, commandMeta);
    await commandDitamap.write();
    return commandDitamap.getFilename();
  }
}
