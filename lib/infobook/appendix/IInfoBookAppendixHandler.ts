import {IInfoAppendix} from "../IInfoAppendix";

/**
 * Creates appendices of a specific type.
 */
export interface IInfoBookAppendixHandler {

  /**
   * Creates an appendix for the given data element.
   * @param data Tag contents.
   * @returns {IInfoAppendix} A new appendix instance.
   */
  createAppendix(data: any): IInfoAppendix;

}
