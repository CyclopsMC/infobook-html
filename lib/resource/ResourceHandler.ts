/**
 * Allows Minecraft resources to be used.
 */
export class ResourceHandler {

  private readonly translations: {[language: string]: {[key: string]: string}} = {};

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
   * Collect all translations for the given translation key.
   * @param {string} translationKey A translation key.
   * @returns {{[p: string]: string}} A mapping from language to translated value.
   */
  public getTranslations(translationKey: string): {[lang: string]: string} {
    const collectedTranslations: {[lang: string]: string} = {};

    for (const language in this.translations) {
      const entries = this.translations[language];
      if (entries[translationKey]) {
        collectedTranslations[language] = entries[translationKey];
      }
    }

    return collectedTranslations;
  }

}
