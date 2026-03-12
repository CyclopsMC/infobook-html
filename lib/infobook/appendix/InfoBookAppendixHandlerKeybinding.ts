import { join } from 'node:path';
import type { compileTemplate } from 'pug';
import { compileFile as compilePug } from 'pug';
import type { ResourceHandler } from '../../resource/ResourceHandler';
import type { ISerializeContext } from '../../serialize/HtmlInfoBookSerializer';
import type { IInfoAppendix } from '../IInfoAppendix';
import type { IInfoBookAppendixHandler } from './IInfoBookAppendixHandler';

/**
 * Handles keybindings appendices.
 */
export class InfoBookAppendixHandlerKeybinding implements IInfoBookAppendixHandler {
  private readonly resourceHandler: ResourceHandler;
  private readonly templateKeybinding: compileTemplate;

  public constructor(resourceHandler: ResourceHandler) {
    this.resourceHandler = resourceHandler;
    this.templateKeybinding = compilePug(
      join(__dirname, '..', '..', '..', 'template', 'appendix', 'keybinding.pug'),
    );
  }

  public createAppendix(data: any): IInfoAppendix {
    const id: string = <string>data._;
    const key = this.resourceHandler.getKeybinding(id);
    return {
      getName: context => this.resourceHandler.getTranslation(`infobook.cyclopscore.keybinding`, context.language),
      toHtml: async(context: ISerializeContext) => {
        const name = this.resourceHandler.getTranslation(id, context.language);
        return this.templateKeybinding({ name, key });
      },
    };
  }
}
