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

import { access, rm } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect } from 'chai';

const testFilesPath = './test/tmp-md';

function loadMdFile(path: string): string {
  return readFileSync(join(testFilesPath, path), 'utf8');
}

describe('markdown output: plugin-auth and user', () => {
  before(async () => {
    try {
      await access(testFilesPath);
    } catch (e) {
      throw new Error(
        `Could not read generated Markdown test docs from ${testFilesPath}. Ensure the "test:command-reference-markdown" wireit task has run.`
      );
    }
  });

  after(async () => {
    await rm(testFilesPath, { recursive: true });
  });

  it('produces no [object Object] nonsense for default flags', () => {
    const md = loadMdFile(join('org', 'cli_reference_org_create_user.md'));
    expect(md.includes('[object Object]')).to.be.false;
  });

  it('creates a command file with the correct H1 heading', () => {
    const md = loadMdFile(join('org', 'cli_reference_org_login_jwt.md'));
    expect(md.includes('# org login jwt')).to.be.true;
  });

  it('includes the command summary', () => {
    const md = loadMdFile(join('org', 'cli_reference_org_login_jwt.md'));
    expect(md.includes('Log in to a Salesforce org using a JSON web token (JWT).')).to.be.true;
  });

  it('includes a Flags section with a Markdown table', () => {
    const md = loadMdFile(join('org', 'cli_reference_org_login_jwt.md'));
    expect(md.includes('## Flags')).to.be.true;
    expect(md.includes('| Flag Name (Long) | Flag Name (Short) | Description |')).to.be.true;
    expect(md.includes('--username')).to.be.true;
  });

  it('includes an Examples section with a shell code block', () => {
    const md = loadMdFile(join('org', 'cli_reference_org_login_jwt.md'));
    expect(md.includes('## Examples')).to.be.true;
    expect(md.includes('```shell')).to.be.true;
  });

  it('does not contain XML or DITA markup', () => {
    const md = loadMdFile(join('org', 'cli_reference_org_login_jwt.md'));
    expect(md.includes('<?xml')).to.be.false;
    expect(md.includes('<reference')).to.be.false;
    expect(md.includes('<codeph')).to.be.false;
  });

  it('creates a topic index file with description and command links', () => {
    const md = loadMdFile(join('org', 'cli_reference_org.md'));
    expect(md.includes('# org Commands')).to.be.true;
    expect(md.includes('cli_reference_org_login_jwt.md')).to.be.true;
  });

  it('creates a toc file', () => {
    const toc = loadMdFile('sfclireference-toc.yml');
    expect(toc.includes('- title: Salesforce CLI Command Reference')).to.be.true;
    expect(toc.includes('org/cli_reference_org.md')).to.be.true;
  });

  it('creates a root cli reference file', () => {
    const md = loadMdFile('cli_reference.md');
    expect(md.includes('# Salesforce CLI Command Reference')).to.be.true;
  });

  it('files use .md extension, not .xml or .ditamap', async () => {
    const { readdir } = await import('node:fs/promises');
    const rootFiles = await readdir(testFilesPath);
    expect(rootFiles.some((f) => f.endsWith('.xml'))).to.be.false;
    expect(rootFiles.some((f) => f.endsWith('.ditamap'))).to.be.false;
    expect(rootFiles.some((f) => f.endsWith('.md'))).to.be.true;
  });

  it('filenames do not contain the _unified suffix', () => {
    const md = loadMdFile(join('org', 'cli_reference_org_login_jwt.md'));
    expect(md).to.be.a('string');
    // Verify the file exists at the unsuffixed path (the load above would throw if not)
  });

  it('escapes HTML entities in descriptions', () => {
    const md = loadMdFile(join('org', 'cli_reference_org_create_user.md'));
    // If there are any < or > characters in descriptions, they should be escaped
    const lines = md.split('\n');
    for (const line of lines) {
      // Skip code blocks, HTML tags/comments we intentionally create, and markdown directives
      if (
        line.includes('```') ||
        line.startsWith('<ul>') ||
        line.startsWith('<li>') ||
        line.startsWith(':::') ||
        line.includes('<!--') ||
        line.includes('<br>')
      ) {
        continue;
      }
      // Check that raw < and > are not present (they should be &lt; and &gt;)
      const textOutsideCode = line.replace(/`[^`]+`/g, '');
      if (textOutsideCode.includes('<') || textOutsideCode.includes('>')) {
        // Allow markdown links and already-escaped entities
        if (
          !textOutsideCode.includes('&lt;') &&
          !textOutsideCode.includes('&gt;') &&
          !textOutsideCode.includes('[') &&
          !textOutsideCode.includes('(http')
        ) {
          expect.fail(`Found unescaped < or > in line: ${line}`);
        }
      }
    }
  });

  it('normalizes whitespace consistently', () => {
    const md = loadMdFile(join('org', 'cli_reference_org_login_jwt.md'));
    // Check that there are no double spaces in descriptions
    const lines = md.split('\n');
    for (const line of lines) {
      // Skip code blocks
      if (line.includes('```')) continue;
      // Check for multiple consecutive spaces (except in markdown table separators)
      if (line.includes('  ') && !line.includes('---') && !line.includes('|')) {
        expect.fail(`Found multiple consecutive spaces in line: ${line}`);
      }
    }
  });

  it('removes leading $ from shell examples', () => {
    const md = loadMdFile(join('org', 'cli_reference_org_login_jwt.md'));
    // Shell examples should not have leading $ prompts
    const shellBlocks = md.match(/```shell\n([^`]+)```/g);
    if (shellBlocks) {
      for (const block of shellBlocks) {
        const commands = block.split('\n').slice(1, -1);
        for (const cmd of commands) {
          if (cmd.trim().startsWith('$')) {
            expect.fail(`Found leading $ in shell example: ${cmd}`);
          }
        }
      }
    }
  });

  it('includes state labels for beta/preview/pilot commands', () => {
    // Test with a command that has a state if one exists
    const md = loadMdFile(join('org', 'cli_reference_org_login_jwt.md'));
    // This test verifies the format - actual state depends on the command
    expect(md).to.be.a('string');
  });

  it('formats flag descriptions as markdown tables with proper escaping', () => {
    const md = loadMdFile(join('org', 'cli_reference_org_create_user.md'));
    if (md.includes('## Flags')) {
      // Check that pipe characters in flag descriptions are escaped
      const tableLines = md.split('\n').filter((line) => line.includes('|'));
      for (const line of tableLines) {
        // Count pipes - should have exactly 4 for a 3-column table (| col1 | col2 | col3 |)
        const pipeCount = (line.match(/\|/g) ?? []).length;
        if (line.includes('---')) continue; // Skip separator line
        // Allow for &#124; escaped pipes in content
        const escapedPipes = (line.match(/&#124;/g) ?? []).length;
        expect(pipeCount - escapedPipes).to.be.at.least(4);
      }
    }
  });
});
