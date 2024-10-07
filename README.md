# node-jpeg-mosher
![](./art.jpeg)
Pure JS CLI that mildly corrupts JPEGs for a moshing-like effect; e.g. introduces creative distortions into the image data.

All Credit goes to [knobs-dials](https://github.com/knobs-dials), who wrote the original in python ([https://github.com/knobs-dials/jpeg-mosh/](https://github.com/knobs-dials/jpeg-mosh/)), and did a lot of interesting research. It's available live at [https://mosh.scarfboy.com/](https://github.com/knobs-dials/jpeg-mosh/).

The test.jpg is from https://commons.wikimedia.org/wiki/File:Jpeg_thumb_artifacts_test.jpg

## Requirements

- Node.js v14+ (uses native ES modules and promises)
- The ability to tolerate bad software

## Installation

1. Clone this repository or download the script.
2. Run `npm install` to install the necessary dependencies.

## Usage

### Options

- `--output`, `-o`: Path to save the moshed JPEG file. (Default: `moshed_image.jpg`)
- `--number`, `-n`: Number of files to mosh. (Default: `1`)
- `--iterations`, `-i`: Number of iterations to run the moshing process. (Default: `3`)

### Example

Mosh multiple JPEG files:

```bash
node index.js input.jpg -n 3 -o moshed_output.jpg
```

This command applies the mosh effect to the `input.jpg` file, saves the output as `moshed_output.jpg`, and processes the image three times (`moshed_output-1.jpg, ...`). The original file is not modified.

### Notes

    Some interesting reading:
    - https://helpful.knobs-dials.com/index.php/Image_file_format_notes#Notes_on_JPEG_file_structure
    - http://www.opennet.ru/docs/formats/jpeg.txt
    - http://www.tex.ac.uk/ctan/support/jpeg2ps/readjpeg.c
    - https://svn.xiph.org/experimental/giles/jpegdump.c
    - http://fotoforensics.com/tutorial-estq.php  'estimating quality based on quantization tables"
    - http://en.wikibooks.org/wiki/JPEG_-_Idea_and_Practice/The_header_part
    - http://www.digitalpreservation.gov/formats/fdd/fdd000017.shtml
    - https://web.archive.org/web/20240406182506/https://koushtav.me/jpeg/tutorial/2017/11/25/lets-write-a-simple-jpeg-library-part-1/


