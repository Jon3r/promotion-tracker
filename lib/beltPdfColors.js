/** RGB tuples for PDF sections: header bar, header text, name area background, name text */

export const BELT_PDF_COLORS = {
  white: {
    header: [245, 245, 245],
    headerText: [24, 24, 27],
    body: [250, 250, 250],
    bodyText: [24, 24, 27],
  },
  blue: {
    header: [37, 99, 235],
    headerText: [255, 255, 255],
    body: [239, 246, 255],
    bodyText: [30, 58, 138],
  },
  purple: {
    header: [126, 34, 206],
    headerText: [255, 255, 255],
    body: [250, 245, 255],
    bodyText: [88, 28, 135],
  },
  brown: {
    header: [120, 53, 15],
    headerText: [255, 255, 255],
    body: [255, 251, 235],
    bodyText: [69, 26, 3],
  },
  black: {
    header: [24, 24, 27],
    headerText: [255, 255, 255],
    body: [228, 228, 231],
    bodyText: [24, 24, 27],
  },
  grey: {
    header: [113, 113, 122],
    headerText: [255, 255, 255],
    body: [244, 244, 245],
    bodyText: [39, 39, 42],
  },
  greywhite: {
    header: [161, 161, 170],
    headerText: [255, 255, 255],
    body: [250, 250, 250],
    bodyText: [39, 39, 42],
  },
  greyblack: {
    header: [82, 82, 91],
    headerText: [255, 255, 255],
    body: [228, 228, 231],
    bodyText: [39, 39, 42],
  },
  yellow: {
    header: [234, 179, 8],
    headerText: [24, 24, 27],
    body: [254, 252, 232],
    bodyText: [113, 63, 18],
  },
  yellowwhite: {
    header: [250, 204, 21],
    headerText: [24, 24, 27],
    body: [254, 252, 232],
    bodyText: [113, 63, 18],
  },
  yellowblack: {
    header: [202, 138, 4],
    headerText: [255, 255, 255],
    body: [254, 249, 195],
    bodyText: [113, 63, 18],
  },
  orange: {
    header: [249, 115, 22],
    headerText: [255, 255, 255],
    body: [255, 247, 237],
    bodyText: [154, 52, 18],
  },
  orangewhite: {
    header: [251, 146, 60],
    headerText: [24, 24, 27],
    body: [255, 247, 237],
    bodyText: [154, 52, 18],
  },
  orangeblack: {
    header: [234, 88, 12],
    headerText: [255, 255, 255],
    body: [255, 237, 213],
    bodyText: [154, 52, 18],
  },
  green: {
    header: [22, 163, 74],
    headerText: [255, 255, 255],
    body: [240, 253, 244],
    bodyText: [20, 83, 45],
  },
  greenwhite: {
    header: [74, 222, 128],
    headerText: [24, 24, 27],
    body: [240, 253, 244],
    bodyText: [20, 83, 45],
  },
  greenblack: {
    header: [21, 128, 61],
    headerText: [255, 255, 255],
    body: [220, 252, 231],
    bodyText: [20, 83, 45],
  },
  unknown: {
    header: [248, 113, 113],
    headerText: [255, 255, 255],
    body: [254, 242, 242],
    bodyText: [127, 29, 29],
  },
};

/**
 * @param {string} belt
 */
export function getBeltPdfColors(belt) {
  return BELT_PDF_COLORS[belt] || BELT_PDF_COLORS.unknown;
}
