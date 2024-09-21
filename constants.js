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

export {
  SOI,
  APP0,
  APP1,
  APP2,
  APP3,
  APP4,
  APP5,
  APP6,
  APP7,
  APP8,
  APP9,
  APP10,
  APP11,
  APP12,
  APP13,
  APP14,
  APP15,
  SOF0,
  SOF2,
  SOF1,
  SOF9,
  HQT,
  DQT,
  SOS,
  EOI,
  COM,
};