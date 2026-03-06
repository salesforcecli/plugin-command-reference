# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Purpose

This plugin generates the Salesforce CLI command reference documentation guide (https://developer.salesforce.com/docs/atlas.en-us.sfdx_cli_reference.meta/sfdx_cli_reference/). It's an oclif plugin that reads command metadata from other Salesforce CLI plugins and transforms them into DITA XML format for publication.

## Common Commands

### Build and Development

```bash
# Build the project (compile + lint)
yarn build

# Compile TypeScript only
yarn compile

# Run linter
yarn lint

# Format code
yarn format
```

### Testing

```bash
# Run all tests (includes test:compile, test:only, and lint)
yarn test

# Run only unit tests (skips compilation and lint)
yarn test:only

# Run a single test file
yarn mocha test/unit/utils.test.ts
```

### Local Development

```bash
# Link plugin to local Salesforce CLI for testing
sf plugins link .

# Run command using dev executable
./bin/dev.js commandreference generate --plugins auth

# Generate documentation for multiple plugins
sf commandreference generate --plugins auth user deploy-retrieve --output-dir ./test-output
```

### Generate Command Reference

```bash
# Generate docs for specific plugins (default: DITA XML format)
sf commandreference generate --plugins auth user

# Generate docs in Markdown format
sf commandreference generate --plugins auth --format markdown

# Generate docs for all plugins
sf commandreference generate --all

# Generate docs with error on warnings (useful in CI)
sf commandreference generate --plugins auth --error-on-warnings

# Install JIT plugins (needed for comprehensive doc generation)
sf jit install
```

## Code Architecture

### Core Components

**Docs class (`src/docs.ts`)**

- Entry point for documentation generation
- Orchestrates the entire documentation generation process
- Groups commands by topics and subtopics using `groupTopicsAndSubtopics()`
- Iterates through all topics and calls `populateTopic()` for each
- Each topic generates multiple DITA XML files through various ditamap classes

**Command Reference Generator (`src/commands/commandreference/generate.ts`)**

- Main CLI command implementation
- Loads plugin configurations and metadata from oclif
- Resolves plugin dependencies and child plugins
- Extracts topic metadata from plugin `package.json` oclif configurations
- Loads all commands from specified plugins
- Initializes Docs class and triggers generation

**Ditamap Base Class (`src/ditamap/ditamap.ts`)**

- Abstract base class for all DITA XML generators
- Uses Handlebars templates from `templates/` directory
- Manages file paths, naming conventions, and output directory
- Registers Handlebars helpers for XML generation (xmlFile, uniqueId, isCodeBlock, etc.)
- Static properties like `outputDir`, `suffix`, `cliVersion` are shared across all ditamap instances

### Ditamap Hierarchy

The plugin generates multiple types of DITA files through specialized ditamap classes:

- **BaseDitamap** (`src/ditamap/base-ditamap.ts`): Top-level ditamap that references all topic ditamaps
- **CLIReference** (`src/ditamap/cli-reference.ts`): CLI version and plugin version metadata
- **HelpReference** (`src/ditamap/help-reference.ts`): General help content
- **TopicDitamap** (`src/ditamap/topic-ditamap.ts`): Maps for each topic, referencing all commands in that topic
- **TopicCommands** (`src/ditamap/topic-commands.ts`): Topic-level command listing pages
- **Command** (`src/ditamap/command.ts`): Individual command documentation pages with flags, examples, descriptions

### Handlebars Templates

All templates are in `templates/` directory:

- `base_ditamap.hbs`: Top-level namespace ditamap
- `cli_reference_xml.hbs`: CLI and plugin version information
- `cli_reference_help.hbs`: Help reference page
- `cli_reference_topic_commands.hbs`: Topic overview pages
- `topic_ditamap.hbs`: Topic-level ditamaps
- `command.hbs`: Individual command documentation (flags, examples, descriptions)

### Topic and Command Metadata

Topics and subtopics are defined in each plugin's `package.json` under the `oclif.topics` section:

```json
{
  "oclif": {
    "topics": {
      "commandreference": {
        "description": "generate the Salesforce CLI command reference guide.",
        "longDescription": "..."
      }
    }
  }
}
```

The generator reads this metadata to:

- Organize commands into hierarchical topics/subtopics
- Extract descriptions and long descriptions
- Determine command state (beta, pilot, deprecated)
- Handle hidden topics/commands based on the `--hidden` flag

### Command Processing Flow

1. `CommandReferenceGenerate.run()` loads all plugins and commands
2. Calls `Docs.build()` with the command list
3. `Docs.populateTemplate()` groups commands into topics/subtopics
4. For each topic, `Docs.populateTopic()` generates ditamaps
5. For each command, `Docs.populateCommand()` creates command XML via `Command` class
6. Each ditamap class extends `Ditamap` and uses corresponding `.hbs` template
7. Handlebars transforms data into DITA XML format
8. Files are written to the output directory (default: `./tmp/root`)

### Event System

The plugin uses Node's EventEmitter (`events` in `src/utils.ts`) to communicate status:

- `'topic'`: Emitted when processing a new topic
- `'subtopics'`: Emitted with subtopic names
- `'warning'`: Emitted for metadata issues or validation warnings

### Wireit Task Dependencies

This project uses Wireit for build orchestration. Key task dependencies:

- `build` depends on `compile` and `lint`
- `test` depends on `test:compile`, `test:only`, and `lint`
- `test:only` depends on `test:command-reference` (generates test fixtures by running the command)
- Tests run using Mocha with `ts-node/esm` loader for ESM support

### TypeScript Configuration

- Uses ESM modules (`"type": "module"` in package.json)
- Extends strict TypeScript configuration from `@salesforce/dev-config`
- Source in `src/`, compiled output in `lib/`
- Mocha tests use `ts-node/esm` loader for direct TypeScript execution

## Output Formats

The plugin supports two output formats via the `--format` flag:

### DITA XML (default)

- Original format for Salesforce documentation pipeline
- Uses templates in `templates/` directory
- Generates XML files following the DITA specification
- Output includes `.ditamap` files for documentation aggregation

### Markdown

- Alternative format for easier reading and contribution
- Uses templates in `templates/markdown/` directory
- Generates `.md` files with GitHub-flavored Markdown
- Creates README.md files for topic/command navigation
- Useful for hosting docs on GitHub or other Markdown-friendly platforms

Both formats use the same data pipeline and Handlebars templating system. The Markdown generator classes (`src/markdown/`) mirror the DITA generator classes (`src/ditamap/`) in structure.

## Important Notes

- The plugin reads metadata from other plugins' `package.json` oclif configurations - it doesn't generate its own command metadata
- Warnings are emitted when plugins lack required metadata (topic descriptions, command metadata)
- The `--error-on-warnings` flag is useful in CI to enforce metadata completeness
- Commands are grouped by namespace (e.g., `force:org:create` → topic: `force`, subtopic: `org`)
- The `--ditamap-suffix` flag allows multiple doc sets to coexist (default: "unified")
- The plugin supports generating documentation for external/JIT plugins via the `jit install` command
- Both DITA and Markdown formats share the same suffix configuration for consistency
