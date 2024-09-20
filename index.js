import fs from 'node:fs/promises';
import yargs from 'yargs';
import {hideBin} from 'yargs/helpers';

import {moshJpegData,read_structure} from './helpers.js';

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
    .option('iterations', {
      alias: 'n',
      default: 3,
      description: 'Number of iterations for the moshing process',
      type: 'number',
    })
    .help().argv;

  try {
    const jpegdata = await fs.readFile(argv.input);
    const moshedData = await moshJpegData(jpegdata, argv.iterations, [2, 1], [15, 1], true);
    await fs.writeFile(argv.output, moshedData);
    console.log(`Moshed image saved to ${argv.output}`);
  } catch (error) {
    console.error('Error moshing JPEG data:', error);
  }
};

main();
