import * as fs from "fs";
import {parseString} from "xml2js";
import {IInfoBookAppendixHandler} from "../infobook/appendix/IInfoBookAppendixHandler";
import {IInfoAppendix} from "../infobook/IInfoAppendix";
import {IInfoBook} from "../infobook/IInfoBook";
import {IInfoSection} from "../infobook/IInfoSection";

/**
 * Parses an XML file into an {@link IInfoBook}.
 */
export class XmlInfoBookParser {

  private readonly appendixHandlers: {[type: string]: IInfoBookAppendixHandler} = {};

  /**
   * Register an appendix handler for the given type.
   * @param {string} type A type string.
   * @param {IInfoBookAppendixHandler} handler An appendix handler.
   */
  public registerAppendixHandler(type: string, handler: IInfoBookAppendixHandler) {
    if (this.appendixHandlers[type]) {
      throw new Error(`Tried overwriting an appendix handler for type '${type}'`);
    }
    this.appendixHandlers[type] = handler;
  }

  /**
   * Parse the infobook at the given path.
   * @param {string} path A path.
   * @returns {Promise<IInfoBook>} Promise resolving to an infobook.
   */
  public parse(path: string): Promise<IInfoBook> {
    return new Promise((resolve, reject) => {
      parseString(fs.readFileSync(path), (error, data) => {
        if (error) {
          return reject(error);
        }
        return resolve(this.jsonToInfoBook(data));
      });
    });
  }

  /**
   * Convert a data object to an infobook.
   * @param data A data object.
   * @returns {IInfoBook} An infobook.
   */
  public jsonToInfoBook(data: any): IInfoBook {
    if (data.section) {
      return { rootSection: this.jsonToSection(data.section) };
    }
    throw new Error('No valid root section was found.');
  }

  /**
   * Convert a data object to a section.
   * @param data A data object.
   * @returns {IInfoSection} A section.
   */
  public jsonToSection(data: any): IInfoSection {
    // tslint:disable:object-literal-sort-keys
    return {
      nameTranslationKey: data.$.name,
      subSections: (data.section || []).map((subData: any) => this.jsonToSection(subData)),
      paragraphTranslationKeys: (data.paragraph || []).map((subData: any) => this.jsonToParagraph(subData)),
      appendix: ((data.appendix || []).concat(data.appendix_list || []))
        .map((subData: any) => this.jsonToAppendix(subData)),
    };
  }

  /**
   * Convert a data object to a paragraph.
   * @param data A data object.
   * @returns {string} A paragraph string.
   */
  public jsonToParagraph(data: any): string {
    return data;
  }

  /**
   * Convert a data object to an appendix.
   * @param data A data object.
   * @returns {IInfoAppendix} An appendix.
   */
  public jsonToAppendix(data: any): IInfoAppendix {
    if (!data.$ || (!data.$.type && !data.$.factory)) {
      throw new Error(`No type or factory was found for the appendix ${JSON.stringify(data)}.`);
    }
    const type = data.$.type || data.$.factory;
    const handler = this.appendixHandlers[type];
    if (handler) {
      return handler.createAppendix(data);
    }
    // tslint:disable-next-line:no-console
    console.error(`Could not find an appendix handler for type '${type}'`);
    return null;
  }

}
