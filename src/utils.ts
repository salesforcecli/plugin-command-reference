/*
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { EventEmitter } from 'events';
import * as fs from 'fs';
import { EOL } from 'os';
import { join } from 'path';
import { Dictionary, isObject } from '@salesforce/ts-types';

export const events = new EventEmitter();

export async function copyStaticFile(outputDir: string, fileDir: string, fileName: string): Promise<void> {
  const source = join(fileDir, fileName);
  const dest = join(outputDir, fileName);
  await fs.promises.mkdir(outputDir, { recursive: true });
  await fs.promises.copyFile(source, dest);
}

export function mergeDeep(target: Dictionary, source: Dictionary): Dictionary<unknown> {
  Object.keys(source).forEach((key) => {
    if (isObject(target[key]) && isObject(source[key])) {
      mergeDeep(target[key] as Dictionary, source[key] as Dictionary);
    } else {
      target[key] = source[key];
    }
  });
  return target;
}

export function punctuate(description: string): string {
  if (!description) return description;

  const lines = description.split(EOL);
  let mainDescription = lines[0];

  mainDescription = mainDescription.charAt(0).toUpperCase() + mainDescription.substring(1);

  if (mainDescription.charAt(mainDescription.length - 1) !== '.') {
    mainDescription += '.';
  }

  return mainDescription;
}

export function helpFromDescription(description: string): string {
  return description ? description.split(EOL).slice(1).join(EOL).trim() : '';
}
