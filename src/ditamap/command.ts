/*
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { join } from 'node:path';
import { asString, Dictionary, ensureObject, ensureString } from '@salesforce/ts-types';
import { CommandClass, CommandData, CommandParameterData, punctuate, replaceConfigVariables } from '../utils.js';
import { Ditamap } from './ditamap.js';

type FlagInfo = {
  hidden: boolean;
  description: string;
  summary: string;
  required: boolean;
  kind: string;
  type: string;
  defaultHelpValue?: string;
  default: string | (() => Promise<string>);
};

const getDefault = async (flag?: FlagInfo): Promise<string> => {
  if (!flag) {
    return '';
  }
  if (typeof flag.default === 'function') {
    try {
      const help = await flag.default();
      return help.includes('[object Object]') ? '' : help ?? '';
    } catch {
      return '';
    }
  } else {
    return flag.default;
  }
};

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

    const summary = punctuate(command.summary);
    this.commandName = command.id.replace(/:/g, asString(this.commandMeta.topicSeparator, ':'));

    const description = command.description
      ? replaceConfigVariables(command.description, asString(this.commandMeta.binary, 'unknown'), this.commandName)
      : undefined;

    // Help are all the lines after the first line in the description. Before oclif, there was a 'help' property so continue to
    // support that.

    const help = this.formatParagraphs(description);

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
        description: replaceConfigVariables(desc ?? '', asString(this.commandMeta.binary, 'unknown'), this.commandName),
        commands: commands.map((cmd) =>
          replaceConfigVariables(cmd, asString(this.commandMeta.binary, 'unknown'), this.commandName)
        ),
      };
    });

    const state = command.state ?? this.commandMeta.state;
    const commandData: CommandData = {
      name: this.commandName,
      summary,
      description,
      binary: 'binary' in commandMeta && typeof commandMeta.binary === 'string' ? commandMeta.binary : 'unknown',
      commandWithUnderscores,
      deprecated: (command.deprecated as boolean) ?? state === 'deprecated' ?? false,
      examples,
      help,
      isBetaCommand: state === 'beta',
      isClosedPilotCommand: state === 'closedPilot',
      isOpenPilotCommand: state === 'openPilot',
      trailblazerCommunityName,
      trailblazerCommunityUrl,
    };

    this.data = Object.assign(command, commandData);

    this.destination = join(Ditamap.outputDir, topic, filename);
  }

  public async getParametersForTemplate(flags: Dictionary<FlagInfo>): Promise<CommandParameterData[]> {
    const final: CommandParameterData[] = [];

    for (const [flagName, flag] of Object.entries(flags)) {
      if (!flag || flag.hidden) continue;
      const description = replaceConfigVariables(
        Array.isArray(flag?.description) ? flag?.description.join('\n') : flag?.description ?? '',
        asString(this.commandMeta.binary, 'unknown'),
        this.commandName
      );
      const entireDescription = flag.summary
        ? `${replaceConfigVariables(
            flag.summary,
            asString(this.commandMeta.binary, 'unknown'),
            this.commandName
          )}\n${description}`
        : description;
      const updated = Object.assign({}, flag, {
        name: flagName,
        description: this.formatParagraphs(entireDescription),
        optional: !flag?.required,
        kind: flag?.kind ?? flag?.type,
        hasValue: flag?.type !== 'boolean',
        // eslint-disable-next-line no-await-in-loop
        defaultFlagValue: await getDefault(flag),
      });
      final.push(updated);
    }
    return final;
  }

  // eslint-disable-next-line class-methods-use-this
  public getTemplateFileName(): string {
    return 'command.hbs';
  }

  protected async transformToDitamap(): Promise<string> {
    const parameters = await this.getParametersForTemplate(this.flags);
    this.data = Object.assign({}, this.data, { parameters });
    return super.transformToDitamap();
  }
}
