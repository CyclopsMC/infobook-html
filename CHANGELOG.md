# Changelog
All notable changes to this project will be documented in this file.

<a name="v4.0.1"></a>
## [v4.0.1](https://github.com/CyclopsMC/infobook-html/compare/v4.0.0...v4.0.1) - 2025-09-13

### Fixed
* [Convert reset string format code, Closes #36](https://github.com/CyclopsMC/infobook-html/commit/9af942c77ffa3af16e8f40adbebcf3ceca297296)

<a name="v4.0.0"></a>
## [v4.0.0](https://github.com/CyclopsMC/infobook-html/compare/v3.0.0...v4.0.0) - 2024-07-23

### BREAKING CHANGE
* [Update to NeoForge 1.21](https://github.com/CyclopsMC/infobook-html/commit/bec55a8a0d2049a07cc3dafee2276c94ed738e73)
    The most notable change here is that "nbt" on items and fluids is replaced by "components".

<a name="v3.1.0"></a>
## [v3.1.0](https://github.com/CyclopsMC/infobook-html/compare/v3.0.0...v3.1.0) - 2024-01-31

### Added
* [Support text field appendix](https://github.com/CyclopsMC/infobook-html/commit/6f24bbbd606b6cfd1237e3bf740e73ffc23008be)
* [Allowing raw mod URLs in modpack](https://github.com/CyclopsMC/infobook-html/commit/11c9ed5adc554ae7dafa66a202ac83fcacd240fb)

<a name="v3.0.0"></a>
## [v3.0.0](https://github.com/CyclopsMC/infobook-html/compare/v2.0.0...v3.0.0) - 2022-03-10

### Changed
* [Update to MC 1.18](https://github.com/CyclopsMC/infobook-html/commit/1fb77959593a2b84cb14e56406f0df20ad450e16)

<a name="v2.0.0"></a>
## [v2.0.0](https://github.com/CyclopsMC/infobook-html/compare/v1.1.2...v2.0.0) - 2021-02-03

### Changed
* [Update to MC 1.16](https://github.com/CyclopsMC/infobook-html/commit/249b211cb524414db95e3600dcdf14d9304926db)
* [Also extract mod data](https://github.com/CyclopsMC/infobook-html/commit/c11023465f93c2018deaa10e14270102398dfb2a)
* [Update footer year](https://github.com/CyclopsMC/infobook-html/commit/c946bab5c16c293b8a6a01a1c7ee1eb9c28b0ad6)
  
### Fixed
* [Fix incorrect dumpregistries command](https://github.com/CyclopsMC/infobook-html/commit/90bf5675f8a71170e36e91d41c01d5ec94fab430)
* [Fix server start failing after install in a hacky way](https://github.com/CyclopsMC/infobook-html/commit/03319253969e45b76d98b7b918bbf493c5985693)

<a name="v1.1.2"></a>
## [v1.1.2](https://github.com/CyclopsMC/infobook-html/compare/v1.1.1...v1.1.2) - 2019-07-31

### Fixed
* [Fix some URLs ending with two slashes](https://github.com/CyclopsMC/infobook-html/commit/8bb6b5f2efaa5babdbb0365258a911e82121ec74)

<a name="v1.1.1"></a>
## [v1.1.1](https://github.com/CyclopsMC/infobook-html/compare/v1.1.0...v1.1.1) - 2019-07-31

### Added
* [Allow baseUrl to be overridden via CLI](https://github.com/CyclopsMC/infobook-html/commit/c0090fd3fedc664cb33049bef5bc7e27225cb2b8)

### Fixed
* [Fix _lang dirs not being served on GitHub pages](https://github.com/CyclopsMC/infobook-html/commit/bb0c7bda1a8081322d1192ff293bbee1bdb411b0)
* [Fix language links not resolving to baseIRI](https://github.com/CyclopsMC/infobook-html/commit/e87eb5a8cf5e5a1651350dfc49923503e3badb7e)
* [Always end directory URLs with a slash](https://github.com/CyclopsMC/infobook-html/commit/9185cefa713e2d07783ff1f9b800926e24af8a8e)

<a name="v1.1.0"></a>
## [v1.1.0](https://github.com/CyclopsMC/infobook-html/compare/v1.0.1...v1.1.0) - 2019-07-29

### Added
* [Add furnace recipe handler](https://github.com/CyclopsMC/infobook-html/commit/7b6f2728c47283ed4c2e7a29da17a59af91be8bd)
* [Add support for combined formatting codes and newlines](https://github.com/CyclopsMC/infobook-html/commit/47a857e5a42465fa27c08ad0473065118cfa6fac)
* [Add support for predefined crafting recipes](https://github.com/CyclopsMC/infobook-html/commit/ecc794b36be7cdb2e7835723d62e729e9d89a629)

### Fixed
* [Fix item icons not being selected based on nbt](https://github.com/CyclopsMC/infobook-html/commit/1fe8f2938af881cc1a8911ccce4dafeaf6a9e25f)
* [Fix too many ad blocks being added](https://github.com/CyclopsMC/infobook-html/commit/5db0b9321116c710ced4cb9a6bcbfb2de0224324)

### Changed
* [Make page controls slightly smaller](https://github.com/CyclopsMC/infobook-html/commit/c2bd0167b93eeab8e8feb343e5e3f8a0634c8379)
* [Add support for multiple crafting recipes](https://github.com/CyclopsMC/infobook-html/commit/232f4c293564c818ce73b278b665282f12a7e4d7)
* [Make templateItem field public](https://github.com/CyclopsMC/infobook-html/commit/dd22d9bbfa3ac6d2b7e9aa6c3eb2e98d91e45556)
* [Throw error when translation keys are not found](https://github.com/CyclopsMC/infobook-html/commit/904c82275a84a3027b25660c0d87581d16decd43)
* [Throw error if predefined is not found](https://github.com/CyclopsMC/infobook-html/commit/43cac0f927e5f8c5dbc05312e6008fe7ea96b345)
* [Handle tagged crafting recipes](https://github.com/CyclopsMC/infobook-html/commit/d6d2dc821a868e790bc229da035c546a5b3e8ade)
* [Exit with non-zero exit code on error](https://github.com/CyclopsMC/infobook-html/commit/33e3ef8fee72fc72d5608ddb865c53c91b24f59c)

<a name="v1.0.1"></a>
## [v1.0.1](https://github.com/CyclopsMC/infobook-html/compare/v1.0.0...v1.0.1) - 2019-07-25

### Fixed
* [Package assets](https://github.com/CyclopsMC/infobook-html/commit/1d6eda2f7618a7fb312427481f90528dd07185c9)

<a name="v1.0.0"></a>
## [v1.0.0] - 2019-06-25

Initial release