
import fs from 'node:fs/promises';
import {read_structure, mosh_jpeg_data} from './helpers.js';

const main = async () => {
  // Example usage (assuming you have a JPEG file named 'image.jpg')
let jpegdata = await fs.readFile('./test.jpg')

  
  try {
      const moshedData = await mosh_jpeg_data(jpegdata, 3, [2, 1], [15, 1], true);
      await fs.writeFile('moshed_image.jpg', moshedData);
  } catch (error) {
      console.error('Error moshing JPEG data:', error);
  }

}
main();
