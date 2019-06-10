import * as fs from "fs";
import minimist = require("minimist");
import {IInfoBook} from "../lib/infobook/IInfoBook";
import {InfoBookInitializer} from "../lib/infobook/InfoBookInitializer";
import {ResourceLoader} from "../lib/resource/ResourceLoader";
import {HtmlInfoBookSerializer} from "../lib/serialize/HtmlInfoBookSerializer";

// Process CLI args
const args = minimist(process.argv.slice(2));
if (args.help || args._.length !== 2) {
  process.stdout.write(`generate-cyclops-infobook-html Output Cyclops infobooks as HTML
Usage:
  generate-cyclops-infobook-html /path/to/config.json /path/to/output/
Options:
  --help        print this help message
`);
  process.exit(1);
}

async function create() {
  // Create infobook from config
  const config = JSON.parse(fs.readFileSync(args._[0], "utf8"));

  // Read resources
  const resourceLoader = new ResourceLoader();
  await resourceLoader.loadAll(config.baseDir, config.resources);

  // Initialize book
  const infoBookInitializer = new InfoBookInitializer(config);
  const infoBook: IInfoBook = await infoBookInitializer.initialize();
  // console.log(JSON.stringify(infoBook, null, "  ")); // TODO
  // console.log(infoBook); // TODO

  // Convert info book to HTML
  const infoBookSerializer = new HtmlInfoBookSerializer();
  await infoBookSerializer.serialize(infoBook, {
    baseUrl: config.baseUrl,
    path: args._[1],
    resourceHandler: resourceLoader.getResourceHandler(),
  });
}

create();
