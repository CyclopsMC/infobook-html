import * as fs from 'node:fs';
import { join } from 'node:path';
import type { ResourceHandler } from '../../resource/ResourceHandler';
import type { HtmlInfoBookSerializer, ISerializeContext } from '../../serialize/HtmlInfoBookSerializer';
import type { IFileWriter } from '../IFileWriter';
import type { IInfoAppendix } from '../IInfoAppendix';
import type { IInfoBookAppendixHandler } from './IInfoBookAppendixHandler';

/**
 * Handles abstract recipe appendices.
 */
export abstract class InfoBookAppendixHandlerAbstractRecipe<TR extends IRecipe> implements IInfoBookAppendixHandler {
  protected readonly id: string;
  protected readonly resourceHandler: ResourceHandler;
  protected readonly registry: IRecipeRegistryIndexed<TR>;

  public constructor(id: string, resourceHandler: ResourceHandler, registriesPath: string, recipeOverrides: any) {
    this.id = id;
    this.resourceHandler = resourceHandler;
    this.registry = InfoBookAppendixHandlerAbstractRecipe.indexRegistry(
      <IRecipeRegistryRead<TR>>JSON.parse(
        fs.readFileSync(join(registriesPath, `${id.replaceAll(':', '__')}.json`), 'utf8'),
      ),
    );
    if (recipeOverrides) {
      this.registry = { ...this.registry, ...<IRecipeRegistryIndexed<TR>>recipeOverrides[id] };
    }
  }

  public static indexRegistry<TR extends IRecipe>(registryRead: IRecipeRegistryRead<TR>): IRecipeRegistryIndexed<TR> {
    const index: IRecipeRegistryIndexed<TR> = {};
    for (const recipe of registryRead.recipes) {
      index[recipe.id] = recipe;
    }
    return index;
  }

  public createAppendix(data: any): IInfoAppendix {
    const recipeId: string = <string>data._;
    let recipes: TR[] = [];
    if (recipeId.includes('*')) {
      const recipeRegex = new RegExp(recipeId, 'u');
      for (const [ k, v ] of Object.entries(this.registry)) {
        if (recipeRegex.test(k)) {
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
      getName: context => this.resourceHandler.getTranslation(this.getRecipeNameUnlocalized(), context.language),
      toHtml: async(context: ISerializeContext, fileWriter: IFileWriter, serializer: HtmlInfoBookSerializer) =>
        (await Promise.all(
          recipes.map(recipe => this.serializeRecipe(recipe, context, fileWriter, serializer)),
        )).join('<hr />'),
    };
  }

  protected abstract getRecipeNameUnlocalized(): string;

  protected abstract serializeRecipe(recipe: TR, context: ISerializeContext,
    fileWriter: IFileWriter, serializer: HtmlInfoBookSerializer): Promise<string>;
}

export interface IRecipeRegistryRead<TR extends IRecipe> {
  recipes: [TR];
}

export type IRecipeRegistryIndexed<TR extends IRecipe> = Record<string, TR>;

export interface IRecipe {
  id: string;
}
