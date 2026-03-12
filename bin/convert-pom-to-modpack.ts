#!/usr/bin/env node
import * as fs from 'node:fs';
import * as path from 'node:path';
import minimist from 'minimist';
import { convertPomToModpack } from '../lib/modloader/PomConverter';

// Process CLI args
const args = minimist(process.argv.slice(2));
if (args.help || args._.length === 0 || args._.length > 3) {
  printUsage();
}

async function run(pomPath: string, settingsPath: string | undefined, outputPath: string): Promise<void> {
  const pomXml = fs.readFileSync(pomPath, 'utf8');
  const settingsXml = settingsPath ? fs.readFileSync(settingsPath, 'utf8') : undefined;

  const modpack = await convertPomToModpack(pomXml, settingsXml);

  fs.writeFileSync(outputPath, `${JSON.stringify(modpack, undefined, 2)}\n`, 'utf8');
  process.stdout.write(`Written modpack.json to ${outputPath}\n`);
}

function printUsage(): never {
  process.stdout.write(`convert-pom-to-modpack Convert a Maven pom.xml + settings.xml into a modpack.json
Usage:
  convert-pom-to-modpack /path/to/modpack.pom.xml [/path/to/modpack.settings.xml] [/path/to/modpack.json]
Arguments:
  pom.xml       Path to the Maven POM file (required)
  settings.xml  Path to the Maven settings file (optional, provides repository URLs and credentials)
  modpack.json  Output path for the generated modpack.json (default: modpack.json in cwd)
Options:
  --help        print this help message
Notes:
  - The Minecraft version is taken from the project <version> in the POM.
  - The NeoForge version is taken from the <neoforge.version> property in the POM.
  - The Forge version is taken from the <forge.version> property in the POM.
  - Each dependency becomes a maven mod entry pointing to the first active repository.
  - Server credentials in settings.xml are encoded as Authorization headers using the
    placeholder values from the file (e.g. \${GITHUB_TOKEN} remains as-is).
`);
  process.exit(1);
}

const pomPath = path.resolve(args._[0]);
const settingsArg = args._.length >= 2 ? args._[1] : undefined;
const outputArg = args._.length >= 3 ? args._[2] : path.join(process.cwd(), 'modpack.json');
const settingsPath = settingsArg ? path.resolve(settingsArg) : undefined;
const outputPath = path.resolve(outputArg);

run(pomPath, settingsPath, outputPath).catch((e) => {
  console.error(e);
  process.exit(1);
});
