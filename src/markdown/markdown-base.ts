/*
 * Copyright 2026, Salesforce, Inc.
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

import { dirname, join } from 'node:path';
import fs from 'node:fs/promises';

export abstract class MarkdownBase {
  protected destination: string;

  protected constructor(private filename: string, protected outputDir: string) {
    this.destination = join(outputDir, filename);
  }

  public static file(name: string): string {
    return `${name}.md`;
  }

  public getFilename(): string {
    return this.filename;
  }

  public async write(): Promise<void> {
    await fs.mkdir(dirname(this.destination), { recursive: true });
    const output = await this.generate();
    await fs.writeFile(this.destination, output);
  }

  protected abstract generate(): Promise<string>;
}
