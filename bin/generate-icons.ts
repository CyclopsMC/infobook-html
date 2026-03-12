#!/usr/bin/env node
import * as fs from "fs";
import minimist = require("minimist");
import {join} from "path";
import {IconsGenerator} from "../lib/icon/IconsGenerator";

// Process CLI args
const args = minimist(process.argv.slice(2));
if (args.help || args._.length < 1) {
  printUsage();
}

async function run(configPath: string) {
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

  if (!config.minecraft) {
    process.stderr.write('Missing "minecraft" field in config\n');
    process.exit(1);
  }
  if (!config.neoforge && !config.forge) {
    process.stderr.write('Missing "neoforge" or "forge" field in config\n');
    process.exit(1);
  }

  const generator = new IconsGenerator({
    modsDir: join(process.cwd(), args['mods-dir'] || join('server', 'mods')),
    iconsDir: join(process.cwd(), args['icons-dir'] || 'icon'),
    workDir: join(process.cwd(), args['work-dir'] || 'headlessmc'),
    minecraftVersion: config.minecraft,
    neoforgeVersion: config.neoforge || config.forge,
    iconExporterVersion: args['icon-exporter-version'],
    headlessMcVersion: args['headlessmc-version'],
    launchTimeoutMs: args.timeout ? parseInt(args.timeout, 10) * 1000 : undefined,
  });

  await generator.generate();
}

function printUsage() {
  process.stdout.write(`generate-icons Download IconExporter and HeadlessMC, launches Minecraft headlessly, and exports item icons
Usage:
  generate-icons /path/to/modpack.json
Options:
  --help                   print this help message
  --mods-dir               directory containing mod JARs (default: server/mods)
  --icons-dir              output directory for icons (default: icons)
  --work-dir               working directory for HeadlessMC (default: headlessmc)
  --icon-exporter-version  version of the IconExporter artifact to pin (e.g. "1.4.0-174");
                           if omitted, the latest version for the configured Minecraft version
                           is fetched automatically from Modrinth
  --headlessmc-version     version of HeadlessMC to use (default: 2.8.0)
  --timeout                timeout in seconds for the full icon generation (default: 1800)
`);
  process.exit(1);
}

run(args._[0]).catch((e) => {
  // tslint:disable-next-line:no-console
  console.error(e);
  process.exit(1);
});