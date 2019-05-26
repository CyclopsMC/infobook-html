import {InfoBookInitializer} from "../../lib/infobook/InfoBookInitializer";

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

    it('should fail without resources arg', () => {
      return expect(() => new InfoBookInitializer(<any> { baseDir: "b", sectionsFile: "f" }))
        .toThrow(new Error('Missing resources array for infobook construction'));
    });
  });

  describe('initialize', () => {
    let initializer: InfoBookInitializer;

    beforeEach(() => {
      initializer = new InfoBookInitializer({ baseDir: "b", sectionsFile: "f", resources: [] });
    });

    it('should return null', () => {
      return expect(initializer.initialize()).toBe(null);
    });
  });
});
