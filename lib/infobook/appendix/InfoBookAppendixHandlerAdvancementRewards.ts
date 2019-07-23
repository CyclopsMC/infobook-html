import {compileFile as compilePug, compileTemplate} from "pug";
import {IAdvancement, ResourceHandler} from "../../resource/ResourceHandler";
import {HtmlInfoBookSerializer, ISerializeContext} from "../../serialize/HtmlInfoBookSerializer";
import {IFileWriter} from "../IFileWriter";
import {IInfoAppendix} from "../IInfoAppendix";
import {IItem} from "../IItem";
import {IInfoBookAppendixHandler} from "./IInfoBookAppendixHandler";

/**
 * Handles advancement rewards appendices.
 */
export class InfoBookAppendixHandlerAdvancementRewards implements IInfoBookAppendixHandler {

  private readonly resourceHandler: ResourceHandler;
  private readonly templateAdvancementRewards: compileTemplate;

  constructor(resourceHandler: ResourceHandler) {
    this.resourceHandler = resourceHandler;
    this.templateAdvancementRewards = compilePug(__dirname + '/../../../template/appendix/advancement_rewards.pug');
  }

  public createAppendix(data: any): IInfoAppendix {
    const advancementsData: IAdvancement[] = [];
    for (const advancementTag of data.advancements[0].advancement) {
      const advancementId = advancementTag.$.id;
      advancementsData.push(this.resourceHandler.getAdvancement(advancementId));
    }

    const rewardsData: IItem[] = [];
    for (const rewardTag of data.rewards[0].reward) {
      if (rewardTag.$.type !== 'item') {
        throw new Error(`Unknown achievement reward type '${rewardTag.$.type}'`);
      }
      const count = rewardTag.$.amount;
      const meta = rewardTag.$.meta || 0;
      rewardsData.push({ item: rewardTag._, data: meta, count });
    }

    return {
      getName: (context) => this.resourceHandler.getTranslation('gui.advancements', context.language),
      toHtml: (context: ISerializeContext, fileWriter: IFileWriter, serializer: HtmlInfoBookSerializer) => {
        const advancements = advancementsData
          .map((advancement) => ({
            description: this.resourceHandler.getTranslation(advancement.description, context.language),
            title: this.resourceHandler.getTranslation(advancement.title, context.language),
          }));
        const rewards = rewardsData
          .map((reward) => serializer.createItemDisplay(
            this.resourceHandler, context, fileWriter, reward, true));
        const rewardsString = this.resourceHandler.getTranslation(`gui.${context.modId}.rewards`, context.language);
        return this.templateAdvancementRewards({ advancements, rewards, rewardsString });
      },
    };
  }

}
