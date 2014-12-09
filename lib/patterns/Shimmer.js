/**
 * Uses a rolling sine-wave to add some HSV shimmer
 */
var _ = require('lodash');

module.exports = function(NUM_PIXELS, TICK_INTERVAL_MS, ls) {

  var Shimmer = function Shimmer(ls, opts) {
    opts = _.defaults(opts || {}, {
      /** First pixel starts at Math.sin(phase) */
      initialPhase: Math.PI/2,

      /** How many pixels equal 2*PI (how many pixels one full sin wave takes up) */
      wavelengthPx: NUM_PIXELS * 4, // full string goes 1/4 wavelength, or full string goes from 1 to 0

      /** How many seconds it takes to do one full rotation through the sin wave.
       *  Can be negative to make sin wave go in reverse. */
      frequencySec: 2,

      /**
       * This function is called NUM_PIXELS times per tick, once for each pixel.
       *
       * Each pixel gets passed its sin wave value during the tick.  It should do something with that and turn it into
       * a ls.hsv() or ls.rgb() call.
       *
       * @param {Object} ls the lightstrip instance
       * @param {number} waveValue sin wave value from -1 to 1
       * @param {number} pixelN
       */
      mapShimmerToLightstrip: function(ls, waveValue, pixelN) {
        ls.hsv(waveValue > 0 ? 0.7 : 0.3, Math.abs(waveValue), 1);
      }
    });

    // Hairy unit conversion: rad/tick = (2*PI rad) * ((ms/tick) / (ms/sec)) / (sec)
    this._deltaPhasePerTick = 2 * Math.PI * TICK_INTERVAL_MS / 1000 / opts.frequencySec;

    // efficiency: map each pixel to a phase shift
    this._phasePerPixel = 2*Math.PI / opts.wavelengthPx;
    this._pixelPhi = new Array(NUM_PIXELS);
    for (var i=0; i<NUM_PIXELS; i++) {
      this._pixelPhi[i] = i * this._phasePerPixel;
    }

    this.options = opts;
    this.init();
  };

  Shimmer.prototype.init = function() {
    this.phase = this.options.initialPhase;
  };

  Shimmer.prototype.tick = function() {
    var shimmerPhi = this.phase,
        wave;
    for (var i=0; i<NUM_PIXELS; i++) {
      wave = Math.sin(this._pixelPhi[i] + shimmerPhi);
      shimmerPhi += this._phasePerPixel;

      this.options.mapShimmerToLightstrip(ls, wave, i);
    }

    this.phase += this._deltaPhasePerTick;
  };

  return Shimmer;

};
