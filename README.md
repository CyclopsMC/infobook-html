# Cyclops Infobook HTML

[![Build Status](https://travis-ci.org/CyclopsMC/infobook-html.svg?branch=master)](https://travis-ci.org/CyclopsMC/infobook-html)
[![Coverage Status](https://coveralls.io/repos/github/CyclopsMC/infobook-html/badge.svg?branch=master)](https://coveralls.io/github/CyclopsMC/infobook-html?branch=master)
[![npm version](https://badge.fury.io/js/infobook-html.svg)](https://www.npmjs.com/package/infobook-html)

Output Cyclops infobooks as HTML.

This tool is the basis for the following mod-specific plugins:

* [infobook-html-integrateddynamics](https://github.com/CyclopsMC/infobook-html-integrateddynamics).
* [infobook-html-evilcraft](https://github.com/CyclopsMC/infobook-html-evilcraft).

## Usage

This tool allows Cyclops infobooks to be exported as an HTML website in three phases:

1. Metadata generation: A preparation step for generating all required metadata that is needed for serializing the infobook to HTML.
2. Icon generation: Exporting item and block icons to PNG files. 
3. HTML generation: Serialization to HTML based on the infook XML and metadata.

### 1. Metadata Generation

This step will start a Forge server with your mods so that all relevant metadata can be exported to JSON files.

Before you can execute this phase, you need a `modpack.json` file with contents that look as follows:
```json
{
  "minecraft": "1.12.2",
  "forge": "14.23.5.2838",
  "mods": [
	{
	  "type": "curseforge",
	  "project": "cyclops-core",
	  "artifact": "CyclopsCore-1.12.2",
	  "version": "1.4.0"
	},
    {
	  "type": "maven",
      "artifact": "org.cyclops.integrateddynamics:IntegratedDynamics:1.12.2-1.0.9-1317",
      "repo": "https://oss.jfrog.org/artifactory/simple/libs-release/"
    },
    {
	  "type": "maven",
      "artifact": "org.cyclops.commoncapabilities:CommonCapabilities:1.12.2-2.4.4-309",
      "repo": "https://oss.jfrog.org/artifactory/simple/libs-release/"
    },
    {
      "type": "raw",
      "name": "integratedscripting-1.19.2-1.0.0-61.jar",
      "url": "https://www.dropbox.com/s/mbbikni5ieyttuq/integratedscripting-1.19.2-1.0.0-61.jar?dl=1"
    }
  ]
}
```

*The "forge" entry may be replaced by "neoforge".*

To start this phase, simply run `generate-mod-metadata modpack.json generate`.

Optionally, you can delete the resulting server files afterwards using `generate-mod-metadata modpack.json clean`.

If you want to re-download the mods without re-installing Forge, you can run `generate-mod-metadata modpack.json cleanmods`.

### 2. Icon Generation

This phase should be done using the [Item Exporter mod](https://github.com/CyclopsMC/IconExporter).

Simply create a modpack with all the mods that were downloaded in the previous step (including the Item Exporter mod),
start a world, and run the `/iconexporter export 64` command.

Next, copy the resulting contents of `icon-exports-x64` to `icons` in your project directory.

### 3. HTML Generation

Before you start this phase, make sure the following files and directories are present:

* `registries/crafting_recipe.json`: All crafting recipes. _(Generated in Metadata Generation)_
* `registries/item_translation_keys.json`: A mapping from all items to translation keys. _(Generated in Metadata Generation)_
* `registries/fluid_translation_keys.json`: A mapping from all items to translation keys. _(Generated in Metadata Generation)_
* `mod_assets/` The mod asset files extracting from the mod jars. _(Generated in Metadata Generation)_
* `config.json`: A configuration file with the following contents:

```json
{
  "baseUrl": "/",
  "googleAnalytics": "UA-???????-??",
  "googleAdsense": {
    "client": "ca-pub-?",
    "slot": "?",
    "format": "auto"
  },
  "colors": {
    "h": "#16384c",
    "border": "#3381ad",
    "border_light": "#49b8f7",
    "border_muted": "#9fcae3",
    "main_background": "#e6d6ac",
    "outer_background": "#09171f"
  },
  "icon": "https://media.forgecdn.net/attachments/70/844/logo.png",
  "modId": "integrateddynamics",
  "modName": "Integrated Dynamics",
  "modUrl": "https://www.curseforge.com/minecraft/mc-mods/integrated-dynamics",
  "bookName": "On the Dynamics of Integration",
  "sectionsFile": "mod_assets/integrateddynamics/info/on_the_dynamics_of_integration.xml",
  "injectSections": {
    "info_book.integrateddynamics.manual": [
      {
        "sectionsFile": "mod_assets/integratedtunnels/info/tunnels_info.xml",
        "modId": "integratedtunnels"
      }
    ],
    "info_book.integrateddynamics.tutorials": [
      {
        "sectionsFile": "mod_assets/integratedtunnels/info/tunnels_tutorials.xml",
        "modId": "integratedtunnels"
      }
    ]
  },
  "keybindings": {
    "key.integrateddynamics.logic_programmer_focus_search": "Alt + F",
    "key.integrateddynamics.logic_programmer_open_rename": "Alt + R"
  },
  "recipeOverrides": {},
  "recipePredefineds": {}
}
```

This phase can be started by executing `generate-cyclops-infobook-html config.json /output`.
Afterwards, the contents of `/output` can be hosted on any Web server.

### Plugins

Optionally, plugins can be loaded to for example add support for non-default appendix handlers.

This can be done by implementing [`IInfobookPlugin`](https://github.com/CyclopsMC/infobook-html/blob/master/lib/infobook/IInfobookPlugin.ts),
and exporting an instance of it via a JavaScript file.

Next, the plugin can be loaded when generating HTML by adding the following to your `config.json` file:

```json
{
  "plugins": [
    "path/to/instance.js"
  ],
}
```

Example: [Integrated Dynamics plugin](https://github.com/CyclopsMC/infobook-html-integrateddynamics)

## License
This software is written by [Ruben Taelman](http://rubensworks.net/).

This code is released under the [MIT license](http://opensource.org/licenses/MIT).
