import {XmlInfoBookParser} from "../parse/XmlInfoBookParser";
import {IInfoBookAppendixHandler} from "./appendix/IInfoBookAppendixHandler";
import {IInfoBook} from "./IInfoBook";

/**
 * InfoBookInitializer is a datastructure for holding information on an info book so that it can be constructed.
 */
export class InfoBookInitializer {

  private readonly baseDir: string;
  private readonly sectionsFile: string;

  private readonly parser: XmlInfoBookParser;

  constructor(args: IInfoBookArgs) {
    if (!args.baseDir) {
      throw new Error('Missing baseDir field for infobook construction');
    }
    if (!args.sectionsFile) {
      throw new Error('Missing sectionsFile field for infobook construction');
    }

    this.baseDir = args.baseDir;
    this.sectionsFile = args.sectionsFile;

    this.parser = new XmlInfoBookParser();
  }

  public async initialize(): Promise<IInfoBook> {
    return this.parser.parse(this.baseDir + this.sectionsFile);
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
  baseDir: string;
  sectionsFile: string;
  resources: string[];
}
