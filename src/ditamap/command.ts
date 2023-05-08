/*
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { join } from 'path';
import {
  AnyJson,
  asString,
  Dictionary,
  ensureJsonMap,
  ensureObject,
  ensureString,
  JsonMap,
} from '@salesforce/ts-types';
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

const getDefault = async (flag: CommandHelpInfo): Promise<string> => {
  if (typeof flag.default !== 'function') {
    return flag.default;
  } else if (typeof flag.default === 'function') {
    try {
      const help = await flag.default();
      return help || '';
    } catch {
      return '';
    }
  } else {
    return '';
  }
};

export class Command extends Ditamap {
  private flags: Dictionary<CommandHelpInfo>;

  public constructor(topic: string, subtopic: string, command: CommandClass, commandMeta: JsonMap = {}) {
    const commandWithUnderscores = ensureString(command.id).replace(/:/g, '_');
    const filename = Ditamap.file(`cli_reference_${commandWithUnderscores}`, 'xml');

    super(filename, {});

    this.flags = ensureObject(command.flags);

    const summary = punctuate(asString(command.summary));

    const description = asString(command.description);

    // Help are all the lines after the first line in the description. Before oclif, there was a 'help' property so continue to
    // support that.

    const help = this.formatParagraphs(description);

    let trailblazerCommunityUrl: AnyJson;
    let trailblazerCommunityName: AnyJson;

    if (commandMeta.trailblazerCommunityLink) {
      const community = ensureJsonMap(commandMeta.trailblazerCommunityLink);
      trailblazerCommunityUrl = community.url;
      trailblazerCommunityName = community.name;
    }

    const commandName = asString(command.id).replace(/:/g, asString(commandMeta.topicSeparator));

    const examples = ((command.examples as string[]) || []).map((example) => {
      const parts = example.split('\n');
      const desc = parts.length > 1 ? parts[0] : null;
      const commands = parts.length > 1 ? parts.slice(1) : [parts[0]];

      return {
        description: desc,
        commands: commands.map((c) => {
          return c
            .replace(/<%= config.bin %>/g, asString(commandMeta.binary))
            .replace(/<%= command.id %>/g, commandName);
        }),
      };
    });

    const state = command.state || commandMeta.state;
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
    });

    this.destination = join(Ditamap.outputDir, topic, filename);
  }

  public async getParametersForTemplate(flags: Dictionary<CommandHelpInfo>) {
    const final = [] as CommandHelpInfo[];

    for (const [flagName, flag] of Object.entries(flags)) {
      if (flag.hidden) continue;
      const description = Array.isArray(flag.description) ? flag.description.join('\n') : flag.description || '';
      const entireDescription = flag.summary ? `${flag.summary}\n${description}` : description;
      const updated = Object.assign({}, flag, {
        name: flagName,
        description: this.formatParagraphs(entireDescription),
        optional: !flag.required,
        kind: flag.kind || flag.type,
        hasValue: flag.type !== 'boolean',
        defaultFlagValue: await getDefault(flag),
      });
      final.push(updated);
    }
    return final;
  }

  public getTemplateFileName(): string {
    return 'command.hbs';
  }

  protected async transformToDitamap() {
    const parameters = await this.getParametersForTemplate(this.flags);
    this.data = Object.assign({}, this.data, { parameters });
    return super.transformToDitamap();
  }
}
