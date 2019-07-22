import {createWriteStream} from "fs";
import {join} from "path";
import {Readable} from "stream";
import {ISerializeContext} from "../serialize/HtmlInfoBookSerializer";
import {IFileWriter} from "./IFileWriter";

/**
 * A context-based {@link IFileWriter}.
 */
export class FileWriter implements IFileWriter {

  private readonly context: ISerializeContext;

  constructor(context: ISerializeContext) {
    this.context = context;
  }

  public write(baseName: string, contents: Readable): string {
    contents.pipe(createWriteStream(join(this.context.basePath, 'assets', baseName)));
    return this.context.baseUrl + 'assets/' + baseName;
  }
}
