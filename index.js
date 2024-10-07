import chalk from 'chalk';
import returnSafeFilepath from 'elliotisms/return-safe-filepath';
import fs from 'node:fs/promises';
import yargs from 'yargs';
import {hideBin} from 'yargs/helpers';

import {moshJpegData} from './helpers.js';

const main = async () => {
  const argv = yargs(hideBin(process.argv))
    .usage('Usage: $0 <input> [options]')
    .command('$0 <input>', 'Moshes a JPEG file', yargs => {
      yargs.positional('input', {
        demandOption: true,
        describe: 'Path to the input JPEG file',
        type: 'string',
      });
    })
    .option('output', {
      alias: 'o',
      default: 'moshed_image.jpg',
      description: 'Path to save the moshed JPEG file',
      type: 'string',
    })
    .option('number', {
      alias: 'n',
      default: 1,
      description: 'Number of files to mosh',
      type: 'number',
    })
    .option('iterations', {
      alias: 'i',
      default: 3,
      description: 'Number of iterations for the moshing process',
      type: 'number',
    })
    .option("validate", {
      alias: "v",
      default: true,
      description: "Validate the moshed JPEG file using the JIMP library",
      type: "boolean",
 })
    .help().argv;

  try {
    const jpegdata = await fs.readFile(argv.input);

    for await (const _ of Array.from({length: argv.number})) {
      const moshedData = await moshJpegData(jpegdata, argv.iterations, [2, 1], [15, 1], argv.validate);
      let finalPath = await returnSafeFilepath(argv.output);
      await fs.writeFile(finalPath, moshedData);
      console.log(chalk.green(`Moshed image saved to ${finalPath}`));
    }
  } catch (error) {
    console.error(chalk.red('Error moshing JPEG data:', error));
  }
};

main();
