import type { ResourceHandler } from '../../resource/ResourceHandler';
import type { ISerializeContext } from '../../serialize/HtmlInfoBookSerializer';
import type { IFileWriter } from '../IFileWriter';
import type { IInfoAppendix } from '../IInfoAppendix';
import type { IInfoBookAppendixHandler } from './IInfoBookAppendixHandler';

/**
 * Handles text field appendices.
 */
export class InfoBookAppendixHandlerTextfield implements IInfoBookAppendixHandler {
  private readonly resourceHandler: ResourceHandler;

  public constructor(resourceHandler: ResourceHandler) {
    this.resourceHandler = resourceHandler;
  }

  public createAppendix(data: any): IInfoAppendix {
    const contents: string = (<string>data._)
      .replaceAll(' ', '&nbsp;')
      .replaceAll('\n', '<br >');
    const scale: number = <number>data.$.scale || 1;
    return {
      // eslint-disable-next-line unused-imports/no-unused-vars
      toHtml: async(context: ISerializeContext, fileWriter: IFileWriter) =>
        `<div class="appendix-textfield" style="font-size: ${scale}em">${contents}</div>`,
    };
  }
}
