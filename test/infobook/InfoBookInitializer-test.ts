import {InfoBookInitializer} from "../../lib/infobook/InfoBookInitializer";

// tslint:disable:object-literal-key-quotes
// tslint:disable:object-literal-sort-keys

describe('InfoBookInitializer', () => {
  describe('when constructing', () => {
    it('should succeed with all required args', () => {
      return expect(() => new InfoBookInitializer({ baseDir: "b", sectionsFile: "f", resources: [] }))
        .not.toThrow();
    });

    it('should fail without args', () => {
      return expect(() => new InfoBookInitializer(<any> {}))
        .toThrow(new Error('Missing baseDir field for infobook construction'));
    });

    it('should fail without baseDir arg', () => {
      return expect(() => new InfoBookInitializer(<any> { sectionsFile: "f", resources: [] }))
        .toThrow(new Error('Missing baseDir field for infobook construction'));
    });

    it('should fail without sectionsFile arg', () => {
      return expect(() => new InfoBookInitializer(<any> { baseDir: "b", resources: [] }))
        .toThrow(new Error('Missing sectionsFile field for infobook construction'));
    });
  });

  describe('initialize', () => {
    let initializer: InfoBookInitializer;

    beforeEach(() => {
      initializer = new InfoBookInitializer(
        { baseDir: __dirname, sectionsFile: "/assets/infobook.xml", resources: [] });
    });

    it('should return null', async () => {
      return expect(await initializer.initialize()).toEqual({
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
                  'tags': ['abc'],
                },
              ],
              'paragraphTranslationKeys': [],
              'appendix': [],
              'tags': [],
            },
          ],
          'paragraphTranslationKeys': [],
          'appendix': [],
          'tags': [],
        },
      });
    });
  });
});
