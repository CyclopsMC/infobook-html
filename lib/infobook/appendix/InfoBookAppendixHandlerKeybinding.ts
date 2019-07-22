import {compileFile as compilePug, compileTemplate} from "pug";
import {ResourceHandler} from "../../resource/ResourceHandler";
import {ISerializeContext} from "../../serialize/HtmlInfoBookSerializer";
import {IInfoAppendix} from "../IInfoAppendix";
import {IInfoBookAppendixHandler} from "./IInfoBookAppendixHandler";

/**
 * Handles keybindings appendices.
 */
export class InfoBookAppendixHandlerKeybinding implements IInfoBookAppendixHandler {

  private readonly resourceHandler: ResourceHandler;
  private readonly templateKeybinding: compileTemplate;

  constructor(resourceHandler: ResourceHandler) {
    this.resourceHandler = resourceHandler;
    this.templateKeybinding = compilePug(__dirname + '/../../../template/appendix/keybinding.pug');
  }

  public createAppendix(data: any): IInfoAppendix {
    const id = data._;
    const key = this.resourceHandler.getKeybinding(id);
    return {
      getName: (context) => this.resourceHandler.getTranslation(`gui.${context.modId}.keybinding`, context.language),
      toHtml: (context: ISerializeContext) => {
        const name = this.resourceHandler.getTranslation(id, context.language);
        return this.templateKeybinding({ name, key });
      },
    };
  }

}
