import {XmlInfoBookParser} from "../../lib/parse/XmlInfoBookParser";

// tslint:disable:object-literal-key-quotes
// tslint:disable:object-literal-sort-keys

describe('XmlInfoBookParser', () => {
  let parser: XmlInfoBookParser;
  let dummyAppendix;

  beforeEach(() => {
    parser = new XmlInfoBookParser();
    parser.registerAppendixHandler('dummy', {
      createAppendix: () => dummyAppendix,
    });
    dummyAppendix = ({
      toHtml: () => 'abc',
    });
  });

  describe('parse', () => {
    it('should reject for an invalid path', async () => {
      return expect(parser.parse(__dirname + "/assets/unknown.xml")).rejects
        .toThrow(new Error(`ENOENT: no such file or directory, open '${__dirname}/assets/unknown.xml'`));
    });

    it('should resolve for a valid path', async () => {
      return expect(await parser.parse(__dirname + '/assets/infobook.xml')).toEqual({
        'rootSection': {
          'nameTranslationKey': 'info_book.integrateddynamics.section.main',
          'subSections': [
            {
              'nameTranslationKey': 'info_book.integrateddynamics.introduction',
              'subSections': [],
              'paragraphTranslationKeys': [
                'info_book.integrateddynamics.introduction.text1',
                'info_book.integrateddynamics.introduction.text2',
                'info_book.integrateddynamics.introduction.text3',
                'info_book.integrateddynamics.introduction.text4',
              ],
              'appendix': [],
            },
            {
              'nameTranslationKey': 'info_book.integrateddynamics.tutorials',
              'subSections': [
                {
                  'nameTranslationKey': 'info_book.integrateddynamics.tutorials.introduction',
                  'subSections': [],
                  'paragraphTranslationKeys': [
                    'info_book.integrateddynamics.tutorials.introduction.text1',
                  ],
                  'appendix': [],
                },
              ],
              'paragraphTranslationKeys': [],
              'appendix': [],
            },
          ],
          'paragraphTranslationKeys': [],
          'appendix': [],
        },
      });
    });
  });

  describe('jsonToInfoBook', () => {
    it('should return the root section', async () => {
      return expect(parser.jsonToInfoBook({
        section: {
          $: { name: "abc" },
        },
      })).toEqual({
        rootSection: {
          nameTranslationKey: "abc",
          subSections: [],
          paragraphTranslationKeys: [],
          appendix: [],
        },
      });
    });

    it('should throw for a missing root section', async () => {
      return expect(() => parser.jsonToInfoBook({
        blabla: {
          $: { name: "abc" },
        },
      })).toThrow(new Error('No valid root section was found.'));
    });
  });

  describe('jsonToSection', () => {
    it('should return a section without sub-elements', async () => {
      const data = {
        $: { name: "abc" },
      };
      return expect(parser.jsonToSection(data)).toEqual({
        nameTranslationKey: "abc",
        subSections: [],
        paragraphTranslationKeys: [],
        appendix: [],
      });
    });

    it('should return a section with all sub-elements', async () => {
      const data = {
        $: { name: "abc" },
        section: [
          {
            $: { name: "a_1" },
          },
          {
            $: { name: "a_2" },
          },
        ],
        paragraph: [
          "p1",
          "p2",
          "p3",
        ],
        appendix: [
          {
            $: { type: "ap1" },
          },
          {
            $: { type: "ap2" },
          },
        ],
      };
      return expect(parser.jsonToSection(data)).toEqual({
        nameTranslationKey: "abc",
        subSections: [
          {
            nameTranslationKey: "a_1",
            subSections: [],
            paragraphTranslationKeys: [],
            appendix: [],
          },
          {
            nameTranslationKey: "a_2",
            subSections: [],
            paragraphTranslationKeys: [],
            appendix: [],
          },
        ],
        paragraphTranslationKeys: [
          "p1",
          "p2",
          "p3",
        ],
        appendix: [
          null,
          null,
        ],
      });
    });
  });

  describe('jsonToParagraph', () => {
    it('should return the data as string', async () => {
      return expect(parser.jsonToParagraph("abc")).toBe("abc");
    });
  });

  describe('jsonToAppendix', () => {
    it('should error for no $ field', async () => {
      return expect(() => parser.jsonToAppendix({}))
        .toThrow(new Error('No type or factory was found for the appendix {}.'));
    });

    it('should error for no type', async () => {
      return expect(() => parser.jsonToAppendix({ $: {} }))
        .toThrow(new Error('No type or factory was found for the appendix {"$":{}}.'));
    });

    it('should return null for an unknown type', async () => {
      return expect(parser.jsonToAppendix({ $: { type: 'unknown' } })).toBe(null);
    });

    it('should return an appendix for an image for a known type', async () => {
      return expect(parser.jsonToAppendix({ $: { type: 'dummy' } })).toBe(dummyAppendix);
    });
  });
});
