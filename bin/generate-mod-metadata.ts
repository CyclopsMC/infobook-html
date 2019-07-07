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
    versionForge: config.forge,
    versionMinecraft: config.minecraft,
  });

  switch (command) {
  case 'clean':
    await modLoader.removeServer();
    break;
  case 'cleanmods':
    await modLoader.removeMods();
    break;
  case 'generate':
    if (!modLoader.isForgeInstalled()) {
      await modLoader.installForge();
      await modLoader.acceptEula();
    }
    if (!modLoader.areModsInstalled()) {
      await modLoader.installMods();
    }
    await modLoader.startServer();
    await modLoader.copyRegistries(join(process.cwd(), 'cyclops_registries'));
    break;
  default:
    printUsage();
    break;
  }
}

function printUsage() {
  process.stdout.write(`generate-mod-metadata Download Forge and mods, starts a headless server, and generates metadata
Usage:
  generate-mod-metadata /path/to/modpack.json (generate|clean|cleanmods)
Options:
  --help        print this help message
`);
  process.exit(1);
}

run(args._[1], args._[0]);
