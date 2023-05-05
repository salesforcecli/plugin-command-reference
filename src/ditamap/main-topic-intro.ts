/*
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { join } from 'path';
import { asString, ensureObject } from '@salesforce/ts-types';
import { MainTopicIntroData, punctuate } from '../utils';
import { Ditamap } from './ditamap';

export class MainTopicIntro extends Ditamap {
  public constructor(topic: string, subtopic: string, subTopicMeta: Record<string, unknown>) {
    const filename = Ditamap.file(`cli_reference_${topic}_${subtopic}`, 'xml');

    let trailblazerCommunityUrl: string | undefined;
    let trailblazerCommunityName: string | undefined;
    if (subTopicMeta.trailblazerCommunityLink) {
      const community = ensureObject<Record<string, unknown>>(subTopicMeta.trailblazerCommunityLink) as {
        url: string;
        name: string;
      };
      trailblazerCommunityUrl = community.url ?? 'unknown';
      trailblazerCommunityName = community.name ?? 'unknown';
    }

    if (!subTopicMeta.longDescription && !subTopicMeta.external) {
      subTopicMeta.longDescription = punctuate(asString(subTopicMeta.description));
    }

    super(filename, {
      topic: subtopic,
      longDescription: subTopicMeta.longDescription,
      isOpenPilotTopic: subTopicMeta.state === 'openPilot',
      isClosedPilotTopic: subTopicMeta.state === 'closedPilot',
      isBetaTopic: subTopicMeta.state === 'beta',
      trailblazerCommunityUrl,
      trailblazerCommunityName,
    } as MainTopicIntroData);

    this.destination = join(Ditamap.outputDir, topic, filename);
  }

  // eslint-disable-next-line class-methods-use-this
  public getTemplateFileName(): string {
    return 'main_topic_intro.hbs';
  }
}
