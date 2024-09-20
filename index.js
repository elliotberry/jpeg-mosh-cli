import fs from 'node:fs/promises';
import {read_structure, moshJpegData} from './helpers.js';
import yargs from 'yargs';
import {hideBin} from 'yargs/helpers';

const main = async () => {
  const argv = yargs(hideBin(process.argv))
    .usage('Usage: $0 <input> [options]')
    .command('$0 <input>', 'Moshes a JPEG file', yargs => {
      yargs.positional('input', {
        describe: 'Path to the input JPEG file',
        type: 'string',
        demandOption: true,
      });
    })
    .option('output', {
      alias: 'o',
      type: 'string',
      description: 'Path to save the moshed JPEG file',
      default: 'moshed_image.jpg',
    })
    .option('iterations', {
      alias: 'n',
      type: 'number',
      description: 'Number of iterations for the moshing process',
      default: 3,
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
