#!/usr/bin/env node
/*
    read_structure() parses a relatively simple JPEG file into its constituent segments.
    - ...which is less than you were probably looking for.
    - (it originated in somthing even simpler, verying that the mars rover images were indeed an unusual JPEG flavour)

    mosh_jpegData() takes the segments from read_structure() and corrupts a few of them
*/

import {Buffer} from 'node:buffer';
import {randomInt} from 'node:crypto';

import {Jimp} from 'jimp';

// Image processing library for checking if the corrupted image can still be opened
import {APP0, APP15, COM, DQT, EOI, HQT, SOF0, SOF1, SOF2, SOF9, SOI, SOS} from './constants.js'; // JPEG marker constants

// Helper function to convert a byte to a hexadecimal string in the format '0x00'
const byteToHex = byte => byte.toString(16).padStart(2, '0');
let timesValidated = 0;
/*
    Given a jpeg file contents as a bytes object, splits it into its constituent segments.
    You wouldn't call this a parser - it does little to no interpretation of what those segments mean.

    @param jpegData: the file as a Buffer object
    @param debug: whether to spit out debug stuff on stdout
    @return: a generator that yields 4-tuples:
      - the segment's marker byte (~= its 'type')
      - a readable description
      - segment size
      - segment data
*/
function* readStructure(jpegData, debug = false) {
  let index = 0;
  const dsize = jpegData.length;

  while (index < jpegData.length) {
    if (debug) {
      console.log(`now at bytepos ${index} of ${dsize}`);
    }

    if (jpegData[index] !== 0xff) {
      if (debug) {
        console.log(`segment didn't start with 0xff, we probably mis-parsed (next bytes are ${jpegData.slice(index, index + 8)})`);
        console.log('');
      }
      break;
    }

    const marker = jpegData[index + 1]; // marker byte for segment
    let description;
    let moveon;
    let segdata;

    if (debug) {
      console.log(`marker byte  [${byteToHex(marker)}]`);
    }

    if (marker === SOI) {
      description = 'Start Of Image';
      moveon = 2;
    } else if (marker === EOI) {
      description = 'End Of Image';
      moveon = 2;
    } else if (marker === 0xd0) {
      description = 'restart 0';
      moveon = 2;
    } else if (marker === 0xd1) {
      description = 'restart 1';
      moveon = 2;
    } else if (marker === 0xd2) {
      description = 'restart 2';
      moveon = 2;
    } else if (marker === 0xd3) {
      description = 'restart 3';
      moveon = 2;
    } else if (marker === 0xd4) {
      description = 'restart 4';
      moveon = 2;
    } else if (marker === 0xd5) {
      description = 'restart 5';
      moveon = 2;
    } else if (marker === 0xd6) {
      description = 'restart 6';
      moveon = 2;
    } else if (marker === 0xd7) {
      description = 'restart 7';
      moveon = 2;
    } else if (marker >= 0x30 && marker <= 0x3f) {
      description = 'reserved JP2';
      moveon = 2;
    } else if (marker === 0xdd) {
      description = 'restart interval';
      moveon = 6;
    } else if (marker === SOS) {
      // Start of Scan
      description = 'start of scan';

     
      if (debug) {
        const datasize = (jpegData[index + 2] << 8) + jpegData[index + 3];
      
        console.log(`SOS header size: ${datasize}`);
      }
      const number_components = jpegData[index + 4];

      if (debug) {
        console.log(`Components in scan: ${number_components}`);
      }
      for (let ci = 0; ci < number_components; ci++) {
        if (debug) {
          console.log(`Component ${ci + 1} of `);
        }
        const cid = jpegData[index + 4 + 2 * ci];
        if (debug) {
          if (cid === 1) {
            console.log('Channel Y ');
          } else if (cid === 2) {
            console.log('Channel Cb');
          } else if (cid === 3) {
            console.log('Channel Cr');
          } else if (cid === 4) {
            console.log('Channel I ');
          } else if (cid === 5) {
            console.log('Channel Q ');
          } else {
            console.log(`cid: `);
          }
        }
        const htab = jpegData[index + 4 + 2 * ci + 1];
        const htab_ac = (htab & 0xf0) >> 4;
        const htab_dc = htab & 0x0f;
        if (debug) {
          console.log(`Huffman table AC:${byteToHex(htab_ac)}  DC:${byteToHex(htab_dc)}`);
        }
      }

      // HACK: just look assume this section ends with an EOI
      if (jpegData.slice(-2).equals(Buffer.from([0xff, 0xd9]))) {
        segdata = jpegData.slice(index, -2);
        moveon = jpegData.length - index - 2;
      } else {
        // or sometimes no EOI. Joy.
        segdata = jpegData.slice(index);
        moveon = jpegData.length - index;
      }
    } else {
      // assume it's one that codes its length
      if (marker === COM) {
        description = 'comment';
      } else if (marker >= APP0 && marker <= APP15) {
        const nullIndex = jpegData.indexOf(0x00, index + 5);
        description = `APP${marker - 0xe0} ${jpegData.slice(index + 4, nullIndex).toString()}`;
      } else if (marker === HQT) {
        description = 'huffman tables';
      } else if (marker === DQT) {
        description = 'quantization tables';
      } else if (marker === SOF0) {
        description = 'start of frame, baseline sequential, huffman';
      } else if (marker === SOF2) {
        description = 'start of frame, progressive, huffman';
      } else if (marker === SOF1) {
        description = 'start of frame, extended sequential, huffman';
      } else if (marker === SOF9) {
        description = 'start of frame, extended sequential, arithmetic';
      } else if (marker === 0xc3) {
        description = '(start of frame? -) lossless';
      } else if (marker === 0xc5) {
        description = '(start of frame? -) differential sequential DCI';
      } else if (marker === 0xc6) {
        description = '(start of frame? -) differential progressive DCI';
      } else if (marker === 0xc7) {
        description = '(start of frame? -) differential lossless';
      } else if (marker === 0xc8) {
        description = 'JPEG extensions';
      } else if (marker === 0xca) {
        description = '(start of frame? -) extended progressive DCT';
      } else if (marker === 0xcb) {
        description = '(start of frame? -) extended lossless';
      } else if (marker === 0xcc) {
        description = 'arithmetic conditioning table';
      } else if (marker >= 0xf0 && marker <= 0xf6) {
        description = 'JPEG extensions, ITU T.84/IEC 10918-3';
      } else if (marker === 0xf7) {
        description = 'JPEG LS - SOF48';
      } else if (marker === 0xf8) {
        description = 'JPEG LS - LSE';
      } else if (marker >= 0xf9 && marker <= 0xf_fd) {
        description = 'JPEG extensions, ITU T.84/IEC 10918-3';
      } else if (marker >= 0x4f && marker <= 0x6f) {
        description = 'JPEG extensions, JPEG2000?';
      } else if (marker >= 0x90 && marker <= 0x93) {
        description = 'JPEG extensions, JPEG2000?';
      } else if (marker === 0x51) {
        description = 'JPEG extensions, JPEG2000?, image and tile size';
      } else if (marker === 0x52) {
        description = 'JPEG extensions, JPEG2000?, coding style default';
      } else if (marker === 0x53) {
        description = 'JPEG extensions, JPEG2000?, coding style component';
      } else if (marker === 0x5e) {
        description = 'JPEG extensions, JPEG2000?, region of interest';
      } else if (marker === 0x5c) {
        description = 'JPEG extensions, JPEG2000?, quantization default';
      } else if (marker === 0x5d) {
        description = 'JPEG extensions, JPEG2000?, quantization component';
      } else if (marker === 0x5f) {
        description = 'JPEG extensions, JPEG2000?, progression order change';
      } else if (marker === 0x55) {
        description = 'JPEG extensions, JPEG2000?, tile-part lengths';
      } else if (marker === 0x57) {
        description = 'JPEG extensions, JPEG2000?, packet length (main header)';
      } else if (marker === 0x58) {
        description = 'JPEG extensions, JPEG2000?, packet length (tile-part header)';
      } else if (marker === 0x60) {
        description = 'JPEG extensions, JPEG2000?, packed packet headers (main header)';
      } else if (marker === 0x61) {
        description = 'JPEG extensions, JPEG2000?, packet packet headers (tile-part header)';
      } else if (marker === 0x91) {
        description = 'JPEG extensions, JPEG2000?, start of packet';
      } else if (marker === 0x92) {
        description = 'JPEG extensions, JPEG2000?, end of packet header';
      } else if (marker === 0x63) {
        description = 'JPEG extensions, JPEG2000?, component reg';
      } else if (marker === 0x64) {
        description = 'JPEG extensions, JPEG2000?, comment';
      } else if (marker === 0xfd) {
        description = 'reserved for JPEG extensions';
      } else if (marker === SOS) {
        description = 'SOS Start Of Scan';
      } else {
        description = 'unknown marker';
      }

      const datasize = (jpegData[index + 2] << 8) + jpegData[index + 3];
      segdata = jpegData.slice(index + 4, index + 2 + datasize);
      moveon = datasize + 2;
    }

    if (debug) {
      console.log(`Chunk size:2+${(moveon - 2).toString().padStart(3)}   type:${marker.toString(16).padStart(2, '0')}  ${description.padEnd(30)}`);
    }

    // Selective parsing of contents
    if (debug) {
      if (marker === 0xe0) {
        if (segdata.slice(0, 5).equals(Buffer.from('JFIF\u0000'))) {
          const units = segdata[7];
          let unitsDesc;
          if (units === 0) {
            unitsDesc = 'none (0)';
          } else if (units === 1) {
            unitsDesc = 'dpi (1)';
          } else if (units === 2) {
            unitsDesc = 'dpcm (2)';
          } else {
            unitsDesc = `unknown ()`;
          }
          console.log(`Version:    ${segdata[5]}.${segdata[6].toString().padStart(2, '0')}`);
          console.log(`Units:`);
          console.log(`Xdensity:   ${(segdata[8] << 8) + segdata[9]}`);
          console.log(`Ydensity:   ${(segdata[10] << 8) + segdata[11]}`);
          console.log(`XThumbnail: ${segdata[12]}`);
          console.log(`YThumbnail: ${segdata[13]}`);
        } else {
          console.log(`Don't know APP0 identifier ${segdata.slice(0, 5)}, skipping`);
        }
      }

      if (marker === SOF0) {
        // start of frame, baseline
        const data_precision = segdata[0];
        const h = (segdata[1] << 8) + segdata[2];
        const w = (segdata[3] << 8) + segdata[4];
        const comps = segdata[5];
        console.log(`Image is  by  px,  -channel,   bits per channel`);
        for (let ci = 0; ci < comps; ci++) {
          process.stdout.write(' ');
          const cid = segdata[6 + ci * 3 + 0];
          const sampfac = segdata[6 + ci * 3 + 1];
          const qtnum = segdata[6 + ci * 3 + 2];
          if (cid === 1) {
            process.stdout.write('Y ');
          } else if (cid === 2) {
            process.stdout.write('Cb');
          } else if (cid === 3) {
            process.stdout.write('Cr');
          } else if (cid === 4) {
            process.stdout.write('I ');
          } else if (cid === 5) {
            process.stdout.write('Q ');
          }
          console.log(`hsfac:${(sampfac & 0xf0) >> 4} vsfac:${sampfac & 0x0f}  qtnum:`);
        }
      }

      if (marker === 0xfe) {
        console.log(`${segdata.toString()}`);
      }
    }

    segdata = jpegData.slice(index, index + moveon);
    index += moveon;
    yield {description: description, marker: marker, moveon: moveon, segmentData: segdata};
  }
}

function flipbits(data, howmanytimes = 10, howmanybits = 2, skipfirstbytes = 0, mask = null) {
  if (mask) {
    const filteredMask = [];
    for (const element of mask) {
      if (element > skipfirstbytes && element < data.length) {
        filteredMask.push(element);
      }
    }
    mask = filteredMask;
  }

  const dataLength = data.length - skipfirstbytes;

  while (howmanytimes-- > 0) {
    const targetbyte = mask ? mask[randomInt(0, mask.length)] : randomInt(0, dataLength) + skipfirstbytes;

    for (let _ = 0; _ < howmanybits; _++) {
      const bitnum = randomInt(0, 8);
      data[targetbyte] ^= 1 << bitnum; // Modify the original data in-place
    }
  }

  return data; // Return the modified data
}

/* 
  
  Takes a JPEG file's byte data, returns a corrupted JPEG file byte data that hopefully still displays
    
  @param typ: what part(s) to corrupt;
    - if typ&1, we corrupt quantization tables according to qt
    - if typ&2, we corrupt image data according to im
    
  @param qt: should be a (howmanytimes, howmanybits) tuple, how much to corrupt the quantization tables
  Note that small changes have a lot of effect if early in the table
  (though we don't currently control where -- that might be interesting to do).
    
  @param im: should be a (howmanytimes,howmanybits) tuple, how much to corrupt the image data after the SOS
  You generally want the howmanybits low, because it's very easy to cause a "we can't deal with the rest" breakoff
    
  @param validate: if True, we keep generating until PIL can read it,
  which is a decent estimation of us not having corrupted it beyond being an image anymore.
  Depending on the settings you use, this may take a few tries.
  If False, it just flips some bits and gives you the result.
    
  @param validate_maxtries: if validating, how fast to give up
  (mostly to avoid indinite loop caused by corrupting too much)
*/

async function moshJpegData(jpegdata, typ = 3, qt = [2, 1], im = [15, 1], validate = false, validate_maxtries = 10) {
  /* 
  Takes bytes, and some parameters on how to corrupt those bytes.
    
  The corruption is based on
    - picking a byte position (random with some control),
    - flipping a random bit in that byte _howmanybits_ times.
    - and repeating that _howmanytimes_ times
      
  Yes, both can pick the same positions and end up not changing the data at all.
  No, this is not the most efficient way to do this. For my purposes, I don't care yet.
      
  @param skipfirst: basic construction to not touch the first bytes, to avoid headers at the start
      
  @param mask: if not null, should be a list of indices - we will work _only_ on those indices
  Note that if mask is set, it overrules skipfirstbytes.
      
  @return: a Buffer object of the same length, and _mostly_ with the same data, y'know.
*/

  let tries = validate_maxtries;
  while (tries > 0) {
    tries--;
    console.log(`Tries left: ${tries}`);
    const returnValue = [];

    for (const {marker, segmentData} of readStructure(jpegdata)) {
      if (marker === DQT) {
        // quant tables
        let mask = [];
        let index = 4; // skip past ff, marker, and length
        for (let _ = 0; _ < 4; _++) {
          index++;
          mask.push(...Array.from({length: 64}, (_, index_) => index + index_)); // current assumes 8-bit quant tables; TODO: fix
        }
        if (typ & 0x01) {
          const corrupted_segdata = flipbits(segmentData, qt[0], qt[1], 4);
          returnValue.push(corrupted_segdata);
        } else {
          returnValue.push(segmentData);
        }
      } else if (marker === SOS) {
        // SOS and image data
        if (typ & 0x02) {
          const corrupted_segdata = flipbits(segmentData, im[0], im[1], 20);
          returnValue.push(corrupted_segdata);
        } else {
          returnValue.push(segmentData);
        }
      } else if (marker >= 0xe1 && marker <= 0xef) {
        // strip APP1..15
        // Do nothing, skip these segments
      } else {
        // other chunk, pass through
        returnValue.push(segmentData);
      }
    }

    const retdata = Buffer.concat(returnValue);

    if (validate) {
      timesValidated++;
      try {
        // Use Jimp to validate if the image can still be opened
        await Jimp.read(retdata);
        if (timesValidated > 1) {
          process.stdout.write(`\n`);
        }
        return retdata;
      } catch {
        process.stdout.write(`Validation failed ${timesValidated > 1 ? `${timesValidated} times` : ""}, trying again${timesValidated === validate_maxtries ? "\n" : "\r"}`);
     
        continue; // Try again if validation fails
      }
    } else {
      return retdata;
    }
  }

  throw new Error(`Didn't get valid data after ${validate_maxtries} tries, you're probably asking for too much corruption.`);
}
export {moshJpegData, readStructure as read_structure};
