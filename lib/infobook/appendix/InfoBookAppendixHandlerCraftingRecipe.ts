import * as fs from "fs";
import {basename, join} from "path";
import {compileFile as compilePug, compileTemplate} from "pug";
import {ResourceHandler} from "../../resource/ResourceHandler";
import {ISerializeContext} from "../../serialize/HtmlInfoBookSerializer";
import {IFileWriter, IInfoAppendix} from "../IInfoAppendix";
import {IInfoBookAppendixHandler} from "./IInfoBookAppendixHandler";

/**
 * Handles crafting recipe appendices.
 */
export class InfoBookAppendixHandlerCraftingRecipe implements IInfoBookAppendixHandler {

  private readonly resourceHandler: ResourceHandler;
  private readonly registry: IRecipeRegistry;
  private readonly templateCraftingRecipe: compileTemplate;
  private readonly templateItem: compileTemplate;

  constructor(resourceHandler: ResourceHandler, registriesPath: string, recipeOverrides: any) {
    this.resourceHandler = resourceHandler;
    this.registry = JSON.parse(fs.readFileSync(join(registriesPath, 'crafting_recipe.json'), "utf8"));
    if (recipeOverrides) {
      this.registry = { ... this.registry, ...recipeOverrides };
    }
    this.templateCraftingRecipe = compilePug(__dirname + '/../../../template/appendix/crafting_recipe.pug');
    this.templateItem = compilePug(__dirname + '/../../../template/appendix/item.pug');
  }

  public createAppendix(data: any): IInfoAppendix {
    const index = data.$.index || 0;
    // const meta = data.$.meta || 0;
    // const count = data.$.count || 1;
    const outputName = data._;
    const recipes = this.registry[outputName];
    if (!recipes) {
      throw new Error(`Could not find any recipe for ${outputName}`);
    }
    if (index >= recipes.length) {
      throw new Error(`Could not find recipe ${index} for ${outputName} that only has ${recipes.length} recipes.`);
    }
    const recipe = recipes[index];

    return {
      getName: (context) => this.resourceHandler.getTranslation('tile.workbench.name', context.language),
      toHtml: (context: ISerializeContext, fileWriter: IFileWriter) => {
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
              inputs[outputIndex].push(this.createItemDisplay(context.language, fileWriter, item));
            }
          }
        }

        const output = this.createItemDisplay(context.language, fileWriter, recipe.output);

        return this.templateCraftingRecipe({inputs, output});
      },
    };
  }

  public createItemDisplay(language: string, fileWriter: IFileWriter, item: IItem): string {
    if (item.item === 'minecraft:air') {
      return '<div class="item">&nbsp;</div>';
    }

    const icon = this.resourceHandler.getItemIconFile(item.item, item.data);
    if (!icon) {
      throw new Error(`Could not find an icon for item ${JSON.stringify(item)}`);
    }
    const iconUrl = fileWriter.write('icons/' + basename(icon), fs.createReadStream(icon));

    return this.templateItem({
      count: item.count || 1,
      icon: iconUrl,
      name: this.resourceHandler.getTranslation(this.resourceHandler.getItemTranslationKey(item), language),
    });
  }

}

export interface IRecipeRegistry {
  [id: string]: [{
    input: IItem[][];
    output: IItem;
    width: number;
    height: number;
  }];
}

export interface IItem {
  item: string;
  data: number;
  count?: number;
  nbt?: string;
}
