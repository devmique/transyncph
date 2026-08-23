/* Geometry for the landing hero map, in a 640×400 viewBox.
 *
 * The coastline, islands, lake and river are generated rather than drawn by
 * hand: a base curve sampled at ~120 points, each offset along its normal by
 * a sum of sine octaves. Hand-drawn beziers always came out as smooth blobs;
 * the octaves are what give a coast headlands and inlets at more than one
 * scale, which is what makes the eye read "map" instead of "shape".
 *
 * Generated once and pasted here. There is no runtime cost — these are string
 * constants, and the whole plate is static SVG. */

/** Sea. The coast enters at the right edge and leaves at the bottom, so the
 *  land runs off the frame — a viewport onto somewhere larger, not an island
 *  floating in the middle of a card. */
export const SEA =
  'M 648 58 L 642 56.6 L 636.1 55.5 L 630.5 54.9 L 626 55.8 L 623.4 59.1 L 622.2 63.8 L 621.3 68.8 L 618.8 71.9 L 615.5 74 L 612 75.8 L 607.8 77.1 L 602.7 77.4 L 597.1 77.4 L 592.6 78.5 L 590.2 81.5 L 589.2 85.9 L 588 89.9 L 585.6 92.9 L 582.5 95.2 L 580.3 98.3 L 579.7 102.6 L 579.8 107.5 L 579.5 112 L 578.6 115.9 L 577.7 119.8 L 577.2 123.9 L 576.1 127.6 L 573.2 129.9 L 568.7 131.1 L 564.4 132.5 L 562.1 135.3 L 562.1 139.7 L 562.7 144.6 L 562.4 148.7 L 560.7 151.9 L 558.7 154.9 L 556.8 158 L 554.4 160.7 L 550.6 162.6 L 545.9 163.9 L 541.8 165.6 L 539.3 168.3 L 537.7 171.7 L 535.4 174.5 L 531.4 176.3 L 527 177.8 L 524.1 180.4 L 523.8 184.6 L 525.4 190 L 527.4 195.9 L 529.6 201.8 L 532.5 208.3 L 536.1 215.3 L 538.9 222 L 539.7 227.2 L 538.1 230.9 L 535.9 234.3 L 534.8 238.4 L 535.2 243.7 L 535.5 249 L 534.4 253.3 L 532 256.8 L 529.4 260.1 L 527.4 264 L 525.5 268 L 523 271.5 L 519.9 274.7 L 517.5 278.4 L 516.3 283.2 L 515.3 288.3 L 512.6 292 L 507.5 293.7 L 500.8 293.9 L 494.5 294.4 L 489.6 296.1 L 485.6 298.7 L 481.7 301.5 L 477.9 304.4 L 474.9 308 L 472.8 312.8 L 470.6 317.6 L 467.2 321.2 L 462.3 323.2 L 457.1 324.9 L 452.8 327.6 L 449.3 331.3 L 445.2 334.5 L 439.3 335.5 L 431.8 334.4 L 423.7 332.5 L 415.8 330.7 L 408.1 329 L 400.1 326.9 L 392.3 324.8 L 385.7 324.3 L 380.7 326.3 L 376.6 329.7 L 372.1 332.5 L 366.3 333.5 L 359.7 333.3 L 353.6 333.9 L 348.4 336 L 343.6 339 L 338.5 341.6 L 333.1 343.8 L 327.9 346.6 L 323.2 350.5 L 318.5 354.7 L 313.1 357.9 L 307.2 360.1 L 301.5 363 L 296.8 368.5 L 294.3 379 L 290.9 388.3 L 286.2 394.9 L 280.4 399.7 L 274.3 403.8 L 268 408 L 648 408 Z'

export const ISLANDS = [
  'M 585.6 322 L 583.3 324.9 L 581.5 327.7 L 577.2 329.6 L 573.1 331 L 570.9 333.4 L 567.5 335.3 L 562.2 334.6 L 557.9 334 L 553.8 336 L 548.2 337.9 L 542.6 337.6 L 537.1 336.4 L 532.3 334.5 L 532.1 330.5 L 536 326.5 L 536.8 324.1 L 533.6 322 L 532.2 319.4 L 533 316.9 L 533 313.8 L 534.6 310.8 L 539.6 309.4 L 544.3 308.4 L 548 305.7 L 553.1 304.1 L 558.6 306.1 L 562.4 309.1 L 565.7 310.7 L 568.5 312.5 L 570.7 314.2 L 576.3 314.7 L 584.4 315.6 L 587.9 318.6 Z',
  'M 467.1 372 L 467 373.6 L 464.9 374.8 L 462.2 375.6 L 462.1 377.2 L 462.6 379.9 L 460.7 381.8 L 457.3 382.4 L 453.7 382.6 L 450.4 381.9 L 448.1 379.8 L 446.5 378.3 L 443.6 378.3 L 440.4 377.9 L 439.2 376.5 L 438.2 375 L 436.1 373.7 L 435.1 372 L 435.5 370.3 L 435 368.3 L 435 366.1 L 438.5 365.1 L 443.3 365.5 L 446.4 365.7 L 448.5 365.1 L 450.8 364.7 L 453.3 364 L 456.8 362.4 L 460.7 362.1 L 462.9 363.9 L 464.1 365.8 L 466.4 367 L 468 368.5 L 467.6 370.4 Z',
]

/** Sits in the western lowland, well clear of the network. */
export const LAKE =
  'M 162.7 250 L 161.5 253 L 157 255.4 L 153.9 257.8 L 151.9 260.6 L 146.4 261.8 L 139.7 261.4 L 135.5 262.8 L 131.2 266.5 L 124.5 268.6 L 117.3 268.3 L 110 267.5 L 104.8 264.9 L 105 260.1 L 106.7 256.4 L 103.1 254.7 L 97.8 252.7 L 96.7 250 L 96.7 247.2 L 95.4 243.9 L 97.8 240.9 L 103.2 239 L 106.7 236.3 L 110.3 232.7 L 117.5 232.1 L 125.1 234.7 L 130.5 236.7 L 135.3 237.5 L 139.5 238.8 L 144.5 239.4 L 153.8 238.6 L 162.8 239.5 L 164.6 243.1 L 162.7 246.9 Z'

/** Runs from the northern uplands to a mouth on the coast. Kept north of the
 *  network — a river and a bus route drawn near each other read as the same
 *  kind of line, and the reader should never have to work that out. */
export const RIVER =
  'M 148 26 L 155.8 29.3 L 164.3 31 L 171.7 34.2 L 177.8 39.8 L 184 45.2 L 191 48.7 L 199.9 47.7 L 207.6 48.9 L 215 50.9 L 222.9 50.6 L 229.9 53.1 L 236.8 56 L 243.3 60.6 L 250.4 63.2 L 258.4 61.5 L 265.5 63.6 L 272.5 66.8 L 279.5 69.8 L 286.8 71.5 L 294.7 69.7 L 302.2 70 L 310 67.4 L 318.2 61.8 L 325.9 59.8 L 333.4 60.2 L 340.4 65.7 L 347.6 70 L 355.1 71.6 L 362.3 76.7 L 369.6 80.2 L 377.1 83.6 L 384.5 86.5 L 392 89.5 L 399 96.8 L 406.4 99.9 L 414.1 99.7 L 421.8 100.3 L 429.4 101.4 L 436.5 106.4 L 443.8 109.8 L 450.9 113.6 L 457.5 120.4 L 464.6 123.4 L 472.3 123.7 L 480.8 120.3 L 489.5 117.3 L 497.3 118.5 L 505.9 116.9 L 514.7 115.5 L 523.4 115 L 532.4 114.6 L 540.7 116.4 L 549.4 117.5 L 557.1 121.4 L 564.3 126.8 L 572 131'

/* Roads bend. Each line changes its mind a few times on the way across, the
   way a highway does, instead of arcing cleanly from A to B. */
export const CORRIDOR =
  'M150 96 C 174 126 154 150 178 168 C 206 189 236 170 258 184 C 276 195 286 190 300 200 ' +
  'C 328 220 322 244 348 254 C 376 265 388 248 416 252 C 446 256 456 272 480 276'
export const FEEDER =
  'M168 330 C 198 322 190 296 210 280 C 232 262 232 248 250 238 C 268 228 288 216 300 200'
export const SPUR =
  'M300 200 C 314 228 300 254 318 272 C 336 289 340 306 366 316'
