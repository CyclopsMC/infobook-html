import {IInfoParagraph} from "./IInfoParagraph";

/**
 * Datastructure for an info book section.
 */
export interface IInfoSection {
  subSections: IInfoSection[];
  paragraphs: IInfoParagraph[];
}
