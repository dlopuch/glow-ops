var _ = require('lodash'),
    DevopsdConnection = require('./DevopsdConnection'),
    ls = require('./lightstrip');

var NUM_PIXELS = 32,
    TICK_INTERVAL = 33, // ~30 FPS

    HUE_BLUE = 0.7,
    HUE_ORANGE = 0.13,
    HUE_GREEN = 0.3;

var rainFactory = require('./rainFactory')(NUM_PIXELS - 6, TICK_INTERVAL, ls);
// num_pixels - 6 because 3 on left and 3 on right are reserved for status pixels

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
    });

blueRain.init();
greenRain.init();

var canvasHue = new Array(NUM_PIXELS),
    i = 0;

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


  // Middle pixels are the rain factories
  if (blue.isProcessUp && blue.isAcceptingRequests) {
    blueRain.tick();
  } else if (green.isProcessUp && green.isAcceptingRequests) {
    greenRain.tick();
  } else {
    for (i=0; i<NUM_PIXELS-6; i++) {
      ls.hsv(HUE_ORANGE, 1, 0.3);
    }
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

}, TICK_INTERVAL);


// TODO: Create drops
blue
.on('activity', function(level) {
  console.log('activity on blue: ' + level);
  blueRain.addDrop();
})
.on('error', function(error) {
  console.log('error on blue: ' + error);
});

green
.on('activity', function(level) {
  console.log('activity on green: ' + level);
  greenRain.addDrop();
})
.on('error', function(error) {
  console.log('error on green: ' + error);
});
