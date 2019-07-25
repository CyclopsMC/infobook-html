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
 * Handles crafting recipe appendices.
 */
export class InfoBookAppendixHandlerCraftingRecipe implements IInfoBookAppendixHandler {

  private readonly resourceHandler: ResourceHandler;
  private readonly registry: IRecipeRegistry;
  private readonly registryTagged: {[tag: string]: IRecipe[]};
  private readonly recipePredefineds: IRecipePredefineds;
  private readonly templateCraftingRecipe: compileTemplate;

  constructor(resourceHandler: ResourceHandler, registriesPath: string, recipeOverrides: any,
              recipePredefineds: IRecipePredefineds) {
    this.resourceHandler = resourceHandler;
    this.registry = JSON.parse(fs.readFileSync(join(registriesPath, 'crafting_recipe.json'), "utf8"));
    if (recipeOverrides) {
      this.registry = { ... this.registry, ...recipeOverrides };
    }
    this.recipePredefineds = recipePredefineds;
    this.registryTagged = {};
    for (const recipeId in this.registry) {
      for (const recipe of this.registry[recipeId]) {
        for (const tag of recipe.tags) {
          let recipes = this.registryTagged[tag];
          if (!recipes) {
            recipes = this.registryTagged[tag] = [];
          }
          recipes.push(recipe);
        }
      }
    }
    this.templateCraftingRecipe = compilePug(__dirname + '/../../../template/appendix/crafting_recipe.pug');
  }

  public createAppendix(data: any): IInfoAppendix {
    const index = data.$.index || 0;
    // const meta = data.$.meta || 0;
    // const count = data.$.count || 1;
    const outputName = data._;
    let recipes;
    if (data.$.predefined) {
      recipes = [this.recipePredefineds[outputName]];
    } else {
      recipes = this.registry[outputName] || this.registryTagged['crafting_recipe:' + outputName];
    }
    if (!recipes) {
      throw new Error(`Could not find any recipe for ${outputName}`);
    }
    if (index >= recipes.length) {
      throw new Error(`Could not find recipe ${index} for ${outputName} that only has ${recipes.length} recipes.`);
    }
    const recipe = recipes[index];

    return {
      getName: (context) => this.resourceHandler.getTranslation('tile.workbench.name', context.language),
      toHtml: (context: ISerializeContext, fileWriter: IFileWriter, serializer: HtmlInfoBookSerializer) => {
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
              items.push({ item: 'minecraft:air', data: 0 });
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
          fileWriter, { item: 'minecraft:crafting_table', data: 0 }, false);

        return this.templateCraftingRecipe({ inputs, output, appendixIcon });
      },
    };
  }

}

export interface IRecipeRegistry {
  [id: string]: [IRecipe];
}

export interface IRecipe {
  input: IItem[][];
  output: IItem;
  width: number;
  height: number;
  tags: string[];
}

export interface IRecipePredefineds {
  [id: string]: IRecipe;
}
