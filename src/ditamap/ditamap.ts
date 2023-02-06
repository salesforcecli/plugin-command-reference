/*
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as fs from 'fs';
import { dirname, join } from 'path';
import { JsonMap } from '@salesforce/ts-types';
import * as debugCreator from 'debug';
// import { compile, registerHelper } from 'handlebars';
import * as handlebars from 'handlebars';

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
    handlebars.registerHelper('toUpperCase', (str: string) => str.toUpperCase());
    handlebars.registerHelper('join', (array: string[]) => array.join(', '));

    /*
     * Returns true if the string should be formatted as code block in docs
     */
    // tslint:disable-next-line: no-any
    handlebars.registerHelper('isCodeBlock', function (this: any, val: string, options) {
      return val.includes('$ sfdx') || val.includes('>>') ? options.fn(this) : options.inverse(this);
    });

    /*
     * Remove OS prompt in codeblocks, as per CCX style guidelines in our published docs
     */
    handlebars.registerHelper('removePrompt', (codeblock: string) => codeblock.substring(codeblock.indexOf('$') + 1));
    handlebars.registerHelper('nextVersion', (value) => parseInt(value as string, 2) + 1);
    this.source = join(Ditamap.templatesDir, this.getTemplateFileName());
    this.destination = join(Ditamap.outputDir, filename);
  }

  public getFilename(): string {
    return this.filename;
  }

  public getOutputFilePath(): string {
    return this.destination;
  }

  public async write(): Promise<void> {
    await fs.promises.mkdir(dirname(this.destination), { recursive: true });
    const output = await this.transformToDitamap();

    await fs.promises.writeFile(this.destination, output);
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
  private async transformToDitamap(): Promise<string> {
    debug(`Generating ${this.destination} from ${this.getTemplateFileName()}`);
    const src = await fs.promises.readFile(this.source, 'utf8');
    const template = handlebars.compile(src);
    return template(this.data);
  }

  public abstract getTemplateFileName(): string;
}
