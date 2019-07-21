import {createReadStream, createWriteStream, promises as fs} from "fs";
import mkdirp = require("mkdirp");
import {ncp} from "ncp";
import {basename, join} from "path";
import {compileFile as compilePug, compileTemplate} from "pug";
import {Readable} from "stream";
import {promisify} from "util";
import {IFluid} from "../infobook/IFluid";
import {IFileWriter} from "../infobook/IInfoAppendix";
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

  constructor() {
    this.templateIndex = compilePug(__dirname + '/../../template/index.pug');
    this.templateSection = compilePug(__dirname + '/../../template/section.pug');
    this.appendixWrapper = compilePug(__dirname + '/../../template/appendix/appendix_base.pug');
    this.templateItem = compilePug(__dirname + '/../../template/appendix/item.pug');
  }

  public async serialize(infobook: IInfoBook, context: ISerializeContext, assetsPaths: string[]) {
    await this.ensureDirExists(context.path);
    await this.ensureDirExists(join(context.path, 'assets'));
    await this.ensureDirExists(join(context.path, 'assets', 'icons'));

    // Serialize sections in all languages
    for (const language of context.resourceHandler.getLanguages()) {
      const langPath = join(context.path, language);
      await this.ensureDirExists(langPath);
      await this.serializeSection(infobook.rootSection, {
        ...context,
        basePath: context.path,
        breadcrumbs: [],
        language,
        path: langPath,
      });
    }

    // Serialize assets
    await promisify(ncp)(__dirname + '/../../assets/', join(context.path, 'assets'));
    for (const assetsPath of assetsPaths) {
      await promisify(ncp)(assetsPath, join(context.path, 'assets'));
    }
  }

  public async serializeSection(section: IInfoSection, context: ISerializeContext)
    : Promise<{ filePath: string, sectionTitle: string }> {
    // TODO: cleanup
    const fileWriter = {
      write: (baseName: string, contents: Readable): string => {
        contents.pipe(createWriteStream(join(context.basePath, 'assets', baseName)));
        return context.baseUrl + 'assets/' + baseName;
      },
    };

    if (section.subSections && section.subSections.length > 0) {
      // Navigation section
      const sectionTitle = this.formatString(context.resourceHandler
        .getTranslation(section.nameTranslationKey, context.language));

      // Serialize subsections
      const subSectionDatas: { url: string, sectionTitle: string }[] = [];
      const subBreadcrumbs = context.breadcrumbs.concat([{
        name: sectionTitle,
        url: this.filePathToUrl(context.path, context.basePath, context.baseUrl),
      }]);
      for (const subSection of section.subSections) {
        const subSectionData = await this.serializeSection(subSection,
          {
            ...context,
            breadcrumbs: subBreadcrumbs,
            path: join(context.path, subSection.nameTranslationKey
              .substr(subSection.nameTranslationKey.lastIndexOf('.') + 1)),
          });
        subSectionDatas.push({
          ...subSectionData,
          url: this.filePathToUrl(subSectionData.filePath, context.basePath, context.baseUrl),
        });
      }

      // Create index file
      const filePath = join(context.path, 'index.html');
      const fileContents = this.templateIndex({
        baseUrl: context.baseUrl,
        breadcrumbs: context.breadcrumbs.concat([{ name: sectionTitle }]),
        colors: context.colors,
        headSuffix: context.headSuffixGetters.map((g) => g(context)).join(''),
        language: context.language,
        mainTitle: context.title,
        sectionTitle,
        subSectionDatas,
      });
      await fs.writeFile(filePath, fileContents);

      return { filePath: context.path, sectionTitle };
    } else {
      // Leaf section
      const directory = context.path.substr(0, context.path.lastIndexOf('/'));
      await this.ensureDirExists(directory);

      // Create leaf file
      const filePath = context.path + '.html';
      const sectionTitle = this.formatString(context.resourceHandler
        .getTranslation(section.nameTranslationKey, context.language));
      const fileContents = this.templateSection({
        baseUrl: context.baseUrl,
        breadcrumbs: context.breadcrumbs.concat([{ name: sectionTitle }]),
        colors: context.colors,
        headSuffix: context.headSuffixGetters.map((g) => g(context)).join(''),
        language: context.language,
        mainTitle: context.title,
        sectionAppendices: section.appendix
          .filter((appendix) => appendix) // TODO: rm
          .map((appendix) => this.appendixWrapper({
            appendixContents: appendix.toHtml(context, fileWriter, this),
            appendixName: appendix.getName ? appendix.getName(context) : null,
          })),
        sectionParagraphs: section.paragraphTranslationKeys
          .map((key) => context.resourceHandler.getTranslation(key, context.language))
          .map((value) => this.formatString(value)),
        sectionTitle,
      });
      await fs.writeFile(filePath, fileContents);

      return { filePath, sectionTitle };
    }
  }

  public createItemDisplay(resourceHandler: ResourceHandler, language: string,
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

    return this.templateItem({
      annotation,
      count: item.count || 1,
      icon: iconUrl,
      name: resourceHandler.getTranslation(resourceHandler.getItemTranslationKey(item), language),
      slot,
    });
  }

  public createFluidDisplay(resourceHandler: ResourceHandler, language: string,
                            fileWriter: IFileWriter, fluid: IFluid, slot: boolean): string {
    const icon = resourceHandler.getFluidIconFile(fluid.fluid);
    if (!icon) {
      throw new Error(`Could not find an icon for fluid ${JSON.stringify(fluid)}`);
    }
    const iconUrl = fileWriter.write('icons/' + basename(icon), createReadStream(icon));

    return this.templateItem({
      count: (fluid.amount || 1),
      icon: iconUrl,
      name: resourceHandler.getTranslation(resourceHandler.getFluidTranslationKey(fluid), language),
      slot,
    });
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

  /**
   * Convert Minecraft formatting codes to HTML formats.
   *
   * Based on https://minecraft.gamepedia.com/Formatting_codes
   *
   * @param {string} value A string value that can contain multiple formatting codes.
   * @returns {string} The re-formatted string value.
   */
  protected formatString(value: string): string {
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
  title: string;
  colors: {[key: string]: string};
  headSuffixGetters: ((context: ISerializeContext) => string)[];
}
