import * as fs from "fs";
import {ResourceHandler} from "../../resource/ResourceHandler";
import {HtmlInfoBookSerializer, ISerializeContext} from "../../serialize/HtmlInfoBookSerializer";
import {IFileWriter} from "../IFileWriter";
import {IInfoAppendix} from "../IInfoAppendix";
import {IInfoBookAppendixHandler} from "./IInfoBookAppendixHandler";
import {join} from "path";

/**
 * Handles abstract recipe appendices.
 */
export abstract class InfoBookAppendixHandlerAbstractRecipe<R extends IRecipe> implements IInfoBookAppendixHandler {

  protected readonly id: string;
  protected readonly resourceHandler: ResourceHandler;
  protected readonly registry: IRecipeRegistryIndexed<R>;

  constructor(id: string, resourceHandler: ResourceHandler, registriesPath: string, recipeOverrides: any) {
    this.id = id;
    this.resourceHandler = resourceHandler;
    this.registry = InfoBookAppendixHandlerAbstractRecipe.indexRegistry(JSON.parse(fs.readFileSync(join(registriesPath, id.replace(/:/g, '__') + '.json'), "utf8")));
    if (recipeOverrides) {
      this.registry = { ... this.registry, ...(recipeOverrides[id] || {}) };
    }
  }

  public static indexRegistry<R extends IRecipe>(registryRead: IRecipeRegistryRead<R>) : IRecipeRegistryIndexed<R> {
    const index: IRecipeRegistryIndexed<R> = {};
    for (const recipe of registryRead.recipes) {
      index[recipe.id] = recipe;
    }
    return index;
  }

  public createAppendix(data: any): IInfoAppendix {
    const recipeId = data._;
    let recipes: R[] = [];
    if (recipeId.includes('*')) {
      const recipeRegex = new RegExp(recipeId);
      for (const [k, v] of Object.entries(this.registry)) {
        if (recipeRegex.exec(k)) {
          recipes.push(v);
        }
      }
    } else if (this.registry[recipeId]) {
      recipes = [ this.registry[recipeId] ];
    }
    if (recipes.length === 0) {
      throw new Error(`Could not find ${this.id} recipe for ${recipeId}`);
    }

    return {
      getName: (context) => this.resourceHandler.getTranslation(this.getRecipeNameUnlocalized(), context.language),
      toHtml: (context: ISerializeContext, fileWriter: IFileWriter, serializer: HtmlInfoBookSerializer) => {
        return recipes.map((recipe) => this.serializeRecipe(recipe, context, fileWriter, serializer)).join('<hr />');
      },
    };
  }

  protected abstract getRecipeNameUnlocalized(): string;

  protected abstract serializeRecipe(recipe: R, context: ISerializeContext,
                                     fileWriter: IFileWriter, serializer: HtmlInfoBookSerializer): string;

}

export interface IRecipeRegistryRead<R extends IRecipe> {
  recipes: [R];
}

export interface IRecipeRegistryIndexed<R extends IRecipe> {
  [id: string]: R;
}

export interface IRecipe {
  id: string;
}
