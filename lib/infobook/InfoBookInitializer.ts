import {XmlInfoBookParser} from "../parse/XmlInfoBookParser";
import {IInfoBookAppendixHandler} from "./appendix/IInfoBookAppendixHandler";
import {IInfoBook} from "./IInfoBook";

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

  public async initialize(): Promise<IInfoBook> {
    const infoBook = await this.parser.parse(this.sectionsFile, this.modId);
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
