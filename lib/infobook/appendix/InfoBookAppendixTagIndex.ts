import { join } from 'node:path';
import type { compileTemplate } from 'pug';
import { compileFile as compilePug } from 'pug';
import type { ResourceHandler } from '../../resource/ResourceHandler';
import type { HtmlInfoBookSerializer, ISerializeContext } from '../../serialize/HtmlInfoBookSerializer';
import type { IFileWriter } from '../IFileWriter';
import type { IInfoAppendix } from '../IInfoAppendix';

/**
 * An appendix that lists all tags with links to them
 */
export class InfoBookAppendixTagIndex implements IInfoAppendix {
  private readonly resourceHandler: ResourceHandler;
  private readonly templateTagIndex: compileTemplate;

  public constructor(resourceHandler: ResourceHandler) {
    this.resourceHandler = resourceHandler;
    this.templateTagIndex = compilePug(
      join(__dirname, '..', '..', '..', 'template', 'appendix', 'tag_index.pug'),
    );
  }

  public async toHtml(
    context: ISerializeContext,
    fileWriter: IFileWriter,
    serializer: HtmlInfoBookSerializer,
  ): Promise<string> {
    const links: { url: string; name: string; icon: string }[] = [];
    for (const tag in context.sectionIndex.tags) {
      const url = context.sectionIndex.tags[tag];

      // First try localizing as item, and if that fails, as fluid
      let icon: string;
      const item = { item: tag };
      let translationKey = this.resourceHandler.getItemTranslationKey(item);
      if (translationKey) {
        icon = await serializer.createItemDisplay(this.resourceHandler, context, fileWriter, item, false);
      } else {
        const fluid = { fluid: tag };
        translationKey = this.resourceHandler.getFluidTranslationKey(fluid);
        icon = await serializer.createFluidDisplay(this.resourceHandler, context, fileWriter, fluid, false);
      }
      const name = this.resourceHandler.getTranslation(translationKey, context.language);

      links.push({ url, name, icon });
    }
    links.sort((link1, link2) => link1.name.localeCompare(link2.name));
    return this.templateTagIndex({ links });
  }
}
