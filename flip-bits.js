
function flipbits(data, howManyTimes = 10, howManyBits = 2, skipFirstBytes = 0) {
    const retdata = Buffer.from(data);
    while (howManyTimes > 0) {
      const targetByte = Math.floor(
        Math.random() * (retdata.length - skipFirstBytes) + skipFirstBytes
      );
      for (let _ = 0; _ < howManyBits; _++) {
        const bitnum = Math.floor(Math.random() * 8);
        retdata[targetByte] ^= 1 << bitnum;
      }
      howManyTimes--;
    }
    return retdata;
  }
export default flipbits;