import {createReadStream} from "fs";
import {basename} from "path";
import {ResourceHandler} from "../../resource/ResourceHandler";
import {ISerializeContext} from "../../serialize/HtmlInfoBookSerializer";
import {IFileWriter} from "../IFileWriter";
import {IInfoAppendix} from "../IInfoAppendix";
import {IInfoBookAppendixHandler} from "./IInfoBookAppendixHandler";

/**
 * Handles image appendices.
 */
export class InfoBookAppendixHandlerImage implements IInfoBookAppendixHandler {

  private readonly resourceHandler: ResourceHandler;

  constructor(resourceHandler: ResourceHandler) {
    this.resourceHandler = resourceHandler;
  }

  public createAppendix(data: any): IInfoAppendix {
    const fullPath = this.resourceHandler.expandResourcePath(data._);
    const fileName = basename(data._);
    const { width, height } = data.$;
    return {
      toHtml: (context: ISerializeContext, fileWriter: IFileWriter) => {
        const writtenPath = fileWriter.write(fileName, createReadStream(fullPath));
        return `<canvas class="appendix-image" style="background: url(${
          writtenPath}); width: ${width * 2}px; height: ${height * 2}px; background-size: 512px 512px;"></canvas>`;
      },
    };
  }

}
