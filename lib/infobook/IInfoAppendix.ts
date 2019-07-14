/**
 * Datastructure for an info book appendix.
 */
import {Readable} from "stream";
import {ISerializeContext} from "../serialize/HtmlInfoBookSerializer";

export interface IInfoAppendix {
  /**
   * @param context The serialization context.
   * @returns {string} The optional appendix type name.
   */
  getName?: (context: ISerializeContext) => string;

  /**
   * @param context The serialization context.
   * @param fileWriter A function that can be called for writing auxiliary files.
   * @returns {string} The HTML representation of this appendix.
   */
  toHtml(context: ISerializeContext, fileWriter: IFileWriter): string;
}

/**
 * Allows auxiliary files to be written to the output.
 */
export interface IFileWriter {
  /**
   * Write the given contents somewhere in the output files.
   * @param {string} baseName The file basename.
   * @param {"stream".internal.Readable} contents A stream of contents to write.
   * @returns {string} The file path in the output, relative to the output root.
   */
  write(baseName: string, contents: Readable): string;
}
