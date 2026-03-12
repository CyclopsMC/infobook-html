import { createReadStream } from 'node:fs';
import { basename } from 'node:path';
import type { ResourceHandler } from '../../resource/ResourceHandler';
import type { ISerializeContext } from '../../serialize/HtmlInfoBookSerializer';
import type { IFileWriter } from '../IFileWriter';
import type { IInfoAppendix } from '../IInfoAppendix';
import type { IInfoBookAppendixHandler } from './IInfoBookAppendixHandler';

/**
 * Handles image appendices.
 */
export class InfoBookAppendixHandlerImage implements IInfoBookAppendixHandler {
  private readonly resourceHandler: ResourceHandler;

  public constructor(resourceHandler: ResourceHandler) {
    this.resourceHandler = resourceHandler;
  }

  public createAppendix(data: any): IInfoAppendix {
    const fullPath = this.resourceHandler.expandResourcePath(<string>data._);
    const fileName = basename(<string>data._);
    const { width, height } = <{ width: number; height: number }>data.$;
    return {
      toHtml: async(context: ISerializeContext, fileWriter: IFileWriter): Promise<string> => {
        const writtenPath = await fileWriter.write(fileName, () => createReadStream(fullPath));
        return `<canvas class="appendix-image" style="background: url(${
          writtenPath}); width: ${width * 2}px; height: ${height * 2}px; background-size: 512px 512px;"></canvas>`;
      },
    };
  }
}
