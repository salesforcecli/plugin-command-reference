# @salesforce/plugin-command-reference

Generate the [Salesforce CLI command reference guide](https://developer.salesforce.com/docs/atlas.en-us.sfdx_cli_reference.meta/sfdx_cli_reference/).

[![Version](https://img.shields.io/npm/v/@salesforce/plugin-command-reference.svg)](https://npmjs.org/package/@salesforce/plugin-command-reference)
[![Codecov](https://codecov.io/gh/salesforcecli/plugin-command-reference/branch/master/graph/badge.svg)](https://codecov.io/gh/salesforcecli/plugin-command-reference)
[![Downloads/week](https://img.shields.io/npm/dw/@salesforce/plugin-command-reference.svg)](https://npmjs.org/package/@salesforce/plugin-command-reference)
[![License](https://img.shields.io/npm/l/@salesforce/plugin-command-reference.svg)](https://github.com/salesforcecli/plugin-command-reference/blob/master/package.json)

First install the plugin.

```bash
$ sf plugins install @salesforce/plugin-command-reference
```

Ensure any plugins are installed that you with to generate documentation for.

```bash
$ sf plugins:install salesforce@plugin-auth
```

Now we can generate the documentation for all core plug-ins.

```bash
# notice we can use the oclif shorthand for the plugin name.  @salesforce/plugin-foo => foo
$ sf commandreference --plugins auth
```

**Note:** Warnings will occur for missing properties in plugins. Those have to be fixed in the plugin itself.

## Add to your Salesforce CLI Plugin

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
./bin/dev commandreference --plugins <name-of-your-plugin> --error-on-warnings
```

## Local Development

If you need to make changes to this repository, the easiest thing to do is to link it to your Salesforce CLI. After you cloned this plugin, run the following from this plugin directory:

```sh-session
sf plugins link .
```

## Testing

How do you know if the output is correct, given your change?

```bash
# Install the current version of the plugin (use `@sf` until the plugin is publishing the sf version as main)
sf plugins install @salesforce/plugin-command-reference@sf
# installs all JIT plugins (if you intend to produce ditamaps for them)
sf jit install
# run using a relatively current version of plugins, saving the output as a "gold file"
sf commandreference generate --plugins login env deploy-retrieve settings functions info sobject limits schema custom-metadata data community signups user org packaging templates apex auth dev @salesforce/sfdx-plugin-lwc-test -d outputGold
```

While working on your branch

```bash
sf plugins link .
# run the same command from above, but with your new version of the plugin, writing to a new output file
sf commandreference generate --plugins login env deploy-retrieve settings functions info sobject limits schema custom-metadata data community signups user org packaging templates apex auth dev @salesforce/sfdx-plugin-lwc-test -d outputNew
```

Now diff the output. Changes should be intentional!

## Commands

<!-- commands -->

# Command Topics

- [`sf commandreference`](docs/commandreference.md) - generate the Salesforce CLI command reference guide.
- [`sf jit`](docs/jit.md) - description for jit

<!-- commandsstop -->
