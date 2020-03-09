/*
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { asString, Dictionary, ensureJsonMap, ensureObject, ensureString, JsonMap } from '@salesforce/ts-types';
import chalk = require('chalk');
import { join } from 'path';
import { events } from '../utils';
import { Ditamap } from './ditamap';

export class Command extends Ditamap {
  constructor(topic: string, subtopic: string, command: Dictionary, commandMeta: JsonMap = {}) {
    const commandWithUnderscores = ensureString(command.id).replace(/:/g, '_');
    const filename = `cli_reference_${commandWithUnderscores}.xml`;

    const flags = ensureObject(command.flags);

    super(filename, {});

    const parameters = Object.entries(flags)
      .filter(([, flag]) => !flag.hidden)
      .map(([flagName, flag]) => {
        if (!flag.longDescription) {
          events.emit(
            'warning',
            `No flag longDescription for command "${chalk.bold(command.id)}" on flag "${chalk.bold(
              flagName
            )}". That command owner must add the longDescription to the flag definition.`
          );
        }
        return Object.assign(flag, {
          name: flagName,
          longDescriptionPs: this.formatParagraphs(flag.longDescription),
          optional: !flag.required,
          kind: flag.kind || flag.type,
          hasValue: flag.type !== 'boolean'
        });
      });

    let trailblazerCommunityUrl;
    let trailblazerCommunityName;
    if (commandMeta.trailblazerCommunityLink) {
      const community = ensureJsonMap(commandMeta.trailblazerCommunityLink);
      trailblazerCommunityUrl = community.url;
      trailblazerCommunityName = community.name;
    }

    if (!command.longDescription) {
      events.emit(
        'warning',
        `No longDescription for command ${chalk.bold(
          command.id
        )}. That command owner must add the longDescription to the command definition.`
      );
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
      helpPs: this.formatParagraphs(asString(command.help)),
      longDescriptionPs: this.formatParagraphs(asString(command.longDescription)),
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

  public getTemplateFileName(): string {
    return 'command.hbs';
  }
}
