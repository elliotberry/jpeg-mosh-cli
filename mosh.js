import {DQT, SOS, SOI, EOI} from './constants.js';
import flipbits from './flip-bits.js';

async function mosh_jpeg_data(segments, typ = 3, qt = [2, 1], im = [15, 1], validate = false, validate_maxtries = 10) {
  let tries = validate_maxtries;
  while (tries > 0) {
    tries--;
    const ret = [];

    for (const {marker, } of segments) {
      if (segment.marker === DQT && typ & 1) {
        const corruptedSegdata = flipbits(segment.data, qt[0], qt[1], 4);
        ret.push(corruptedSegdata);
      } else if (segment.marker === SOS && typ & 2) {
        const corruptedSegdata = flipbits(segment.data, im[0], im[1], 20);
        ret.push(corruptedSegdata);
      } else {
        ret.push(segment.data);
      }
    }
    console.log(ret);
    const retdata = Buffer.concat(ret);

    if (!validate) {
      return retdata;
    } else {
      try {
        await Jimp.read(retdata);
        return retdata;
      } catch (err) {
        continue;
      }
    }
  }

  throw new Error(`Didn't get valid data after ${validate_maxtries} tries`);
}

export default mosh_jpeg_data;