#!/usr/bin/env node
import * as fs from "fs";
import minimist = require("minimist");
import {join} from "path";
import {
  InfoBookAppendixHandlerAdvancementRewards,
} from "../lib/infobook/appendix/InfoBookAppendixHandlerAdvancementRewards";
import {InfoBookAppendixHandlerCraftingRecipe} from "../lib/infobook/appendix/InfoBookAppendixHandlerCraftingRecipe";
import {InfoBookAppendixHandlerSmeltingRecipe} from "../lib/infobook/appendix/InfoBookAppendixHandlerSmeltingRecipe";
import {InfoBookAppendixHandlerImage} from "../lib/infobook/appendix/InfoBookAppendixHandlerImage";
import {InfoBookAppendixHandlerKeybinding} from "../lib/infobook/appendix/InfoBookAppendixHandlerKeybinding";
import {InfoBookAppendixHandlerTextfield} from "../lib/infobook/appendix/InfoBookAppendixHandlerTextfield";
import {IInfoBook} from "../lib/infobook/IInfoBook";
import {IInfobookPlugin} from "../lib/infobook/IInfobookPlugin";
import {InfoBookInitializer} from "../lib/infobook/InfoBookInitializer";
import {ResourceLoader} from "../lib/resource/ResourceLoader";
import {HtmlInfoBookSerializer, ISerializeContext} from "../lib/serialize/HtmlInfoBookSerializer";

// Process CLI args
const args = minimist(process.argv.slice(2));
if (args.help || (args._.length !== 2 && args._.length !== 3)) {
  process.stdout.write(`generate-cyclops-infobook-html Output Cyclops infobooks as HTML
Usage:
  generate-cyclops-infobook-html /path/to/config.json /path/to/output/ [baseUrl]
Options:
  --help        print this help message
`);
  process.exit(1);
}

async function create() {
  // Create infobook from config
  const config = JSON.parse(fs.readFileSync(args._[0], "utf8"));

  // Override baseUrl
  if (args._.length === 3) {
    config.baseUrl = args._[2];
  }

  // Check if registries have been generated
  if (!fs.existsSync('registries')) {
    process.stderr.write(
      'Could not find a "registries" folder, make sure to create one with generate-mod-metadata.\n');
    process.exit(1);
  }
  // Check if registries have been generated
  if (!fs.existsSync('mod_assets')) {
    process.stderr.write(
      'Could not find a "mod_assets" folder, make sure to create one with generate-mod-metadata.\n');
    process.exit(1);
  }
  // Check if icons are available
  if (!fs.existsSync('icons')) {
    process.stderr.write(
      'Could not find a "icons" folder, make sure to create one with output from the IconExporter mod.\n');
    process.exit(1);
  }

  // Read resources
  const resourceLoader = new ResourceLoader();
  await resourceLoader.loadIcons('icons');
  await resourceLoader.loadItemTranslationKeys('registries');
  await resourceLoader.loadFluidTranslationKeys('registries');
  await resourceLoader.loadKeybindings(config.keybindings);
  await resourceLoader.loadAll(process.cwd(), 'mod_assets');

  // Setup infobook loader
  const infoBookInitializer = new InfoBookInitializer(config);
  infoBookInitializer.registerAppendixHandler('advancement_rewards',
    new InfoBookAppendixHandlerAdvancementRewards(resourceLoader.getResourceHandler()));
  infoBookInitializer.registerAppendixHandler('minecraft:crafting',
    new InfoBookAppendixHandlerCraftingRecipe(resourceLoader.getResourceHandler(), 'registries', config.recipeOverrides));
  infoBookInitializer.registerAppendixHandler('minecraft:smelting',
    new InfoBookAppendixHandlerSmeltingRecipe(resourceLoader.getResourceHandler(), 'registries', config.recipeOverrides));
  infoBookInitializer.registerAppendixHandler('image',
    new InfoBookAppendixHandlerImage(resourceLoader.getResourceHandler()));
  infoBookInitializer.registerAppendixHandler('keybinding',
    new InfoBookAppendixHandlerKeybinding(resourceLoader.getResourceHandler()));
  infoBookInitializer.registerAppendixHandler('textfield',
    new InfoBookAppendixHandlerTextfield(resourceLoader.getResourceHandler()));

  // Load plugins
  const assetsPaths = [];
  const headSuffixGetters: ((context: ISerializeContext) => string)[] = [];
  if (config.plugins) {
    for (const pluginPath of config.plugins) {
      const plugin: IInfobookPlugin = require(join(process.cwd(), pluginPath));
      plugin.load(infoBookInitializer, resourceLoader, config);
      if (plugin.assetsPath) {
        assetsPaths.push(plugin.assetsPath);
      }
      if (plugin.getHeadSuffix) {
        headSuffixGetters.push(plugin.getHeadSuffix);
      }
    }
  }

  // Find all available mods
  const mods: string[] = (await fs.promises.readdir('server/mods'))
    .filter((mod) => mod.endsWith('.jar'))
    .map((mod) => mod.substr(0, mod.length - 4));

  // Initialize book
  const infoBook: IInfoBook = await infoBookInitializer.initialize(resourceLoader.getResourceHandler());

  // Convert info book to HTML
  let path = args._[1];
  if (!path.endsWith('/')) {
    path += '/';
  }
  const infoBookSerializer = new HtmlInfoBookSerializer();
  await infoBookSerializer.serialize(infoBook, {
    ...config,
    headSuffixGetters,
    mods,
    path,
    resourceHandler: resourceLoader.getResourceHandler(),
    root: true,
  }, assetsPaths);
}

create().catch((e) => {
  // tslint:disable-next-line:no-console
  console.error(e);
  process.exit(1);
});
