import {promises as fs} from "fs";
import mkdirp = require("mkdirp");
import {ncp} from "ncp";
import {join} from "path";
import {compileFile as compilePug, compileTemplate} from "pug";
import {promisify} from "util";
import {IInfoBook} from "../infobook/IInfoBook";
import {IInfoSection} from "../infobook/IInfoSection";
import {ResourceHandler} from "../resource/ResourceHandler";

/**
 * Serializes an infobook to a collection of HTML files.
 */
export class HtmlInfoBookSerializer {

  private readonly templateIndex: compileTemplate;
  private readonly templateSection: compileTemplate;

  constructor() {
    this.templateIndex = compilePug(__dirname + '/../../template/index.pug');
    this.templateSection = compilePug(__dirname + '/../../template/section.pug');
  }

  public async serialize(infobook: IInfoBook, context: ISerializeContext) {
    await this.ensureDirExists(context.path);

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
  }

  public async serializeSection(section: IInfoSection, context: ISerializeContext)
    : Promise<{ filePath: string, sectionTitle: string }> {
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
        language: context.language,
        mainTitle: context.title,
        sectionParagraphs: section.paragraphTranslationKeys
          .map((key) => context.resourceHandler.getTranslation(key, context.language))
          .map((value) => this.formatString(value)),
        sectionTitle,
      });
      await fs.writeFile(filePath, fileContents);

      return { filePath, sectionTitle };
    }
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
  resourceHandler: ResourceHandler;
  title: string;
}
