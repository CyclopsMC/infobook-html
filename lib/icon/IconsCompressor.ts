import {execFile} from "child_process";
import * as fs from "fs";
import {dirname, join} from "path";
import {promisify} from "util";

const execFileAsync = promisify(execFile);

/**
 * Losslessly compresses PNG icon files using OptiPNG.
 * Mimics how ImgBot compresses images: lossless PNG compression at optimization level 7
 * with metadata stripping.
 */
export class IconsCompressor {

  private readonly iconsDir: string;

  public constructor(iconsDir: string) {
    if (!iconsDir) {
      throw new Error('Missing iconsDir argument');
    }
    this.iconsDir = iconsDir;
  }

    /**
     * Compress all PNG files in the icon directory using OptiPNG.
     */
  public async compress(): Promise<void> {
    const optipngPath = this.getOptipngPath();

    if (!fs.existsSync(optipngPath)) {
      throw new Error(`OptiPNG binary not found at: ${optipngPath}. Ensure optipng-bin is installed.`);
    }

    const files = await fs.promises.readdir(this.iconsDir);
    const pngFiles = files.filter((f) => f.endsWith('.png'));

    if (pngFiles.length === 0) {
      process.stdout.write(`No PNG files found in ${this.iconsDir}\n`);
      return;
    }

    process.stdout.write(`Compressing ${pngFiles.length} icons in ${this.iconsDir}...\n`);

    let compressed = 0;
    let errors = 0;
    let totalSavedBytes = 0;

    for (const file of pngFiles) {
      const filePath = join(this.iconsDir, file);
      const sizeBefore = fs.statSync(filePath).size;
      try {
        await execFileAsync(optipngPath, ['-o7', '-strip', 'all', '-quiet', filePath]);
        const sizeAfter = fs.statSync(filePath).size;
        totalSavedBytes += sizeBefore - sizeAfter;
        compressed++;
      } catch (err) {
        process.stderr.write(`Warning: failed to compress ${file}: ${err}\n`);
        errors++;
      }
    }

    const savedKb = (totalSavedBytes / 1024).toFixed(1);
    process.stdout.write(
            `Compressed ${compressed} icons (saved ${savedKb} KB)` +
            (errors > 0 ? `, ${errors} errors` : '') +
            `\n`,
        );
  }

    /**
     * Get the path to the optipng binary from optipng-bin package.
     * Uses require.resolve to find the package root, then constructs the vendor binary path.
     */
  public getOptipngPath(): string {
    const indexPath = require.resolve('optipng-bin');
    const pkgRoot = dirname(indexPath);
    const binaryName = process.platform === 'win32' ? 'optipng.exe' : 'optipng';
    return join(pkgRoot, 'vendor', binaryName);
  }

}