#!/usr/bin/env node
/*
    read_structure() parses a relatively simple JPEG file into its constituent segments.
    - ...which is less than you were probably looking for.
    - (it originated in somthing even simpler, verying that the mars rover images were indeed an unusual JPEG flavour)

    mosh_jpeg_data() takes the segments from read_structure() and corrupts a few of them


    Pure Node, meaning it won't be the fastest out there.

    Some interesting reading:
    - https://helpful.knobs-dials.com/index.php/Image_file_format_notes#Notes_on_JPEG_file_structure
    - http://www.opennet.ru/docs/formats/jpeg.txt
    - http://www.tex.ac.uk/ctan/support/jpeg2ps/readjpeg.c
    - https://svn.xiph.org/experimental/giles/jpegdump.c
    - http://fotoforensics.com/tutorial-estq.php  'estimating quality based on quantization tables"
    - http://en.wikibooks.org/wiki/JPEG_-_Idea_and_Practice/The_header_part
    - http://www.digitalpreservation.gov/formats/fdd/fdd000017.shtml
    - https://web.archive.org/web/20240406182506/https://koushtav.me/jpeg/tutorial/2017/11/25/lets-write-a-simple-jpeg-library-part-1/

*/

// Import necessary modules
import fs from 'node:fs'; // For file system operations

import {Jimp} from 'jimp'; // Image processing library for checking if the corrupted image can still be opened

// Define JPEG marker constants
const SOI = 0xd8; // Start of Image
const APP0 = 0xe0; // Application-specific
const APP1 = 0xe1; // Application-specific
const APP2 = 0xe2; // Application-specific
const APP3 = 0xe3; // Application-specific
const APP4 = 0xe4; // Application-specific
const APP5 = 0xe5; // Application-specific
const APP6 = 0xe6; // Application-specific
const APP7 = 0xe7; // Application-specific
const APP8 = 0xe8;
const APP9 = 0xe9;
const APP10 = 0xea;
const APP11 = 0xeb;
const APP12 = 0xec;
const APP13 = 0xed;
const APP14 = 0xee;
const APP15 = 0xef;
const SOF0 = 0xc0; // Start of Frame (baseline DCT)
const SOF2 = 0xc2; // Start of Frame (progressive DCT)
const SOF1 = 0xc1; // Start of Frame (extended sequential DCT)
const SOF9 = 0xc9; // Start of Frame (extended sequential DCT)
const HQT = 0xc4; // Huffman table
const DQT = 0xdb; // Quantization table
const SOS = 0xda; // Start of Scan
const EOI = 0xd9; // End of Image
const COM = 0xfe; // Comment

// Helper function to convert a byte to a hexadecimal string in the format '0x00'
const byteToHex = byte => byte.toString(16).padStart(2, '0');

/*
    Given a jpeg file contents as a bytes object, splits it into its constituent segments.
    You wouldn't call this a parser - it does little to no interpretation of what those segments mean.

    @param jpeg_data: the file as a Buffer object
    @param debug: whether to spit out debug stuff on stdout
    @return: a generator that yields 4-tuples:
      - the segment's marker byte (~= its 'type')
      - a readable description
      - segment size
      - segment data
*/
function* read_structure(jpeg_data, debug = false) {
  let index = 0;
  const dsize = jpeg_data.length;

  while (index < jpeg_data.length) {
    if (debug) {
      console.log(`now at bytepos ${index} of ${dsize}`);
    }

    if (jpeg_data[index] !== 0xff) {
      if (debug) {
        console.log(`segment didn't start with 0xff, we probably mis-parsed (next bytes are ${jpeg_data.slice(index, index + 8)})`);
        console.log('');
      }
      break;
    }

    const ma = jpeg_data[index + 1]; // marker byte for segment
    let descr;
    let moveon;
    let segdata;

    if (debug) {
      console.log(`marker byte  [${byteToHex(ma)}]`);
    }

    if (ma === SOI) {
      descr = 'Start Of Image';
      moveon = 2;
    } else if (ma === EOI) {
      descr = 'End Of Image';
      moveon = 2;
    } else if (ma === 0xd0) {
      descr = 'restart 0';
      moveon = 2;
    } else if (ma === 0xd1) {
      descr = 'restart 1';
      moveon = 2;
    } else if (ma === 0xd2) {
      descr = 'restart 2';
      moveon = 2;
    } else if (ma === 0xd3) {
      descr = 'restart 3';
      moveon = 2;
    } else if (ma === 0xd4) {
      descr = 'restart 4';
      moveon = 2;
    } else if (ma === 0xd5) {
      descr = 'restart 5';
      moveon = 2;
    } else if (ma === 0xd6) {
      descr = 'restart 6';
      moveon = 2;
    } else if (ma === 0xd7) {
      descr = 'restart 7';
      moveon = 2;
    } else if (ma >= 0x30 && ma <= 0x3f) {
      descr = 'reserved JP2';
      moveon = 2;
    } else if (ma === 0xdd) {
      descr = 'restart interval';
      moveon = 6;
    } else if (ma === SOS) {
      // Start of Scan
      descr = 'start of scan';

      const datasize = (jpeg_data[index + 2] << 8) + jpeg_data[index + 3];
      if (debug) {
        console.log(`SOS header size: ${datasize}`);
      }
      const number_components = jpeg_data[index + 4];

      if (debug) {
        console.log(`Components in scan: ${number_components}`);
      }
      for (let ci = 0; ci < number_components; ci++) {
        if (debug) {
          console.log(`Component ${ci + 1} of ${number_components}`);
        }
        const cid = jpeg_data[index + 4 + 2 * ci];
        if (debug) {
          process.stdout.write('Channel');
          if (cid === 1) {
            console.log('Y ');
          } else if (cid === 2) {
            console.log('Cb');
          } else if (cid === 3) {
            console.log('Cr');
          } else if (cid === 4) {
            console.log('I ');
          } else if (cid === 5) {
            console.log('Q ');
          } else {
            console.log(cid);
          }
        }
        const htab = jpeg_data[index + 4 + 2 * ci + 1];
        const htab_ac = (htab & 0xf0) >> 4;
        const htab_dc = htab & 0x0f;
        if (debug) {
          console.log(`Huffman table  AC:<span class="math-inline">\{htab\_ac\.toString\(16\)\}  DC\:</span>{htab_dc.toString(16)}`);
        }
      }

      // HACK: just look assume this section ends with an EOI
      if (jpeg_data.slice(-2).equals(Buffer.from([0xff, 0xd9]))) {
        segdata = jpeg_data.slice(index, -2);
        moveon = jpeg_data.length - index - 2;
      } else {
        // or sometimes no EOI. Joy.
        segdata = jpeg_data.slice(index);
        moveon = jpeg_data.length - index;
      }
    } else {
      // assume it's one that codes its length
      if (ma === COM) {
        descr = 'comment';
      } else if (ma >= APP0 && ma <= APP15) {
        const nullIndex = jpeg_data.indexOf(0x00, index + 5);
        descr = `APP${ma - 0xe0} ${jpeg_data.slice(index + 4, nullIndex).toString()}`;
      } else if (ma === HQT) {
        descr = 'huffman tables';
      } else if (ma === DQT) {
        descr = 'quantization tables';
      } else if (ma === SOF0) {
        descr = 'start of frame, baseline sequential, huffman';
      } else if (ma === SOF2) {
        descr = 'start of frame, progressive, huffman';
      } else if (ma === SOF1) {
        descr = 'start of frame, extended sequential, huffman';
      } else if (ma === SOF9) {
        descr = 'start of frame, extended sequential, arithmetic';
      } else if (ma === 0xc3) {
        descr = '(start of frame? -) lossless';
      } else if (ma === 0xc5) {
        descr = '(start of frame? -) differential sequential DCI';
      } else if (ma === 0xc6) {
        descr = '(start of frame? -) differential progressive DCI';
      } else if (ma === 0xc7) {
        descr = '(start of frame? -) differential lossless';
      } else if (ma === 0xc8) {
        descr = 'JPEG extensions';
      } else if (ma === 0xca) {
        descr = '(start of frame? -) extended progressive DCT';
      } else if (ma === 0xcb) {
        descr = '(start of frame? -) extended lossless';
      } else if (ma === 0xcc) {
        descr = 'arithmetic conditioning table';
      } else if (ma >= 0xf0 && ma <= 0xf6) {
        descr = 'JPEG extensions, ITU T.84/IEC 10918-3';
      } else if (ma === 0xf7) {
        descr = 'JPEG LS - SOF48';
      } else if (ma === 0xf8) {
        descr = 'JPEG LS - LSE';
      } else if (ma >= 0xf9 && ma <= 0xf_fd) {
        descr = 'JPEG extensions, ITU T.84/IEC 10918-3';
      } else if (ma >= 0x4f && ma <= 0x6f) {
        descr = 'JPEG extensions, JPEG2000?';
      } else if (ma >= 0x90 && ma <= 0x93) {
        descr = 'JPEG extensions, JPEG2000?';
      } else if (ma === 0x51) {
        descr = 'JPEG extensions, JPEG2000?, image and tile size';
      } else if (ma === 0x52) {
        descr = 'JPEG extensions, JPEG2000?, coding style default';
      } else if (ma === 0x53) {
        descr = 'JPEG extensions, JPEG2000?, coding style component';
      } else if (ma === 0x5e) {
        descr = 'JPEG extensions, JPEG2000?, region of interest';
      } else if (ma === 0x5c) {
        descr = 'JPEG extensions, JPEG2000?, quantization default';
      } else if (ma === 0x5d) {
        descr = 'JPEG extensions, JPEG2000?, quantization component';
      } else if (ma === 0x5f) {
        descr = 'JPEG extensions, JPEG2000?, progression order change';
      } else if (ma === 0x55) {
        descr = 'JPEG extensions, JPEG2000?, tile-part lengths';
      } else if (ma === 0x57) {
        descr = 'JPEG extensions, JPEG2000?, packet length (main header)';
      } else if (ma === 0x58) {
        descr = 'JPEG extensions, JPEG2000?, packet length (tile-part header)';
      } else if (ma === 0x60) {
        descr = 'JPEG extensions, JPEG2000?, packed packet headers (main header)';
      } else if (ma === 0x61) {
        descr = 'JPEG extensions, JPEG2000?, packet packet headers (tile-part header)';
      } else if (ma === 0x91) {
        descr = 'JPEG extensions, JPEG2000?, start of packet';
      } else if (ma === 0x92) {
        descr = 'JPEG extensions, JPEG2000?, end of packet header';
      } else if (ma === 0x63) {
        descr = 'JPEG extensions, JPEG2000?, component reg';
      } else if (ma === 0x64) {
        descr = 'JPEG extensions, JPEG2000?, comment';
      } else if (ma === 0xfd) {
        descr = 'reserved for JPEG extensions';
      } else if (ma === SOS) {
        descr = 'SOS Start Of Scan';
      } else {
        descr = 'unknown marker';
      }

      const datasize = (jpeg_data[index + 2] << 8) + jpeg_data[index + 3];
      segdata = jpeg_data.slice(index + 4, index + 2 + datasize);
      moveon = datasize + 2;
    }

    if (debug) {
      console.log(`Chunk size:2+${(moveon - 2).toString().padStart(3)}   type:${ma.toString(16).padStart(2, '0')}  ${descr.padEnd(30)}`);
    }

    // Selective parsing of contents
    if (debug) {
      if (ma === 0xe0) {
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
            unitsDesc = `unknown (${units})`;
          }
          console.log(`Version:    ${segdata[5]}.${segdata[6].toString().padStart(2, '0')}`);
          console.log(`Units:${unitsDesc}`);
          console.log(`Xdensity:   ${(segdata[8] << 8) + segdata[9]}`);
          console.log(`Ydensity:   ${(segdata[10] << 8) + segdata[11]}`);
          console.log(`XThumbnail: ${segdata[12]}`);
          console.log(`YThumbnail: ${segdata[13]}`);
        } else {
          console.log(`Don't know APP0 identifier ${segdata.slice(0, 5)}, skipping`);
        }
      }

      if (ma === SOF0) {
        // start of frame, baseline
        const data_precision = segdata[0];
        const h = (segdata[1] << 8) + segdata[2];
        const w = (segdata[3] << 8) + segdata[4];
        const comps = segdata[5];
        console.log(`Image is ${w} by ${h} px,  ${comps}-channel,  ${data_precision} bits per channel`);
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
          console.log(`hsfac:${(sampfac & 0xf0) >> 4} vsfac:${sampfac & 0x0f}  qtnum:${qtnum}`);
        }
      }

      if (ma === 0xfe) {
        console.log(`${segdata.toString()}`);
      }
    }

    segdata = jpeg_data.slice(index, index + moveon);
    index += moveon;
    yield [ma, descr, moveon, segdata];
  }
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
  function flipbits(data, howmanytimes = 10, howmanybits = 2, skipfirstbytes = 0, mask = null) {
    const retdata = Buffer.from(data); // Create a copy of the data

    if (mask) {
      mask = mask.filter(index => index > skipfirstbytes && index < data.length);
    }

    while (howmanytimes > 0) {
      const targetbyte = mask ? mask[Math.floor(Math.random() * mask.length)] : Math.floor(Math.random() * (data.length - skipfirstbytes)) + skipfirstbytes;

      for (let _ = 0; _ < howmanybits; _++) {
        const bitnum = Math.floor(Math.random() * 8);
        retdata[targetbyte] ^= 2 ** bitnum;
      }
      howmanytimes--;
    }
    return retdata;
  }

  let tries = validate_maxtries;
  while (tries > 0) {
    tries--;
    const returnValue = [];

    for (const [marker, _descr, _moveon, segdata] of read_structure(jpegdata)) {
      if (marker === DQT) {
        // quant tables
        const mask = [];
        let index = 4; // skip past ff, marker, and length
        for (let _ = 0; _ < 4; _++) {
          index++;
          mask.push(...Array.from({length: 64}, (_, index_) => index + index_)); // current assumes 8-bit quant tables; TODO: fix
        }
        if (typ & 0x01) {
          const corrupted_segdata = flipbits(segdata, qt[0], qt[1], 4);
          returnValue.push(corrupted_segdata);
        } else {
          returnValue.push(segdata);
        }
      } else if (marker === SOS) {
        // SOS and image data
        if (typ & 0x02) {
          const corrupted_segdata = flipbits(segdata, im[0], im[1], 20);
          returnValue.push(corrupted_segdata);
        } else {
          returnValue.push(segdata);
        }
      } else if (marker >= 0xe1 && marker <= 0xef) {
        // strip APP1..15
        // Do nothing, skip these segments
      } else {
        // other chunk, pass through
        returnValue.push(segdata);
      }
    }

    const retdata = Buffer.concat(returnValue);

    if (validate) {
      try {
        // Use Jimp to validate if the image can still be opened
        await Jimp.read(retdata);
        return retdata;
      } catch {
        debug && console.log('Validation failed, trying again');
        continue; // Try again if validation fails
      }
    } else {
      return retdata;
    }
  }

  throw new Error(`Didn't get valid data after ${validate_maxtries} tries, you're probably asking for too much corruption.`);
}
export {moshJpegData, read_structure};
