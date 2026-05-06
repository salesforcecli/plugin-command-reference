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

import { join } from 'node:path';
import { asString, Dictionary, ensureObject, ensureString } from '@salesforce/ts-types';
import { CommandClass, CommandData, punctuate, replaceConfigVariables } from '../utils.js';
import { Ditamap } from './ditamap.js';
import { buildCommandParameters, FlagInfo, readBinary, formatParagraphs } from './command-helpers.js';

export class Command extends Ditamap {
  private flags: Dictionary<FlagInfo>;
  private commandMeta: Record<string, unknown>;
  private commandName: string;

  public constructor(
    topic: string,
    subtopic: string | null,
    command: CommandClass,
    commandMeta: Record<string, unknown> = {}
  ) {
    const commandWithUnderscores = ensureString(command.id).replace(/:/g, '_');
    const filename = Ditamap.file(`cli_reference_${commandWithUnderscores}`, 'xml');
    super(filename, undefined);

    this.flags = ensureObject(command.flags);
    this.commandMeta = commandMeta;
    const binary = readBinary(this.commandMeta);

    const summary = punctuate(command.summary);
    this.commandName = command.id.replace(/:/g, asString(this.commandMeta.topicSeparator, ':'));

    const description = command.description
      ? replaceConfigVariables(command.description, binary, this.commandName)
      : undefined;

    // Help are all the lines after the first line in the description. Before oclif, there was a 'help' property so continue to
    // support that.

    const help = formatParagraphs(description);

    let trailblazerCommunityUrl: string | undefined;
    let trailblazerCommunityName: string | undefined;

    if (this.commandMeta.trailblazerCommunityLink) {
      const community = this.commandMeta.trailblazerCommunityLink as { url: string; name: string };
      trailblazerCommunityUrl = community.url ?? 'unknown';
      trailblazerCommunityName = community.name ?? 'unknown';
    }

    const examples = (command.examples ?? []).map((example) => {
      let desc: string | null;
      let commands: string[];
      if (typeof example === 'string') {
        const parts = example.split('\n');
        desc = parts.length > 1 ? parts[0] : null;
        commands = parts.length > 1 ? parts.slice(1) : [parts[0]];
      } else {
        desc = example.description;
        commands = [example.command];
      }

      return {
        description: replaceConfigVariables(desc ?? '', binary, this.commandName),
        commands: commands.map((cmd) => replaceConfigVariables(cmd, binary, this.commandName)),
      };
    });

    const state = command.state ?? this.commandMeta.state;
    const commandData: CommandData = {
      name: this.commandName,
      summary,
      description,
      binary,
      commandWithUnderscores,
      deprecated: (command.deprecated as boolean) ?? state === 'deprecated' ?? false,
      examples,
      help,
      isBetaCommand: state === 'beta',
      isPreviewCommand: state === 'preview',
      isClosedPilotCommand: state === 'closedPilot',
      isOpenPilotCommand: state === 'openPilot',
      trailblazerCommunityName,
      trailblazerCommunityUrl,
    };

    this.data = Object.assign(command, commandData);

    this.destination = join(Ditamap.outputDir, topic, filename);
  }

  // eslint-disable-next-line class-methods-use-this
  public getTemplateFileName(): string {
    return 'command.hbs';
  }

  protected async transformToDitamap(): Promise<string> {
    const parameters = await buildCommandParameters(this.commandName, readBinary(this.commandMeta), this.flags);
    this.data = Object.assign({}, this.data, { parameters });
    return super.transformToDitamap();
  }
}
