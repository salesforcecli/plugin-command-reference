# commandSummary

generate the command reference guide located

# commandDescription

generate the command reference guide located

# flags.plugins.summary

comma separated list of plugin names to be part of the generation. Defaults to the oclif plugin in the current working directory

# flags.all.summary

include all relevant plugins in the generation

# flags.hidden.summary

show hidden commands

# flags.output-dir.summary

output directory to put generated files

# flags.error-on-warnings.summary

fail the command if there are any warnings

# flags.ditamap-suffix.summary

unique suffix to append to generated ditamap

# flags.config-path.summary

A path to the directory containing a plugin or cli

# examples

- Generate the command reference guide

  <%= config.bin %> <%= command.id %>

- Generate the command reference for a set of plugins

  <%= config.bin %> <%= command.id %> --plugins pluginA,pluginB

- Generate the command reference for all plugins

  <%= config.bin %> <%= command.id %> --all --output-dir ./docs

- Generate the command reference for all plugins in a directory

  <%= config.bin %> <%= command.id %> --all --config-path /path/to/plugin --output-dir ./docs
