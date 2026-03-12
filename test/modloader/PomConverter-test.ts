import { convertPomToModpack } from '../../lib/modloader/PomConverter';

// eslint-disable-next-line no-template-curly-in-string
const GITHUB_TOKEN_PLACEHOLDER = '${GITHUB_TOKEN}';

const POM_BASIC = `<?xml version="1.0" encoding="UTF-8"?>
<project>
  <version>1.21.1</version>
  <properties>
    <neoforge.version>21.1.210</neoforge.version>
  </properties>
  <dependencies>
    <dependency>
      <groupId>org.cyclops.cyclopscore</groupId>
      <artifactId>cyclopscore-1.21.1-neoforge</artifactId>
      <version>1.27.0</version>
    </dependency>
  </dependencies>
</project>`;

const POM_WITH_CLASSIFIER = `<?xml version="1.0" encoding="UTF-8"?>
<project>
  <version>1.21.1</version>
  <properties>
    <neoforge.version>21.1.210</neoforge.version>
  </properties>
  <dependencies>
    <dependency>
      <groupId>mekanism</groupId>
      <artifactId>Mekanism</artifactId>
      <version>1.21.1-10.7.18.84</version>
      <classifier>all</classifier>
    </dependency>
  </dependencies>
</project>`;

const POM_WITH_FORGE = `<?xml version="1.0" encoding="UTF-8"?>
<project>
  <version>1.20.1</version>
  <properties>
    <forge.version>47.3.0</forge.version>
  </properties>
  <dependencies/>
</project>`;

const SETTINGS_GITHUB = `<settings>
  <activeProfiles>
    <activeProfile>github</activeProfile>
  </activeProfiles>
  <profiles>
    <profile>
      <id>github</id>
      <repositories>
        <repository>
          <id>github</id>
          <url>https://maven.pkg.github.com/CyclopsMC/packages</url>
        </repository>
      </repositories>
    </profile>
  </profiles>
  <servers>
    <server>
      <id>github</id>
      <username>\${GITHUB_USER}</username>
      <password>\${GITHUB_TOKEN}</password>
    </server>
  </servers>
</settings>`;

const SETTINGS_LITERAL_CREDS = `<settings>
  <activeProfiles>
    <activeProfile>myrepo</activeProfile>
  </activeProfiles>
  <profiles>
    <profile>
      <id>myrepo</id>
      <repositories>
        <repository>
          <id>myrepo</id>
          <url>https://repo.example.com/maven2</url>
        </repository>
      </repositories>
    </profile>
  </profiles>
  <servers>
    <server>
      <id>myrepo</id>
      <username>myuser</username>
      <password>mysecret</password>
    </server>
  </servers>
</settings>`;

const SETTINGS_INACTIVE_PROFILE = `<settings>
  <activeProfiles>
    <activeProfile>active</activeProfile>
  </activeProfiles>
  <profiles>
    <profile>
      <id>active</id>
      <repositories>
        <repository>
          <id>active</id>
          <url>https://active.example.com/maven2</url>
        </repository>
      </repositories>
    </profile>
    <profile>
      <id>inactive</id>
      <repositories>
        <repository>
          <id>inactive</id>
          <url>https://inactive.example.com/maven2</url>
        </repository>
      </repositories>
    </profile>
  </profiles>
</settings>`;

describe('PomConverter', () => {
  describe('convertPomToModpack', () => {
    it('should extract the Minecraft version from project version', async() => {
      const result = await convertPomToModpack(POM_BASIC, undefined);
      expect(result.minecraft).toBe('1.21.1');
    });

    it('should extract the NeoForge version from properties', async() => {
      const result = await convertPomToModpack(POM_BASIC, undefined);
      expect(result.neoforge).toBe('21.1.210');
    });

    it('should extract the Forge version from properties', async() => {
      const result = await convertPomToModpack(POM_WITH_FORGE, undefined);
      expect(result.forge).toBe('47.3.0');
      expect(result.neoforge).toBeUndefined();
    });

    it('should convert a basic dependency to a maven mod entry', async() => {
      const result = await convertPomToModpack(POM_BASIC, undefined);
      expect(result.mods).toHaveLength(1);
      expect(result.mods[0]).toEqual({
        type: 'maven',
        artifact: 'org.cyclops.cyclopscore:cyclopscore-1.21.1-neoforge:1.27.0',
        repo: 'https://repo.maven.apache.org/maven2',
      });
    });

    it('should include a classifier in the artifact coordinate when present', async() => {
      const result = await convertPomToModpack(POM_WITH_CLASSIFIER, undefined);
      expect(result.mods[0].artifact).toBe('mekanism:Mekanism:1.21.1-10.7.18.84:all');
    });

    it('should use the GitHub packages repo URL from settings.xml', async() => {
      const result = await convertPomToModpack(POM_BASIC, SETTINGS_GITHUB);
      expect(result.mods[0].repo).toBe('https://maven.pkg.github.com/CyclopsMC/packages');
    });

    it('should add a Bearer auth header when the server password is a placeholder', async() => {
      const result = await convertPomToModpack(POM_BASIC, SETTINGS_GITHUB);
      expect(result.mods[0].headers).toEqual({
        Authorization: `Bearer ${GITHUB_TOKEN_PLACEHOLDER}`,
      });
    });

    it('should add a Basic auth header when the server password is a literal value', async() => {
      const result = await convertPomToModpack(POM_BASIC, SETTINGS_LITERAL_CREDS);
      const expected = `Basic ${Buffer.from('myuser:mysecret').toString('base64')}`;
      expect(result.mods[0].headers).toEqual({
        Authorization: expected,
      });
    });

    it('should only include repos from active profiles', async() => {
      const result = await convertPomToModpack(POM_BASIC, SETTINGS_INACTIVE_PROFILE);
      expect(result.mods[0].repo).toBe('https://active.example.com/maven2');
    });

    it('should strip trailing slash from repo URL', async() => {
      const settingsWithTrailingSlash = SETTINGS_GITHUB.replace(
        'https://maven.pkg.github.com/CyclopsMC/packages',
        'https://maven.pkg.github.com/CyclopsMC/packages/',
      );
      const result = await convertPomToModpack(POM_BASIC, settingsWithTrailingSlash);
      expect(result.mods[0].repo).toBe('https://maven.pkg.github.com/CyclopsMC/packages');
    });

    it('should return empty mods array when there are no dependencies', async() => {
      const result = await convertPomToModpack(POM_WITH_FORGE, undefined);
      expect(result.mods).toHaveLength(0);
    });

    it('should produce a valid modpack.json matching the committed file', async() => {
      const pomXml = `<?xml version="1.0" encoding="UTF-8"?>
<project>
  <version>1.21.1</version>
  <properties>
    <neoforge.version>21.1.210</neoforge.version>
  </properties>
  <dependencies>
    <dependency>
      <groupId>org.cyclops.cyclopscore</groupId>
      <artifactId>cyclopscore-1.21.1-neoforge</artifactId>
      <version>1.27.0</version>
    </dependency>
  </dependencies>
</project>`;
      const settingsXml = `<settings>
  <activeProfiles>
    <activeProfile>github</activeProfile>
  </activeProfiles>
  <profiles>
    <profile>
      <id>github</id>
      <repositories>
        <repository>
          <id>github</id>
          <url>https://maven.pkg.github.com/CyclopsMC/packages</url>
        </repository>
      </repositories>
    </profile>
  </profiles>
  <servers>
    <server>
      <id>github</id>
      <username>\${GITHUB_USER}</username>
      <password>\${GITHUB_TOKEN}</password>
    </server>
  </servers>
</settings>`;
      const result = await convertPomToModpack(pomXml, settingsXml);
      expect(result).toEqual({
        minecraft: '1.21.1',
        neoforge: '21.1.210',
        mods: [
          {
            type: 'maven',
            artifact: 'org.cyclops.cyclopscore:cyclopscore-1.21.1-neoforge:1.27.0',
            repo: 'https://maven.pkg.github.com/CyclopsMC/packages',
            headers: { Authorization: `Bearer ${GITHUB_TOKEN_PLACEHOLDER}` },
          },
        ],
      });
    });
  });
});
