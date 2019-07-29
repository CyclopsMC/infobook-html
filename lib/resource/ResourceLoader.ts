import {promises as fs, readFileSync} from "fs";
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
   * Load all icon files from the given path.
   * @param {string} iconsPath Path to an directory containing icon files.
   * @returns {Promise<void>} A promise resolving when loading is done.
   */
  public async loadIcons(iconsPath: string) {
    const iconNames = await fs.readdir(iconsPath);
    for (const iconName of iconNames) {
      const iconFile = join(iconsPath, iconName);
      if (iconName.startsWith('fluid__')) {
        this.resourceHandler.addFluidIcon(iconName.substring(7, iconName.length - 4), iconFile);
      } else {
        const split = iconName.split("__");
        const namespace = split[0];
        const path = split[1];
        const meta = parseInt(split[2], 10);
        let nbt = '';
        if (split.length > 3) {
          nbt = split.slice(3, split.length).join(":");
          nbt = nbt.substr(0, nbt.length - 4);
        }
        this.resourceHandler.addItemIcon(namespace, path, meta, nbt, iconFile);
      }
    }
  }

  /**
   * Load all item translation keys from the 'item_translation_keys.json' file.
   * @param {string} registriesPath A registries path.
   * @returns {Promise<void>} A promise resolving when loading is done.
   */
  public async loadItemTranslationKeys(registriesPath: string) {
    const registry = JSON.parse(readFileSync(join(registriesPath, 'item_translation_keys.json'), "utf8"));
    for (const entry of registry.items) {
      this.resourceHandler.addItemTranslationKey(entry.item, entry.translationKey);
    }
  }

  /**
   * Load all fluid translation keys from the 'fluid_translation_keys.json' file.
   * @param {string} registriesPath A registries path.
   * @returns {Promise<void>} A promise resolving when loading is done.
   */
  public async loadFluidTranslationKeys(registriesPath: string) {
    const registry = JSON.parse(readFileSync(join(registriesPath, 'fluid_translation_keys.json'), "utf8"));
    for (const entry of registry.fluids) {
      this.resourceHandler.addFluidTranslationKey(entry.fluid, entry.translationKey);
    }
  }

  /**
   * Load all resources within the given paths.
   * @param {string} baseDir A base directory.
   * @param {string[]} paths An array of paths to traverse to look for resources.
   * @returns {Promise<void>} A promise resolving when loading is done.
   */
  public async loadAll(baseDir: string, path: string) {
    await this.load(join(baseDir, path));
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
    for (const modid of entries) {
      const modPath = join(fullPath, modid);
      if ((await fs.stat(modPath)).isDirectory()) {
        await this.loadAssets(modid, modPath);
      }
    }
  }

  /**
   * Load the assets of the given pack.
   * @param {string} modid A mod id.
   * @param {string} fullPath The full path of the pack.
   * @returns {Promise<void>} A promise resolving when loading is done.
   */
  public async loadAssets(modid: string, fullPath: string) {
    // Set base path
    this.resourceHandler.setResourcePackBasePath(modid, fullPath);

    // Handle languages
    const langDir = join(fullPath, 'lang');
    try {
      if ((await fs.stat(langDir)).isDirectory()) {
        await this.loadAssetsLang(modid, langDir);
      }
    } catch (e) {
      // Ignore mods without language files
    }

    // Handle advancements
    const advancementsDir = join(fullPath, 'advancements');
    try {
      if ((await fs.stat(langDir)).isDirectory()) {
        await this.loadAssetsAdvancements(modid, advancementsDir, '');
      }
    } catch (e) {
      // Ignore mods without advancements
    }
  }

  /**
   * Load the language file within the given language folder.
   * @param {string} modid A mod id.
   * @param {string} langDir The full language directory path.
   * @returns {Promise<void>} A promise resolving when loading is done.
   */
  public async loadAssetsLang(modid: string, langDir: string) {
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

  /**
   * Load the advancements within the given folder, recursively.
   * @param {string} modid A mod id.
   * @param {string} advancementsDir A folder.
   * @param {string} idPrefix The prefix to use for advancement id.
   */
  public async loadAssetsAdvancements(modid: string, advancementsDir: string, idPrefix: string) {
    const entries = await fs.readdir(advancementsDir);

    for (const entry of entries) {
      const entryFullPath = join(advancementsDir, entry);
      const entryId = idPrefix + '/' + entry;
      if ((await fs.stat(entryFullPath)).isDirectory()) {
        await this.loadAssetsAdvancements(modid, entryFullPath, entryId);
      } else {
        await this.loadAssetsAdvancement(modid, entryFullPath, entryId);
      }
    }
  }

  /**
   * Load the advancement in the given file.
   * @param {string} modid A mod id.
   * @param {string} advancementsFile A file.
   * @param {string} id The id of the advancement.
   */
  public async loadAssetsAdvancement(modid: string, advancementsFile: string, id: string) {
    const contents = JSON.parse((await fs.readFile(advancementsFile)).toString('utf8'));
    const itemIcon = contents.display.icon;
    const title = contents.display.title.translate;
    const description = contents.display.description.translate;

    // Remove first slash and '.json' suffix.
    id = id.substr(1, id.length - 6);

    this.resourceHandler.addAdvancement({ itemIcon, title, description }, modid + ':' + id);
  }

  /**
   * Load the given keybindings.
   * @param {{[p: string]: string}} keybindings Keybindings.
   */
  public loadKeybindings(keybindings: {[key: string]: string}) {
    for (const key in keybindings) {
      this.resourceHandler.addKeybinding(key, keybindings[key]);
    }
  }
}
