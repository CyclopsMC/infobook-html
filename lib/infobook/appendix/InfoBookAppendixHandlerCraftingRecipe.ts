import {compileFile as compilePug, compileTemplate} from "pug";
import {ResourceHandler} from "../../resource/ResourceHandler";
import {HtmlInfoBookSerializer, ISerializeContext} from "../../serialize/HtmlInfoBookSerializer";
import {IFileWriter} from "../IFileWriter";
import {IItem} from "../IItem";
import {
  InfoBookAppendixHandlerAbstractRecipe,
  IRecipe,
} from "./InfoBookAppendixHandlerAbstractRecipe";

/**
 * Handles crafting recipe appendices.
 */
export class InfoBookAppendixHandlerCraftingRecipe extends InfoBookAppendixHandlerAbstractRecipe<IRecipeCrafting> {

  private readonly templateCraftingRecipe: compileTemplate;

  constructor(resourceHandler: ResourceHandler, registriesPath: string, recipeOverrides: any) {
    super('minecraft:crafting', resourceHandler, registriesPath, recipeOverrides);
    this.templateCraftingRecipe = compilePug(__dirname + '/../../../template/appendix/crafting_recipe.pug');
  }

  protected getRecipeNameUnlocalized(): string {
    return 'block.minecraft.crafting_table';
  }

  protected serializeRecipe(recipe: IRecipeCrafting, context: ISerializeContext,
                            fileWriter: IFileWriter, serializer: HtmlInfoBookSerializer) {
    // Prepare input array
    const inputs = "|".repeat(9).split("|").map(() => []);

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
        if (!items.length) {
          items.push({ item: 'minecraft:air' });
        }
        const outputIndex = y * 3 + x;
        for (const item of items) {
          inputs[outputIndex].push(serializer.createItemDisplay(this.resourceHandler, context,
            fileWriter, item, true));
        }
      }
    }

    const output = serializer.createItemDisplay(this.resourceHandler, context,
      fileWriter, recipe.output, true);

    const appendixIcon = serializer.createItemDisplay(this.resourceHandler, context,
      fileWriter, { item: 'minecraft:crafting_table' }, false);

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
