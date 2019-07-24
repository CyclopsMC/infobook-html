import {IInfoAppendix} from "../IInfoAppendix";

/**
 * Creates appendices of a specific type.
 */
export interface IInfoBookAppendixHandler {

  /**
   * Creates an appendix for the given data element.
   * @param data Tag contents.
   * @param {string} modId The owning mod.
   * @returns {IInfoAppendix} A new appendix instance.
   */
  createAppendix(data: any, modId: string): IInfoAppendix;

}
