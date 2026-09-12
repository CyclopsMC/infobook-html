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
  /**
   * The size of the textures that image appendices refer into.
   */
  public static readonly textureSize = 512;

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
        // The image is a window onto the top-left corner of a 512x512 texture.
        // Sizing that window with an aspect ratio and the background with a percentage keeps the
        // image intact when the stylesheet has to shrink it to fit a narrow screen.
        const backgroundWidth = Math.round((InfoBookAppendixHandlerImage.textureSize / (width * 2)) * 10_000) / 100;
        return `<canvas class="appendix-image" style="background-image: url(${
          writtenPath}); width: ${width * 2}px; aspect-ratio: ${width} / ${
          height}; background-size: ${backgroundWidth}% auto;"></canvas>`;
      },
    };
  }
}
