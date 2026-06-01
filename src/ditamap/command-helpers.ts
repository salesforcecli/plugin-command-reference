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

import { Dictionary, Optional } from '@salesforce/ts-types';
import { CommandParameterData, replaceConfigVariables } from '../utils.js';

export type FlagInfo = {
  hidden: boolean;
  description: string;
  summary: string;
  required: boolean;
  kind: string;
  type: string;
  defaultHelpValue?: string;
  default: string | (() => Promise<string>);
  aliases?: string[];
  options?: string[];
  char?: string;
  deprecated?: { version: string; to: string };
};

export const getDefault = async (flag: FlagInfo, flagName: string): Promise<string> => {
  if (!flag) {
    return '';
  }
  if (flagName === 'target-org' || flagName === 'target-dev-hub') {
    return '';
  }
  if (typeof flag.default === 'function') {
    try {
      const help = await flag.default();
      return help.includes('[object Object]') ? '' : help ?? '';
    } catch {
      return '';
    }
  } else {
    return flag.default;
  }
};

export const flagIsDefined = (input: [string, Optional<FlagInfo>]): input is [string, FlagInfo] =>
  input[1] !== undefined;

export const buildDescription =
  (commandName: string) =>
  (binary: string) =>
  (flag: FlagInfo): string[] => {
    const description = replaceConfigVariables(
      Array.isArray(flag?.description) ? flag?.description.join('\n') : flag?.description ?? '',
      binary,
      commandName
    );
    return formatParagraphs(
      flag.summary ? `${replaceConfigVariables(flag.summary, binary, commandName)}\n${description}` : description
    );
  };

export const formatParagraphs = (textToFormat?: string): string[] =>
  textToFormat ? textToFormat.split('\n').filter((n) => n !== '') : [];

export const readBinary = (commandMeta: Record<string, unknown>): string =>
  'binary' in commandMeta && typeof commandMeta.binary === 'string' ? commandMeta.binary : 'unknown';

export const buildCommandParameters = async (
  commandName: string,
  binary: string,
  flags: Dictionary<FlagInfo>
): Promise<CommandParameterData[]> => {
  const descriptionBuilder = buildDescription(commandName)(binary);
  return Promise.all(
    [...Object.entries(flags)]
      .filter(flagIsDefined)
      .filter(([, flag]) => !flag.hidden)
      .map(
        async ([flagName, flag]) =>
          ({
            ...flag,
            name: flagName,
            description: descriptionBuilder(flag),
            optional: !flag.required,
            kind: flag.kind ?? flag.type,
            hasValue: flag.type !== 'boolean',
            defaultFlagValue: await getDefault(flag, flagName),
          } satisfies CommandParameterData)
      )
  );
};
