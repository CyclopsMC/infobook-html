import {InfoBookInitializer} from "../../lib/infobook/InfoBookInitializer";

// tslint:disable:object-literal-key-quotes
// tslint:disable:object-literal-sort-keys

describe('InfoBookInitializer', () => {
  describe('when constructing', () => {
    it('should succeed with all required args', () => {
      return expect(() => new InfoBookInitializer({ sectionsFile: "f", modId: 'mod', resources: [] }))
        .not.toThrow();
    });

    it('should fail without args', () => {
      return expect(() => new InfoBookInitializer(<any> {}))
        .toThrow(new Error('Missing modId field for infobook construction'));
    });

    it('should fail without sectionsFile arg', () => {
      return expect(() => new InfoBookInitializer(<any> { modId: "b", resources: [] }))
        .toThrow(new Error('Missing sectionsFile field for infobook construction'));
    });

    it('should fail without modId arg', () => {
      return expect(() => new InfoBookInitializer(<any> { sectionsFile: "b", resources: [] }))
        .toThrow(new Error('Missing modId field for infobook construction'));
    });
  });

  describe('initialize', () => {
    let initializer: InfoBookInitializer;

    beforeEach(() => {
      initializer = new InfoBookInitializer(
        { sectionsFile: __dirname + "/assets/infobook.xml", modId: 'mod', resources: [] });
    });

    it('should return', async () => {
      return expect(await initializer.initialize(null)).toMatchObject({
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
            {
              'appendix': [{}],
              'modId': 'mod',
              'nameTranslationKey': 'info_book.mod.tag_index',
              paragraphTranslationKeys: [],
              subSections: [],
              tags: [],
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
              {
                'appendix': [{}],
                'modId': 'mod',
                'nameTranslationKey': 'info_book.mod.tag_index',
                paragraphTranslationKeys: [],
                subSections: [],
                tags: [],
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
          'info_book.mod.tag_index' : {
            'appendix': [{}],
            'modId': 'mod',
            'nameTranslationKey': 'info_book.mod.tag_index',
            paragraphTranslationKeys: [],
            subSections: [],
            tags: [],
          },
        },
      });
    });
  });
});
