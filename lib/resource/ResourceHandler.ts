import {join} from "path";
import {IFluid} from "../infobook/IFluid";
import {IItem} from "../infobook/IItem";

/**
 * Allows Minecraft resources to be used.
 */
export class ResourceHandler {

  private static readonly TRANSLATION_DEFAULTS: {[key: string]: string} = {
    'fluid.tile.lava': 'Lava',
    'fluid.tile.water': 'Water',
  };

  private readonly translations: {[language: string]: {[key: string]: string}} = {};
  private readonly resourcePackBasePaths: {[resourcePackId: string]: string} = {};
  private readonly iconsItem: IItemKeyedRegistry = {};
  private readonly itemTranslationKeys: IItemKeyedRegistry = {};
  private readonly iconsFluid: {[fluidName: string]: string} = {};
  private readonly fluidTranslationKeys: {[fluidName: string]: string} = {};
  private readonly advancements: {[advancementId: string]: IAdvancement} = {};
  private readonly keybindings: {[keyId: string]: string} = {};

  /**
   * Split an item id like "minecraft:stone" into namespace an path.
   * @param {string} itemId An item id.
   * @returns {{namespace: string; path: string}} Namespace and path.
   */
  public static splitItemId(itemId: string): { namespace: string, path: string } {
    const split = itemId.split(':');
    const namespace = split[0];
    const path = split[1];
    return { namespace, path };
  }

  /**
   * Add an entry to a {@llink IItemKeyedRegistry}.
   * @param {string} namespace The namespace.
   * @param {string} path The path.
   * @param {string} nbt The NBT. (empty string represents no NBT)
   * @param {string} value The value.
   */
  protected static addItemKeyedRegistryEntry(registry: IItemKeyedRegistry, namespace: string, path: string,
                                             nbt: string, value: string) {
    let paths = registry[namespace];
    if (!paths) {
      paths = registry[namespace] = {};
    }
    let nbts = paths[path];
    if (!nbts) {
      nbts = paths[path] = {};
    }
    nbts[nbt] = value;
  }

  /**
   * Get an value from a {@llink IItemKeyedRegistry}.
   * @param {string} namespace The namespace.
   * @param {string} path The path.
   * @param {string} nbt The NBT. (empty string represents no NBT)
   * @return The value.
   */
  protected static getItemKeyedRegistryEntry(registry: IItemKeyedRegistry, namespace: string,
                                             path: string, nbt: string = ''): string {
    const paths = registry[namespace];
    if (!paths) {
      return null;
    }
    const nbts = paths[path];
    if (!nbts) {
      return null;
    }
    let file = nbts[nbt];
    if (!file) {
      file = nbts[Object.keys(nbts)[0]]; // Take the first NBT-tagged item if none without NBT could be found
    }
    return file;
  }

  /**
   * @returns {string[]} All available language keys.
   */
  public getLanguages(): string[] {
    return Object.keys(this.translations);
  }

  /**
   * Add translations for the given language.
   * @param {string} language A language key.
   * @param {{[p: string]: string}} translations A mapping from translation key to translated value.
   */
  public addTranslations(language: string, translations: {[key: string]: string}) {
    language = language.toLowerCase();
    const existingTranslations = this.translations[language];
    if (!existingTranslations) {
      this.translations[language] = translations;
    } else {
      for (const key in translations) {
        existingTranslations[key] = translations[key];
      }
    }
  }

  /**
   * Get the translation for the given key.
   * @param {string} translationKey A translation key.
   * @param {string} languageKey A language key.
   * @returns {string} A translated value.
   */
  public getTranslation(translationKey: string, languageKey: string): string {
    const entries = this.translations[languageKey] || this.translations.en_us;
    let value = entries[translationKey];
    if (!value) {
      value = this.translations.en_us[translationKey] || ResourceHandler.TRANSLATION_DEFAULTS[translationKey];
      if (!value) {
        throw new Error(`Could not find translation key ${translationKey} in ${languageKey}`);
      }
    }
    return value;
  }

  /**
   * Set the base path for resource keys.
   * @param {string} resourcePackId A resource pack id.
   * @param {string} basePath An absolute base path.
   */
  public setResourcePackBasePath(resourcePackId: string, basePath: string) {
    if (this.resourcePackBasePaths[resourcePackId]) {
      throw new Error(`Tried overwriting a resource pack base path for '${resourcePackId}'`);
    }
    this.resourcePackBasePaths[resourcePackId] = basePath;
  }

  /**
   * Get the full path corresponding to a resource key.
   * @param {string} resourceKey A resource key.
   * @returns {string} A full file path.
   */
  public expandResourcePath(resourceKey: string): string {
    const separator = resourceKey.indexOf(':');
    if (separator < 0) {
      throw new Error(`Invalid resource key for expansion: ${resourceKey}`);
    }
    const resourcePackId = resourceKey.substr(0, separator);
    const basePath = this.resourcePackBasePaths[resourcePackId];
    if (!basePath) {
      throw new Error(`Failed to expand unknown resource pack id for resource path: ${resourceKey}`);
    }
    const suffix = resourceKey.substr(separator + 1);
    return join(basePath, suffix);
  }

  /**
   * Add an item icon file.
   * @param {string} namespace The icon namespace.
   * @param {string} path The icon path.
   * @param {string} nbt The icon NBT. (empty string represents no NBT)
   * @param {string} file The icon file path.
   */
  public addItemIcon(namespace: string, path: string, nbt: string, file: string) {
    ResourceHandler.addItemKeyedRegistryEntry(this.iconsItem, namespace, path, nbt, file);
  }

  /**
   * Get an item icon file.
   * @param {string} itemId The icon namespace:path.
   * @param {string} nbt The icon NBT. (empty string represents no NBT)
   * @return The icon file path or null.
   */
  public getItemIconFile(itemId: string, nbt: string = ''): string {
    const { namespace, path } = ResourceHandler.splitItemId(itemId);
    return ResourceHandler.getItemKeyedRegistryEntry(this.iconsItem, namespace, path, nbt);
  }

  /**
   * Add a fluid icon file.
   * @param {string} fluidName The fluid name.
   * @param {string} file The icon file path.
   */
  public addFluidIcon(fluidName: string, file: string) {
    this.iconsFluid[fluidName] = file;
  }

  /**
   * Get a fluid icon file.
   * @param {string} fluidName The fluid name.
   * @return The icon file path or null.
   */
  public getFluidIconFile(fluidName: string): string {
    return this.iconsFluid[fluidName.replace(':', '__')];
  }

  /**
   * Add an item translation key.
   * @param {IItem} item An item.
   * @param {string} translationKey The translation key.
   */
  public addItemTranslationKey(item: IItem, translationKey: string) {
    const { namespace, path } = ResourceHandler.splitItemId(item.item);
    ResourceHandler.addItemKeyedRegistryEntry(this.itemTranslationKeys, namespace, path, item.components, translationKey);
  }

  /**
   * Get an item translation key.
   * @param {IItem} item An item.
   * @return The translation key or null.
   */
  public getItemTranslationKey(item: IItem): string {
    const { namespace, path } = ResourceHandler.splitItemId(item.item);
    return ResourceHandler.getItemKeyedRegistryEntry(this.itemTranslationKeys, namespace, path, item.components);
  }

  /**
   * Add an fluid translation key.
   * @param {IFluid} fluid An fluid.
   * @param {string} translationKey The translation key.
   */
  public addFluidTranslationKey(fluid: IFluid, translationKey: string) {
    this.fluidTranslationKeys[fluid.fluid] = translationKey;
  }

  /**
   * Get an fluid translation key.
   * @param {IFluid} fluid An fluid.
   * @return The translation key or null.
   */
  public getFluidTranslationKey(fluid: IFluid): string {
    return this.fluidTranslationKeys[fluid.fluid];
  }

  /**
   * Add an advancement.
   * @param {IAdvancement} advancement An advancement.
   * @param {string} id An advancement id.
   */
  public addAdvancement(advancement: IAdvancement, id: string) {
    if (this.advancements[id]) {
      throw new Error(`Tried overwriting an advancement for '${id}'`);
    }
    this.advancements[id] = advancement;
  }

  /**
   * Get an advancement.
   * @param {string} id An advancement id.
   * @return The advancement.
   */
  public getAdvancement(id: string): IAdvancement {
    const advancement = this.advancements[id];
    if (!advancement) {
      throw new Error(`Could not find an advancement with id '${id}'`);
    }
    return advancement;
  }

  /**
   * Add an keybinding.
   * @param {string} id A keybinding id.
   * @param {string} keybinding An keybinding.
   */
  public addKeybinding(id: string, keybinding: string) {
    if (this.keybindings[id]) {
      throw new Error(`Tried overwriting an keybinding for '${id}'`);
    }
    this.keybindings[id] = keybinding;
  }

  /**
   * Get a keybinding.
   * @param {string} id A keybinding id.
   * @return The keybinding.
   */
  public getKeybinding(id: string): string {
    const keybinding = this.keybindings[id];
    if (!keybinding) {
      throw new Error(`Could not find a keybinding with id '${id}'`);
    }
    return keybinding;
  }

}

export interface IItemKeyedRegistry {
  [namespace: string]: {[path: string]: {[nbt: string]: string}};
}

export interface IAdvancement {
  itemIcon: IItem;
  title: string;
  description: string;
}
