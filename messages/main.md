# commandSummary

generate the command reference guide located

# commandDescription

generate the command reference guide located

# pluginFlagSummary

comma separated list of plugin names to be part of the generation. Defaults to the oclif plugin in the current working directory

# allFlagSummary

include all relevant plugins in the generation

# hiddenFlagSummary

show hidden commands

# outputdirFlagSummary

output directory to put generated files

# erroronwarningFlagSummary

fail the command if there are any warnings

# ditamapSuffixFlagSummary

unique suffix to append to generated ditamap

# configPathFlagSummary

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
