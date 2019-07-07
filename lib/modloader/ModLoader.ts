import {ChildProcess, exec} from "child_process";
import * as fs from "fs";
import download from 'mvn-artifact-download';
import {ncp} from "ncp";
import fetch from 'node-fetch';
import {join} from "path";
import rimraf = require('rimraf');
import {promisify} from "util";

/**
 * Takes care of installing Forge, installing mods, starting a Forge server, and fetching metadata.
 */
export class ModLoader {

  private readonly mods: { artifact: string, repo: string }[];
  private readonly path: string;
  private readonly versionForge: string;
  private readonly versionMinecraft: string;

  constructor(args: IModLoaderArgs) {
    this.mods = args.mods;
    this.path = args.path;
    this.versionForge = args.versionForge;
    this.versionMinecraft = args.versionMinecraft;
  }

  /**
   * @returns {boolean} If Forge is installed
   */
  public isForgeInstalled(): boolean {
    return fs.existsSync(this.path);
  }

  /**
   * Download and install Forge.
   */
  public async installForge() {
    if (!fs.existsSync(this.path)) {
      await fs.promises.mkdir(this.path);
    }

    // Download Forge installer
    process.stdout.write('Downloading Forge...\n');
    const forgeInstaller: string = `https://files.minecraftforge.net/maven/net/minecraftforge/forge/${
      this.versionMinecraft}-${this.versionForge}/forge-${this.versionMinecraft}-${this.versionForge}-installer.jar`;
    const res = await fetch(forgeInstaller);
    if (!res.ok) {
      throw new Error(`Failed to fetch (${res.statusText}): ${forgeInstaller}`);
    }
    const installerFile = join(this.path, 'forge-installer.jar');
    await new Promise(async (resolve, reject) => fs.writeFile(installerFile,
      await res.buffer(), (err) => err ? reject(err) : resolve()));

    // Install Forge
    process.stdout.write('Installing Forge...\n');
    await new Promise((resolve, reject) => exec(
      `cd ${this.path} && java -jar forge-installer.jar --installServer`).on('exit', resolve));

    // Cleanup
    process.stdout.write('Cleaning up...\n');
    await fs.promises.unlink(installerFile);
    await fs.promises.unlink(installerFile + '.log');
  }

  /**
   * Accept the Minecraft EULA
   */
  public async acceptEula() {
    process.stdout.write('Accepting EULA...\n');
    await fs.promises.writeFile(join(this.path, 'eula.txt'), 'eula=true');
  }

  /**
   * @returns {boolean} If mods are installed.
   */
  public areModsInstalled(): boolean {
    return fs.existsSync(join(this.path, 'mods'));
  }

  /**
   * Download and install mods.
   */
  public async installMods() {
    process.stdout.write('Downloading mods...\n');
    const modsDir = join(this.path, 'mods');
    if (!fs.existsSync(modsDir)) {
      await fs.promises.mkdir(modsDir);
    }
    for (const mod of this.mods) {
      process.stdout.write(`  - ${mod.artifact} from ${mod.repo}...\n`);
      await download(mod.artifact, modsDir, mod.repo);
    }
  }

  /**
   * Start the server and execute a command to dump all registries
   */
  public async startServer() {
    // Start the Forge server
    process.stdout.write('Starting server...\n');
    const proc = exec(`cd ${this.path} && java -jar forge-*.jar nogui`);
    // Ignore stdout: proc.stdout.pipe(process.stdout);
    proc.stderr.pipe(process.stderr);
    const onDone = new Promise((resolve, reject) => {
      proc.addListener('exit', resolve);
      proc.addListener('error', reject);
    });

    // Once the loading is complete, send our command and stop the server
    proc.stdout.on('data', (line: string) => {
      if (line.indexOf('[minecraft/DedicatedServer]: Done') >= 0) {
        process.stdout.write('Dumping registries...\n');
        this.sendCommand(proc, '/cyclops dumpregistries');
        this.sendCommand(proc, '/stop');
      }
    });

    await onDone;
  }

  /**
   * Send a command to the given process via stdin.
   * @param {"child_process".ChildProcess} proc A process.
   * @param {string} command A command.
   */
  public sendCommand(proc: ChildProcess, command: string) {
    proc.stdin.write(command + '\n');
  }

  /**
   * Copy the resulting registry files to a target path.
   * @param {string} target A target path.
   */
  public async copyRegistries(target: string) {
    process.stdout.write('Copying registries...\n');
    await promisify(ncp)(join(this.path, 'cyclops_registries'), target);
  }

  /**
   * Remove the server files.
   */
  public async removeServer() {
    await promisify(rimraf)(this.path);
  }

  /**
   * Remove the mod directory.
   */
  public async removeMods() {
    await promisify(rimraf)(join(this.path, 'mods'));
  }

}

export interface IModLoaderArgs {
  mods: { artifact: string, repo: string }[];
  path: string;
  versionForge: string;
  versionMinecraft: string;
}
