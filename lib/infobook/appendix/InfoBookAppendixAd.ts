import { join } from 'node:path';
import type { compileTemplate } from 'pug';
import { compileFile as compilePug } from 'pug';
import type { HtmlInfoBookSerializer, ISerializeContext } from '../../serialize/HtmlInfoBookSerializer';
import type { IFileWriter } from '../IFileWriter';
import type { IInfoAppendix } from '../IInfoAppendix';

/**
 * An appendix with an add
 */
export class InfoBookAppendixAd implements IInfoAppendix {
  public readonly skipWrapper: boolean = true;

  private readonly templateTagIndex: compileTemplate;

  public constructor() {
    this.templateTagIndex = compilePug(join(__dirname, '..', '..', '..', 'template', 'appendix', 'ad.pug'));
  }

  public async toHtml(
    context: ISerializeContext,
    // eslint-disable-next-line unused-imports/no-unused-vars
    fileWriter: IFileWriter,
    // eslint-disable-next-line unused-imports/no-unused-vars
    serializer: HtmlInfoBookSerializer,
  ): Promise<string> {
    return this.templateTagIndex(context.googleAdsense);
  }
}
