/*
 * Copyright 2025, Salesforce, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Ditamap } from './ditamap.js';

export class BaseDitamap extends Ditamap {
  public constructor(topics: string[]) {
    // Set the data of topic and filenames
    super(Ditamap.file('cli_reference', 'ditamap'), {
      namespaceDitamapFiles: topics.sort().map((topic) => Ditamap.file(`${topic}/cli_reference_${topic}`, 'ditamap')),
    });
  }

  // eslint-disable-next-line class-methods-use-this
  public getTemplateFileName(): string {
    return 'base_ditamap.hbs';
  }
}
