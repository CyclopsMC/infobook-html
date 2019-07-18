import {ResourceLoader} from "../resource/ResourceLoader";
import {ISerializeContext} from "../serialize/HtmlInfoBookSerializer";
import {InfoBookInitializer} from "./InfoBookInitializer";

/**
 * A plugin for infobook loading.
 */
export interface IInfobookPlugin {
  /**
   * An optional assets path that should be loaded.
   */
  assetsPath?: string;
  /**
   * Load the this plugin.
   * @param {InfoBookInitializer} infoBookInitializer The infobook initializer.
   * @param {ResourceLoader} resourceLoader The resource loader,
   * @param config The config object that was loaded.
   */
  load(infoBookInitializer: InfoBookInitializer, resourceLoader: ResourceLoader, config: any): void;

  /**
   * An optional method for adding a string to the <head> tag.
   * @param {ISerializeContext} context The serialization context.
   */
  getHeadSuffix?(context: ISerializeContext): string;
}
