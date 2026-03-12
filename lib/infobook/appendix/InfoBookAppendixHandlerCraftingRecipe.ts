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
 * Handles crafting recipe appendices.
 */
export class InfoBookAppendixHandlerCraftingRecipe
  extends InfoBookAppendixHandlerAbstractRecipe<IRecipeCrafting> {
  private readonly templateCraftingRecipe: compileTemplate;

  public constructor(resourceHandler: ResourceHandler, registriesPath: string, recipeOverrides: any) {
    super('minecraft:crafting', resourceHandler, registriesPath, recipeOverrides);
    this.templateCraftingRecipe = compilePug(
      join(__dirname, '..', '..', '..', 'template', 'appendix', 'crafting_recipe.pug'),
    );
  }

  protected getRecipeNameUnlocalized(): string {
    return 'block.minecraft.crafting_table';
  }

  protected async serializeRecipe(
    recipe: IRecipeCrafting,
    context: ISerializeContext,
    fileWriter: IFileWriter,
    serializer: HtmlInfoBookSerializer,
  ): Promise<string> {
    // Prepare input array
    const inputs = '|'.repeat(9).split('|').map((): any[] => []);

    // Define custom dimensions for shapeless recipes
    if (!recipe.width || !recipe.height) {
      recipe.width = recipe.height = Math.sqrt(recipe.input.length);
    }

    // Format items in  grid
    for (let x = 0; x < 3; x++) {
      for (let y = 0; y < 3; y++) {
        let items: IItem[];
        if (x < recipe.width && y < recipe.height) {
          const inputIndex = y * recipe.width + x;
          items = recipe.input[inputIndex] || [];
        } else {
          items = [];
        }
        if (items.length === 0) {
          items.push({ item: 'minecraft:air' });
        }
        const outputIndex = y * 3 + x;
        for (const item of items) {
          inputs[outputIndex].push(
            await serializer.createItemDisplay(this.resourceHandler, context, fileWriter, item, true),
          );
        }
      }
    }

    const output = await serializer.createItemDisplay(
      this.resourceHandler, context, fileWriter, recipe.output, true,
    );

    const appendixIcon = await serializer.createItemDisplay(
      this.resourceHandler, context, fileWriter, { item: 'minecraft:crafting_table' }, false,
    );

    return this.templateCraftingRecipe({ inputs, output, appendixIcon });
  }
}
export interface IRecipeCrafting extends IRecipe {
  id: string;
  input: IItem[][];
  output: IItem;
  width?: number;
  height?: number;
}
