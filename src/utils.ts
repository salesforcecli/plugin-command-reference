/*
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { EventEmitter } from 'events';
import { EOL } from 'os';
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

export function helpFromDescription(description: string): string {
  return description ? description.split(EOL).slice(1).join(EOL).trim() : '';
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

export type PluginVersion = {
  name: string;
  version: string;
};

export type BaseDitamapData = {
  namespaceDitamapFiles: string[];
};

export type CliRefData = {
  cliVersion: string;
  pluginVersions: PluginVersion[];
};

export type CliRefHelpData = {
  id: string;
};

export type ClIRefTopicData = {
  topic: string;
  longDescription?: string;
};

export type CliRefTopicCommandsData = {
  name: string;
  description?: string;
};

export type CommandParameterData = {
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
  | MainTopicIntroData
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
  deprecated: boolean;
  trailblazerCommunityUrl?: string;
  trailblazerCommunityName?: string;
  help?: string[];
  // TODO: resolve examples type.  from the command hbs template the block that iterates over examples has references this.description, this.commands which seems out of place.
  examples?: unknown[];
  // flags
  parameters?: CommandParameterData[];
};

export type MainTopicIntroData = {
  topic: string;
  longDescription?: string;
  isClosedPilotTopic?: boolean;
  isOpenPilotTopic?: boolean;
  isBetaTopic?: boolean;
  trailblazerCommunityUrl?: string;
};

export type TopicDitamapData = {
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
