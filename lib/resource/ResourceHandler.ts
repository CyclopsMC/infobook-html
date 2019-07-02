/**
 * Allows Minecraft resources to be used.
 */
import {join} from "path";

export class ResourceHandler {

  private readonly translations: {[language: string]: {[key: string]: string}} = {};
  private readonly resourcePackBasePaths: {[resourcePackId: string]: string} = {};

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
      value = this.translations.en_us[translationKey];
      if (!value) {
        throw new Error(`Could not find translation key ${translationKey} in ${languageKey}`);
      }
    }
    return value;
  }

  public setResourcePackBasePath(resourcePackId: string, basePath: string) {
    if (this.resourcePackBasePaths[resourcePackId]) {
      throw new Error(`Tried overwriting a resource pack base path for '${resourcePackId}'`);
    }
    this.resourcePackBasePaths[resourcePackId] = basePath;
  }

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

}
