# @salesforce/plugin-command-reference

Generate the [Salesforce CLI command reference guide](https://developer.salesforce.com/docs/atlas.en-us.sfdx_cli_reference.meta/sfdx_cli_reference/).

[![Version](https://img.shields.io/npm/v/@salesforce/plugin-command-reference.svg)](https://npmjs.org/package/@salesforce/plugin-command-reference)
[![Codecov](https://codecov.io/gh/salesforcecli/plugin-command-reference/branch/master/graph/badge.svg)](https://codecov.io/gh/salesforcecli/plugin-command-reference)
[![Downloads/week](https://img.shields.io/npm/dw/@salesforce/plugin-command-reference.svg)](https://npmjs.org/package/@salesforce/plugin-command-reference)
[![License](https://img.shields.io/npm/l/@salesforce/plugin-command-reference.svg)](https://github.com/salesforcecli/plugin-command-reference/blob/master/package.json)

First install the plugin.

```sh-session
$ sfdx plugins:install @salesforce/plugin-command-reference
```

Ensure any plugins are installed that you with to generate documentation for.

```sh-session
$ sfdx plugins:install salesforcedx
```

Now we can generate the documentation.

```sh-session
$ sfdx commandreference --plugins salesforcedx
```

**Note:** Warnings will occur for missing properties in plugins. Those have to be fixed in the plugin itself.

To add this to your plugin to catch warning at development time, add it as a dev plugin in the project.json.

```json
"oclif": {
  "devPlugins": [
    "@salesforce/plugin-command-reference"
  ]
}
```

Then you can run this in your plugin's CI.

```sh-session
./bin/run commandreference --plugins <name-of-your-plugin> --error-on-warnings
```

<!-- commands -->

- [`sfdx commandreference:generate -p <array> [-d <string>] [--hidden] [--erroronwarnings] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-commandreferencegenerate--p-array--d-string---hidden---erroronwarnings---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)

## `sfdx commandreference:generate -p <array> [-d <string>] [--hidden] [--erroronwarnings] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

generate the command reference guide located

```
USAGE
  $ sfdx commandreference:generate -p <array> [-d <string>] [--hidden] [--erroronwarnings] [--json] [--loglevel
  trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -d, --outputdir=outputdir                                                         [default: ./tmp/root] output
                                                                                    directory to put generated files

  -p, --plugins=plugins                                                             (required) comma separated list of
                                                                                    plugin names to be part of the
                                                                                    generation

  --erroronwarnings                                                                 fail the command if there are any
                                                                                    warnings

  --hidden                                                                          show hidden commands

  --json                                                                            format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: warn] logging level for
                                                                                    this command invocation
```

_See code: [lib/commands/commandreference/generate.js](https://github.com/forcedotcom/plugin-command-reference/blob/v1.0.5/lib/commands/commandreference/generate.js)_

<!-- commandsstop -->
