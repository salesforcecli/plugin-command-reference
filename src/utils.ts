/*
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { EventEmitter } from 'events';
import { EOL } from 'os';
import { Command } from '@oclif/core';

export type CommandClass = Command.Class & { topic: string; subtopic: string } & Record<string, unknown>;

export const events = new EventEmitter();

export function punctuate(description?: string): string | undefined {
  if (!description) return description;

  const lines = description.split(EOL);
  let mainDescription = lines[0];

  mainDescription = mainDescription.charAt(0).toUpperCase() + mainDescription.substring(1);

  if (!mainDescription.endsWith('.')) {
    mainDescription += '.';
  }

  return mainDescription;
}

export function helpFromDescription(description: string): string {
  return description ? description.split(EOL).slice(1).join(EOL).trim() : '';
}
