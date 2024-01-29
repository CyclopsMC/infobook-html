import {ResourceHandler} from "../../resource/ResourceHandler";
import {ISerializeContext} from "../../serialize/HtmlInfoBookSerializer";
import {IFileWriter} from "../IFileWriter";
import {IInfoAppendix} from "../IInfoAppendix";
import {IInfoBookAppendixHandler} from "./IInfoBookAppendixHandler";

/**
 * Handles text field appendices.
 */
export class InfoBookAppendixHandlerTextfield implements IInfoBookAppendixHandler {

  private readonly resourceHandler: ResourceHandler;

  constructor(resourceHandler: ResourceHandler) {
    this.resourceHandler = resourceHandler;
  }

  public createAppendix(data: any): IInfoAppendix {
    const contents = data._
      .replace(/ /g, '&nbsp;')
      .replace(/\n/g, '<br \>');
    const scale = data.$.scale || 1;
    return {
      toHtml: (context: ISerializeContext, fileWriter: IFileWriter) => {
        return `<div class="appendix-textfield" style="font-size: ${scale}em">${contents}</div>`;
      },
    };
  }

}
