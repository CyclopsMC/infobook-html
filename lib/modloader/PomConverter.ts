import { promisify } from 'node:util';
import fetch from 'node-fetch';
import { parseString } from 'xml2js';

const parseStringPromise = promisify(parseString);

// ---- xml2js document shape interfaces ----

interface IPomXmlDependency {
  groupId: string[];
  artifactId: string[];
  version: string[];
  classifier?: string[];
}

interface IPomXmlDoc {
  project: {
    version: string[];
    properties?: Record<string, string[]>[];
    dependencies?: { dependency: IPomXmlDependency[] }[];
  };
}

interface ISettingsXmlDoc {
  settings: {
    activeProfiles?: { activeProfile: string[] }[];
    profiles?: {
      profile: {
        id: string[];
        repositories?: {
          repository: {
            id: string[];
            url: string[];
          }[];
        }[];
      }[];
    }[];
    servers?: {
      server: {
        id: string[];
        username?: string[];
        password?: string[];
      }[];
    }[];
  };
}

/** Default Maven repository URL, used when no settings.xml is provided. */
const DEFAULT_MAVEN_REPO = 'https://repo.maven.apache.org/maven2';

/**
 * Build the URL for a Maven artifact JAR in a repository.
 */
export function buildMavenArtifactUrl(
  groupId: string,
  artifactId: string,
  version: string,
  classifier: string | undefined,
  repoUrl: string,
): string {
  const groupPath = groupId.replaceAll('.', '/');
  const suffix = classifier ? `-${classifier}` : '';
  const fileName = `${artifactId}-${version}${suffix}.jar`;
  const base = repoUrl.endsWith('/') ? repoUrl : `${repoUrl}/`;
  return `${base}${groupPath}/${artifactId}/${version}/${fileName}`;
}

/**
 * Check if a Maven artifact exists in a repository by sending an HTTP HEAD request.
 * Returns true if the server responds with a 2xx status, false otherwise.
 */
export async function artifactExistsInRepo(
  groupId: string,
  artifactId: string,
  version: string,
  classifier: string | undefined,
  repoUrl: string,
  headers?: Record<string, string>,
): Promise<boolean> {
  const url = buildMavenArtifactUrl(groupId, artifactId, version, classifier, repoUrl);
  try {
    const response = await fetch(url, { method: 'HEAD', headers: headers ?? {}});
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Build Authorization headers for a server entry.
 * Returns a Bearer header for placeholder passwords, or a Basic header for literal credentials.
 * Returns an empty object if no password is configured.
 */
function buildAuthHeaders(
  server: { id: string; username?: string; password?: string } | undefined,
): Record<string, string> {
  if (!server?.password) {
    return {};
  }
  const headers: Record<string, string> = {};
  // If the password is an environment variable placeholder (e.g. ${GITHUB_TOKEN}),
  // use Bearer authentication to avoid having to base64-encode at generation time.
  if (/^\$\{[^}]+\}$/u.test(server.password)) {
    headers.Authorization = `Bearer ${server.password}`;
  } else {
    // Literal credentials: encode as Basic auth
    const credentials = Buffer
      .from(`${server.username ?? 'token'}:${server.password}`)
      .toString('base64');
    headers.Authorization = `Basic ${credentials}`;
  }
  return headers;
}

export interface IModpackMod {
  type: 'maven';
  artifact: string;
  repo: string;
  headers?: Record<string, string>;
}

export interface IModpackJson {
  minecraft: string;
  neoforge?: string;
  forge?: string;
  mods: IModpackMod[];
}

/**
 * Convert a Maven pom.xml (and optional settings.xml) into a modpack.json object.
 * @param pomXml The contents of the pom.xml file.
 * @param settingsXml The contents of the settings.xml file, or undefined.
 * @returns The generated modpack.json object.
 */
export async function convertPomToModpack(
  pomXml: string,
  settingsXml: string | undefined,
): Promise<IModpackJson> {
  const pomDoc = <IPomXmlDoc>(await parseStringPromise(pomXml));
  const project = pomDoc.project;

  // Extract Minecraft version from the project <version>
  const minecraftVersion: string = project.version[0];

  // Extract NeoForge/Forge version from <properties>
  let neoforgeVersion: string | undefined;
  let forgeVersion: string | undefined;
  if (project.properties?.[0]) {
    const props = project.properties[0];
    if (props['neoforge.version']) {
      neoforgeVersion = props['neoforge.version'][0];
    }
    if (props['forge.version']) {
      forgeVersion = props['forge.version'][0];
    }
  }

  // Parse settings.xml if provided
  const activeProfileIds = new Set<string>();
  const repoMap = new Map<string, { id: string; url: string }>();
  const serverMap = new Map<string, { id: string; username?: string; password?: string }>();

  if (settingsXml) {
    const settingsDoc = <ISettingsXmlDoc>(await parseStringPromise(settingsXml));
    const settings = settingsDoc.settings;

    // Collect active profile IDs
    if (settings.activeProfiles?.[0]?.activeProfile) {
      for (const id of settings.activeProfiles[0].activeProfile) {
        activeProfileIds.add(id);
      }
    }

    // Collect repositories from active profiles
    if (settings.profiles?.[0]?.profile) {
      for (const profile of settings.profiles[0].profile) {
        const profileId = profile.id[0];
        if (!activeProfileIds.has(profileId)) {
          continue;
        }
        if (profile.repositories?.[0]?.repository) {
          for (const repo of profile.repositories[0].repository) {
            const repoId = repo.id[0];
            const repoUrl = repo.url[0].replace(/\/$/u, '');
            repoMap.set(repoId, { id: repoId, url: repoUrl });
          }
        }
      }
    }

    // Collect server credentials
    if (settings.servers?.[0]?.server) {
      for (const server of settings.servers[0].server) {
        const serverId = server.id[0];
        const username = server.username?.[0];
        const password = server.password?.[0];
        serverMap.set(serverId, { id: serverId, username, password });
      }
    }
  }

  // Collect dependencies from pom.xml
  const mods: IModpackMod[] = [];
  if (project.dependencies?.[0]?.dependency) {
    const repos = [ ...repoMap.values() ];

    for (const dep of project.dependencies[0].dependency) {
      const groupId = dep.groupId[0];
      const artifactId = dep.artifactId[0];
      const version = dep.version[0];
      const classifier = dep.classifier?.[0];

      const artifact = classifier ?
        `${groupId}:${artifactId}:${version}:${classifier}` :
        `${groupId}:${artifactId}:${version}`;

      // Determine repo: when multiple repos are configured, probe each one in order
      // and use the first that has the artifact (mirrors Maven's repository resolution).
      // When only one repo is configured, skip probing and use it directly.
      let repo = repos[0] ?? { id: 'central', url: DEFAULT_MAVEN_REPO };
      if (repos.length > 1) {
        for (const candidateRepo of repos) {
          const candidateServer = serverMap.get(candidateRepo.id);
          const probeHeaders = buildAuthHeaders(candidateServer);
          const found = await artifactExistsInRepo(
            groupId,
            artifactId,
            version,
            classifier,
            candidateRepo.url,
            probeHeaders,
          );
          if (found) {
            repo = candidateRepo;
            break;
          }
        }
      }

      const mod: IModpackMod = {
        type: 'maven',
        artifact,
        repo: repo.url,
      };

      // If the repo has a server entry with credentials, add auth headers
      const server = serverMap.get(repo.id);
      if (server?.password) {
        mod.headers = buildAuthHeaders(server);
      }

      mods.push(mod);
    }
  }

  // Build the modpack.json output
  const modpack: IModpackJson = {
    minecraft: minecraftVersion,
    mods,
  };
  if (neoforgeVersion) {
    modpack.neoforge = neoforgeVersion;
  } else if (forgeVersion) {
    modpack.forge = forgeVersion;
  }

  // Reorder so minecraft/neoforge/forge come before mods
  return {
    minecraft: modpack.minecraft,
    ...(modpack.neoforge ? { neoforge: modpack.neoforge } : {}),
    ...(modpack.forge ? { forge: modpack.forge } : {}),
    mods: modpack.mods,
  };
}
