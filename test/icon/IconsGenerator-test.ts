import * as fs from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { IconsGenerator } from '../../lib/icon/IconsGenerator';

describe('IconsGenerator', () => {
  let workDir: string;
  let generator: IconsGenerator;

  beforeEach(async() => {
    workDir = await fs.promises.mkdtemp(join(tmpdir(), 'infobook-icons-'));
    generator = new IconsGenerator({
      modsDir: join(workDir, 'mods'),
      iconsDir: join(workDir, 'icon'),
      workDir,
      minecraftVersion: '1.21.1',
      neoforgeVersion: '21.1.210',
    });
  });

  afterEach(async() => {
    await fs.promises.rm(workDir, { recursive: true, force: true });
  });

  describe('getRequiredGameOptions', () => {
    it('should export at a GUI scale that keeps IconExporter\'s pose scaling uniform', () => {
      // A GUI scale of iconSize / 16 makes IconExporter scale the pose by exactly 1,
      // which keeps vertex normals (and hence the shading of block icons) intact.
      expect(generator.getRequiredGameOptions().guiScale).toBe('4');
    });

    it('should request a window that is large enough for the required GUI scale', () => {
      const options = generator.getRequiredGameOptions();
      const guiScale = Number.parseInt(options.guiScale, 10);
      expect(Number.parseInt(options.overrideWidth, 10)).toBeGreaterThanOrEqual(320 * guiScale);
      expect(Number.parseInt(options.overrideHeight, 10)).toBeGreaterThanOrEqual(240 * guiScale);
      expect(options.fullscreen).toBe('false');
    });
  });

  describe('writeGameOptions', () => {
    const optionsPath = (): string => join(workDir, 'game', 'options.txt');

    it('should create the options file with all required options', async() => {
      await generator.writeGameOptions();

      const contents = await fs.promises.readFile(optionsPath(), 'utf8');
      for (const [ key, value ] of Object.entries(generator.getRequiredGameOptions())) {
        expect(contents).toContain(`${key}:${value}\n`);
      }
    });

    it('should preserve unrelated options and overwrite conflicting ones', async() => {
      await fs.promises.mkdir(join(workDir, 'game'), { recursive: true });
      await fs.promises.writeFile(optionsPath(), [
        'version:3955',
        'guiScale:2',
        'key_key.attack:key.mouse.left',
        '',
      ].join('\n'));

      await generator.writeGameOptions();

      const lines = (await fs.promises.readFile(optionsPath(), 'utf8')).trim().split('\n');
      expect(lines).toContain('version:3955');
      expect(lines).toContain('key_key.attack:key.mouse.left');
      expect(lines).toContain('guiScale:4');
      expect(lines).not.toContain('guiScale:2');
      expect(lines.filter(line => line.startsWith('guiScale:'))).toHaveLength(1);
      expect(lines.filter(line => line.trim().length === 0)).toHaveLength(0);
    });
  });
});
