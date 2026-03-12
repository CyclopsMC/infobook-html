import type { IInfoSection } from './IInfoSection';

export interface IInfoBook {
  rootSection: IInfoSection;
  sections: Record<string, IInfoSection>;
}
