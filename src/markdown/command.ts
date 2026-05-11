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

import { join } from 'node:path';
import { asString, Dictionary, ensureObject, ensureString } from '@salesforce/ts-types';
import { CommandClass, CommandParameterData, punctuate, replaceConfigVariables } from '../utils.js';
import { buildCommandParameters, FlagInfo, formatParagraphs, readBinary } from '../ditamap/command-helpers.js';
import { MarkdownBase } from './markdown-base.js';

type ParsedExample = {
  description: string;
  commands: string[];
};

export class MarkdownCommand extends MarkdownBase {
  private flags: Dictionary<FlagInfo>;
  private commandMeta: Record<string, unknown>;
  private commandName: string;
  private summary: string | undefined;
  private help: string[];
  private examples: ParsedExample[];
  private state: unknown;
  private deprecated: boolean;
  private deprecationDetails: { version?: string; to?: string } | null;

  public constructor(
    topic: string,
    subtopic: string | null,
    command: CommandClass,
    commandMeta: Record<string, unknown> = {},
    outputDir: string
  ) {
    const commandWithUnderscores = ensureString(command.id).replace(/:/g, '_');
    // If the command ID has no subtopic (e.g. "doctor"), its filename would collide with the topic
    // index file (cli_reference_doctor.md), so append _command to disambiguate.
    const isTopicLevelCommand = !ensureString(command.id).includes(':');
    const baseName = isTopicLevelCommand
      ? `cli_reference_${commandWithUnderscores}_command`
      : `cli_reference_${commandWithUnderscores}`;
    const filename = MarkdownBase.file(baseName);
    super(filename, outputDir);
    this.destination = join(outputDir, topic, filename);

    this.flags = ensureObject(command.flags);
    this.commandMeta = commandMeta;
    const binary = readBinary(this.commandMeta);

    this.summary = punctuate(command.summary);
    // commandName is the bare command ID used for template variable replacement (e.g. "agent activate")
    // commandNameForDisplay is the full invocation shown in headings (e.g. "sf agent activate")
    this.commandName = command.id.replace(/:/g, asString(this.commandMeta.topicSeparator, ' '));

    const description = command.description
      ? replaceConfigVariables(command.description, binary, this.commandName)
      : undefined;

    this.help = formatParagraphs(description);

    this.examples = (command.examples ?? []).map((example) => {
      let desc: string | null;
      let commands: string[];
      if (typeof example === 'string') {
        const parts = example.split('\n');
        desc = parts.length > 1 ? parts[0] : null;
        commands = parts.length > 1 ? parts.slice(1) : [parts[0]];
      } else {
        desc = example.description;
        commands = [example.command];
      }
      return {
        description: replaceConfigVariables(desc ?? '', binary, this.commandName),
        commands: commands.map((cmd) => replaceConfigVariables(cmd, binary, this.commandName)),
      };
    });

    this.state = command.state ?? this.commandMeta.state;
    this.deprecated = (command.deprecated as boolean) ?? this.state === 'deprecated' ?? false;
    const dep = command.deprecated;
    this.deprecationDetails = dep && typeof dep === 'object' ? (dep as { version?: string; to?: string }) : null;
  }

  protected async generate(): Promise<string> {
    const binary = readBinary(this.commandMeta);
    const parameters = await buildCommandParameters(this.commandName, binary, this.flags);

    const lines: string[] = [];

    const stateLabel = resolveStateLabel(this.state, this.deprecated);
    lines.push(`# ${this.commandName}${stateLabel ? ` (${stateLabel})` : ''}`);
    lines.push('');

    if (this.summary) {
      lines.push(this.summary);
      lines.push('');
    }

    const disclaimer = resolveDisclaimer(this.commandName, this.state, this.deprecated, this.deprecationDetails);
    if (disclaimer) {
      lines.push(':::note');
      lines.push(disclaimer);
      lines.push(':::');
      lines.push('');
    }

    if (this.help.length > 0) {
      lines.push(`## Description for ${this.commandName}`);
      lines.push('');
      for (const paragraph of convertHyphenListsToMarkdown(
        this.help.map((p) => applyCodeFormatting(escapeAngleBrackets(p)))
      )) {
        lines.push(paragraph);
        lines.push('');
      }
    }

    if (parameters.length > 0) {
      lines.push('## Flags');
      lines.push('');
      lines.push('<!-- prettier-ignore-start -->');
      lines.push('| Flag Name (Long) | Flag Name (Short) | Description |');
      lines.push('|------------------|-------------------|-------------|');
      for (const param of parameters) {
        lines.push(renderFlagRow(param));
      }
      lines.push('');
      lines.push('<!-- prettier-ignore-end -->');
      lines.push('');
    }

    if (this.examples.length > 0) {
      lines.push(`## Examples for ${this.commandName}`);
      lines.push('');
      for (const example of this.examples) {
        if (example.description) {
          lines.push(example.description);
          lines.push('');
        }
        for (const cmd of example.commands) {
          lines.push('```shell');
          lines.push(cmd.trim().replace(/^\$\s*/, ''));
          lines.push('```');
          lines.push('');
        }
      }
    }

    return lines.join('\n');
  }
}

function escapeAngleBrackets(text: string): string {
  return text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function applyCodeFormatting(text: string): string {
  // Wrap --flag-name tokens (not already in backticks)
  let result = text.replace(/(?<!`)--([\w-]+)(?!`)/g, '`--$1`');
  // Wrap glob patterns like *.cls, *.trigger (not already in backticks)
  result = result.replace(/(?<!`)\*(\.\w+)(?!`)/g, '`*$1`');
  // Wrap filenames/extensions with known doc-related extensions (not already in backticks)
  // Must run compound extensions (.sarif.json) before simple ones (.sarif, .json)
  result = result.replace(/(?<![\w`])(\.sarif\.json)(?![\w`])/g, '`$1`');
  result = result.replace(/(?<![\w`])(\w[\w.-]*\.(?:xml|html?|json|sarif|csv))(?![\w`])/g, '`$1`');
  result = result.replace(/(?<![\w`])(\.(?:xml|html?|json|sarif|csv))(?![\w`])/g, '`$1`');
  // Wrap file/directory paths: must be preceded by whitespace or opening punctuation (not part of a URL)
  // Matches: ./foo/bar, ../foo, foo/bar/baz — but not https://foo/bar
  result = result.replace(/(^|(?<=[\s(["]))(?!https?:\/\/)((?:\.{1,2}\/|[\w][\w-]*\/)[\w./-]+)/g, '$1`$2`');
  return result;
}

function convertHyphenListsToMarkdown(paragraphs: string[]): string[] {
  const result: string[] = [];
  let i = 0;
  while (i < paragraphs.length) {
    if (paragraphs[i].startsWith('- ')) {
      // Collect consecutive list items and join with <br> for table cell rendering
      const items: string[] = [];
      while (i < paragraphs.length && paragraphs[i].startsWith('- ')) {
        items.push(paragraphs[i]);
        i++;
      }
      result.push(items.join('<br>'));
    } else {
      result.push(paragraphs[i]);
      i++;
    }
  }
  return result;
}

function resolveStateLabel(state: unknown, deprecated: boolean): string | null {
  if (deprecated) return 'Deprecated';
  if (state === 'beta') return 'Beta';
  if (state === 'preview') return 'Developer Preview';
  if (state === 'closedPilot' || state === 'openPilot') return 'Pilot';
  return null;
}

function resolveDisclaimer(
  commandName: string,
  state: unknown,
  deprecated: boolean,
  deprecationDetails: { version?: string; to?: string } | null
): string | null {
  if (deprecated) {
    const versionNote = deprecationDetails?.version
      ? ` and will be removed in v${deprecationDetails.version} or later`
      : '';
    const toNote = deprecationDetails?.to ? ` Use \`${deprecationDetails.to}\` instead.` : '';
    return `The command \`${commandName}\` has been deprecated${versionNote}.${toNote}`;
  }
  if (state === 'closedPilot') {
    // prettier-ignore
    return `We provide the \`${commandName}\` command to selected customers through an invitation-only pilot program that requires agreement to specific terms and conditions. Pilot programs are subject to change, and we can\x27t guarantee acceptance. The \`${commandName}\` command isn\x27t generally available unless or until Salesforce announces its general availability in documentation or in press releases or public statements. We can\x27t guarantee general availability within any particular time frame or at all. Make your purchase decisions only on the basis of generally available products and features.`;
  }
  if (state === 'openPilot') {
    // prettier-ignore
    return `We provide the \`${commandName}\` command to selected customers through a pilot program that requires agreement to specific terms and conditions. To be nominated to participate in the program, contact Salesforce. Pilot programs are subject to change, and we can\x27t guarantee acceptance. The \`${commandName}\` command isn\x27t generally available unless or until Salesforce announces its general availability in documentation or in press releases or public statements. We can\x27t guarantee general availability within any particular time frame or at all. Make your purchase decisions only on the basis of generally available products and features.`;
  }
  if (state === 'beta') {
    return 'This feature is a Beta Service. Customers may opt to try such Beta Service in its sole discretion. Any use of the Beta Service is subject to the applicable Beta Services Terms provided at [Agreements and Terms](https://www.salesforce.com/company/legal/agreements/).';
  }
  if (state === 'preview') {
    // prettier-ignore
    return 'This command is available as a developer preview. The command isn\'t generally available unless or until Salesforce announces its general availability in documentation or in press releases or public statements. All commands, parameters, and other features are subject to change or deprecation at any time, with or without notice. Don\'t implement functionality developed with these commands or tools.';
  }
  return null;
}

function renderFlagRow(param: CommandParameterData): string {
  const longFlag = `\`--${param.name}\``;
  const shortFlag = param.char ? `\`-${param.char}\`` : 'N/A';
  const desc = renderFlagDescription(param);
  return `| ${longFlag} | ${shortFlag} | ${desc} |`;
}

function renderFlagDescription(param: CommandParameterData): string {
  const metadataParts: string[] = [];
  if (param.deprecated) {
    const toNote = param.deprecated.to ? ` Use \`--${param.deprecated.to}\` instead.` : '';
    metadataParts.push(`**This flag is deprecated.${toNote}**`);
  }
  const flagType = param.hasValue ? 'Value' : 'Boolean';
  metadataParts.push(`**Type:** ${flagType}`);
  if (!param.optional) metadataParts.push('**Required**');
  if (param.options?.length) {
    metadataParts.push(`**Valid Values:** ${param.options.map((o) => `\`${o}\``).join(', ')}`);
  }
  if (param.defaultFlagValue) metadataParts.push(`**Default value:** \`${param.defaultFlagValue}\``);

  const desc = convertHyphenListsToMarkdown(
    param.description.map((p) => applyCodeFormatting(escapeAngleBrackets(p.replace(/\|/g, '&#124;'))))
  ).join('<br><br>');

  const parts: string[] = [metadataParts.join('<br>')];
  if (desc) parts.push(desc);

  return parts.join('<br><br>').replace(/\n/g, ' ');
}
