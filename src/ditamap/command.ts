/*
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { asString, Dictionary, ensureJsonMap, ensureObject, ensureString, JsonMap } from '@salesforce/ts-types';
import { join } from 'path';
import { helpFromDescription, punctuate } from '../utils';
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
  constructor(topic: string, subtopic: string, command: Dictionary, commandMeta: JsonMap = {}) {
    const commandWithUnderscores = ensureString(command.id).replace(/:/g, '_');
    const filename = `cli_reference_${commandWithUnderscores}.xml`;

    super(filename, {});

    const flags = ensureObject(command.flags);
    const parameters = this.getParametersForTemplate(flags);

    // The template only expects a oneline description. Punctuate the first line of either the lingDescription or description.
    const description = punctuate(asString(command.longDescription) || asString(command.description));
    // Help are all the lines after the first line in the description. Before oclif, there was a 'help' property so continue to
    // support that.
    const help = this.formatParagraphs(asString(command.help) || helpFromDescription(asString(command.description)));
    let trailblazerCommunityUrl;
    let trailblazerCommunityName;

    if (commandMeta.trailblazerCommunityLink) {
      const community = ensureJsonMap(commandMeta.trailblazerCommunityLink);
      trailblazerCommunityUrl = community.url;
      trailblazerCommunityName = community.name;
    }

    let fullName: string;
    if (subtopic) {
      fullName = commandWithUnderscores.replace(`${topic}_${subtopic}_`, '');
    } else {
      fullName = commandWithUnderscores.replace(`${topic}_`, '');
    }
    const state = command.state || commandMeta.state;
    this.data = Object.assign(command, {
      binary: 'sfdx',
      // The old style didn't have the topic or subtopic in the reference ID.
      full_name_with_underscores: fullName,
      help,
      description,
      parameters,
      isClosedPilotCommand: state === 'closedPilot',
      isOpenPilotCommand: state === 'openPilot',
      isBetaCommand: state === 'beta',
      trailblazerCommunityUrl,
      trailblazerCommunityName
    }) as JsonMap;

    // Override destination to include topic and subtopic
    if (subtopic) {
      this.destination = join(Ditamap.outputDir, topic, subtopic, filename);
    } else {
      this.destination = join(Ditamap.outputDir, topic, filename);
    }
  }

  public getParametersForTemplate(flags: Dictionary<CommandHelpInfo>) {
    Object.entries(flags)
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
          hasValue: flag.type !== 'boolean'
        });
      });
  }

  public getTemplateFileName(): string {
    return 'command.hbs';
  }
}
