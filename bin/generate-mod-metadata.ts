#!/usr/bin/env node
import * as fs from "fs";
import minimist = require("minimist");
import {join} from "path";
import {ModLoader} from "../lib/modloader/ModLoader";

// Process CLI args
const args = minimist(process.argv.slice(2));
if (args.help || args._.length !== 2) {
  printUsage();
}

async function run(command: string, configPath: string) {
  // Create mod loader
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  const modLoader = new ModLoader({
    mods: config.mods,
    path: join(process.cwd(), 'server'),
    loader: 'forge' in config ? { versionForge: config.forge } : { versionNeoForge: config.neoforge },
    versionMinecraft: config.minecraft,
  });

  switch (command) {
  case 'clean':
    await modLoader.removeServer();
    break;
  case 'cleanmods':
    await modLoader.removeMods();
    break;
  case 'extractmc':
    await modLoader.extractMinecraftAssets();
    await modLoader.copyModAssets(join(process.cwd(), 'mod_assets'));
    break;
  case 'extractmods':
    await modLoader.extractModsAssets();
    await modLoader.copyModAssets(join(process.cwd(), 'mod_assets'));
    break;
  case 'generate':
    if (!modLoader.isForgeInstalled()) {
      await modLoader.installForge();
      await modLoader.acceptEula();
    }
    if (!modLoader.areModsInstalled()) {
      await modLoader.installMods();
    }

    // Multiple attempts for starting the server
    // Needed because for some reason this can fail when happening right after Forge installation
    let attempts = 0;
    let lastError: Error;
    do {
      try {
        await modLoader.startServer();
        lastError = undefined;
        break;
      } catch (error) {
        lastError = error;
        process.stdout.write('Failed to start server, retrying after delay...\n');
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    } while (attempts++ < 5);
    if (lastError) {
      throw lastError;
    }

    await modLoader.copyRegistries(join(process.cwd(), 'registries'));
    await modLoader.extractMinecraftAssets();
    await modLoader.extractModsAssets();
    await modLoader.copyModAssets(join(process.cwd(), 'mod_assets'));
    break;
  default:
    printUsage();
    break;
  }
}

function printUsage() {
  process.stdout.write(`generate-mod-metadata Download Forge and mods, starts a headless server, and generates metadata
Usage:
  generate-mod-metadata /path/to/modpack.json (generate|clean|cleanmods|extractmc|extractmods)
Options:
  --help        print this help message
`);
  process.exit(1);
}

run(args._[1], args._[0]).catch((e) => {
  // tslint:disable-next-line:no-console
  console.error(e);
  process.exit(1);
});
