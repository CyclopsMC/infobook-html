import type { IFileWriter } from '../../lib/infobook/IFileWriter';
import type { ResourceHandler } from '../../lib/resource/ResourceHandler';
import type { ISerializeContext } from '../../lib/serialize/HtmlInfoBookSerializer';
import { HtmlInfoBookSerializer } from '../../lib/serialize/HtmlInfoBookSerializer';

// Exposes the protected members that need a fileWriter, which is set during serialization.
class TestSerializer extends HtmlInfoBookSerializer {
  public setFileWriter(fileWriter: IFileWriter) {
    (<any> this).fileWriter = fileWriter;
  }

  public resolveBookIconPublic(context: ISerializeContext) {
    return this.resolveBookIcon(context);
  }
}

describe('HtmlInfoBookSerializer', () => {
  let serializer: TestSerializer;
  let fileWriter: IFileWriter;
  let resourceHandler: ResourceHandler;
  let context: ISerializeContext;

  beforeEach(() => {
    serializer = new TestSerializer();
    fileWriter = { write: jest.fn(async(baseName: string) => `http://example.org/book/assets/${baseName}`) };
    serializer.setFileWriter(fileWriter);
    resourceHandler = <any> {
      getItemIconFile: jest.fn((itemId: string) => itemId === 'mod:unexported' ?
        undefined :
        `/icon/${itemId.replace(':', '__')}.png`),
      getItemTranslationKey: jest.fn((item: { item: string }) => `item.${item.item.replace(':', '.')}`),
      getTranslation: jest.fn((key: string) => `Name of ${key}`),
    };
    context = <any> {
      baseUrl: 'http://example.org/book/',
      icon: 'http://example.org/book/favicon.png',
      language: 'en_us',
      modUrl: 'http://example.org/',
      resourceHandler,
      sectionIndex: { linkedPagesList: [], tags: { 'mod:thing': 'http://example.org/book/thing.html' }, urlIndex: {}},
    };
  });

  describe('formatString', () => {
    it('should keep plain strings as-is', () => {
      expect(serializer.formatString('Just some text')).toBe('Just some text');
    });

    it('should convert bold, underline and italic codes', () => {
      expect(serializer.formatString('§lBold§r')).toBe('<strong>Bold</strong>');
      expect(serializer.formatString('§nUnderline§r')).toBe('<u>Underline</u>');
      expect(serializer.formatString('§oItalic§r')).toBe('<em>Italic</em>');
      expect(serializer.formatString('§l§nBoth§r')).toBe('<strong><u>Both</u></strong>');
    });

    it('should convert newline codes', () => {
      expect(serializer.formatString('One§NTwo')).toBe('One<br />Two');
    });

    it('should accept & as an alternative to §', () => {
      expect(serializer.formatString('&lBold&r')).toBe('<strong>Bold</strong>');
    });

    it('should convert color codes to a class with the in-game color as fallback', () => {
      expect(serializer.formatString('§6Integer§0'))
        .toBe('<span class="mc mc-6" style="color: var(--mc-6, #FFAA00)">Integer</span>');
      expect(serializer.formatString('§aOperator§0'))
        .toBe('<span class="mc mc-a" style="color: var(--mc-a, #55FF55)">Operator</span>');
    });

    it('should convert the reset code to the default text color', () => {
      expect(serializer.formatString('§rAny§0'))
        .toBe('<span class="mc mc-0" style="color: var(--mc-0, #000000)">Any</span>');
    });

    it('should convert all color codes', () => {
      for (const { code, name, color } of HtmlInfoBookSerializer.colorCodes) {
        expect(serializer.formatString(`§${code}Value§0`))
          .toBe(`<span class="mc mc-${name}" style="color: var(--mc-${name}, ${color})">Value</span>`);
      }
    });

    it('should convert multiple color codes in one string', () => {
      expect(serializer.formatString('Add §6Integer§0 to §6Integer§0'))
        .toBe('Add <span class="mc mc-6" style="color: var(--mc-6, #FFAA00)">Integer</span> to ' +
          '<span class="mc mc-6" style="color: var(--mc-6, #FFAA00)">Integer</span>');
    });
  });

  describe('getLanguagePath', () => {
    it('should keep en_us at the root', () => {
      expect(serializer.getLanguagePath('en_us')).toBe('');
      expect(serializer.getLanguagePath('en_us', 'output')).toBe('output');
    });

    it('should place other languages in a _lang folder', () => {
      expect(serializer.getLanguagePath('nl_nl')).toBe('_lang/nl_nl');
      expect(serializer.getLanguagePath('nl_nl', 'output')).toBe('output/_lang/nl_nl');
    });
  });

  describe('tagFluid', () => {
    it('should return the fluid name', () => {
      expect(serializer.tagFluid(context, 'mod:blood')).toBe('mod:blood');
    });
  });

  describe('createResourceLink', () => {
    it('should link Minecraft resources to the wiki in a new tab', () => {
      expect(serializer.createResourceLink(resourceHandler, context, 'minecraft:stick', 'item.minecraft.stick'))
        .toEqual({
          link: 'https://minecraft.gamepedia.com/Name_of_item.minecraft.stick',
          linkTarget: '_blank',
        });
    });

    it('should link tagged resources to their page in the book', () => {
      expect(serializer.createResourceLink(resourceHandler, context, 'mod:thing', 'item.mod.thing'))
        .toEqual({ link: 'http://example.org/book/thing.html', linkTarget: undefined });
    });

    it('should not link unknown resources', () => {
      expect(serializer.createResourceLink(resourceHandler, context, 'mod:other', 'item.mod.other'))
        .toEqual({ link: undefined, linkTarget: undefined });
    });
  });

  describe('createItemDisplay', () => {
    it('should create an empty slot for air', async() => {
      await expect(serializer
        .createItemDisplay(resourceHandler, context, fileWriter, { item: 'minecraft:air' }, true))
        .resolves.toBe('<div class="item item-slot">&nbsp;</div>');
      await expect(serializer
        .createItemDisplay(resourceHandler, context, fileWriter, { item: 'minecraft:air' }, false))
        .resolves.toBe('<div class="item">&nbsp;</div>');
    });

    it('should create an item with its written icon', async() => {
      const html = await serializer
        .createItemDisplay(resourceHandler, context, fileWriter, { item: 'mod:thing' }, true);
      expect(fileWriter.write).toHaveBeenCalledWith('icon/mod__thing.png', expect.any(Function));
      expect(html).toContain('class="item item-slot"');
      expect(html).toContain('src="http://example.org/book/assets/icon/mod__thing.png"');
      expect(html).toContain('href="http://example.org/book/thing.html"');
      expect(html).not.toContain('item-count');
    });

    it('should show the count and the annotation when they are set', async() => {
      const html = await serializer
        .createItemDisplay(resourceHandler, context, fileWriter, { item: 'mod:thing', count: 4 }, true, '50%');
      expect(html).toContain('>4</span>');
      expect(html).toContain('50%');
    });

    it('should reject items without an icon', async() => {
      await expect(serializer
        .createItemDisplay(resourceHandler, context, fileWriter, { item: 'mod:unexported' }, true))
        .rejects.toThrow('Could not find an icon for item');
    });
  });

  describe('resolveBookIcon', () => {
    it('should write and return the icon of the book item', async() => {
      await expect(serializer.resolveBookIconPublic({ ...context, bookIconItem: 'mod:thing' }))
        .resolves.toBe('http://example.org/book/assets/icon/mod__thing.png');
    });

    it('should fall back to the icon option when the book item has no icon', async() => {
      await expect(serializer.resolveBookIconPublic({ ...context, bookIconItem: 'mod:unexported' }))
        .resolves.toBe('http://example.org/book/favicon.png');
    });

    it('should fall back to the icon option when no book item is set', async() => {
      await expect(serializer.resolveBookIconPublic(context)).resolves.toBe('http://example.org/book/favicon.png');
    });
  });
});
