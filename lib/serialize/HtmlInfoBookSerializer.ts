import { createReadStream, promises as fs } from 'node:fs';
import { basename, join } from 'node:path';
import { promisify } from 'node:util';
import mkdirp from 'mkdirp';
import { ncp } from 'ncp';
import type { compileTemplate } from 'pug';
import { compileFile as compilePug } from 'pug';
import { InfoBookAppendixAd } from '../infobook/appendix/InfoBookAppendixAd';
import { FileWriter } from '../infobook/FileWriter';
import type { IFileWriter } from '../infobook/IFileWriter';
import type { IFluid } from '../infobook/IFluid';
import type { IInfoBook } from '../infobook/IInfoBook';
import type { IInfoSection } from '../infobook/IInfoSection';
import type { IItem } from '../infobook/IItem';
import type { ResourceHandler } from '../resource/ResourceHandler';

/**
 * Serializes an infobook to a collection of HTML files.
 */
export class HtmlInfoBookSerializer {
  /**
   * The Minecraft color formatting codes, and the colors they correspond to.
   *
   * Based on https://minecraft.gamepedia.com/Formatting_codes
   *
   * The '§r' code resets the formatting, which falls back to the default black text color.
   */
  public static readonly colorCodes: { code: string; name: string; color: string }[] = [
    { code: 'r', name: '0', color: '#000000' },
    { code: '1', name: '1', color: '#0000AA' },
    { code: '2', name: '2', color: '#00AA00' },
    { code: '3', name: '3', color: '#00AAAA' },
    { code: '4', name: '4', color: '#AA0000' },
    { code: '5', name: '5', color: '#AA00AA' },
    { code: '6', name: '6', color: '#FFAA00' },
    { code: '7', name: '7', color: '#AAAAAA' },
    { code: '8', name: '8', color: '#555555' },
    { code: '9', name: '9', color: '#5555FF' },
    { code: 'a', name: 'a', color: '#55FF55' },
    { code: 'b', name: 'b', color: '#55FFFF' },
    { code: 'c', name: 'c', color: '#FF5555' },
    { code: 'd', name: 'd', color: '#FF55FF' },
    { code: 'e', name: 'e', color: '#FFFF55' },
    { code: 'f', name: 'f', color: '#FFFFFF' },
  ];

  /**
   * Regular expressions for replacing color codes with colored spans.
   *
   * Each span carries both a class and a custom property, so that stylesheets can tune the
   * in-game colors for readability on the page background by redefining '--mc-*',
   * while the in-game color remains as fallback.
   */
  protected static readonly colorReplacers: { regex: RegExp; replacement: string }[] =
    HtmlInfoBookSerializer.colorCodes.map(({ code, name, color }) => ({
      regex: new RegExp(`§${code}([^§]*)§0`, 'gu'),
      replacement: `<span class="mc mc-${name}" style="color: var(--mc-${name}, ${color})">$1</span>`,
    }));

  public readonly templateItem: compileTemplate;
  private readonly templateIndex: compileTemplate;
  private readonly templateSection: compileTemplate;
  private readonly appendixWrapper: compileTemplate;

  private fileWriter: IFileWriter;

  public constructor() {
    this.templateIndex = compilePug(join(__dirname, '..', '..', 'template', 'index.pug'));
    this.templateSection = compilePug(join(__dirname, '..', '..', 'template', 'section.pug'));
    this.appendixWrapper = compilePug(join(__dirname, '..', '..', 'template', 'appendix', 'appendix_base.pug'));
    this.templateItem = compilePug(join(__dirname, '..', '..', 'template', 'appendix', 'item.pug'));
  }

  public async serialize(infobook: IInfoBook, context: ISerializeContext, assetsPaths: string[]): Promise<void> {
    context = {
      ...context,
      basePath: context.path,
      breadcrumbs: [],
    };
    this.fileWriter = new FileWriter(context);

    await this.ensureDirExists(context.path);
    await this.ensureDirExists(join(context.path, 'assets'));
    await this.ensureDirExists(join(context.path, 'assets', 'icon'));

    // Resolve the icon that is shown next to the book name in the header of every page
    context = { ...context, bookIcon: await this.resolveBookIcon(context) };

    // Create a .nojekyll file to ensure _lang directories are served via GitHub pages.
    await fs.writeFile(join(context.path, '.nojekyll'), '');

    // Serialize sections in all languages
    for (const language of context.resourceHandler.getLanguages()) {
      const langPath = this.getLanguagePath(language, context.path);
      await this.ensureDirExists(langPath);
      const sectionIndex = await this.serializeSectionIndex(infobook, context, language, langPath);
      await this.serializeSectionFiles(infobook, context, language, langPath, sectionIndex);
    }

    // Serialize assets
    await promisify(ncp)(join(__dirname, '..', '..', 'assets'), join(context.path, 'assets'));
    for (const assetsPath of assetsPaths) {
      await promisify(ncp)(assetsPath, join(context.path, 'assets'));
    }
  }

  public async serializeSectionIndex(
    infobook: IInfoBook,
    contextRoot: ISerializeContext,
    language: string,
    langPath: string,
  ): Promise<ISectionIndex> {
    const sectionIndex: ISectionIndex = {
      linkedPagesList: [],
      tags: {},
      urlIndex: {},
    };
    let pageIndex = 0;
    await this.serializeSection(infobook.rootSection, {
      ...contextRoot,
      language,
      path: langPath,
    // eslint-disable-next-line unused-imports/no-unused-vars
    }, async({ index, section, sectionTitle, fileUrl, breadcrumbs }) => {
      if (!index) {
        sectionIndex.urlIndex[fileUrl] = pageIndex++;
        const name = breadcrumbs.slice(1).map(b => b.name).join(' / ');
        sectionIndex.linkedPagesList.push({ name, url: fileUrl });
        for (let tag of section.tags) {
          if (!tag.includes(':')) {
            tag = `${contextRoot.modId}:${tag}`;
          }
          sectionIndex.tags[tag] = fileUrl;
        }
      }
    });
    return sectionIndex;
  }

  public async serializeSectionFiles(
    infobook: IInfoBook,
    contextRoot: ISerializeContext,
    language: string,
    langPath: string,
    sectionIndex: ISectionIndex,
  ): Promise<void> {
    await this.serializeSection(infobook.rootSection, {
      ...contextRoot,
      language,
      languageTag: HtmlInfoBookSerializer.toLanguageTag(language),
      path: langPath,
      sectionIndex,
    }, async({ index, breadcrumbs, context, section, sectionTitle, subSectionDatas, filePath, fileUrl }) => {
      // Create links to this page in other languages
      const languages: { url: string; name: string }[] = [];
      for (const name of contextRoot.resourceHandler.getLanguages()) {
        const baseFilePath = filePath.slice(join(contextRoot.basePath, this.getLanguagePath(language)).length);
        const languageFilePath = join(contextRoot.basePath, this.getLanguagePath(name), baseFilePath);
        const url = this.filePathToUrl(languageFilePath, contextRoot.basePath, context.baseUrl);
        languages.push({ name, url });
      }

      if (index) {
        // Create index file
        const fileContents = this.templateIndex({
          ...context,
          breadcrumbs,
          headSuffix: context.headSuffixGetters.map(g => g(context)).join(''),
          languages,
          sectionTitle,
          subSectionDatas,
        });
        await fs.writeFile(filePath, fileContents);
      } else {
        // Determine next/previous page based on the index
        const pageIndex = sectionIndex.urlIndex[fileUrl];
        const nextPage = pageIndex < sectionIndex.linkedPagesList.length ?
          sectionIndex.linkedPagesList[pageIndex + 1] :
          null;
        const previousPage = pageIndex > 0 ?
          sectionIndex.linkedPagesList[pageIndex - 1] :
          null;

        // Prepend ad appendix if enabled
        const appendices = section.appendix;
        if (context.googleAdsense && language === 'en_us') {
          appendices.unshift(new InfoBookAppendixAd());
        }

        const sectionAppendices: string[] = [];
        for (const appendix of appendices) {
          if (appendix) {
            const appendixContents = await appendix.toHtml(context, this.fileWriter, this);
            if (appendix.skipWrapper) {
              sectionAppendices.push(appendixContents);
            } else {
              sectionAppendices.push(this.appendixWrapper({
                appendixContents,
                appendixName: appendix.getName ? appendix.getName(context) : null,
              }));
            }
          }
        }

        // Create leaf file
        const fileContents = this.templateSection({
          ...context,
          breadcrumbs,
          headSuffix: context.headSuffixGetters.map(g => g(context)).join(''),
          languages,
          nextPage,
          previousPage,
          sectionAppendices,
          sectionParagraphs: section.paragraphTranslationKeys
            .map(key => context.resourceHandler.getTranslation(key, context.language))
            .map(value => this.formatString(value)),
          sectionTitle,
        });
        await fs.writeFile(filePath, fileContents);
      }
    });
  }

  public async serializeSection(
    section: IInfoSection,
    context: ISerializeContext,
    onSection: (args: ISectionCallbackArgs) => Promise<void>,
  ): Promise<{ filePath: string; sectionTitle: string }> {
    const sectionTitle = this.formatString(context.resourceHandler
      .getTranslation(section.nameTranslationKey, context.language));
    const breadcrumbs = [ ...context.breadcrumbs, { name: sectionTitle }];

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
      const subSectionDatas: { url: string; sectionTitle: string }[] = [];
      const fileUrl = this.filePathToUrl(context.path, context.basePath, context.baseUrl);
      const subBreadcrumbs = [ ...context.breadcrumbs, {
        name: sectionTitle,
        url: fileUrl,
      }];
      for (const subSection of section.subSections) {
        const subSectionData = await this.serializeSection(subSection, {
          ...context,
          breadcrumbs: subBreadcrumbs,
          path: join(context.path, subSection.nameTranslationKey
            .slice(subSection.nameTranslationKey.lastIndexOf('.') + 1)),
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
    }
    // Leaf section
    const directory = context.path.slice(0, Math.max(0, context.path.lastIndexOf('/')));
    await this.ensureDirExists(directory);

    // Handle leaf file
    const filePath = `${context.path}.html`;
    const fileUrl = this.filePathToUrl(filePath, context.basePath, context.baseUrl);

    await onSection(
      { index: false, breadcrumbs, context, sectionTitle, section, subSectionDatas: [], filePath, fileUrl },
    );

    return { filePath, sectionTitle };
  }

  public createResourceLink(
    resourceHandler: ResourceHandler,
    context: ISerializeContext,
    resource: string,
    translationKey: string,
  ): { link: string; linkTarget: string } {
    let link;
    let linkTarget;
    if (resource.startsWith('minecraft:')) {
      const translated = resourceHandler.getTranslation(translationKey, 'en_us');

      link = `https://minecraft.gamepedia.com/${translated.replaceAll(' ', '_')}`;
      linkTarget = '_blank';
    } else if (context.sectionIndex.tags[resource]) {
      link = context.sectionIndex.tags[resource];
    }

    return { link, linkTarget };
  }

  public async createItemDisplay(
    resourceHandler: ResourceHandler,
    context: ISerializeContext,
    fileWriter: IFileWriter,
    item: IItem,
    slot: boolean,
    annotation = '',
  ): Promise<string> {
    if (item.item === 'minecraft:air') {
      return slot ? '<div class="item item-slot">&nbsp;</div>' : '<div class="item">&nbsp;</div>';
    }

    const icon = resourceHandler.getItemIconFile(item.item, item.components);
    if (!icon) {
      throw new Error(`Could not find an icon for item ${JSON.stringify(item)}`);
    }
    const iconUrl = await fileWriter.write(`icon/${basename(icon)}`, () => createReadStream(icon));

    const key = resourceHandler.getItemTranslationKey(item);
    if (!key) {
      throw new Error(`Could not find translation key for item ${JSON.stringify(item)}`);
    }
    const { link, linkTarget } = this.createResourceLink(resourceHandler, context, item.item, key);

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

  public async createFluidDisplay(
    resourceHandler: ResourceHandler,
    context: ISerializeContext,
    fileWriter: IFileWriter,
    fluid: IFluid,
    slot: boolean,
  ): Promise<string> {
    const icon = resourceHandler.getFluidIconFile(fluid.fluid);
    if (!icon) {
      throw new Error(`Could not find an icon for fluid ${JSON.stringify(fluid)}`);
    }
    const iconUrl = await fileWriter.write(`icon/${basename(icon)}`, () => createReadStream(icon));

    const key = resourceHandler.getFluidTranslationKey(fluid);
    if (!key) {
      throw new Error(`Could not find translation key for fluid ${JSON.stringify(fluid)}`);
    }
    const { link, linkTarget } = this.createResourceLink(
      resourceHandler,
      context,
      this.tagFluid(context, fluid.fluid),
      key,
    );

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
    return fluidName;
  }

  public getLanguagePath(language: string, path = ''): string {
    return language === 'en_us' ? path : join(path, '_lang', language);
  }

  /**
   * Convert a Minecraft language code into a BCP 47 language tag for the lang attribute.
   *
   * Minecraft separates the language and the region with an underscore, such as 'en_us',
   * which is not a valid language tag, and stops consumers such as screen readers
   * and the search indexer from recognising the language.
   *
   * Codes that do not have this shape, such as 'enws', are left untouched.
   *
   * @param {string} language A Minecraft language code.
   * @returns {string} The corresponding language tag.
   */
  public static toLanguageTag(language: string): string {
    const match = /^([a-z]{2,3})_([a-z]{2})$/u.exec(language);
    return match ? `${match[1]}-${match[2].toUpperCase()}` : language;
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
    value = value.replaceAll('&', '§');

    // Formats to HTML
    value = value.replaceAll(/§l§n([^§]*)§r/gu, '<strong><u>$1</u></strong>');
    value = value.replaceAll(/§l([^§]*)§r/gu, '<strong>$1</strong>');
    value = value.replaceAll(/§n([^§]*)§r/gu, '<u>$1</u>');
    value = value.replaceAll(/§o([^§]*)§r/gu, '<em>$1</em>');
    value = value.replaceAll('§N', '<br />');

    // Colors to HTML
    for (const { regex, replacement } of HtmlInfoBookSerializer.colorReplacers) {
      value = value.replaceAll(regex, replacement);
    }

    return value;
  }

  /**
   * Determine the URL of the icon that is shown next to the book name in the page header.
   *
   * This is the icon of the item in {@link ISerializeContext#bookIconItem} if it is set and exported,
   * and the {@link ISerializeContext#icon} URL otherwise.
   *
   * @param {ISerializeContext} context The serialization context.
   * @returns {Promise<string>} The book icon URL, which can be undefined if neither is available.
   */
  protected async resolveBookIcon(context: ISerializeContext): Promise<string | undefined> {
    if (context.bookIconItem) {
      const icon = context.resourceHandler.getItemIconFile(context.bookIconItem);
      if (icon) {
        return await this.fileWriter.write(`icon/${basename(icon)}`, () => createReadStream(icon));
      }
      process.stderr.write(
        `Could not find an icon for bookIconItem '${context.bookIconItem}', falling back to the icon option\n`,
      );
    }
    return context.icon;
  }

  protected async ensureDirExists(dirPath: string): Promise<void> {
    let fstat;
    try {
      fstat = await fs.stat(dirPath);
    } catch {
      await promisify(mkdirp)(dirPath);
    }
    if (fstat && !fstat.isDirectory() && fstat.isFile()) {
      throw new Error(`Could not serialize to a file, must be a directory.`);
    }
  }

  protected filePathToUrl(filePath: string, basePath: string, baseUrl: string): string {
    let url = filePath.replace(basePath, baseUrl);
    const last = basename(url);
    if (!url.endsWith('/') && !last.includes('.')) {
      url += '/';
    }
    return url;
  }
}

export interface ISerializeContext {
  baseUrl: string;
  basePath?: string;
  breadcrumbs?: { url?: string; name: string }[];
  language?: string;
  path: string;
  modId: string;
  resourceHandler: ResourceHandler;
  colors: Record<string, string>;
  headSuffixGetters: ((context: ISerializeContext) => string)[];
  sectionIndex?: ISectionIndex;
  root: boolean;
  modName: string;
  modUrl: string;
  bookName: string;
  mods: string[];
  googleAnalytics: string;
  googleAdsense: { client: string; format: string; slot: string };
  icon: string;
  /**
   * Optional id of the item (such as 'mymod:my_book') of which the exported icon
   * is shown next to the book name in the page header.
   */
  /**
   * The BCP 47 language tag of the page being serialized, derived from the language.
   */
  languageTag?: string;
  /**
   * Whether the pages should offer the search interface.
   */
  search?: boolean;
  bookIconItem?: string;
  /**
   * The resolved URL of the book icon, which is determined during serialization.
   */
  bookIcon?: string;
}

export interface ISectionCallbackArgs {
  index: boolean;
  breadcrumbs?: { url?: string; name: string }[];
  context: ISerializeContext;
  sectionTitle: string;
  section: IInfoSection;
  subSectionDatas: { url: string; sectionTitle: string }[];
  filePath: string;
  fileUrl: string;
}

export interface ISectionIndex {
  /**
   * The array of pages, with defined order.
   */
  linkedPagesList: { name: string; url: string }[];
  /**
   * Mapping from url to page index within linkedPagesList.
   */
  urlIndex: Record<string, number>;
  /**
   * Mapping from tag to page URL.
   */
  tags: Record<string, string>;
}
