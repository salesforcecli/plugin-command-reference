/*
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';
import debugCreator from 'debug';
import hb from 'handlebars';
import { HelperOptions } from 'handlebars';
import { DitamapData } from '../utils.js';

const debug = debugCreator('commandreference');

hb.registerHelper('toUpperCase', (str: string) => str.toUpperCase());
hb.registerHelper('join', (array: string[]) => array.join(', '));
hb.registerHelper('xmlFile', (...strings) => {
  const parts = strings.filter((s) => typeof s === 'string');
  return Ditamap.file(parts.join('_'), 'xml');
});
hb.registerHelper('uniqueId', (...strings) => {
  const parts = strings.filter((s) => typeof s === 'string');
  return Ditamap.file(parts.join('_'), 'xml').replace('.xml', '');
});

/*
 * Returns true if the string should be formatted as code block in docs
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
hb.registerHelper('isCodeBlock', function (this: any, val: string, options: HelperOptions): any {
  return val.startsWith('sf') || val.startsWith('sfdx') || val.includes('$') || val.includes('>>')
    ? options.fn(this)
    : options.inverse(this);
});

hb.registerHelper('nextVersion', (value: string) => parseInt(value, 2) + 1);

export abstract class Ditamap {
  public static SUFFIX = 'unified';

  public static templatesDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'templates');

  public static outputDir: string;

  public static cliVersion: string;

  public static plugins: Record<string, string>;

  public static pluginVersions: Array<{
    name: string;
    version: string;
  }>;

  private static _suffix: string;

  protected destination: string;

  private readonly source: string;

  protected constructor(private filename: string, protected data: DitamapData) {
    this.source = join(Ditamap.templatesDir, this.getTemplateFileName());
    this.destination = join(Ditamap.outputDir, filename);
  }

  public static get suffix(): string {
    return Ditamap._suffix;
  }

  public static set suffix(suffix: string) {
    Ditamap._suffix = suffix;
  }

  public static file(name: string, ext: string): string {
    return Ditamap.suffix ? `${name}_${Ditamap.suffix}.${ext}` : `${name}.${ext}`;
  }

  public getFilename(): string {
    return this.filename;
  }

  public getOutputFilePath(): string {
    return this.destination;
  }

  public async write(): Promise<void> {
    await fs.mkdir(dirname(this.destination), { recursive: true });
    const output = await this.transformToDitamap();

    await fs.writeFile(this.destination, output);
  }

  // eslint-disable-next-line class-methods-use-this
  protected formatParagraphs(textToFormat?: string): string[] {
    return textToFormat ? textToFormat.split('\n').filter((n) => n !== '') : [];
  }

  /**
   * Applies the named handlebars template to the supplied data
   *
   * @param data
   * @param templateName
   * @returns {object}
   */
  protected async transformToDitamap(): Promise<string> {
    //
    debug(`Generating ${this.destination} from ${this.getTemplateFileName()}`);
    const src = await fs.readFile(this.source, 'utf8');
    const template = hb.compile(src, { noEscape: false });
    return template(this.data);
  }

  public abstract getTemplateFileName(): string;
}
