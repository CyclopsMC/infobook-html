import { createWriteStream } from 'node:fs';
import { join } from 'node:path';
import type { Readable } from 'node:stream';
import type { ISerializeContext } from '../serialize/HtmlInfoBookSerializer';
import type { IFileWriter } from './IFileWriter';

/**
 * A context-based {@link IFileWriter}.
 */
export class FileWriter implements IFileWriter {
  private readonly context: ISerializeContext;
  private readonly writtenFiles: Record<string, boolean>;

  public constructor(context: ISerializeContext) {
    this.context = context;
    this.writtenFiles = {};
  }

  public async write(baseName: string, contents: () => Readable): Promise<string> {
    // Don't write the file if it has been written before
    if (!this.writtenFiles[baseName]) {
      const eventEmitter = contents().pipe(createWriteStream(join(this.context.basePath, 'assets', baseName)));
      this.writtenFiles[baseName] = true;
      await new Promise<void>((resolve, reject) => {
        eventEmitter.on('finish', () => resolve());
        eventEmitter.on('error', reject);
      });
    }
    return `${this.context.baseUrl}assets/${baseName}`;
  }
}
