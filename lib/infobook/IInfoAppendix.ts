import {HtmlInfoBookSerializer, ISerializeContext} from "../serialize/HtmlInfoBookSerializer";
import {IFileWriter} from "./IFileWriter";

/**
 * Datastructure for an info book appendix.
 */
export interface IInfoAppendix {
  /**
   * If this appendix should not be wrapped inside a box.
   */
  skipWrapper?: boolean;
  /**
   * @param context The serialization context.
   * @returns {string} The optional appendix type name.
   */
  getName?: (context: ISerializeContext) => string;

  /**
   * @param context The serialization context.
   * @param fileWriter A function that can be called for writing auxiliary files.
   * @param serializer The HTML serializer.
   * @returns {string} The HTML representation of this appendix.
   */
  toHtml(context: ISerializeContext, fileWriter: IFileWriter, serializer: HtmlInfoBookSerializer): string;
}
