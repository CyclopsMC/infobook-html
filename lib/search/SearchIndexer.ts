import { join } from 'node:path';

/**
 * Builds the client-side search index over a directory of generated HTML files.
 *
 * The index is built with Pagefind, which splits it per language and into chunks,
 * so that browsers only download the parts they need to answer a query.
 */
export class SearchIndexer {
  /**
   * Build a search index for the given output directory.
   *
   * The index is written to a `pagefind` folder inside that directory, next to the pages it covers.
   *
   * @param {string} outputPath The directory holding the generated HTML files.
   * @param {ISearchIndexerOptions} options Options for indexing.
   * @returns {Promise<ISearchIndexerResult>} The number of pages that were indexed.
   */
  public async index(outputPath: string, options: ISearchIndexerOptions = {}): Promise<ISearchIndexerResult> {
    const pagefind = await SearchIndexer.loadPagefind();

    const { index, errors: indexErrors } = await pagefind.createIndex({
      // The pages mark their own content with data-pagefind-body and data-pagefind-ignore,
      // but item icons carry their names in alt text, which would drown out the page text.
      excludeSelectors: options.excludeSelectors,
    });
    if (!index) {
      throw new Error(`Could not create a search index: ${indexErrors.join(', ')}`);
    }

    const { page_count: pageCount, errors: directoryErrors } = await index.addDirectory({
      path: outputPath,
      glob: options.glob,
    });
    if (directoryErrors.length > 0) {
      throw new Error(`Could not index ${outputPath} for search: ${directoryErrors.join(', ')}`);
    }

    const { errors: writeErrors } = await index.writeFiles({ outputPath: join(outputPath, 'pagefind') });
    if (writeErrors.length > 0) {
      throw new Error(`Could not write the search index: ${writeErrors.join(', ')}`);
    }

    await pagefind.close();

    return { pageCount };
  }

  /**
   * Load the Pagefind module.
   *
   * Pagefind only exposes an ECMAScript module, while this package is compiled to CommonJS,
   * in which TypeScript rewrites a dynamic import into a require that Pagefind does not support.
   * Building the import through a function keeps it a real dynamic import after compilation.
   */
  protected static async loadPagefind(): Promise<IPagefind> {
    // eslint-disable-next-line ts/no-implied-eval, no-new-func
    return <Promise<IPagefind>> new Function('return import("pagefind")')();
  }
}

export interface ISearchIndexerOptions {
  /**
   * Only index the files matching this glob, relative to the output directory.
   * Defaults to all HTML files.
   */
  glob?: string;
  /**
   * Selectors that should not become part of the indexed page text.
   */
  excludeSelectors?: string[];
}

export interface ISearchIndexerResult {
  /**
   * The number of pages that were indexed, across all languages.
   */
  pageCount: number;
}

/**
 * The part of the Pagefind API that is used here.
 *
 * Pagefind ships its own types, but they are only reachable through the `exports` field
 * of its package, which the CommonJS module resolution of this package does not read.
 */
export interface IPagefind {
  createIndex: (config?: { excludeSelectors?: string[] }) => Promise<{
    errors: string[];
    index?: IPagefindIndex;
  }>;
  close: () => Promise<unknown>;
}

export interface IPagefindIndex {
  addDirectory: (directory: { path: string; glob?: string }) => Promise<{
    errors: string[];
    // This name comes from the Pagefind API
    // eslint-disable-next-line ts/naming-convention
    page_count: number;
  }>;
  writeFiles: (options: { outputPath: string }) => Promise<{ errors: string[]; outputPath: string }>;
}
