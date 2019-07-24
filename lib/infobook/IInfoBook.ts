import {IInfoSection} from "./IInfoSection";

export interface IInfoBook {
  rootSection: IInfoSection;
  sections: {[id: string]: IInfoSection};
}
