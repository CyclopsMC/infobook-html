import {ResourceLoader} from "../resource/ResourceLoader";
import {InfoBookInitializer} from "./InfoBookInitializer";

/**
 * A plugin for infobook loading.
 */
export interface IInfobookPlugin {
  /**
   * Load the this plugin.
   * @param {InfoBookInitializer} infoBookInitializer The infobook initializer.
   * @param {ResourceLoader} resourceLoader The resource loader,
   * @param config The config object that was loaded.
   */
  load(infoBookInitializer: InfoBookInitializer, resourceLoader: ResourceLoader, config: any): void;
}
