import {createReadStream, promises as fs} from "fs";
import mkdirp = require("mkdirp");
import {ncp} from "ncp";
import {basename, join} from "path";
import {compileFile as compilePug, compileTemplate} from "pug";
import {promisify} from "util";
import {InfoBookAppendixAd} from "../infobook/appendix/InfoBookAppendixAd";
import {FileWriter} from "../infobook/FileWriter";
import {IFileWriter} from "../infobook/IFileWriter";
import {IFluid} from "../infobook/IFluid";
import {IInfoBook} from "../infobook/IInfoBook";
import {IInfoSection} from "../infobook/IInfoSection";
import {IItem} from "../infobook/IItem";
import {ResourceHandler} from "../resource/ResourceHandler";

/**
 * Serializes an infobook to a collection of HTML files.
 */
export class HtmlInfoBookSerializer {

  private readonly templateIndex: compileTemplate;
  private readonly templateSection: compileTemplate;
  private readonly appendixWrapper: compileTemplate;
  private readonly templateItem: compileTemplate;

  private fileWriter: IFileWriter;

  constructor() {
    this.templateIndex = compilePug(__dirname + '/../../template/index.pug');
    this.templateSection = compilePug(__dirname + '/../../template/section.pug');
    this.appendixWrapper = compilePug(__dirname + '/../../template/appendix/appendix_base.pug');
    this.templateItem = compilePug(__dirname + '/../../template/appendix/item.pug');
  }

  public async serialize(infobook: IInfoBook, context: ISerializeContext, assetsPaths: string[]) {
    context = {
      ...context,
      basePath: context.path,
      breadcrumbs: [],
    };
    this.fileWriter = new FileWriter(context);

    await this.ensureDirExists(context.path);
    await this.ensureDirExists(join(context.path, 'assets'));
    await this.ensureDirExists(join(context.path, 'assets', 'icons'));

    // Serialize sections in all languages
    for (const language of context.resourceHandler.getLanguages()) {
      const langPath = this.getLanguagePath(language, context.path);
      await this.ensureDirExists(langPath);
      const sectionIndex = await this.serializeSectionIndex(infobook, context, language, langPath);
      await this.serializeSectionFiles(infobook, context, language, langPath, sectionIndex);
    }

    // Serialize assets
    await promisify(ncp)(__dirname + '/../../assets/', join(context.path, 'assets'));
    for (const assetsPath of assetsPaths) {
      await promisify(ncp)(assetsPath, join(context.path, 'assets'));
    }
  }

  public async serializeSectionIndex(infobook: IInfoBook, contextRoot: ISerializeContext,
                                     language: string, langPath: string): Promise<ISectionIndex> {
    const sectionIndex: ISectionIndex = {
      linkedPagesList: [],
      tags: {},
      urlIndex: {},
    };
    let pageIndex: number = 0;
    await this.serializeSection(infobook.rootSection, {
      ...contextRoot,
      language,
      path: langPath,
    }, async ({ index, section, sectionTitle, fileUrl, breadcrumbs }) => {
      if (!index) {
        sectionIndex.urlIndex[fileUrl] = pageIndex++;
        const name = breadcrumbs.slice(1).map((b) => b.name).join(' / ');
        sectionIndex.linkedPagesList.push({ name, url: fileUrl });
        for (let tag of section.tags) {
          if (tag.indexOf(':') < 0) {
            tag = contextRoot.modId + ':' + tag;
          }
          sectionIndex.tags[tag] = fileUrl;
        }
      }
    });
    return sectionIndex;
  }

  public async serializeSectionFiles(infobook: IInfoBook, contextRoot: ISerializeContext,
                                     language: string, langPath: string, sectionIndex: ISectionIndex) {
    await this.serializeSection(infobook.rootSection, {
      ...contextRoot,
      language,
      path: langPath,
      sectionIndex,
    }, async ({ index, breadcrumbs, context, section, sectionTitle, subSectionDatas, filePath, fileUrl }) => {
      // Create links to this page in other languages
      const languages: { url: string, name: string }[] = [];
      for (const name of contextRoot.resourceHandler.getLanguages()) {
        const baseFilePath = filePath.substr(join(contextRoot.basePath, this.getLanguagePath(language)).length);
        const languageFilePath = join(this.getLanguagePath(name), baseFilePath);
        let url = this.filePathToUrl(languageFilePath, contextRoot.basePath, context.baseUrl);
        if (url[0] !== '/') {
          url = '/' + url;
        }
        languages.push({ name, url });
      }

      if (index) {
        // Create index file
        const fileContents = this.templateIndex({
          ...context,
          breadcrumbs,
          headSuffix: context.headSuffixGetters.map((g) => g(context)).join(''),
          languages,
          sectionTitle,
          subSectionDatas,
        });
        await fs.writeFile(filePath, fileContents);
      } else {
        // Determine next/previous page based on the index
        const pageIndex = sectionIndex.urlIndex[fileUrl];
        const nextPage = pageIndex < sectionIndex.linkedPagesList.length
          ? sectionIndex.linkedPagesList[pageIndex + 1] : null;
        const previousPage = pageIndex > 0
          ? sectionIndex.linkedPagesList[pageIndex - 1] : null;

        // Prepend ad appendix if enabled
        const appendices = section.appendix;
        if (context.googleAdsense) {
          appendices.unshift(new InfoBookAppendixAd());
        }

        // Create leaf file
        const fileContents = this.templateSection({
          ...context,
          breadcrumbs,
          headSuffix: context.headSuffixGetters.map((g) => g(context)).join(''),
          languages,
          nextPage,
          previousPage,
          sectionAppendices: appendices
            .filter((appendix) => appendix) // TODO: rm
            .map((appendix) => {
              const appendixContents = appendix.toHtml(context, this.fileWriter, this);
              if (appendix.skipWrapper) {
                return appendixContents;
              } else {
                return this.appendixWrapper({
                  appendixContents,
                  appendixName: appendix.getName ? appendix.getName(context) : null,
                });
              }
            }),
          sectionParagraphs: section.paragraphTranslationKeys
            .map((key) => context.resourceHandler.getTranslation(key, context.language))
            .map((value) => this.formatString(value)),
          sectionTitle,
        });
        await fs.writeFile(filePath, fileContents);
      }
    });
  }

  public async serializeSection(section: IInfoSection, context: ISerializeContext,
                                onSection: (args: ISectionCallbackArgs) => Promise<void>)
    : Promise<{ filePath: string, sectionTitle: string }> {
    const sectionTitle = this.formatString(context.resourceHandler
      .getTranslation(section.nameTranslationKey, context.language));
    const breadcrumbs = context.breadcrumbs.concat([{ name: sectionTitle }]);

    // Go in a subfolder when we are handling a different mod
    if (section.modId !== context.modId) {
      await this.ensureDirExists(join(context.path, section.modId));
      context = {
        ...context,
        modId: section.modId,
        path: join(context.path, section.modId),
      };
    }

    if (section.subSections && section.subSections.length > 0) {
      // Navigation section

      // Serialize subsections
      const subSectionDatas: { url: string, sectionTitle: string }[] = [];
      const fileUrl = this.filePathToUrl(context.path, context.basePath, context.baseUrl);
      const subBreadcrumbs = context.breadcrumbs.concat([{
        name: sectionTitle,
        url: fileUrl,
      }]);
      for (const subSection of section.subSections) {
        const subSectionData = await this.serializeSection(subSection,
          {
            ...context,
            breadcrumbs: subBreadcrumbs,
            path: join(context.path, subSection.nameTranslationKey
              .substr(subSection.nameTranslationKey.lastIndexOf('.') + 1)),
            root: false,
          }, onSection);
        subSectionDatas.push({
          ...subSectionData,
          url: this.filePathToUrl(subSectionData.filePath, context.basePath, context.baseUrl),
        });
      }

      const filePath = join(context.path, 'index.html');
      await onSection({ index: true, breadcrumbs, context, sectionTitle, section, subSectionDatas, filePath, fileUrl });

      return { filePath: context.path, sectionTitle };
    } else {
      // Leaf section
      const directory = context.path.substr(0, context.path.lastIndexOf('/'));
      await this.ensureDirExists(directory);

      // Handle leaf file
      const filePath = context.path + '.html';
      const fileUrl = this.filePathToUrl(filePath, context.basePath, context.baseUrl);

      await onSection(
        { index: false, breadcrumbs, context, sectionTitle, section, subSectionDatas: [], filePath, fileUrl });

      return { filePath, sectionTitle };
    }
  }

  public createResourceLink(resourceHandler: ResourceHandler, context: ISerializeContext, resource: string,
                            translationKey: string): { link: string, linkTarget: string } {
    let link;
    let linkTarget;
    if (resource.startsWith('minecraft:')) {
      link = 'https://minecraft.gamepedia.com/' + resourceHandler.getTranslation(
        translationKey, 'en_us').replace(/ /g, '_');
      linkTarget = '_blank';
    } else if (context.sectionIndex.tags[resource]) {
      link = context.sectionIndex.tags[resource];
    }

    return { link, linkTarget };
  }

  public createItemDisplay(resourceHandler: ResourceHandler, context: ISerializeContext,
                           fileWriter: IFileWriter, item: IItem, slot: boolean,
                           annotation: string = ''): string {
    if (item.item === 'minecraft:air') {
      return slot ? '<div class="item item-slot">&nbsp;</div>' : '<div class="item">&nbsp;</div>';
    }

    const icon = resourceHandler.getItemIconFile(item.item, item.data);
    if (!icon) {
      throw new Error(`Could not find an icon for item ${JSON.stringify(item)}`);
    }
    const iconUrl = fileWriter.write('icons/' + basename(icon), createReadStream(icon));

    const { link, linkTarget } = this.createResourceLink(resourceHandler, context, item.item,
      resourceHandler.getItemTranslationKey(item));

    return this.templateItem({
      ...context,
      annotation,
      count: item.count || 1,
      icon: iconUrl,
      link,
      linkTarget,
      name: resourceHandler.getTranslation(resourceHandler.getItemTranslationKey(item), context.language),
      slot,
    });
  }

  public createFluidDisplay(resourceHandler: ResourceHandler, context: ISerializeContext,
                            fileWriter: IFileWriter, fluid: IFluid, slot: boolean): string {
    const icon = resourceHandler.getFluidIconFile(fluid.fluid);
    if (!icon) {
      throw new Error(`Could not find an icon for fluid ${JSON.stringify(fluid)}`);
    }
    const iconUrl = fileWriter.write('icons/' + basename(icon), createReadStream(icon));

    const { link, linkTarget } = this.createResourceLink(resourceHandler, context, this.tagFluid(context, fluid.fluid),
      resourceHandler.getFluidTranslationKey(fluid));

    return this.templateItem({
      ...context,
      count: (fluid.amount || 1),
      icon: iconUrl,
      link,
      linkTarget,
      name: resourceHandler.getTranslation(resourceHandler.getFluidTranslationKey(fluid), context.language),
      slot,
    });
  }

  public tagFluid(context: ISerializeContext, fluidName: string): string {
    if (fluidName === 'water' || fluidName === 'lava') {
      return 'minecraft:' + fluidName;
    } else {
      return context.modId + ':' + fluidName;
    }
  }

  public getLanguagePath(language: string, path?: string): string {
    path = path || '';
    return language === 'en_us' ? path : join(path, '_lang', language);
  }

  /**
   * Convert Minecraft formatting codes to HTML formats.
   *
   * Based on https://minecraft.gamepedia.com/Formatting_codes
   *
   * @param {string} value A string value that can contain multiple formatting codes.
   * @returns {string} The re-formatted string value.
   */
  public formatString(value: string): string {
    // Convert '&' to '§'
    value = value.replace(/&/g, '§');

    // Formats to HTML
    value = value.replace(/§l([^§]*)§r/g, '<strong>$1</strong>');
    value = value.replace(/§n([^§]*)§r/g, '<u>$1</u>');
    value = value.replace(/§o([^§]*)§r/g, '<em>$1</em>');

    // Colors to HTML
    value = value.replace(/§1([^§]*)§0/g, '<span style="color: #0000AA">$1</span>');
    value = value.replace(/§2([^§]*)§0/g, '<span style="color: #00AA00">$1</span>');
    value = value.replace(/§3([^§]*)§0/g, '<span style="color: #00AAAA">$1</span>');
    value = value.replace(/§4([^§]*)§0/g, '<span style="color: #AA0000">$1</span>');
    value = value.replace(/§5([^§]*)§0/g, '<span style="color: #AA00AA">$1</span>');
    value = value.replace(/§6([^§]*)§0/g, '<span style="color: #FFAA00">$1</span>');
    value = value.replace(/§7([^§]*)§0/g, '<span style="color: #AAAAAA">$1</span>');
    value = value.replace(/§8([^§]*)§0/g, '<span style="color: #555555">$1</span>');
    value = value.replace(/§9([^§]*)§0/g, '<span style="color: #5555FF">$1</span>');
    value = value.replace(/§a([^§]*)§0/g, '<span style="color: #55FF55">$1</span>');
    value = value.replace(/§b([^§]*)§0/g, '<span style="color: #55FFFF">$1</span>');
    value = value.replace(/§c([^§]*)§0/g, '<span style="color: #FF5555">$1</span>');
    value = value.replace(/§d([^§]*)§0/g, '<span style="color: #FF55FF">$1</span>');
    value = value.replace(/§e([^§]*)§0/g, '<span style="color: #FFFF55">$1</span>');
    value = value.replace(/§f([^§]*)§0/g, '<span style="color: #FFFFFF">$1</span>');

    return value;
  }

  protected async ensureDirExists(dirPath: string) {
    let fstat;
    try {
      fstat = await fs.stat(dirPath);
    } catch (e) {
      await promisify(mkdirp)(dirPath);
    }
    if (fstat && !fstat.isDirectory() && fstat.isFile()) {
      throw new Error(`Could not serialize to a file, must be a directory.`);
    }
  }

  protected filePathToUrl(filePath: string, basePath: string, baseUrl: string) {
    return filePath.replace(basePath, baseUrl);
  }

}

export interface ISerializeContext {
  baseUrl: string;
  basePath?: string;
  breadcrumbs?: { url?: string, name: string }[];
  language?: string;
  path: string;
  modId: string;
  resourceHandler: ResourceHandler;
  colors: {[key: string]: string};
  headSuffixGetters: ((context: ISerializeContext) => string)[];
  sectionIndex?: ISectionIndex;
  root: boolean;
  modName: string;
  modUrl: string;
  bookName: string;
  mods: string[];
  googleAnalytics: string;
  googleAdsense: { client: string, format: string, slot: string };
  icon: string;
}

export interface ISectionCallbackArgs {
  index: boolean;
  breadcrumbs?: { url?: string, name: string }[];
  context: ISerializeContext;
  sectionTitle: string;
  section: IInfoSection;
  subSectionDatas: { url: string, sectionTitle: string }[];
  filePath: string;
  fileUrl: string;
}

export interface ISectionIndex {
  /**
   * The array of pages, with defined order.
   */
  linkedPagesList: { name: string, url: string }[];
  /**
   * Mapping from url to page index within linkedPagesList.
   */
  urlIndex: {[url: string]: number};
  /**
   * Mapping from tag to page URL.
   */
  tags: {[tag: string]: string};
}
