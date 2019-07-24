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
      return expect(parser.parse(__dirname + "/assets/unknown.xml", 'mod')).rejects
        .toThrow(new Error(`ENOENT: no such file or directory, open '${__dirname}/assets/unknown.xml'`));
    });

    it('should resolve for a valid path', async () => {
      return expect(await parser.parse(__dirname + '/assets/infobook.xml', 'mod')).toEqual({
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
              'modId': 'mod',
              'tags': [],
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
                  'modId': 'mod',
                  'tags': ['abc'],
                },
              ],
              'paragraphTranslationKeys': [],
              'appendix': [],
              'modId': 'mod',
              'tags': [],
            },
          ],
          'paragraphTranslationKeys': [],
          'appendix': [],
          'modId': 'mod',
          'tags': [],
        },
        'sections': {
          'info_book.integrateddynamics.section.main': {
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
                'modId': 'mod',
                'tags': [],
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
                    'modId': 'mod',
                    'tags': ['abc'],
                  },
                ],
                'paragraphTranslationKeys': [],
                'appendix': [],
                'modId': 'mod',
                'tags': [],
              },
            ],
            'paragraphTranslationKeys': [],
            'appendix': [],
            'modId': 'mod',
            'tags': [],
          },
          'info_book.integrateddynamics.introduction': {
            'nameTranslationKey': 'info_book.integrateddynamics.introduction',
            'subSections': [],
            'paragraphTranslationKeys': [
              'info_book.integrateddynamics.introduction.text1',
              'info_book.integrateddynamics.introduction.text2',
              'info_book.integrateddynamics.introduction.text3',
              'info_book.integrateddynamics.introduction.text4',
            ],
            'appendix': [],
            'modId': 'mod',
            'tags': [],
          },
          'info_book.integrateddynamics.tutorials': {
            'nameTranslationKey': 'info_book.integrateddynamics.tutorials',
            'subSections': [
              {
                'nameTranslationKey': 'info_book.integrateddynamics.tutorials.introduction',
                'subSections': [],
                'paragraphTranslationKeys': [
                  'info_book.integrateddynamics.tutorials.introduction.text1',
                ],
                'appendix': [],
                'modId': 'mod',
                'tags': ['abc'],
              },
            ],
            'paragraphTranslationKeys': [],
            'appendix': [],
            'modId': 'mod',
            'tags': [],
          },
          'info_book.integrateddynamics.tutorials.introduction': {
            'nameTranslationKey': 'info_book.integrateddynamics.tutorials.introduction',
            'subSections': [],
            'paragraphTranslationKeys': [
              'info_book.integrateddynamics.tutorials.introduction.text1',
            ],
            'appendix': [],
            'modId': 'mod',
            'tags': ['abc'],
          },
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
      }, 'mod')).toEqual({
        rootSection: {
          nameTranslationKey: "abc",
          subSections: [],
          paragraphTranslationKeys: [],
          appendix: [],
          modId: 'mod',
          tags: [],
        },
        sections: {
          abc: {
            nameTranslationKey: "abc",
            subSections: [],
            paragraphTranslationKeys: [],
            appendix: [],
            modId: 'mod',
            tags: [],
          },
        },
      });
    });

    it('should throw for a missing root section', async () => {
      return expect(() => parser.jsonToInfoBook({
        blabla: {
          $: { name: "abc" },
        },
      }, 'mod')).toThrow(new Error('No valid root section was found.'));
    });
  });

  describe('jsonToSection', () => {
    it('should return a section without sub-elements', async () => {
      const data = {
        $: { name: "abc" },
      };
      const sections = {};
      expect(parser.jsonToSection(data, sections, 'mod')).toEqual({
        nameTranslationKey: "abc",
        subSections: [],
        paragraphTranslationKeys: [],
        appendix: [],
        modId: 'mod',
        tags: [],
      });
      expect(sections).toEqual({
        abc: {
          nameTranslationKey: "abc",
          subSections: [],
          paragraphTranslationKeys: [],
          appendix: [],
          modId: 'mod',
          tags: [],
        },
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
        tag: [
          'abc',
        ],
      };
      const sections = {};
      expect(parser.jsonToSection(data, sections, 'mod')).toEqual({
        nameTranslationKey: "abc",
        subSections: [
          {
            nameTranslationKey: "a_1",
            subSections: [],
            paragraphTranslationKeys: [],
            appendix: [],
            modId: 'mod',
            tags: [],
          },
          {
            nameTranslationKey: "a_2",
            subSections: [],
            paragraphTranslationKeys: [],
            appendix: [],
            modId: 'mod',
            tags: [],
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
        modId: 'mod',
        tags: ['abc'],
      });
      expect(sections).toEqual({
        abc: {
          nameTranslationKey: "abc",
          subSections: [
            {
              nameTranslationKey: "a_1",
              subSections: [],
              paragraphTranslationKeys: [],
              appendix: [],
              modId: 'mod',
              tags: [],
            },
            {
              nameTranslationKey: "a_2",
              subSections: [],
              paragraphTranslationKeys: [],
              appendix: [],
              modId: 'mod',
              tags: [],
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
          modId: 'mod',
          tags: ['abc'],
        },
        a_1: {
          nameTranslationKey: "a_1",
          subSections: [],
          paragraphTranslationKeys: [],
          appendix: [],
          modId: 'mod',
          tags: [],
        },
        a_2: {
          nameTranslationKey: "a_2",
          subSections: [],
          paragraphTranslationKeys: [],
          appendix: [],
          modId: 'mod',
          tags: [],
        },
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
      return expect(() => parser.jsonToAppendix({}, 'mod'))
        .toThrow(new Error('No type or factory was found for the appendix {}.'));
    });

    it('should error for no type', async () => {
      return expect(() => parser.jsonToAppendix({ $: {} }, 'mod'))
        .toThrow(new Error('No type or factory was found for the appendix {"$":{}}.'));
    });

    it('should return null for an unknown type', async () => {
      return expect(parser.jsonToAppendix({ $: { type: 'unknown' } }, 'mod')).toBe(null);
    });

    it('should return an appendix for an image for a known type', async () => {
      return expect(parser.jsonToAppendix({ $: { type: 'dummy' } }, 'mod')).toBe(dummyAppendix);
    });
  });
});
