var MAX_INTEGER = 9007199254740992;

// DI Wrapper
module.exports = function(NUM_PIXELS, TICK_INTERVAL, ls) {

  function calcWhiteDecay(whiteDecaySec) {
    return whiteDecaySec === 0 ? Infinity : 1 / (TICK_INTERVAL * (whiteDecaySec || 0.3));
  }
  function calcBrightnessDecay(decay) {
    return 1 / (TICK_INTERVAL * (decay || 1));
  }

  /**
   * Factory to produce a new "Rain" pattern
   * @param opts Options to customize the rain pattern:
   *   friendlyName: {string} Pattern name
   *   sortI: {string} pattern sort order on UI
   *   baseHue: {number} 0-1, the base hue from which raindrops are randomized.  Be caseful around the limits -- colors
   *            don't wrap wrap around yet.
   *   hueVariance: {number} 0-1.  Raindrops will be a random color +/- this amount from the baseHue.  Again, wrap
   *                arounds are buggy, don't do baseHue - variance < 0 or > 1.  TODO.
   *   baseAsBackground: {boolean} True to make the background the baseHue, false to leave the background black/off
   *   whiteDecaySec: {number} How many seconds for a raindrop's white flash to decay.
   *                  Defaults to 0.3, set to 0 (===0) to turn off white flashes
   *   decay: {number} How many seconds it takes a raindrop to decay (default 1)
   *   spreadRate: {number} How many pixels/sec the raindrop spreads across (default 6).  Stops spreading after decay.
   *   rainFrequencySec: {number} Number of seconds between rain on average (defaults drop every 1.5 sec)
   */
  return function(opts) {
    opts = opts || {};
    return new function() {
      this.friendlyName = opts.friendlyName || "Digital Rain";
      this.sortI = opts.sortI || 10;

      var BASE_HUE = opts.baseHue || 0.65,
          HUE_VARIANCE = opts.hueVariance || 0.3,

          // Drop decays all its "white" in .3 seconds
          WHITE_DECAY = calcWhiteDecay(opts.whiteDecaySec),

          // Drop decays away in 1 sec
          BRIGHTNESS_DECAY = calcBrightnessDecay(opts.decay),

          // Raindrop spreads 6 pixels / second
          SPREAD_RATE = (opts.spreadRate || 6) / TICK_INTERVAL;

      var hues, whites, vals,
          drops = this._drops = {},
          dropId = 0,

          /**
           * Drop Constructor
           * @param {Object} opts Drop-specific overrides to rain factory overrides
           *   hue: {number} 0-1 base hue from which raindrops are randomized.
           *   hueVariance: {number} 0-1 Randrops will be a random color +/- this amount from the baseHue
           *   whiteDecaySec: {number} Override for factory default
           *   decay: {number} Override for factory default
           */
          Drop = function(dropOpts) {
            dropOpts = dropOpts || {};
            this.dropOpts = dropOpts;

            this.whiteDecay = dropOpts.whiteDecaySec !== undefined ? calcWhiteDecay(dropOpts.whiteDecaySec) : undefined;
            this.brightnessDecay = dropOpts.decay !== undefined ? calcBrightnessDecay(dropOpts.decay) : undefined;

            this.pixelI = Math.floor( Math.random() * NUM_PIXELS );
            this.whiteness = (dropOpts.whiteDecaySec === 0 || opts.whiteDecaySec === 0) ? 0 : 1; // 1-sat, start white
            this.val = 1; // start full brightness
            this.hue = (dropOpts.hue || BASE_HUE) +
                       (Math.random() * (dropOpts.hueVariance || HUE_VARIANCE) * 2 -
                         (dropOpts.hueVariance || HUE_VARIANCE)
                       );
            this.width = 1;

            // Register this drop
            this.dropId = dropId++;
            drops[this.dropId] = this;

            // prevent overflow
            if (dropId === MAX_INTEGER)
              dropId = 0;
          };

      Drop.prototype.tick = function() {
        // Add colors to canvas
        for (var i = Math.ceil(this.pixelI - this.width); i < this.pixelI + this.width; i++) {
          if (i < 0 || i >= NUM_PIXELS)
            continue;

          hues[i].sum += this.hue; // will get averaged   TODO: average doesn't wrap around <0 or >1
          hues[i].num++; // number of contributing pixels (for averaging)
          whites[i] += this.whiteness;
          vals[i] += this.val;
        }

        // Decay
        this.whiteness = Math.max(0, this.whiteness - (this.whiteDecay || WHITE_DECAY));
        this.val = Math.max(0, this.val - (this.brightnessDecay || BRIGHTNESS_DECAY));
        this.width += SPREAD_RATE;

        if (this.val === 0) {
          // We've decayed away.  Goodbye!
          delete drops[this.dropId];
        }
      };

      this.init = function() {
        hues = new Array(NUM_PIXELS);
        whites = new Array(NUM_PIXELS);
        vals = new Array(NUM_PIXELS);
        for (var i=0; i<NUM_PIXELS; i++) {
          hues[i] = {sum: 0, num: 0};
        }
        drops = this._drops = {};
        console.log("Can you feel the (" + this.friendlyName + ") rain?");
        new Drop();
      };

      /**
       * Create a new drop
       * @param {Object} [opts] Drop overrides (see Drop constructor).  If not there, uses rainFactory defaults
       */
      this.addDrop = function(opts) {
        new Drop(opts); // self-registers into drops.
      };

      this.tick = function() {
        for (var i=0; i<NUM_PIXELS; i++) {
          hues[i].sum = opts.baseAsBackground ? BASE_HUE : 0;
          hues[i].num = opts.baseAsBackground ? 1 : 0;
          whites[i] = 0;
          vals[i] = opts.baseAsBackground ? 0.3 : 0;
        }

        var dropIds = Object.keys(drops);
        dropIds.forEach(function(dropId) {
          drops[dropId].tick();
          // Drops remove themselves when they're decayed
        });

        // Canvas is now painted.  Average hues, max the rest.
        for (i=0; i<NUM_PIXELS; i++) {
          ls.hsv( hues[i].num ? hues[i].sum / hues[i].num : 0,
                  Math.max(0, 1 - whites[i]),
                  Math.min(1, vals[i]) );
        }
      };
    }();
  };

};
