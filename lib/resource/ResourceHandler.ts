/**
 * Allows Minecraft resources to be used.
 */
export class ResourceHandler {

  private readonly translations: {[language: string]: {[key: string]: string}} = {};

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

}
