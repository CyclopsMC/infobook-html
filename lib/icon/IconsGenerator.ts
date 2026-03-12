/* tslint:disable:ter-indent */
import {ChildProcess, spawn} from "child_process";
import * as fs from "fs";
import fetch, {RequestInit} from "node-fetch";
import {join} from "path";

/**
 * Generates icons using the IconExporter mod and HeadlessMC.
 * This class downloads HeadlessMC and the IconExporter mod, sets up a headless
 * Minecraft client with NeoForge and all specified mods, launches the game,
 * runs the iconexporter export command, and copies the resulting icons.
 */
export class IconsGenerator {

  private static readonly HEADLESSMC_JAR = 'headlessmc-launcher.jar';
  private static readonly ICONEXPORTER_JAR = 'iconexporter.jar';
  private static readonly HMC_GAME_SUBDIR = 'game';
  private static readonly HMC_CONFIG_SUBDIR = 'HeadlessMC';
  private static readonly ICON_EXPORT_SUBDIR = 'icon-exports-x64';
  private static readonly DEFAULT_ICON_SIZE = 64;
  private static readonly HMC_SPECIFICS_REPO = 'headlesshq/hmc-specifics';
  private static readonly MODRINTH_API_BASE = 'https://api.modrinth.com/v2';
  private static readonly ICONEXPORTER_MODRINTH_SLUG = 'icon-exporter';

  private readonly modsDir: string;
  private readonly iconsDir: string;
  private readonly workDir: string;
  private readonly minecraftVersion: string;
  private readonly neoforgeVersion: string;
  private readonly iconExporterVersion: string | undefined;
  private readonly headlessMcVersion: string;
  private readonly launchTimeoutMs: number;

  public constructor(args: IIconsGeneratorArgs) {
    if (!args.modsDir) {
      throw new Error('Missing modsDir field for icons generation');
    }
    if (!args.iconsDir) {
      throw new Error('Missing iconsDir field for icons generation');
    }
    if (!args.minecraftVersion) {
      throw new Error('Missing minecraftVersion field for icons generation');
    }
    if (!args.neoforgeVersion) {
      throw new Error('Missing neoforgeVersion field for icons generation');
    }

    this.modsDir = args.modsDir;
    this.iconsDir = args.iconsDir;
    this.workDir = args.workDir;
    this.minecraftVersion = args.minecraftVersion;
    this.neoforgeVersion = args.neoforgeVersion;
    this.iconExporterVersion = args.iconExporterVersion;
    this.headlessMcVersion = args.headlessMcVersion || '2.8.0';
    this.launchTimeoutMs = args.launchTimeoutMs || (15 * 60 * 1000); // 15 minutes
  }

  /**
   * Run the full icon generation pipeline.
   */
  public async generate(): Promise<void> {
    // Ensure working directory exists
    if (!fs.existsSync(this.workDir)) {
      await fs.promises.mkdir(this.workDir, {recursive: true});
    }

    process.stdout.write('Downloading HeadlessMC...\n');
    await this.downloadHeadlessMc();

    process.stdout.write('Downloading IconExporter...\n');
    await this.downloadIconExporter();

    process.stdout.write('Setting up mods directory...\n');
    await this.setupGameDirectory();

    process.stdout.write('Writing HeadlessMC config...\n');
    this.writeHmcConfig();

    process.stdout.write('Launching Minecraft to generate icons...\n');
    await this.runGameAndExportIcons();

    process.stdout.write('Copying icons to output...\n');
    await this.copyIcons();
  }

  /**
   * Download the HeadlessMC launcher jar.
   */
  public async downloadHeadlessMc(): Promise<void> {
    const jarPath = join(this.workDir, IconsGenerator.HEADLESSMC_JAR);
    if (fs.existsSync(jarPath)) {
      process.stdout.write('HeadlessMC already downloaded, skipping.\n');
      return;
    }

    const url = `https://github.com/headlesshq/headlessmc/releases/download/${this.headlessMcVersion}/headlessmc-launcher-${this.headlessMcVersion}.jar`;
    await this.downloadFile(url, jarPath);
    process.stdout.write(`Downloaded HeadlessMC to ${jarPath}\n`);
  }

  /**
   * Download the IconExporter mod from Modrinth.
   * If an explicit version is configured, fetches that specific version; otherwise fetches the
   * latest version for the configured Minecraft version. No authentication is required.
   */
  public async downloadIconExporter(): Promise<void> {
    const jarPath = join(this.workDir, IconsGenerator.ICONEXPORTER_JAR);
    if (fs.existsSync(jarPath)) {
      process.stdout.write('IconExporter already downloaded, skipping.\n');
      return;
    }

    if (this.iconExporterVersion) {
      process.stdout.write(`Fetching IconExporter ${this.iconExporterVersion} for Minecraft ${this.minecraftVersion} from Modrinth...\n`);
    } else {
      process.stdout.write(`Fetching latest IconExporter version for Minecraft ${this.minecraftVersion} from Modrinth...\n`);
    }
    const { url: downloadUrl, filename } = await this.fetchIconExporterFromModrinth(this.iconExporterVersion);
    process.stdout.write(`Found IconExporter: ${filename}\n`);
    await this.downloadFile(downloadUrl, jarPath);
    process.stdout.write(`Downloaded IconExporter to ${jarPath}\n`);
  }

  /**
   * Fetch an IconExporter release from Modrinth for the configured Minecraft version and the
   * NeoForge loader. If a specific version number is provided, that version is matched;
   * otherwise the latest (newest) version is returned.
   * Returns the primary file's download URL and filename.
   */
  public async fetchIconExporterFromModrinth(version?: string): Promise<{ url: string; filename: string }> {
    const gameVersions = JSON.stringify([this.minecraftVersion]);
    const loaders = JSON.stringify(['neoforge']);
    const apiUrl = `${IconsGenerator.MODRINTH_API_BASE}/project/${IconsGenerator.ICONEXPORTER_MODRINTH_SLUG}/version` +
      `?game_versions=${encodeURIComponent(gameVersions)}&loaders=${encodeURIComponent(loaders)}`;

    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch IconExporter versions from Modrinth: ${response.status} ${response.statusText}`);
    }

    const versions: IModrinthVersion[] = await response.json();
    if (!versions || versions.length === 0) {
      throw new Error(`No IconExporter versions found on Modrinth for Minecraft ${this.minecraftVersion} with NeoForge`);
    }

    let matched: IModrinthVersion;
    if (version) {
      // Modrinth version_number is typically "{mcVersion}-{modVersion}" (e.g. "1.21.1-1.4.0-174").
      // Match either an exact version_number or the canonical "<mcVersion>-<version>" form.
      const canonicalVersionNumber = `${this.minecraftVersion}-${version}`;
      const found = versions.find((v) => v.version_number === version || v.version_number === canonicalVersionNumber);
      if (!found) {
        throw new Error(`IconExporter version "${version}" not found on Modrinth for Minecraft ${this.minecraftVersion} with NeoForge`);
      }
      matched = found;
    } else {
      // Modrinth returns versions newest-first
      matched = versions[0];
    }

    const primaryFile = matched.files.find((f) => f.primary) || matched.files[0];
    if (!primaryFile) {
      throw new Error(`No files found for IconExporter version ${matched.version_number}`);
    }

    return { url: primaryFile.url, filename: primaryFile.filename };
  }

  /**
   * Set up the game directory with mods and options.
   */
  public async setupGameDirectory(): Promise<void> {
    const gameDir = join(this.workDir, IconsGenerator.HMC_GAME_SUBDIR);
    const modsDir = join(gameDir, 'mods');

    if (!fs.existsSync(modsDir)) {
      await fs.promises.mkdir(modsDir, {recursive: true});
    }

    // Copy mods from server/mods directory
    if (fs.existsSync(this.modsDir)) {
      const mods = await fs.promises.readdir(this.modsDir);
      let copied = 0;
      for (const mod of mods) {
        if (mod.endsWith('.jar')) {
          await fs.promises.copyFile(join(this.modsDir, mod), join(modsDir, mod));
          copied++;
        }
      }
      process.stdout.write(`Copied ${copied} mods from ${this.modsDir} to ${modsDir}\n`);
    } else {
      process.stdout.write(`Warning: mods directory not found: ${this.modsDir}\n`);
    }

    // Copy IconExporter to mods directory
    const iconExporterSrc = join(this.workDir, IconsGenerator.ICONEXPORTER_JAR);
    if (fs.existsSync(iconExporterSrc)) {
      await fs.promises.copyFile(iconExporterSrc, join(modsDir, IconsGenerator.ICONEXPORTER_JAR));
      process.stdout.write('Added IconExporter to mods directory\n');
    }

    // Download hmc-specifics if not already present (avoids relying on HeadlessMC's
    // GitHub API lookup which may hit rate limits in CI environments)
    const existingMods = await fs.promises.readdir(modsDir);
    const hasHmcSpecifics = existingMods.some((f) => f.startsWith('hmc-specifics-'));
    if (!hasHmcSpecifics) {
      await this.downloadHmcSpecifics(modsDir);
    }

    // Write options.txt to disable accessibility screen and pauseOnLostFocus
    const optionsPath = join(gameDir, 'options.txt');
    if (!fs.existsSync(optionsPath)) {
      await fs.promises.writeFile(optionsPath, 'pauseOnLostFocus:false\nonboardAccessibility:false\n');
    }
  }

  /**
   * Write the HeadlessMC configuration file.
   */
  public writeHmcConfig(): void {
    const configDir = join(this.workDir, IconsGenerator.HMC_CONFIG_SUBDIR);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, {recursive: true});
    }

    const gameDir = join(this.workDir, IconsGenerator.HMC_GAME_SUBDIR);
    const configPath = join(configDir, 'config.properties');
    const config = [
      `hmc.mcdir=${gameDir}`,
      'hmc.jline.enabled=false',
    ].join('\n');

    fs.writeFileSync(configPath, config);
    process.stdout.write(`Wrote HeadlessMC config to ${configPath}\n`);
  }

  /**
   * Run the Minecraft client using HeadlessMC and export icons.
   */
  public async runGameAndExportIcons(): Promise<void> {
    const jarPath = join(this.workDir, IconsGenerator.HEADLESSMC_JAR);

    return new Promise<void>((resolve, reject) => {
      const proc = spawn('java', [
        `-Dhmc.mcdir=${join(this.workDir, IconsGenerator.HMC_GAME_SUBDIR)}`,
        // Tell HeadlessMC that Xvfb is in use so it skips offline headless checks
        '-Dhmc.check.xvfb=true',
        '-jar', jarPath,
      ], {
        cwd: this.workDir,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          // Disable ANSI escape sequences for easier parsing
          TERM: 'dumb',
          NO_COLOR: '1',
        },
      });

      let outputBuffer = '';
      // Per-state buffer: cleared on every state transition, so checks only match
      // output produced AFTER entering the current state (avoids stale matches).
      let stateBuffer = '';
      // Track the most recently observed screen name from HeadlessMC `gui` output.
      let lastKnownScreen = '';
      let state: IGameState = 'waiting_for_prompt';
      let stateSettledAt: number = Date.now();
      let commandSent = false;

      const sendCommand = (command: string): void => {
        process.stdout.write(`[HMC] > ${command}\n`);
        proc.stdin.write(command + '\n');
      };

      // Click a button by its text label, resolving to numeric ID from the last gui output.
      // HeadlessMC's click command requires the numeric id, not button text.
      // IMPORTANT: search only the most recent gui response block (from the last 'Screen:' line
      // onward) so that stale button IDs from earlier gui responses in outputBuffer are ignored.
      const clickByText = (buttonText: string): void => {
        const lastScreenIdx = outputBuffer.lastIndexOf('\nScreen:');
        const recentGuiOutput = lastScreenIdx >= 0 ? outputBuffer.slice(lastScreenIdx) : outputBuffer;
        const id = this.findButtonIdByText(recentGuiOutput, buttonText);
        if (id !== null) {
          sendCommand(`click ${id}`);
        } else {
          process.stdout.write(`[HMC] Warning: button "${buttonText}" not found in gui output, trying text fallback\n`);
          sendCommand(`click ${buttonText}`);
        }
      };

      const transitionTo = (newState: IGameState): void => {
        if (state !== newState) {
          process.stdout.write(`[HMC] State: ${state} -> ${newState}\n`);
          state = newState;
          stateSettledAt = Date.now();
          commandSent = false;
          stateBuffer = ''; // reset per-state buffer on every transition
        }
      };

      const handleOutput = (chunk: string): void => {
        outputBuffer += chunk;
        stateBuffer += chunk;
        // Keep global buffer size manageable
        if (outputBuffer.length > 100000) {
          outputBuffer = outputBuffer.slice(outputBuffer.length - 20000);
        }
        // Track the current screen from each gui output chunk
        const screenMatch = chunk.match(/^Screen:\s*(.+)$/m);
        if (screenMatch) {
          lastKnownScreen = screenMatch[1].trim();
          process.stdout.write(`[HMC] Current screen: ${lastKnownScreen}\n`);
        }

        switch (state) {
          case 'waiting_for_prompt':
            // HeadlessMC in non-TTY mode does not print a '>' prompt character.
            // Detect readiness from its actual startup output (version table header or
            // the DefaultCommandLineProvider warning printed just before it waits for input).
            // A time-based fallback ensures we never hang indefinitely.
            if (!commandSent && (
              this.isHeadlessMcReady(outputBuffer) ||
              Date.now() - stateSettledAt > 10000
            )) {
              // HeadlessMC is ready for input - set offline and launch
              commandSent = true;
              sendCommand('offline true');
              // Allow a moment for offline mode to register
              setTimeout(() => {
                sendCommand(`launch neoforge:${this.minecraftVersion} -offline --jvm "-Djava.awt.headless=true"`);
                transitionTo('game_launching');
              }, 1000);
            }
            break;

          case 'game_launching':
            // Wait for NeoForge to finish loading
            if (this.isGameFullyLoaded(stateBuffer) && !commandSent) {
              commandSent = true;
              // Wait a moment for hmc-specifics to be fully initialized
              setTimeout(() => {
                sendCommand('gui');
                transitionTo('checking_screen');
              }, 5000);
            } else if (Date.now() - stateSettledAt > 300000 && !commandSent) {
              // 5-minute timeout: if game output is not being relayed to HMC stdout
              // (e.g. HMCLog4JAppender terminal is null), proceed assuming game is loaded
              commandSent = true;
              process.stdout.write('[HMC] Game load detection timeout, proceeding assuming game is loaded...\n');
              setTimeout(() => {
                sendCommand('gui');
                transitionTo('checking_screen');
              }, 5000);
            }
            break;

          case 'checking_screen':
            // Use lastKnownScreen (from the most recent `gui` output) to avoid acting on
            // stale screen names that appeared earlier in the accumulated outputBuffer.
            if (lastKnownScreen.includes('TitleScreen') && !commandSent) {
              commandSent = true;
              clickByText('Singleplayer');
              transitionTo('navigating_singleplayer');
            } else if ((lastKnownScreen.includes('SelectWorldScreen') ||
              lastKnownScreen.includes('WorldSelectionScreen')) && !commandSent) {
              // World selection screen - click Create New World by numeric ID
              commandSent = true;
              clickByText('Create New World');
              transitionTo('navigating_singleplayer');
            } else if (lastKnownScreen.includes('CreateWorldScreen') && !commandSent) {
              // World creation settings screen - confirm by clicking Create New World
              commandSent = true;
              clickByText('Create New World');
              transitionTo('creating_world');
            } else if (stateBuffer.includes("Couldn't find command for '[gui]'") && !commandSent) {
              // gui not yet recognized; hmc-specifics may still be initializing - retry
              commandSent = true;
              setTimeout(() => {
                sendCommand('gui');
                commandSent = false;
              }, 5000);
            } else if (!commandSent) {
              // Poll for screen changes by sending gui periodically
              commandSent = true;
              setTimeout(() => {
                sendCommand('gui');
                commandSent = false;
              }, 2000);
            }
            break;

          case 'navigating_singleplayer':
            // Poll gui to detect which screen we're on after clicking Singleplayer.
            // Use lastKnownScreen (from most recent gui output) to avoid stale matches.
            // IMPORTANT: check world-load signals BEFORE the SelectWorldScreen check so that
            // a stale lastKnownScreen value of SelectWorldScreen does not trigger another
            // "Create New World" click after the world has already loaded silently.
            if (lastKnownScreen.includes('CreateWorldScreen') && !commandSent) {
              // World creation settings screen - confirm by clicking Create New World
              commandSent = true;
              clickByText('Create New World');
              transitionTo('creating_world');
            } else if ((stateBuffer.includes('logged in') || stateBuffer.includes('not displaying a Gui')) && !commandSent) {
              // World already loaded (detected either from HMC login message or from a gui poll)
              commandSent = true;
              setTimeout(() => {
                sendCommand(`/iconexporter export ${IconsGenerator.DEFAULT_ICON_SIZE}`);
                transitionTo('exporting_icons');
              }, 3000);
            } else if ((lastKnownScreen.includes('SelectWorldScreen') ||
              lastKnownScreen.includes('WorldSelectionScreen')) && !commandSent) {
              // World selection list: click Create New World, then actively poll gui so we detect
              // either CreateWorldScreen (needs a second click) or a loaded world ("not displaying
              // a Gui") even if the game produces no further stdout after the click.
              commandSent = true;
              clickByText('Create New World');
              setTimeout(() => {
                sendCommand('gui');
                commandSent = false;
              }, 8000);
            } else if (Date.now() - stateSettledAt > 60000 && !commandSent) {
              // Fallback: re-check current GUI
              commandSent = true;
              sendCommand('gui');
              transitionTo('checking_screen');
            } else if (!commandSent) {
              // Poll for screen change
              commandSent = true;
              setTimeout(() => {
                sendCommand('gui');
                commandSent = false;
              }, 2000);
            }
            break;

          case 'creating_world':
            // Wait for world to load - look for "logged in" or "not displaying a Gui"
            // Use stateBuffer (cleared on transition) to avoid matching text from earlier states.
            if ((stateBuffer.includes('logged in') || stateBuffer.includes('not displaying a Gui')) && !commandSent) {
              commandSent = true;
              // Wait for world to fully initialize before triggering export
              setTimeout(() => {
                sendCommand(`/iconexporter export ${IconsGenerator.DEFAULT_ICON_SIZE}`);
                transitionTo('exporting_icons');
              }, 3000);
            } else if ((lastKnownScreen.includes('SelectWorldScreen') ||
              lastKnownScreen.includes('WorldSelectionScreen')) && !commandSent) {
              // World creation was cancelled/failed and game returned to world-selection screen.
              // Both 'SelectWorldScreen' and 'WorldSelectionScreen' are checked defensively
              // in case the class name differs across Minecraft/HeadlessMC versions.
              // Re-enter navigating_singleplayer to retry world creation.
              process.stdout.write('[HMC] World creation returned to SelectWorldScreen, retrying...\n');
              transitionTo('navigating_singleplayer');
            } else if (Date.now() - stateSettledAt > 120000 && !commandSent) {
              // Timeout waiting for world - try to proceed anyway
              commandSent = true;
              sendCommand(`/iconexporter export ${IconsGenerator.DEFAULT_ICON_SIZE}`);
              transitionTo('exporting_icons');
            } else if (!commandSent) {
              // Actively poll gui so we can detect world load ("not displaying a Gui") even
              // when the game produces no stdout after loading completes.
              commandSent = true;
              setTimeout(() => {
                sendCommand('gui');
                commandSent = false;
              }, 5000);
            }
            break;

          case 'exporting_icons':
            // Use stateBuffer (cleared on transition) so early startup '[iconexporter] version check'
            // lines in the global outputBuffer don't fire this prematurely.
            // Set commandSent immediately to prevent queuing multiple quit timers.
            // Only match the literal completion string from gui.itemexporter.finished ("Finished exporting")
            // — do NOT use path fragments like 'icon-exports' which appear in Mekanism error stack traces
            // and would cause a premature exit before the export finishes.
            if (!commandSent) {
              if (stateBuffer.includes('Finished exporting')) {
                // Export completion detected - wait a moment for files to flush, then quit
                commandSent = true;
                process.stdout.write('[HMC] Icon export completion detected, quitting in 5s...\n');
                setTimeout(() => {
                  sendCommand('quit');
                  transitionTo('quitting');
                }, 5000);
              } else if (Date.now() - stateSettledAt > 1200000) { // 20 minutes
                // Timeout - quit anyway
                commandSent = true;
                process.stdout.write('[HMC] Warning: icon export may not have completed, quitting...\n');
                sendCommand('quit');
                transitionTo('quitting');
              }
            }
            break;

          case 'quitting':
            // Just waiting for the process to end
            break;

          default:
            break;
        }
      };

      proc.stdout.on('data', (data: Buffer) => {
        const chunk = data.toString();
        process.stdout.write(chunk);
        handleOutput(chunk);
      });

      proc.stderr.on('data', (data: Buffer) => {
        const errChunk = data.toString();
        process.stderr.write(errChunk);
        handleOutput(errChunk);
      });

      // Heartbeat: drive state-machine advances (timeouts, polling) even when the game
      // produces no stdout/stderr output.  Without this the machine freezes permanently
      // after the game goes silent (e.g. after a world finishes loading).
      const heartbeatInterval = setInterval(() => {
        handleOutput('');
      }, 5000);

      const launchTimeout = setTimeout(() => {
        clearInterval(heartbeatInterval);
        proc.kill('SIGTERM');
        reject(new Error(`HeadlessMC timed out after ${this.launchTimeoutMs / 1000}s in state: ${state}`));
      }, this.launchTimeoutMs);

      proc.on('exit', (code) => {
        clearInterval(heartbeatInterval);
        clearTimeout(launchTimeout);
        if (state === 'quitting' || code === 0) {
          resolve();
        } else {
          reject(new Error(`HeadlessMC exited with code ${code} in state: ${state}`));
        }
      });

      proc.on('error', (err) => {
        clearInterval(heartbeatInterval);
        clearTimeout(launchTimeout);
        reject(err);
      });
    });
  }

  /**
   * Copy exported icons to the output icons directory.
   */
  public async copyIcons(): Promise<void> {
    const exportDir = join(this.workDir, IconsGenerator.HMC_GAME_SUBDIR, IconsGenerator.ICON_EXPORT_SUBDIR);

    if (!fs.existsSync(exportDir)) {
      throw new Error(`Icon export directory not found: ${exportDir}. Make sure the IconExporter command ran successfully.`);
    }

    if (!fs.existsSync(this.iconsDir)) {
      await fs.promises.mkdir(this.iconsDir, {recursive: true});
    }

    const files = await fs.promises.readdir(exportDir);
    const pngFiles = files.filter((f) => f.endsWith('.png'));

    for (const file of pngFiles) {
      await fs.promises.copyFile(join(exportDir, file), join(this.iconsDir, file));
    }

    process.stdout.write(`Copied ${pngFiles.length} icons to ${this.iconsDir}\n`);
  }

  /**
   * Parse the HeadlessMC `gui` command output and find the numeric button ID for a given
   * button text label. HeadlessMC's `click` command requires a numeric id, not the text.
   * The gui table format is:
   *   id   text                    x    y    w    h    on   type
   *   0    Multiplayer             140  123  200  20   1    Button
   *   1    Singleplayer            140  99   200  20   1    Button
   * Columns are separated by two or more spaces.
   */
  public findButtonIdByText(guiOutput: string, buttonText: string): number | null {
    for (const line of guiOutput.split('\n')) {
      const cols = line.trim().split(/\s{2,}/);
      if (cols.length >= 2 && /^\d+$/.test(cols[0]) && cols[1].trim() === buttonText) {
        return parseInt(cols[0], 10);
      }
    }
    return null;
  }

  /**
   * Determine if the Minecraft game has fully loaded based on log output.
   */
  public isGameFullyLoaded(output: string): boolean {
    // NeoForge loading complete indicator
    return output.includes('Mod loading complete') ||
      // Vanilla: logged by minecraft/Minecraft when there are 0 advancements
      output.includes('[minecraft/Minecraft]: Loaded 0 advancements') ||
      // Normal case: logged by AdvancementTree after all advancements are loaded;
      // appears near the very end of the loading sequence, just before TitleScreen.
      // NOTE: do NOT use a broad '[Render thread/INFO] + Loaded' match here —
      // that fires prematurely on earlier lines such as RecipeManager output.
      output.includes('[minecraft/AdvancementTree]: Loaded ') ||
      output.includes('HMC Specifics initialized') ||
      output.includes('HMC-Specifics initialized');
  }

  /**
   * Determine if the HeadlessMC launcher is ready to accept commands based on its startup output.
   * In non-TTY mode HeadlessMC does not print a '>' prompt, so we detect readiness from the
   * version-table header or the DefaultCommandLineProvider warning it prints on startup.
   */
  public isHeadlessMcReady(output: string): boolean {
    return output.includes('id   name   parent') ||
      output.includes('DefaultCommandLineProvider');
  }

  /**
   * Download the hmc-specifics mod from GitHub Releases into the given mods directory.
   * This avoids relying on HeadlessMC's built-in `-specifics` auto-download which checks
   * the GitHub API without authentication and can hit rate limits.
   */
  public async downloadHmcSpecifics(modsDir: string): Promise<void> {
    process.stdout.write('Downloading hmc-specifics...\n');
    const apiUrl = `https://api.github.com/repos/${IconsGenerator.HMC_SPECIFICS_REPO}/releases/latest`;
    const apiResponse = await fetch(apiUrl);
    if (!apiResponse.ok) {
      throw new Error(`Failed to fetch hmc-specifics release info: ${apiResponse.status} ${apiResponse.statusText}`);
    }
    const release: any = await apiResponse.json();
    const asset = (release.assets as any[]).find(
      (a: any) => a.name.includes(this.minecraftVersion) && a.name.includes('neoforge'),
    );
    if (!asset) {
      throw new Error(`Could not find hmc-specifics asset for MC ${this.minecraftVersion} in release ${release.tag_name}`);
    }
    const destPath = join(modsDir, asset.name);
    await this.downloadFile(asset.browser_download_url, destPath);
    process.stdout.write(`Downloaded hmc-specifics to ${destPath}\n`);
  }

  /**
   * Download a file from a URL to a destination path.
   */
  public async downloadFile(url: string, destPath: string, headers?: Record<string, string>): Promise<void> {
    const options: RequestInit = {};
    if (headers && Object.keys(headers).length > 0) {
      options.headers = headers;
    }

    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`Failed to download from ${url}: ${response.status} ${response.statusText}`);
    }

    const parentDir = join(destPath, '..');
    if (!fs.existsSync(parentDir)) {
      await fs.promises.mkdir(parentDir, {recursive: true});
    }

    await new Promise<void>((resolve, reject) => {
      const stream = fs.createWriteStream(destPath);
      response.body
        .on('error', reject)
        .pipe(stream);
      stream.on('finish', resolve);
      stream.on('error', reject);
    });
  }

}

export type IGameState =
  'waiting_for_prompt' |
  'game_launching' |
  'checking_screen' |
  'navigating_singleplayer' |
  'creating_world' |
  'exporting_icons' |
  'quitting';

export interface IModrinthVersionFile {
  url: string;
  filename: string;
  primary: boolean;
}

export interface IModrinthVersion {
  version_number: string;
  files: IModrinthVersionFile[];
}

export interface IIconsGeneratorArgs {
  /**
   * Directory containing mod JARs to include in the client (usually server/mods).
   */
  modsDir: string;
  /**
   * Directory where icons will be written.
   */
  iconsDir: string;
  /**
   * Working directory for HeadlessMC and game files.
   */
  workDir: string;
  /**
   * Minecraft version (e.g., "1.21.1").
   */
  minecraftVersion: string;
  /**
   * NeoForge version (e.g., "21.1.210").
   */
  neoforgeVersion: string;
  /**
   * Version of the IconExporter artifact to pin (e.g., "1.4.0-174").
   * If not provided, the latest version for the configured Minecraft version is
   * automatically fetched from Modrinth (no authentication required).
   */
  iconExporterVersion?: string;
  /**
   * Version of HeadlessMC to download (e.g., "2.8.0").
   */
  headlessMcVersion?: string;
  /**
   * Timeout in milliseconds for the full game launch and icon export (default: 30 minutes).
   */
  launchTimeoutMs?: number;
}