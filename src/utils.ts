/*
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {fs} from '@salesforce/core';
import {Dictionary, isObject} from '@salesforce/ts-types';
import { EventEmitter } from 'events';
import {copyFileSync} from 'fs';
import {join} from 'path';

export const events = new EventEmitter();

export async function copyStaticFile(outputDir: string, fileDir: string, fileName: string) {
  const source = join(fileDir, fileName);
  const dest = join(outputDir, fileName);
  await fs.mkdirp(outputDir);
  copyFileSync(source, dest);
}

export function mergeDeep(target: Dictionary, source: Dictionary) {
  Object.keys(source).forEach(key => {
    if (isObject(target[key]) && isObject(source[key])) {
      mergeDeep(target[key] as Dictionary, source[key] as Dictionary);
    } else {
      target[key] = source[key];
    }
  });
  return target;
}
