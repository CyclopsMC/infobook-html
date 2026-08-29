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

  describe('writeModLoaderConfig', () => {
    const configPath = (): string => join(workDir, 'game', 'config', 'fml.toml');

    it('should size NeoForge\'s early window for the required GUI scale', async() => {
      await generator.writeModLoaderConfig();

      const contents = await fs.promises.readFile(configPath(), 'utf8');
      const options = generator.getRequiredGameOptions();
      expect(contents).toContain(`earlyWindowWidth = ${options.overrideWidth}\n`);
      expect(contents).toContain(`earlyWindowHeight = ${options.overrideHeight}\n`);
    });

    it('should overwrite the sizes in an existing config and preserve everything else', async() => {
      await fs.promises.mkdir(join(workDir, 'game', 'config'), { recursive: true });
      await fs.promises.writeFile(configPath(), [
        '#Early window width',
        'earlyWindowWidth = 854',
        '#Early window height',
        'earlyWindowHeight = 480',
        'earlyWindowControl = true',
        '',
      ].join('\n'));

      await generator.writeModLoaderConfig();

      const lines = (await fs.promises.readFile(configPath(), 'utf8')).trim().split('\n');
      expect(lines).toContain('#Early window width');
      expect(lines).toContain('earlyWindowControl = true');
      expect(lines).toContain('earlyWindowWidth = 1920');
      expect(lines).toContain('earlyWindowHeight = 1080');
      expect(lines.filter(line => line.startsWith('earlyWindowWidth'))).toHaveLength(1);
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
