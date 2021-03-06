import {Readable} from "stream";

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
