import {XmlInfoBookParser} from "../parse/XmlInfoBookParser";
import {ResourceHandler} from "../resource/ResourceHandler";
import {IInfoBookAppendixHandler} from "./appendix/IInfoBookAppendixHandler";
import {InfoBookAppendixTagIndex} from "./appendix/InfoBookAppendixTagIndex";
import {IInfoBook} from "./IInfoBook";
import {IInfoSection} from "./IInfoSection";

/**
 * InfoBookInitializer is a datastructure for holding information on an info book so that it can be constructed.
 */
export class InfoBookInitializer {

  private readonly modId: string;
  private readonly sectionsFile: string;
  private readonly injectSections: {[targetSection: string]: { sectionsFile: string, modId: string }[]};

  private readonly parser: XmlInfoBookParser;

  constructor(args: IInfoBookArgs) {
    if (!args.modId) {
      throw new Error('Missing modId field for infobook construction');
    }
    if (!args.sectionsFile) {
      throw new Error('Missing sectionsFile field for infobook construction');
    }

    this.modId = args.modId;
    this.sectionsFile = args.sectionsFile;
    this.injectSections = args.injectSections || {};

    this.parser = new XmlInfoBookParser();
  }

  public async initialize(resourceHandler: ResourceHandler): Promise<IInfoBook> {
    // Initialize the main book
    const infoBook = await this.parser.parse(this.sectionsFile, this.modId);

    // Inject sections
    for (const sectionId in this.injectSections) {
      const section = infoBook.sections[sectionId];
      if (!section) {
        throw new Error(`Could not find the target section '${sectionId}' to inject into.`);
      }
      for (const entry of this.injectSections[sectionId]) {
        const subInfobook = await this.parser.parse(entry.sectionsFile, entry.modId);
        section.subSections.push(subInfobook.rootSection);
        for (const subSectionId in subInfobook.sections) {
          infoBook.sections[subSectionId] = subInfobook.sections[subSectionId];
        }
      }
    }

    // Create tag index section
    const nameTranslationKey = 'info_book.' + this.modId + '.tag_index';
    const indexSection: IInfoSection = {
      appendix: [new InfoBookAppendixTagIndex(resourceHandler)],
      modId: this.modId,
      nameTranslationKey,
      paragraphTranslationKeys: [],
      subSections: [],
      tags: [],
    };
    infoBook.rootSection.subSections.push(indexSection);
    infoBook.sections[nameTranslationKey] = indexSection;

    return infoBook;
  }

  /**
   * Register an appendix handler for the given type.
   * @param {string} type A type string.
   * @param {IInfoBookAppendixHandler} handler An appendix handler.
   */
  public registerAppendixHandler(type: string, handler: IInfoBookAppendixHandler) {
    this.parser.registerAppendixHandler(type, handler);
  }

}

export interface IInfoBookArgs {
  modId: string;
  sectionsFile: string;
  resources: string[];
  injectSections?: {[targetSection: string]: { sectionsFile: string, modId: string }[]};
}
