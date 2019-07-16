#!/usr/bin/env node
import * as fs from "fs";
import minimist = require("minimist");
import {
  InfoBookAppendixHandlerAdvancementRewards,
} from "../lib/infobook/appendix/InfoBookAppendixHandlerAdvancementRewards";
import {InfoBookAppendixHandlerCraftingRecipe} from "../lib/infobook/appendix/InfoBookAppendixHandlerCraftingRecipe";
import {InfoBookAppendixHandlerImage} from "../lib/infobook/appendix/InfoBookAppendixHandlerImage";
import {InfoBookAppendixHandlerKeybinding} from "../lib/infobook/appendix/InfoBookAppendixHandlerKeybinding";
import {IInfoBook} from "../lib/infobook/IInfoBook";
import {InfoBookInitializer} from "../lib/infobook/InfoBookInitializer";
import {ResourceLoader} from "../lib/resource/ResourceLoader";
import {HtmlInfoBookSerializer} from "../lib/serialize/HtmlInfoBookSerializer";
import {join} from "path";

// Process CLI args
const args = minimist(process.argv.slice(2));
if (args.help || args._.length !== 2) {
  process.stdout.write(`generate-cyclops-infobook-html Output Cyclops infobooks as HTML
Usage:
  generate-cyclops-infobook-html /path/to/config.json /path/to/output/
Options:
  --help        print this help message
`);
  process.exit(1);
}

async function create() {
  // Create infobook from config
  const config = JSON.parse(fs.readFileSync(args._[0], "utf8"));

  // Check if registries have been generated
  if (!fs.existsSync('registries')) {
    process.stderr.write(
      'Could not find a "registries" folder, make sure to create one with generate-mod-metadata.\n');
    process.exit(1);
  }
  // Check if registries have been generated
  if (!fs.existsSync('mc_assets')) {
    process.stderr.write(
      'Could not find a "mc_assets" folder, make sure to create one with generate-mod-metadata.\n');
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
  await resourceLoader.loadMinecraftAssets('mc_assets');
  await resourceLoader.loadKeybindings(config.keybindings);
  await resourceLoader.loadAll(config.baseDir, config.resources);

  // Setup infobook loader
  const infoBookInitializer = new InfoBookInitializer(config);
  infoBookInitializer.registerAppendixHandler('advancement_rewards',
    new InfoBookAppendixHandlerAdvancementRewards(resourceLoader.getResourceHandler()));
  infoBookInitializer.registerAppendixHandler('crafting_recipe',
    new InfoBookAppendixHandlerCraftingRecipe(resourceLoader.getResourceHandler(),
      'registries', config.recipeOverrides));
  infoBookInitializer.registerAppendixHandler('image',
    new InfoBookAppendixHandlerImage(resourceLoader.getResourceHandler()));
  infoBookInitializer.registerAppendixHandler('keybinding',
    new InfoBookAppendixHandlerKeybinding(resourceLoader.getResourceHandler()));

  // Initialize book
  const infoBook: IInfoBook = await infoBookInitializer.initialize();

  // Convert info book to HTML
  const path = args._[1];
  const infoBookSerializer = new HtmlInfoBookSerializer();
  await infoBookSerializer.serialize(infoBook, {
    baseUrl: config.baseUrl,
    colors: config.colors,
    modId: config.modId,
    path,
    resourceHandler: resourceLoader.getResourceHandler(),
    title: config.title,
  });
}

create();
