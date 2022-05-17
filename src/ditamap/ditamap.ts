/*
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { dirname, join } from 'path';
import { fs } from '@salesforce/core';
import { JsonMap } from '@salesforce/ts-types';
import * as debugCreator from 'debug';
import { compile, registerHelper } from 'handlebars';

const debug = debugCreator('commandreference');

export abstract class Ditamap {
  public static templatesDir = join(__dirname, '..', '..', 'templates');

  public static outputDir: string;

  public static cliVersion: string;

  public static plugins: JsonMap;

  public static pluginVersions: Array<{
    name: string;
    version: string;
  }>;

  protected destination: string;

  private source: string;

  public constructor(private filename: string, protected data: JsonMap) {
    registerHelper('toUpperCase', (str) => str.toUpperCase());
    registerHelper('join', (array) => array.join(', '));

    /*
     * Returns true if the string should be formatted as code block in docs
     */
    // tslint:disable-next-line: no-any
    registerHelper('isCodeBlock', function (this: any, val, options) {
      return val.indexOf('$ sfdx') >= 0 || val.indexOf('>>') >= 0 ? options.fn(this) : options.inverse(this);
    });

    /*
     * Remove OS prompt in codeblocks, as per CCX style guidelines in our published docs
     */
    registerHelper('removePrompt', (codeblock) => codeblock.substring((codeblock.indexOf('$') as number) + 1));
    registerHelper('nextVersion', (value) => parseInt(value, 2) + 1);
    this.source = join(Ditamap.templatesDir, this.getTemplateFileName());
    this.destination = join(Ditamap.outputDir, filename);
  }

  public getFilename() {
    return this.filename;
  }

  public getOutputFilePath() {
    return this.destination;
  }

  public async write() {
    await fs.mkdirp(dirname(this.destination));
    const output = await this.transformToDitamap();

    await fs.writeFile(this.destination, output);
  }

  protected formatParagraphs(textToFormat?: string) {
    return textToFormat ? textToFormat.split('\n').filter((n) => n !== '') : [];
  }

  /**
   * Applies the named handlebars template to the supplied data
   *
   * @param data
   * @param templateName
   * @returns {object}
   */
  private async transformToDitamap() {
    debug(`Generating ${this.destination} from ${this.getTemplateFileName()}`);
    const src = await fs.readFile(this.source, 'utf8');
    const template = compile(src);
    return template(this.data);
  }

  public abstract getTemplateFileName(): string;
}
