/*
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { join } from 'path';
import {
  asString,
  Dictionary,
  ensureJsonMap,
  ensureObject,
  ensureString,
  isString,
  JsonMap,
} from '@salesforce/ts-types';
import { ensureArray } from '@salesforce/kit';
import { SfError } from '@salesforce/core';
import { events, helpFromDescription, punctuate } from '../utils';
import { Ditamap } from './ditamap';

export type CommandHelpInfo = {
  hidden: boolean;
  description: string;
  longDescription: string;
  required: boolean;
  kind: string;
  type: string;
};

export class Command extends Ditamap {
  public constructor(topic: string, subtopic: string, command: Dictionary, commandMeta: JsonMap = {}) {
    const commandWithUnderscores = ensureString(command.id).replace(/:/g, '_');
    const filename = `cli_reference_${commandWithUnderscores}.xml`;

    super(filename, {});
    const id = command.id;
    if (typeof id !== 'string') {
      throw new SfError('Command id must be a string');
    }
    const flags = ensureObject(command.flags);
    const parameters = this.getParametersForTemplate(flags as Dictionary<CommandHelpInfo>);

    // The template only expects a oneline description. Punctuate the first line of either the lingDescription or description.
    const fullDescription = asString(command.longDescription) || asString(command.description);
    const description = punctuate(fullDescription);
    // Help are all the lines after the first line in the description. Before oclif, there was a 'help' property so continue to
    // support that.

    if (!description) {
      events.emit('warning', `Missing description for ${id}\n`);
    }

    const help = this.formatParagraphs(asString(command.help) || helpFromDescription(fullDescription));
    let trailblazerCommunityUrl;
    let trailblazerCommunityName;

    if (commandMeta.trailblazerCommunityLink) {
      const community = ensureJsonMap(commandMeta.trailblazerCommunityLink);
      trailblazerCommunityUrl = community.url;
      trailblazerCommunityName = community.name;
    }

    if (Array.isArray(command.examples)) {
      if (
        help.includes('Examples:') &&
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        command.examples.map((example, foundAll) => foundAll && help.includes(example), true)
      ) {
        // Examples are already in the help, so don't duplicate.
        // This is legacy support for ToolbeltCommand in salesforce-alm.
        delete command.examples;
      }
    }

    const binary = 'sfdx';
    const examples = command.examples
      ? ensureArray(command.examples)
          .filter(isString)
          .map((example) => example.replace(/<%= config.bin %>/g, binary).replace(/<%= command.id %>/g, id))
      : undefined;

    const state = command.state ?? commandMeta.state;
    this.data = Object.assign(command, {
      binary,
      commandWithUnderscores,
      examples,
      help,
      description,
      parameters,
      isClosedPilotCommand: state === 'closedPilot',
      isOpenPilotCommand: state === 'openPilot',
      isBetaCommand: state === 'beta',
      trailblazerCommunityUrl,
      trailblazerCommunityName,
    }) as JsonMap;

    // Override destination to include topic and subtopic
    if (subtopic) {
      this.destination = join(Ditamap.outputDir, topic, subtopic, filename);
    } else {
      this.destination = join(Ditamap.outputDir, topic, filename);
    }
  }

  public getParametersForTemplate(flags: Dictionary<CommandHelpInfo>) {
    return Object.entries(flags)
      .filter(([, flag]) => !flag.hidden)
      .map(([flagName, flag]) => {
        const description = this.formatParagraphs(flag.longDescription || punctuate(flag.description));
        if (!flag.longDescription) {
          flag.longDescription = punctuate(flag.description);
        }
        return Object.assign(flag, {
          name: flagName,
          description,
          optional: !flag.required,
          kind: flag.kind || flag.type,
          hasValue: flag.type !== 'boolean',
        });
      });
  }

  // eslint-disable-next-line class-methods-use-this
  public getTemplateFileName(): string {
    return 'command.hbs';
  }
}
