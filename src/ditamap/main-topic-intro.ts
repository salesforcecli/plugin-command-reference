/*
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { join } from 'path';
import { AnyJson, ensureJsonMap, ensureString, JsonMap } from '@salesforce/ts-types';
import { punctuate } from '../utils';
import { Ditamap } from './ditamap';

export class MainTopicIntro extends Ditamap {
  public constructor(topic: string, subtopic: string, subTopicMeta: JsonMap) {
    const filename = Ditamap.file(`cli_reference_${topic}_${subtopic}`, 'xml');

    let trailblazerCommunityUrl: AnyJson | undefined;
    let trailblazerCommunityName: AnyJson | undefined;
    if (subTopicMeta.trailblazerCommunityLink) {
      const community = ensureJsonMap(subTopicMeta.trailblazerCommunityLink);
      trailblazerCommunityUrl = community.url;
      trailblazerCommunityName = community.name;
    }

    if (!subTopicMeta.longDescription && !subTopicMeta.external) {
      subTopicMeta.longDescription = punctuate(ensureString(subTopicMeta.description));
    }

    super(filename, {
      topic: subtopic,
      longDescription: subTopicMeta.longDescription,
      isOpenPilotTopic: subTopicMeta.state === 'openPilot',
      isClosedPilotTopic: subTopicMeta.state === 'closedPilot',
      isBetaTopic: subTopicMeta.state === 'beta',
      trailblazerCommunityUrl,
      trailblazerCommunityName,
    });

    this.destination = join(Ditamap.outputDir, topic, filename);
  }

  // eslint-disable-next-line class-methods-use-this
  public getTemplateFileName(): string {
    return 'main_topic_intro.hbs';
  }
}
