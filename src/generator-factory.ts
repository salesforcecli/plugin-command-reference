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

import { BaseDitamap } from './ditamap/base-ditamap.js';
import { CLIReference } from './ditamap/cli-reference.js';
import { Command as DitaCommand } from './ditamap/command.js';
import { Ditamap } from './ditamap/ditamap.js';
import { HelpReference } from './ditamap/help-reference.js';
import { TopicCommands } from './ditamap/topic-commands.js';
import { TopicDitamap } from './ditamap/topic-ditamap.js';
import { MarkdownCliReference } from './markdown/cli-reference.js';
import { MarkdownCommand } from './markdown/command.js';
import { MarkdownRootIndex } from './markdown/root-index.js';
import { MarkdownTopicCommands } from './markdown/topic-commands.js';
import { MarkdownTopicIndex } from './markdown/topic-index.js';
import { CommandClass, SfTopic } from './utils.js';

export type OutputFormat = 'dita' | 'markdown';

type Writable = { write(): Promise<void> };
type WritableWithFilename = Writable & { getFilename(): string };

export type GeneratorFactory = {
  createCliReference(): Writable;
  createHelpReference(): Writable | null;
  createRootIndex(topics: string[]): Writable;
  createTopicCommands(topic: string, topicMeta: SfTopic): Writable;
  createTopicIndex(topic: string, commandIds: string[]): Writable;
  createCommand(
    topic: string,
    subtopic: string | null,
    command: CommandClass,
    commandMeta: Record<string, unknown>
  ): WritableWithFilename;
};

export class DitaGeneratorFactory implements GeneratorFactory {
  // eslint-disable-next-line class-methods-use-this
  public createCliReference(): Writable {
    return new CLIReference();
  }

  // eslint-disable-next-line class-methods-use-this
  public createHelpReference(): Writable {
    return new HelpReference();
  }

  // eslint-disable-next-line class-methods-use-this
  public createRootIndex(topics: string[]): Writable {
    return new BaseDitamap(topics);
  }

  // eslint-disable-next-line class-methods-use-this
  public createTopicCommands(topic: string, topicMeta: SfTopic): Writable {
    return new TopicCommands(topic, topicMeta);
  }

  // eslint-disable-next-line class-methods-use-this
  public createTopicIndex(topic: string, commandIds: string[]): Writable {
    return new TopicDitamap(topic, commandIds);
  }

  // eslint-disable-next-line class-methods-use-this
  public createCommand(
    topic: string,
    subtopic: string | null,
    command: CommandClass,
    commandMeta: Record<string, unknown>
  ): WritableWithFilename {
    return new DitaCommand(topic, subtopic, command, commandMeta);
  }
}

export class MarkdownGeneratorFactory implements GeneratorFactory {
  public constructor(private outputDir: string) {}

  public createCliReference(): Writable {
    return new MarkdownCliReference(Ditamap.cliVersion, Ditamap.pluginVersions, this.outputDir);
  }

  // eslint-disable-next-line class-methods-use-this
  public createHelpReference(): null {
    return null;
  }

  public createRootIndex(topics: string[]): Writable {
    return new MarkdownRootIndex(topics, this.outputDir);
  }

  public createTopicCommands(topic: string, topicMeta: SfTopic): Writable {
    return new MarkdownTopicCommands(topic, topicMeta, this.outputDir);
  }

  public createTopicIndex(topic: string, commandIds: string[]): Writable {
    return new MarkdownTopicIndex(topic, commandIds, this.outputDir);
  }

  public createCommand(
    topic: string,
    subtopic: string | null,
    command: CommandClass,
    commandMeta: Record<string, unknown>
  ): WritableWithFilename {
    return new MarkdownCommand(topic, subtopic, command, commandMeta, this.outputDir);
  }
}
