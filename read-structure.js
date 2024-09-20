import {Buffer} from 'buffer';

import {SOI, EOI, SOS, COM, HQT, DQT, SOF0, SOF2, SOF1, SOF9, APP0, APP15} from './constants.js';

const markerDescriptions = {
  [COM]: 'comment',
  [HQT]: 'huffman tables',
  [DQT]: 'quantization tables',
  [SOF0]: 'start of frame, baseline sequential, huffman',
  [SOF2]: 'start of frame, progressive, huffman',
  [SOF1]: 'start of frame, extended sequential, huffman',
  [SOF9]: 'start of frame, extended sequential, arithmetic',
  0xc3: '(start of frame? -) lossless',
  0xc5: '(start of frame? -) differential sequential DCI',
  0xc6: '(start of frame? -) differential progressive DCI',
  0xc7: '(start of frame? -) differential lossless',
  0xc8: 'JPEG extensions',
  0xca: '(start of frame? -) extended progressive DCT',
  0xcb: '(start of frame? -) extended lossless',
  0xcc: 'arithmetic conditioning table',
  0xf7: 'JPEG LS - SOF48',
  0xf8: 'JPEG LS - LSE',
  0xfd: 'reserved for JPEG extensions',
  [SOS]: 'SOS Start Of Scan',
  0x51: 'JPEG extensions, JPEG2000?, image and tile size',
  0x52: 'JPEG extensions, JPEG2000?, coding style default',
  0x53: 'JPEG extensions, JPEG2000?, coding style component',
  0x5e: 'JPEG extensions, JPEG2000?, region of interest',
  0x5c: 'JPEG extensions, JPEG2000?, quantization default',
  0x5d: 'JPEG extensions, JPEG2000?, quantization component',
  0x5f: 'JPEG extensions, JPEG2000?, progression order change',
  0x55: 'JPEG extensions, JPEG2000?, tile-part lengths',
  0x57: 'JPEG extensions, JPEG2000?, packet length (main header)',
  0x58: 'JPEG extensions, JPEG2000?, packet length (tile-part header)',
  0x60: 'JPEG extensions, JPEG2000?, packed packet headers (main header)',
  0x61: 'JPEG extensions, JPEG2000?, packed packet headers (tile-part header)',
  0x91: 'JPEG extensions, JPEG2000?, start of packet',
  0x92: 'JPEG extensions, JPEG2000?, end of packet header',
  0x63: 'JPEG extensions, JPEG2000?, component reg',
  0x64: 'JPEG extensions, JPEG2000?, comment',
};

function getMarkerDescription(markerByte, jpegData, i) {
  let description = markerDescriptions[markerByte];

  if (!description) {
    // Handle APP0-APP15 range
    if (markerByte >= APP0 && markerByte <= APP15) {
      description = `APP${markerByte - APP0} ${jpegData.toString('ascii', i + 4, jpegData.indexOf(0x00, i + 5))}`;
    }
    // Handle JPEG 2000 marker ranges
    else if (markerByte >= 0x4f && markerByte <= 0x6f) {
      description = 'JPEG extensions, JPEG2000?';
    } else if (markerByte >= 0x90 && markerByte <= 0x93) {
      description = 'JPEG extensions, JPEG2000?';
    } else if (markerByte >= 0xf0 && markerByte <= 0xf6) {
      description = 'JPEG extensions, ITU T.84/IEC 10918-3';
    } else if (markerByte >= 0xf9 && markerByte <= 0xffd) {
      description = 'JPEG extensions, ITU T.84/IEC 10918-3';
    } else {
      description = 'unknown marker';
    }
  }

  return description;
}
const byteToString = byte => {
  return `0x${byte.toString(16).padStart(2, '0')}`;
};

async function* readStructure(jpegData, debug = false) {
  let i = 0;
  const dsize = jpegData.length;

  while (i < dsize) {
    if (debug) {
      console.log(`now at bytepos ${i} of ${dsize}`);
    }

    if (jpegData[i] !== 0xff) {
      if (debug) {
        console.log(`segment didn't start with 0xff, we probably mis-parsed (next bytes are ${jpegData.slice(i, i + 8).toString('hex')})`);
      }
      break;
    }

    const markerByte = jpegData[i + 1]; // marker byte
    let description = '';
    let moveOn = 0;
    let segmentData = null;

    if (debug) {
      console.log(`marker byte  [${byteToString(markerByte)}]`);
    }

    if (markerByte === SOI) {
      description = 'Start Of Image';
      moveOn = 2;
      segmentData = Buffer.from(jpegData[i + 1])
    } else if (markerByte === EOI) {
      description = 'End Of Image';
      moveOn = 2;
      segmentData = Buffer.from(jpegData[i + 1])
    } else if (markerByte >= 0xd0 && markerByte <= 0xd7) {
      description = `restart ${markerByte - 0xd0}`;
      moveOn = 2;
    } else if (markerByte >= 0x30 && markerByte <= 0x3f) {
      description = 'reserved JP2';
      moveOn = 2;
    } else if (markerByte === 0xdd) {
      description = 'restart interval';
      moveOn = 6;
    } else if (markerByte === SOS) {
      description = 'start of scan';
      const datasize = (jpegData[i + 2] << 8) + jpegData[i + 3];
      if (debug) {
        console.log(`SOS header size: ${datasize}`);
      }
      const num_components = jpegData[i + 4];
      if (debug) {
        console.log(`Components in scan: ${num_components}`);
      }
      for (let ci = 0; ci < num_components; ci++) {
        if (debug) {
          console.log(`Component ${ci + 1} of ${num_components}`);
        }
        const cid = jpegData[i + 4 + 2 * ci];
        if (debug) {
          let channel = '';
          if (cid === 1) channel = 'Y ';
          else if (cid === 2) channel = 'Cb';
          else if (cid === 3) channel = 'Cr';
          else if (cid === 4) channel = 'I ';
          else if (cid === 5) channel = 'Q ';
          else channel = cid;
          console.log(` Channel: ${channel}`);
        }
        const htab = jpegData[i + 4 + 2 * ci + 1];
        const htab_ac = (htab & 0xf0) >> 4;
        const htab_dc = htab & 0x0f;
        if (debug) {
          console.log(`Huffman table  AC:${htab_ac.toString(16)}  DC:${htab_dc.toString(16)}`);
        }
      }

      if (jpegData.slice(-2).equals(Buffer.from([0xff, 0xd9]))) {
        segmentData = jpegData.slice(i, -2);
        moveOn = dsize - i - 2;
      } else {
        segmentData = jpegData.slice(i);
        moveOn = dsize - i;
      }
      console.log(`SOS data size: ${segmentData.length}`);
    } else {
      let markerLength = 0;

      description = getMarkerDescription(markerByte, jpegData, i);

      markerLength = (jpegData[i + 2] << 8) + jpegData[i + 3];
      segmentData = jpegData.slice(i + 4, i + 2 + markerLength);
      moveOn = markerLength + 2;
    }

    if (debug) {
      if (description === 'unknown marker' || description === '') {
        console.log(`unknown marker: ${byteToString(markerByte)}`);
      }
      console.log(`Chunk size: 2+${moveOn - 2} type:${byteToString(markerByte)} ${description}`);
    }

    if (markerByte === SOF0 && debug) {
      const data_precision = segmentData[0];
      const h = (segmentData[1] << 8) + segmentData[2];
      const w = (segmentData[3] << 8) + segmentData[4];
      const comps = segmentData[5];
      console.log(`Image is ${w} by ${h} px, ${comps}-channel, ${data_precision} bits per channel`);
      for (let ci = 0; ci < comps; ci++) {
        const cid = segmentData[6 + ci * 3 + 0];
        const sampfac = segmentData[6 + ci * 3 + 1];
        const qtnum = segmentData[6 + ci * 3 + 2];
        console.log(`Component ${cid} hsfac:${(sampfac & 0xf0) >> 4} vsfac:${sampfac & 0x0f} qtnum:${qtnum}`);
      }
    }

    yield {prettyMarker:byteToString(markerByte), marker: markerByte, description: description, size: moveOn, data: segmentData};

    i += moveOn;
  }
}

export default readStructure;
