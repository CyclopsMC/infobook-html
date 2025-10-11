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
 * Handles furnace recipe appendices.
 */
export class InfoBookAppendixHandlerSmeltingRecipe extends InfoBookAppendixHandlerAbstractRecipe<IRecipeSmelting> {

  private readonly templateFurnaceRecipe: compileTemplate;

  constructor(resourceHandler: ResourceHandler, registriesPath: string, recipeOverrides: any) {
    super('minecraft:smelting', resourceHandler, registriesPath, recipeOverrides);
    this.templateFurnaceRecipe = compilePug(__dirname + '/../../../template/appendix/furnace_recipe.pug');
  }

  protected getRecipeNameUnlocalized(): string {
    return 'block.minecraft.furnace';
  }

  protected async serializeRecipe(recipe: IRecipeSmelting, context: ISerializeContext, fileWriter: IFileWriter, serializer: HtmlInfoBookSerializer): Promise<string> {
    const input = await Promise.all(recipe.input.map((item) => serializer.createItemDisplay(this.resourceHandler, context,
      fileWriter, item, true)));
    const output = await serializer.createItemDisplay(this.resourceHandler, context,
      fileWriter, recipe.output, true);

    const appendixIcon = await serializer.createItemDisplay(this.resourceHandler, context,
      fileWriter, { item: 'minecraft:furnace' }, false);

    return this.templateFurnaceRecipe({ input, output, appendixIcon });
  }

}

export interface IRecipeSmelting extends IRecipe {
  input: IItem[];
  output: IItem;
}
