/*
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { join } from 'node:path';
import { asString, Dictionary, ensureObject, ensureString, Optional } from '@salesforce/ts-types';
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

const getDefault = async (flag: FlagInfo, flagName: string): Promise<string> => {
  if (!flag) {
    return '';
  }
  if (flagName === 'target-org') {
    // special handling to prevent global/local default usernames from appearing in the docs, but they do appear in user's help
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
      isClosedPilotCommand: state === 'closedPilot',
      isOpenPilotCommand: state === 'openPilot',
      trailblazerCommunityName,
      trailblazerCommunityUrl,
    };

    this.data = Object.assign(command, commandData);

    this.destination = join(Ditamap.outputDir, topic, filename);
  }

  public async getParametersForTemplate(flags: Dictionary<FlagInfo>): Promise<CommandParameterData[]> {
    const descriptionBuilder = buildDescription(this.commandName)(readBinary(this.commandMeta));
    return Promise.all(
      [...Object.entries(flags)]
        .filter(flagIsDefined)
        .filter(([, flag]) => !flag.hidden)
        .map(
          async ([flagName, flag]) =>
            ({
              ...flag,
              name: flagName,
              description: descriptionBuilder(flag),
              optional: !flag.required,
              kind: flag.kind ?? flag.type,
              hasValue: flag.type !== 'boolean',
              defaultFlagValue: await getDefault(flag, flagName),
            } satisfies CommandParameterData)
        )
    );
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

const flagIsDefined = (input: [string, Optional<FlagInfo>]): input is [string, FlagInfo] => input[1] !== undefined;

const buildDescription =
  (commandName: string) =>
  (binary: string) =>
  (flag: FlagInfo): string[] => {
    const description = replaceConfigVariables(
      Array.isArray(flag?.description) ? flag?.description.join('\n') : flag?.description ?? '',
      binary,
      commandName
    );
    return formatParagraphs(
      flag.summary ? `${replaceConfigVariables(flag.summary, binary, commandName)}\n${description}` : description
    );
  };

const formatParagraphs = (textToFormat?: string): string[] =>
  textToFormat ? textToFormat.split('\n').filter((n) => n !== '') : [];

const readBinary = (commandMeta: Record<string, unknown>): string =>
  'binary' in commandMeta && typeof commandMeta.binary === 'string' ? commandMeta.binary : 'unknown';
