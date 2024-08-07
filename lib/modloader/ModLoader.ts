import {ChildProcess, exec} from "child_process";
import {createWriteStream} from "fs";
import * as fs from "fs";
import download from 'mvn-artifact-download';
import {ncp} from "ncp";
import fetch from 'node-fetch';
import {dirname, join, sep} from "path";
import rimraf = require('rimraf');
import {promisify} from "util";
import {Entry, open as openZip, ZipFile} from "yauzl";
import * as Path from "path";

/**
 * Takes care of installing Forge, installing mods, starting a Forge server, and fetching metadata.
 */
export class ModLoader {

  private readonly mods: IMod[];
  private readonly path: string;
  private readonly loader: ILoader;
  private readonly versionMinecraft: string;

  constructor(args: IModLoaderArgs) {
    this.mods = args.mods;
    this.path = args.path;
    this.loader = args.loader;
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

    let installerFile: string;
    if ('versionForge' in this.loader) {
      // Download Forge installer
      process.stdout.write('Downloading Forge...\n');
      const forgeInstaller: string = `https://files.minecraftforge.net/maven/net/minecraftforge/forge/${
        this.versionMinecraft}-${this.loader.versionForge}/forge-${this.versionMinecraft}-${this.loader.versionForge}-installer.jar`;
      const res = await fetch(forgeInstaller);
      if (!res.ok) {
        throw new Error(`Failed to fetch (${res.statusText}): ${forgeInstaller}`);
      }
      installerFile = join(this.path, 'forge-installer.jar');
      await new Promise<void>(async (resolve, reject) => fs.writeFile(installerFile,
        await res.buffer(), (err) => err ? reject(err) : resolve()));

      // Install Forge
      process.stdout.write('Installing Forge...\n');
      await new Promise((resolve, reject) => exec(
        `cd ${this.path} && java -jar forge-installer.jar --installServer`).on('exit', resolve));
    } else {
      // Download NeoForge installer
      process.stdout.write('Downloading NeoForge...\n');
      const installer: string = `https://maven.neoforged.net/releases/net/neoforged/neoforge/${
        this.loader.versionNeoForge}/neoforge-${this.loader.versionNeoForge}-installer.jar`;
      const res = await fetch(installer);
      if (!res.ok) {
        throw new Error(`Failed to fetch (${res.statusText}): ${installer}`);
      }
      installerFile = join(this.path, 'neoforge-installer.jar');
      await new Promise<void>(async (resolve, reject) => fs.writeFile(installerFile,
        await res.buffer(), (err) => err ? reject(err) : resolve()));

      // Install Forge
      process.stdout.write('Installing NeoForge...\n');
      await new Promise((resolve, reject) => exec(
        `cd ${this.path} && java -jar neoforge-installer.jar --installServer`).on('exit', resolve));
    }

    // Wait a bit, because otherwise some files don't exist yet (while they should...)
    process.stdout.write('Wait a bit after mod loader installation...\n');
    await new Promise((resolve) => setTimeout(resolve, 10000));

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
      if (mod.type === 'curseforge') {
        const fileName = `${mod.artifact}-${mod.version}.jar`;
        process.stdout.write(`  - ${fileName} from CurseForge...\n`);
        const url = `https://minecraft.curseforge.com/api/maven/${mod.project}/${mod.artifact
          .replace(/-/g, '/')}/${fileName}`;
        await this.downloadFile(url, fileName, modsDir);
      } else if (mod.type === 'maven') {
        process.stdout.write(`  - ${mod.artifact} from ${mod.repo}...\n`);
        const name = await download(mod.artifact, modsDir, mod.repo);
        // Rename file if needed
        if ('name' in mod) {
          fs.renameSync(name, join(modsDir, mod.name));
        }
      } else if (mod.type === 'raw') {
        process.stdout.write(`  - ${mod.name} from ${mod.url}...\n`);
        await this.downloadFile(mod.url, mod.name, modsDir);
      } else {
        throw new Error('Unknown mod type ' + (<any> mod).type);
      }
    }
  }

  public async downloadFile(url: string, fileName: string, modsDir: string): Promise<void> {
    const response = await fetch(url);
    if (response.status !== 200) {
      throw new Error(response.statusText + ' on ' + url);
    }
    await new Promise((resolve, reject) => {
      response.body
        .on('error', reject)
        .on('end', resolve)
        .pipe(fs.createWriteStream(join(modsDir, fileName)));
    });
  }

  /**
   * Start the server and execute a command to dump all registries
   */
  public async startServer() {
    // Start the Forge server
    process.stdout.write('Starting server...\n');

    const proc = exec(`cd ${this.path} && ./run.sh nogui`);
    // Ignore stdout: proc.stdout.pipe(process.stdout);
    proc.stderr.pipe(process.stderr);
    const onDone = new Promise<void>((resolve, reject) => {
      proc.addListener('exit', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject('Server closed with non-zero exit code');
        }
      });
      proc.addListener('error', reject);
    });

    // Once the loading is complete, send our command and stop the server
    proc.stdout.on('data', (line: string) => {
      if (line.indexOf('Done') >= 0 && line.indexOf('For help, type "help"') >= 0) {
        process.stdout.write('Dumping registries...\n');
        this.sendCommand(proc, '/cyclopscore dumpregistries');
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
    if (!fs.existsSync(join(this.path, 'cyclops_registries'))) {
      await fs.promises.mkdir(join(this.path, 'cyclops_registries'));
    }
    await promisify(ncp)(join(this.path, 'cyclops_registries'), target);
  }

  /**
   * Extract the Minecraft assets from the server jar
   */
  public async extractMinecraftAssets() {
    process.stdout.write('Extracting minecraft assets...\n');

    if (!fs.existsSync(join(this.path, 'mc_assets'))) {
      await fs.promises.mkdir(join(this.path, 'mc_assets'));
    }

    // Find Minecraft jar
    let jar: string = null;
    const subPath = Path.join(this.path, 'libraries', 'net', 'minecraft', 'server');
    for (const dir of await fs.promises.readdir(subPath)) {
      if (dir.indexOf('-') > 0) {
        for (const file of await fs.promises.readdir(Path.join(subPath, dir))) {
          if (file.startsWith('server') && file.endsWith('extra.jar')) {
            jar = join(subPath, dir, file);
          }
        }
      }
    }

    // Error if no jar was found
    if (!jar) {
      throw new Error('Could not find a valid minecraft server in ' + this.path);
    }

    // Unzip the jar
    process.stdout.write(`Extracting Minecraft jar...\n`);
    await this.extractModAssets(jar);
  }

  /**
   * Extract assets from all mod jars
   */
  public async extractModsAssets() {
    process.stdout.write('Extracting mod assets...\n');

    if (!fs.existsSync(join(this.path, 'mod_assets'))) {
      await fs.promises.mkdir(join(this.path, 'mod_assets'));
    }

    // Loop over all mods
    const modsDir = join(this.path, 'mods');
    for (const mod of await fs.promises.readdir(modsDir)) {
      if (mod.endsWith('.jar')) {
        const modFile = join(modsDir, mod);
        process.stdout.write(`  - ${mod}...\n`);
        await this.extractModAssets(modFile);
      }
    }
  }

  /**
   * Extract the assets of a mod. A mod file.
   * @param {string} modFile A mod file path.
   */
  public async extractModAssets(modFile: string) {
    const zipFile: ZipFile = await new Promise((resolve, reject) => {
      openZip(modFile, { lazyEntries: true, autoClose: true }, (e, f) => {
        if (e) {
          reject(e);
        }
        resolve(f);
      });
    });

    zipFile.readEntry();
    zipFile.on('error', (e) => process.stdout.write(e));
    zipFile.on('entry', (entry: Entry) => {
      if (entry.fileName.endsWith('/')) {
        // Directory
        zipFile.readEntry();
      } else {
        // File
        if (entry.fileName.startsWith('assets/') || entry.fileName.startsWith('data/')) {
          const targetFile = join(this.path, 'mod_assets', entry.fileName.substring(entry.fileName.startsWith('assets/') ? 7 : 5, entry.fileName.length));
          const targetDir = dirname(targetFile);
          this.ensureDirExists(targetDir).then(() => {
            zipFile.openReadStream(entry, (e, readStream) => {
              if (e) {
                throw e;
              }
              readStream.pipe(createWriteStream(targetFile));
              readStream.on('end', () => zipFile.readEntry());
            });
          });
        } else {
          zipFile.readEntry();
        }
      }
    });
    await new Promise((resolve) => zipFile.on('end', resolve));
  }

  /**
   * Copy the resulting mod asset files to a target path.
   * @param {string} target A target path.
   */
  public async copyModAssets(target: string) {
    process.stdout.write('Copying mod assets...\n');
    await promisify(ncp)(join(this.path, 'mod_assets'), target);
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

  protected async ensureDirExists(path: string) {
    const segments = path.substr(this.path.length, path.length).split(sep);
    for (let i = 1; i <= segments.length; i++) {
      const subPath = join(this.path, segments.slice(0, i).join(sep));
      try {
        await fs.promises.stat(subPath);
      } catch (e) {
        await fs.promises.mkdir(subPath);
      }
    }
  }

}

export interface IModLoaderArgs {
  mods: IMod[];
  path: string;
  loader: ILoader;
  versionMinecraft: string;
}

export type ILoader = {
  versionForge: string;
} | {
  versionNeoForge: string;
}

export type IMod = IModMaven | IModCurseforge | IModRaw;

export interface IModMaven {
  type: 'maven';
  artifact: string;
  repo: string;
  name?: string;
}

export interface IModCurseforge {
  type: 'curseforge';
  project: string;
  artifact: string;
  version: string;
}

export interface IModRaw {
  type: 'raw';
  name: string;
  url: string;
}
