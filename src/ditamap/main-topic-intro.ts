/*
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { asString, ensureJsonMap, JsonMap } from '@salesforce/ts-types';
import { join } from 'path';
import { punctuate } from '../utils';
import { Ditamap } from './ditamap';

export class MainTopicIntro extends Ditamap {
  constructor(topic: string, subtopic: string, subTopicMeta: JsonMap) {
    const filename = `cli_reference_${topic}_${subtopic}.xml`;

    let trailblazerCommunityUrl;
    let trailblazerCommunityName;
    if (subTopicMeta.trailblazerCommunityLink) {
      const community = ensureJsonMap(subTopicMeta.trailblazerCommunityLink);
      trailblazerCommunityUrl = community.url;
      trailblazerCommunityName = community.name;
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
      trailblazerCommunityName
    });

    // Override destination to include topic and subtopic
    this.destination = join(Ditamap.outputDir, topic, subtopic, filename);
  }

  public getTemplateFileName(): string {
    return 'main_topic_intro.hbs';
  }
}