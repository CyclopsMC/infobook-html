import {compileFile as compilePug, compileTemplate} from "pug";
import {ResourceHandler} from "../../resource/ResourceHandler";
import {HtmlInfoBookSerializer, ISerializeContext} from "../../serialize/HtmlInfoBookSerializer";
import {IFileWriter} from "../IFileWriter";
import {IInfoAppendix} from "../IInfoAppendix";

/**
 * An appendix that lists all tags with links to them
 */
export class InfoBookAppendixTagIndex implements IInfoAppendix {

  private readonly resourceHandler: ResourceHandler;
  private readonly templateTagIndex: compileTemplate;

  constructor(resourceHandler: ResourceHandler) {
    this.resourceHandler = resourceHandler;
    this.templateTagIndex = compilePug(__dirname + '/../../../template/appendix/tag_index.pug');
  }

  public toHtml(context: ISerializeContext, fileWriter: IFileWriter, serializer: HtmlInfoBookSerializer): string {
    const links: { url: string, name: string, icon: string }[] = [];
    for (const tag in context.sectionIndex.tags) {
      const url = context.sectionIndex.tags[tag];

      // First try localizing as item, and if that fails, as fluid
      let icon: string;
      const item = { item: tag, data: 0 };
      let translationKey = this.resourceHandler.getItemTranslationKey(item);
      if (translationKey) {
        icon = serializer.createItemDisplay(this.resourceHandler, context, fileWriter, item, false);
      } else {
        const fluid = { fluid: tag.substr(tag.indexOf(':') + 1) };
        translationKey = this.resourceHandler.getFluidTranslationKey(fluid);
        icon = serializer.createFluidDisplay(this.resourceHandler, context, fileWriter, fluid, false);
      }
      const name = this.resourceHandler.getTranslation(translationKey, context.language);

      links.push({ url, name, icon });
    }
    links.sort((link1, link2) => link1.name.localeCompare(link2.name));
    return this.templateTagIndex({ links });
  }

}
