import * as fs from "fs";
import minimist = require("minimist");
import {InfoBookAppendixHandlerImage} from "../lib/infobook/appendix/InfoBookAppendixHandlerImage";
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

  // Setup infobook loader
  const infoBookInitializer = new InfoBookInitializer(config);
  infoBookInitializer.registerAppendixHandler('image',
    new InfoBookAppendixHandlerImage(resourceLoader.getResourceHandler()));

  // Initialize book
  const infoBook: IInfoBook = await infoBookInitializer.initialize();

  // Convert info book to HTML
  const infoBookSerializer = new HtmlInfoBookSerializer();
  await infoBookSerializer.serialize(infoBook, {
    baseUrl: config.baseUrl,
    path: args._[1],
    resourceHandler: resourceLoader.getResourceHandler(),
    title: config.title,
  });
}

create();
