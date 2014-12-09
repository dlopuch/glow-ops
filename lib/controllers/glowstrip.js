var _ = require('lodash'),
    DevopsdConnection = require('./DevopsdConnection'),
    ls = require('./lightstrip');

var NUM_PIXELS = 32,
    NUM_DATA_PIXELS = NUM_PIXELS - 6, // because 3 on left and 3 on right are reserved for status pixels
    TICK_INTERVAL_MS = 33, // ~30 FPS

    HUE_BLUE = 0.7,
    HUE_ORANGE = 0.13,
    HUE_GREEN = 0.3;

var rainFactory = require('../patterns/rainFactory')(NUM_DATA_PIXELS, TICK_INTERVAL_MS, ls),
    Shimmer = require('../patterns/Shimmer')(NUM_DATA_PIXELS, TICK_INTERVAL_MS, ls);

var blue = new DevopsdConnection({port: 8321}),
    green = new DevopsdConnection({port: 8322}),

    blueRain = rainFactory({
      friendlyName: "Blue Pulse",
      baseAsBackground: true,
      baseHue: 0.7,
      hueVariance: 0.15,
      whiteDecay: 0
    }),
    greenRain = rainFactory({
      friendlyName: "Green Pulse",
      baseAsBackground: true,
      baseHue: 0.3,
      hueVariance: 0.15,
      whiteDecay: 0
    }),

    blueActive = true,
    isShimmerAsleep,
    colorToShimmer = HUE_ORANGE,
    shimmer = new Shimmer({
      initialPhase: 0,
      frequencySec: -1,
      wavelengthPx: NUM_DATA_PIXELS*3, // get a decently long hump relative to string length
      mapShimmerToLightstrip: function(ls, waveValue, pixelPhi) {
        // Shimmer only for the first 'hump' -- 0 through -PI.  Beyond that phase, just stay constant.
        if (-Math.PI < pixelPhi && pixelPhi < 0) {
          ls.hsv(colorToShimmer, 1, 0.3 + 0.2 * Math.abs(waveValue));
        } else {
          ls.hsv(colorToShimmer, 1, 0.3);
        }
      }
    });

// Wrap the shimmer pattern: the shimmer pattern is infrequent when it goes
shimmer.init();
isShimmerAsleep = false;
var tickShimmerI; //low-memory optimization
function tickShimmer() {
  // If shimmer is sleeping, just show constant pixels
  if (isShimmerAsleep) {
    for (tickShimmerI = 0; tickShimmerI<NUM_DATA_PIXELS; tickShimmerI++) {
      ls.hsv(colorToShimmer, 1, 0.3); // magic value warning: 0.3 is same value as rainFactory does by default
    }
    return;
  }

  // Otherwise, do your magic, Shimmer!
  shimmer.tick();

  // After 1/4 wavelength, sleep for 2-7 seconds
  if (shimmer.phase < -5 * Math.PI) { // (remember we have a -frequency, so phase decreases)
    isShimmerAsleep = true;
    shimmer.init();
    setTimeout(function() {
      isShimmerAsleep = false;
    }, 2000 + 5000 * Math.random());
  }
}

blueRain.init();
greenRain.init();

var canvasHue = new Array(NUM_PIXELS),
    i = 0,
    anyActivity = false;

setInterval(function tick() {

  // reset all hues
  for (i = 0; i<NUM_PIXELS; i++) {
    canvasHue[i] = null;
  }

  ls.next();

  // Blue is left three pixels:
  if (blue.isProcessUp) {
    ls.hsv(HUE_BLUE, 1,1);
    ls.hsv(blue.isAcceptingRequests ? HUE_BLUE : HUE_ORANGE, 1,1);
  } else {
    ls.hsv(HUE_BLUE, 0,0);
    ls.hsv(HUE_BLUE, 0,0);
  }
  ls.hsv(HUE_BLUE, 0,0); // 3rd pixel reserved, spacer


  // Middle pixels are the rain factories, or if nothing going on, an occasional shimmer.

  // First, see who is active
  if (blue.isProcessUp && blue.isAcceptingRequests) {
    blueActive = true;
    colorToShimmer = HUE_BLUE;
    anyActivity = !!Object.keys(blueRain._drops).length;

  } else if (green.isProcessUp && green.isAcceptingRequests) {
    blueActive = false;
    colorToShimmer = HUE_GREEN;
    anyActivity = !!Object.keys(greenRain._drops).length;

  } else {
    blueActive = null;
    colorToShimmer = HUE_ORANGE;
    anyActivity = false;
  }

  if (!anyActivity) {
    tickShimmer();
  } else if (blueActive) {
    blueRain.tick();
  } else {
    greenRain.tick();
  }


  // Green is right three pixels:
  ls.hsv(HUE_GREEN, 0, 0); // 3rd pixel reserved, spacer
  if (green.isProcessUp) {
    ls.hsv(green.isAcceptingRequests ? HUE_GREEN : HUE_ORANGE, 1,1);
    ls.hsv(HUE_GREEN, 1,1);
  } else {
    ls.hsv(HUE_GREEN, 0,0);
    ls.hsv(HUE_GREEN, 0,0);
  }

}, TICK_INTERVAL_MS);


blue
.on('activity', function(level) {
  console.log('activity on blue: ' + level);
  blueRain.addDrop();
})
.on('error', function(error) {
  console.log('error on blue: ' + error);
  // TODO Strobe red
});

green
.on('activity', function(level) {
  console.log('activity on green: ' + level);
  greenRain.addDrop();
})
.on('error', function(error) {
  console.log('error on green: ' + error);
  // TODO: Strobe red
});
