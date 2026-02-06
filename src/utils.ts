/*
 * Copyright 2025, Salesforce, Inc.
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

import { EventEmitter } from 'node:events';
import { EOL } from 'node:os';
import { Command, Interfaces } from '@oclif/core';
import { AnyJson } from '@salesforce/ts-types';

export type CommandClass = Pick<
  Command.Class,
  'id' | 'hidden' | 'description' | 'plugin' | 'state' | 'examples' | 'summary' | 'flags' | 'pluginName'
> & { topic: string; subtopic: string; longDescription?: string; binary: string; deprecated?: boolean };

export const events = new EventEmitter();

export function punctuate(description?: string): string | undefined {
  if (!description) return description;

  const lines = description.split(EOL);
  let mainDescription = lines[0];

  mainDescription = mainDescription.charAt(0).toUpperCase() + mainDescription.substring(1);

  if (!mainDescription.endsWith('.')) {
    mainDescription += '.';
  }

  return mainDescription;
}

export const replaceConfigVariables = (text: string, bin: string, id: string): string =>
  text.replace(/<%= config.bin %>/g, bin ?? 'unknown').replace(/<%= command.id %>/g, id);

export type CliMeta = {
  binary: string;
  topicSeparator?: string;
  state?: string;
  description?: string;
  longDescription?: string | AnyJson;
};

// re-engineering types used in the docs

type PluginVersion = {
  name: string;
  version: string;
};

type BaseDitamapData = {
  namespaceDitamapFiles: string[];
};

type CliRefData = {
  cliVersion: string;
  pluginVersions: PluginVersion[];
};

type CliRefHelpData = {
  id: string;
};

type ClIRefTopicData = {
  topic: string;
  longDescription?: string;
};

export type CommandParameterData = {
  description: string[];
  optional?: boolean;
  char?: string;
  name: string;
  hasValue?: boolean;
  deprecated?: {
    version: string;
    to: string;
  };
  kind?: string;
  options?: string[];
  // TODO: check to see if the type needs to that of the flag
  defaultFlagValue?: string;
  aliases?: string[];
};

export type DitamapData =
  | CliRefHelpData
  | BaseDitamapData
  | CliRefData
  | ClIRefTopicData
  | CommandData
  | SfTopic
  | TopicDitamapData
  | undefined;

export type CommandData = {
  name: string;
  summary?: string;
  description?: string;
  binary: string;
  commandWithUnderscores: string;
  isClosedPilotCommand: boolean;
  isOpenPilotCommand: boolean;
  isBetaCommand: boolean;
  isPreviewCommand: boolean;
  deprecated: boolean;
  trailblazerCommunityUrl?: string;
  trailblazerCommunityName?: string;
  help?: string[];
  // TODO: resolve examples type.  from the command hbs template the block that iterates over examples has references this.description, this.commands which seems out of place.
  examples?: unknown[];
  // flags
  parameters?: CommandParameterData[];
};

type TopicDitamapData = {
  topic: string;
  commands: Array<{ command: string }>;
};

export type SfTopic = Interfaces.Topic & {
  external?: boolean;
  trailblazerCommunityLink?: {
    url: string;
    name: string;
  };
  subtopics?: SfTopics;
};

export type SfTopics = Map<string, SfTopic>;
