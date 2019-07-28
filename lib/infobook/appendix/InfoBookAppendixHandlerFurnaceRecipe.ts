import * as fs from "fs";
import {join} from "path";
import {compileFile as compilePug, compileTemplate} from "pug";
import {ResourceHandler} from "../../resource/ResourceHandler";
import {HtmlInfoBookSerializer, ISerializeContext} from "../../serialize/HtmlInfoBookSerializer";
import {IFileWriter} from "../IFileWriter";
import {IInfoAppendix} from "../IInfoAppendix";
import {IItem} from "../IItem";
import {IInfoBookAppendixHandler} from "./IInfoBookAppendixHandler";

/**
 * Handles furnace recipe appendices.
 */
export class InfoBookAppendixHandlerFurnaceRecipe implements IInfoBookAppendixHandler {

  private readonly resourceHandler: ResourceHandler;
  private readonly registry: IRecipeFurnace[];
  private readonly templateFurnaceRecipe: compileTemplate;

  constructor(resourceHandler: ResourceHandler, registriesPath: string) {
    this.resourceHandler = resourceHandler;
    this.registry = JSON.parse(fs.readFileSync(join(registriesPath, 'furnace_recipe.json'), "utf8")).elements;
    this.templateFurnaceRecipe = compilePug(__dirname + '/../../../template/appendix/furnace_recipe.pug');
  }

  public createAppendix(data: any): IInfoAppendix {
    // const meta = data.$.meta || 0;
    // const count = data.$.count || 1;
    const outputName = data._;
    let recipe: IRecipeFurnace;
    for (const recipeIt of this.registry) {
      if (recipeIt.output.item === outputName) {
        recipe = recipeIt;
        break;
      }
    }
    if (!recipe) {
      throw new Error(`Could not find any recipe for ${outputName}`);
    }

    return {
      getName: (context) => this.resourceHandler.getTranslation('tile.furnace.name', context.language),
      toHtml: (context: ISerializeContext, fileWriter: IFileWriter, serializer: HtmlInfoBookSerializer) => {

        const input = recipe.input.map((item) => serializer.createItemDisplay(this.resourceHandler, context,
          fileWriter, item, true));
        const output = serializer.createItemDisplay(this.resourceHandler, context,
          fileWriter, recipe.output, true);

        const appendixIcon = serializer.createItemDisplay(this.resourceHandler, context,
          fileWriter, { item: 'minecraft:furnace', data: 0 }, false);

        return this.templateFurnaceRecipe({ input, output, appendixIcon });
      },
    };
  }

}

export interface IRecipeFurnace {
  input: IItem[];
  output: IItem;
}
