/*
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { join } from 'path';
import { asString, Dictionary, ensureObject, ensureString, JsonMap } from '@salesforce/ts-types';
import { CommandClass, punctuate } from '../utils';
import { Ditamap } from './ditamap';

export type CommandHelpInfo = {
  hidden: boolean;
  description: string;
  summary: string;
  required: boolean;
  kind: string;
  type: string;
  defaultHelpValue?: string;
  default: string | (() => Promise<string>);
};

const getDefault = async (flag?: CommandHelpInfo): Promise<string> => {
  if (!flag) {
    return '';
  }
  if (typeof flag.default === 'function') {
    try {
      const help = await flag.default();
      return help || '';
    } catch {
      return '';
    }
  } else {
    return flag.default;
  }
};

export class Command extends Ditamap {
  private flags: Dictionary<CommandHelpInfo>;

  public constructor(
    topic: string,
    subtopic: string | null,
    command: CommandClass,
    commandMeta: Record<string, unknown> = {}
  ) {
    const commandWithUnderscores = ensureString(command.id).replace(/:/g, '_');
    const filename = Ditamap.file(`cli_reference_${commandWithUnderscores}`, 'xml');

    super(filename, {});

    this.flags = ensureObject(command.flags);

    const summary = punctuate(asString(command.summary));

    const description = asString(command.description);

    // Help are all the lines after the first line in the description. Before oclif, there was a 'help' property so continue to
    // support that.

    const help = this.formatParagraphs(description);

    let trailblazerCommunityUrl: string | undefined;
    let trailblazerCommunityName: string | undefined;

    if (commandMeta.trailblazerCommunityLink) {
      const community = commandMeta.trailblazerCommunityLink as { url: string; name: string };
      trailblazerCommunityUrl = community.url ?? 'unknown';
      trailblazerCommunityName = community.name ?? 'unknown';
    }

    const commandName = command.id.replace(/:/g, asString(commandMeta.topicSeparator, ':'));

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
        description: desc,
        commands: commands.map((c) =>
          c
            .replace(/<%= config.bin %>/g, asString(commandMeta.binary, 'unknown'))
            .replace(/<%= command.id %>/g, commandName)
        ),
      };
    });

    const state = command.state ?? commandMeta.state;
    this.data = Object.assign(command, {
      name: commandName,
      binary: commandMeta.binary,
      topicSeparator: commandMeta.topicSeparator,
      commandWithUnderscores,
      examples,
      summary,
      description,
      help,
      isClosedPilotCommand: state === 'closedPilot',
      isOpenPilotCommand: state === 'openPilot',
      isBetaCommand: state === 'beta',
      trailblazerCommunityUrl,
      trailblazerCommunityName,
    }) as JsonMap;

    this.destination = join(Ditamap.outputDir, topic, filename);
  }

  public async getParametersForTemplate(flags: Dictionary<CommandHelpInfo>): Promise<CommandHelpInfo[]> {
    const final = [] as CommandHelpInfo[];

    for (const [flagName, flag] of Object.entries(flags)) {
      if (flag?.hidden) continue;
      const description = Array.isArray(flag?.description) ? flag?.description.join('\n') : flag?.description ?? '';
      const entireDescription = flag?.summary ? `${flag.summary}\n${description}` : description;
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
