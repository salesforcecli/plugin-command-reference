/*
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  AnyJson,
  asString,
  Dictionary,
  ensureJsonMap,
  ensureObject,
  ensureString,
  JsonMap
} from '@salesforce/ts-types';
import { join } from 'path';
import { events, punctuate } from '../utils';
import { Ditamap } from './ditamap';

export type CommandHelpInfo = {
  hidden: boolean;
  description: string;
  summary: string;
  required: boolean;
  kind: string;
  type: string;
};

export class Command extends Ditamap {
  constructor(topic: string, subtopic: string, command: Dictionary, commandMeta: JsonMap = {}) {
    const commandWithUnderscores = ensureString(command.id).replace(/:/g, '_');
    const filename = `cli_reference_${commandWithUnderscores}.xml`;

    super(filename, {});

    const flags = ensureObject(command.flags);
    const parameters = this.getParametersForTemplate(flags as Dictionary<CommandHelpInfo>);

    const summmary = punctuate(asString(command.summary));

    const description = asString(command.description);

    // Help are all the lines after the first line in the description. Before oclif, there was a 'help' property so continue to
    // support that.

    if (!description) {
      events.emit('warning', `Missing description for ${command.id}\n`);
    }

    const help = this.formatParagraphs(description);

    let trailblazerCommunityUrl: AnyJson;
    let trailblazerCommunityName: AnyJson;

    if (commandMeta.trailblazerCommunityLink) {
      const community = ensureJsonMap(commandMeta.trailblazerCommunityLink);
      trailblazerCommunityUrl = community.url;
      trailblazerCommunityName = community.name;
    }

    const commandName = asString(command.id).replace(/:/g, asString(commandMeta.topicSeparator));

    const examples = ((command.examples as string[]) || []).map(example => {
      const parts = example.split('\n');
      const desc = parts.length > 1 ? parts[0] : null;
      const commands = parts.length > 1 ? parts.slice(1) : [parts[0]];

      return {
        description: desc,
        commands: commands.map(c => {
          return c
            .replace(/<%= config.bin %>/g, asString(commandMeta.binary))
            .replace(/<%= command.id %>/g, commandName);
        })
      };
    });

    const state = command.state || commandMeta.state;
    this.data = Object.assign(command, {
      name: commandName,
      binary: commandMeta.binary,
      topicSeparator: commandMeta.topicSeparator,
      commandWithUnderscores,
      examples,
      summmary,
      description,
      help,
      parameters,
      isClosedPilotCommand: state === 'closedPilot',
      isOpenPilotCommand: state === 'openPilot',
      isBetaCommand: state === 'beta',
      trailblazerCommunityUrl,
      trailblazerCommunityName
    }) as JsonMap;

    this.destination = join(Ditamap.outputDir, topic, filename);
  }

  public getParametersForTemplate(flags: Dictionary<CommandHelpInfo>) {
    return Object.entries(flags)
      .filter(([, flag]) => !flag.hidden)
      .map(([flagName, flag]) => {
        const description = Array.isArray(flag.description) ? flag.description.join('\n') : flag.description || '';
        const entireDescription = flag.summary ? `${flag.summary}\n${description}` : description;
        // const description = Array.isArray(flag.description) ? flag.description : this.formatParagraphs(flag.description);

        return Object.assign(flag, {
          name: flagName,
          description: this.formatParagraphs(entireDescription),
          optional: !flag.required,
          kind: flag.kind || flag.type,
          hasValue: flag.type !== 'boolean'
        });
      });
  }

  public getTemplateFileName(): string {
    return 'command.hbs';
  }
}
