var _ = require('lodash'),
    DevopsdConnection = require('./DevopsdConnection'),
    ls = require('./lightstrip');

var NUM_PIXELS = 32,
    TICK_INTERVAL = 1000, //33; // ~30 FPS

    HUE_BLUE = 0.7,
    HUE_ORANGE = 0.13,
    HUE_GREEN = 0.3;

var blue = new DevopsdConnection({port: 8321}),
    green = new DevopsdConnection({port: 8322});

var canvasHue = new Array(NUM_PIXELS),
    i = 0;

setInterval(function tick() {
  console.log("new tick!");

  // reset all hues
  for (i = 0; i<NUM_PIXELS; i++) {
    canvasHue[i] = null;
  }

  // Blue is left three pixels:
  canvasHue[0] = blue.isProcessUp ? HUE_BLUE : null;
  canvasHue[1] = blue.isProcessUp && blue.isAcceptingRequests ? HUE_BLUE : HUE_ORANGE;
  // canvasHue[2] reserved, spacer

  // Green is right three pixels:
  canvasHue[NUM_PIXELS - 1] = green.isProcessUp ? HUE_GREEN : null;
  canvasHue[NUM_PIXELS - 2] = green.isProcessUp && green.isAcceptingRequests ? HUE_GREEN : HUE_ORANGE;
  // canvasHue[NUM_PIXELS - 3] reserved, spacer

  ls.next();
  for (i = 0; i<NUM_PIXELS; i++) {
    if (canvasHue[i] === null) {
      ls.hsv(0, 0, 0);
    } else {
      ls.hsv(canvasHue[i], 1, 1);
    }
  }

}, TICK_INTERVAL);


// TODO: Create drops
blue
.on('activity', function(level) {
  console.log('activity on blue: ' + level);
})
.on('error', function(error) {
  console.log('error on blue: ' + error);
});

green
.on('activity', function(level) {
  console.log('activity on green: ' + level);
})
.on('error', function(error) {
  console.log('error on green: ' + error);
});
