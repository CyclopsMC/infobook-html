import {compileFile as compilePug, compileTemplate} from "pug";
import {HtmlInfoBookSerializer, ISerializeContext} from "../../serialize/HtmlInfoBookSerializer";
import {IFileWriter} from "../IFileWriter";
import {IInfoAppendix} from "../IInfoAppendix";

/**
 * An appendix with an add
 */
export class InfoBookAppendixAd implements IInfoAppendix {

  public readonly skipWrapper: boolean = true;

  private readonly templateTagIndex: compileTemplate;

  constructor() {
    this.templateTagIndex = compilePug(__dirname + '/../../../template/appendix/ad.pug');
  }

  public toHtml(context: ISerializeContext, fileWriter: IFileWriter, serializer: HtmlInfoBookSerializer): string {
    return this.templateTagIndex(context.googleAdsense);
  }

}
