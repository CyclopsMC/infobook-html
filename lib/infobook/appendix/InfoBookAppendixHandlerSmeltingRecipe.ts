import { join } from 'node:path';
import type { compileTemplate } from 'pug';
import { compileFile as compilePug } from 'pug';
import type { ResourceHandler } from '../../resource/ResourceHandler';
import type { HtmlInfoBookSerializer, ISerializeContext } from '../../serialize/HtmlInfoBookSerializer';
import type { IFileWriter } from '../IFileWriter';
import type { IItem } from '../IItem';
import type {
  IRecipe,
} from './InfoBookAppendixHandlerAbstractRecipe';
import {
  InfoBookAppendixHandlerAbstractRecipe,
} from './InfoBookAppendixHandlerAbstractRecipe';

/**
 * Handles furnace recipe appendices.
 */
export class InfoBookAppendixHandlerSmeltingRecipe
  extends InfoBookAppendixHandlerAbstractRecipe<IRecipeSmelting> {
  private readonly templateFurnaceRecipe: compileTemplate;

  public constructor(resourceHandler: ResourceHandler, registriesPath: string, recipeOverrides: any) {
    super('minecraft:smelting', resourceHandler, registriesPath, recipeOverrides);
    this.templateFurnaceRecipe = compilePug(
      join(__dirname, '..', '..', '..', 'template', 'appendix', 'furnace_recipe.pug'),
    );
  }

  protected getRecipeNameUnlocalized(): string {
    return 'block.minecraft.furnace';
  }

  protected async serializeRecipe(
    recipe: IRecipeSmelting,
    context: ISerializeContext,
    fileWriter: IFileWriter,
    serializer: HtmlInfoBookSerializer,
  ): Promise<string> {
    const input = await Promise.all(
      recipe.input.map(item => serializer.createItemDisplay(this.resourceHandler, context, fileWriter, item, true)),
    );
    const output = await serializer.createItemDisplay(
      this.resourceHandler,
      context,
      fileWriter,
      recipe.output,
      true,
    );

    const appendixIcon = await serializer.createItemDisplay(
      this.resourceHandler,
      context,
      fileWriter,
      { item: 'minecraft:furnace' },
      false,
    );

    return this.templateFurnaceRecipe({ input, output, appendixIcon });
  }
}

export interface IRecipeSmelting extends IRecipe {
  input: IItem[];
  output: IItem;
}
