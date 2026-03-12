import { join } from 'node:path';
import type { compileTemplate } from 'pug';
import { compileFile as compilePug } from 'pug';
import type { IAdvancement, ResourceHandler } from '../../resource/ResourceHandler';
import type { HtmlInfoBookSerializer, ISerializeContext } from '../../serialize/HtmlInfoBookSerializer';
import type { IFileWriter } from '../IFileWriter';
import type { IInfoAppendix } from '../IInfoAppendix';
import type { IItem } from '../IItem';
import type { IInfoBookAppendixHandler } from './IInfoBookAppendixHandler';

/**
 * Handles advancement rewards appendices.
 */
export class InfoBookAppendixHandlerAdvancementRewards implements IInfoBookAppendixHandler {
  private readonly resourceHandler: ResourceHandler;
  private readonly templateAdvancementRewards: compileTemplate;

  public constructor(resourceHandler: ResourceHandler) {
    this.resourceHandler = resourceHandler;
    this.templateAdvancementRewards = compilePug(
      join(__dirname, '..', '..', '..', 'template', 'appendix', 'advancement_rewards.pug'),
    );
  }

  public createAppendix(data: any): IInfoAppendix {
    const advancementsData: IAdvancement[] = [];
    for (const advancementTag of data.advancements[0].advancement) {
      const advancementId: string = <string>advancementTag.$.id;
      advancementsData.push(this.resourceHandler.getAdvancement(advancementId));
    }

    const rewardsData: IItem[] = [];
    for (const rewardTag of data.rewards[0].reward) {
      if (rewardTag.$.type !== 'item') {
        throw new Error(`Unknown achievement reward type '${<string>rewardTag.$.type}'`);
      }
      const count: number = <number>rewardTag.$.amount;
      rewardsData.push({ item: <string>rewardTag._, count });
    }

    return {
      getName: context => this.resourceHandler.getTranslation('gui.advancements', context.language),
      toHtml: async(
        context: ISerializeContext,
        fileWriter: IFileWriter,
        serializer: HtmlInfoBookSerializer,
      ): Promise<string> => {
        const advancements = advancementsData
          .map(advancement => ({
            description: this.resourceHandler.getTranslation(advancement.description, context.language),
            title: this.resourceHandler.getTranslation(advancement.title, context.language),
          }));
        const rewards = await Promise.all(rewardsData
          .map(reward => serializer.createItemDisplay(
            this.resourceHandler,
            context,
            fileWriter,
            reward,
            true,
          )));
        const rewardsString = this.resourceHandler.getTranslation(`gui.cyclopscore.rewards`, context.language);
        return this.templateAdvancementRewards({ advancements, rewards, rewardsString });
      },
    };
  }
}
