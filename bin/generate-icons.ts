#!/usr/bin/env node
import * as fs from 'node:fs';
import { join } from 'node:path';
import minimist from 'minimist';
import { IconsGenerator } from '../lib/icon/IconsGenerator';

// Process CLI args
const args = minimist(process.argv.slice(2));
if (args.help || args._.length === 0) {
  printUsage();
}

async function run(configPath: string): Promise<void> {
  const config = <Record<string, unknown>>JSON.parse(fs.readFileSync(configPath, 'utf8'));

  if (!config.minecraft) {
    process.stderr.write('Missing "minecraft" field in config\n');
    process.exit(1);
  }
  if (!config.neoforge && !config.forge) {
    process.stderr.write('Missing "neoforge" or "forge" field in config\n');
    process.exit(1);
  }

  const generator = new IconsGenerator({
    modsDir: join(process.cwd(), <string>args['mods-dir'] || join('server', 'mods')),
    iconsDir: join(process.cwd(), <string>args['icons-dir'] || 'icon'),
    workDir: join(process.cwd(), <string>args['work-dir'] || 'headlessmc'),
    minecraftVersion: <string>config.minecraft,
    neoforgeVersion: <string>(config.neoforge || config.forge),
    iconExporterVersion: <string | undefined>args['icon-exporter-version'],
    headlessMcVersion: <string | undefined>args['headlessmc-version'],
    launchTimeoutMs: args.timeout ? Number.parseInt(<string>args.timeout, 10) * 1000 : undefined,
  });

  await generator.generate();
}

function printUsage(): never {
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
  console.error(e);
  process.exit(1);
});
