@salesforce/plugin-command-reference
====================================

Generate the [Salesforce CLI command reference guide](https://developer.salesforce.com/docs/atlas.en-us.sfdx_cli_reference.meta/sfdx_cli_reference/).

[![Version](https://img.shields.io/npm/v/@salesforce/plugin-command-reference.svg)](https://npmjs.org/package/@salesforce/plugin-command-reference)
[![Codecov](https://codecov.io/gh/salesforcecli/plugin-command-reference/branch/master/graph/badge.svg)](https://codecov.io/gh/salesforcecli/plugin-command-reference)
[![Downloads/week](https://img.shields.io/npm/dw/@salesforce/plugin-command-reference.svg)](https://npmjs.org/package/@salesforce/plugin-command-reference)
[![License](https://img.shields.io/npm/l/@salesforce/plugin-command-reference.svg)](https://github.com/salesforcecli/plugin-command-reference/blob/master/package.json)

<!-- install -->
<!-- usage -->
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

<!-- usagestop -->
<!-- commands -->
* [`sfdx hello:org [-n <string>] [-f] [-v <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`](#sfdx-helloorg--n-string--f--v-string--u-string---apiversion-string---json---loglevel-tracedebuginfowarnerrorfataltracedebuginfowarnerrorfatal)

## `sfdx hello:org [-n <string>] [-f] [-v <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]`

print a greeting and your org IDs

```
USAGE
  $ sfdx hello:org [-n <string>] [-f] [-v <string>] [-u <string>] [--apiversion <string>] [--json] [--loglevel 
  trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL]

OPTIONS
  -f, --force                                                                       example boolean flag
  -n, --name=name                                                                   name to print

  -u, --targetusername=targetusername                                               username or alias for the target
                                                                                    org; overrides default target org

  -v, --targetdevhubusername=targetdevhubusername                                   username or alias for the dev hub
                                                                                    org; overrides default dev hub org

  --apiversion=apiversion                                                           override the api version used for
                                                                                    api requests made by this command

  --json                                                                            format output as json

  --loglevel=(trace|debug|info|warn|error|fatal|TRACE|DEBUG|INFO|WARN|ERROR|FATAL)  [default: warn] logging level for
                                                                                    this command invocation

EXAMPLES
  $ sfdx hello:org --targetusername myOrg@example.com --targetdevhubusername devhub@org.com
     Hello world! This is org: MyOrg and I will be around until Tue Mar 20 2018!
     My hub org id is: 00Dxx000000001234
  
  $ sfdx hello:org --name myname --targetusername myOrg@example.com
     Hello myname! This is org: MyOrg and I will be around until Tue Mar 20 2018!
```
<!-- commandsstop -->
