import {promises as fs} from "fs";
import {join} from 'path';
import {ResourceHandler} from "./ResourceHandler";

/**
 * Loads Minecraft resources in-memory.
 */
export class ResourceLoader {

  private readonly resourceHandler: ResourceHandler;

  constructor() {
    this.resourceHandler = new ResourceHandler();
  }

  /**
   * @returns {ResourceHandler} The handler that contains all loaded resources.
   */
  public getResourceHandler(): ResourceHandler {
    return this.resourceHandler;
  }

  /**
   * Load all resources within the given paths.
   * @param {string} baseDir A base directory.
   * @param {string[]} paths An array of paths to traverse to look for resources.
   * @returns {Promise<void>} A promise resolving when loading is done.
   */
  public async loadAll(baseDir: string, paths: string[]) {
    for (const path of paths) {
      await this.load(join(baseDir, path));
    }
  }

  /**
   * Load a resource somewhere within the given path.
   *
   * Once a mcmod.info file is found, this path will be assumed to be a resource pack.
   *
   * @param {string} fullPath A full path to look in.
   * @returns {Promise<void>} A promise resolving when loading is done.
   */
  public async load(fullPath: string) {
    const entries = await fs.readdir(fullPath);

    // Look for a valid pack
    let foundPack: boolean = false;
    for (const entry of entries) {
      if (entry === 'mcmod.info') {
        // TODO: we may want to add some checks here
        const mcmeta = JSON.parse((await fs.readFile(join(fullPath, entry))).toString('utf8'));
        const modid = mcmeta[0].modid;
        foundPack = true;
        await this.loadAssets(mcmeta, modid, join(fullPath, 'assets', modid));
      }
    }

    // Iterate further if no pack was detected
    if (!foundPack) {
      for (const entry of entries) {
        if ((await fs.stat(join(fullPath, entry))).isDirectory()) {
          await this.load(join(fullPath, entry));
        }
      }
    }
  }

  /**
   * Load the assets of the given pack.
   * @param mcmeta Mcmeta file contents.
   * @param {string} modid A mod id.
   * @param {string} fullPath The full path of the pack.
   * @returns {Promise<void>} A promise resolving when loading is done.
   */
  public async loadAssets(mcmeta: any, modid: string, fullPath: string) {
    const langDir = join(fullPath, 'lang');
    if ((await fs.stat(langDir)).isDirectory()) {
      await this.loadAssetsLang(mcmeta, modid, langDir);
    }
  }

  /**
   * Load the language file within the given language folder.
   * @param mcmeta Mcmeta file contents.
   * @param {string} modid A mod id.
   * @param {string} langDir The full language directory path.
   * @returns {Promise<void>} A promise resolving when loading is done.
   */
  public async loadAssetsLang(mcmeta: any, modid: string, langDir: string) {
    const entries = await fs.readdir(langDir);
    for (const entry of entries) {
      const language = entry.substring(0, entry.indexOf('.'));
      await this.loadAssetsLangFile(modid, language, join(langDir, entry));
    }
  }

  /**
   * Load a single language file.
   * @param {string} modid A mod id.
   * @param {string} language A language key.
   * @param {string} fullFilePath The full language file path.
   * @returns {Promise<void>} A promise resolving when loading is done.
   */
  public async loadAssetsLangFile(modid: string, language: string, fullFilePath: string) {
    const translations: {[translationKey: string]: string} = {};

    const lines = (await fs.readFile(fullFilePath)).toString('utf8').split('\n');
    for (const line of lines) {
      if (line.length > 0 && line[0] !== '#') {
        const separatorIndex = line.indexOf('=');
        const key = line.substr(0, separatorIndex);
        const value = line.substr(separatorIndex + 1);
        translations[key] = value;
      }
    }

    this.resourceHandler.addTranslations(language, translations);
  }

}
