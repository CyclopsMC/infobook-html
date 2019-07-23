import {IInfoAppendix} from "./IInfoAppendix";

/**
 * Datastructure for an info book section.
 */
export interface IInfoSection {
  nameTranslationKey: string;
  subSections: IInfoSection[];
  paragraphTranslationKeys: string[];
  appendix: IInfoAppendix[];
  tags: string[];
}
