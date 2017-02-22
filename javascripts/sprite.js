Sprite = (function() {

  return {

    addFrame: function(state, tileX, tileY) {

      var f = {
        tileX: tileX * state.width,
        tileY: tileY * state.height
      };

      state.frames.push(f);

    },

    addState: function(sprite, opt) {

      var state = {
        id:       opt.id       || MODE_READY,
        duration: opt.duration || 0,
        tileset:  opt.tileset  || null,
        width:    opt.width    || TILE_WIDTH,
        height:   opt.height   || TILE_HEIGHT,
        offsetX:  0,
        offsetY:  0,
        frames:   []
      };

      if (opt.offset) {

        // Automatically calculate the rendering offsets that allow the
        // offsite sprites to align with the tile bounds.
        if (opt.width !== TILE_WIDTH) {
          state.offsetX = Math.round((TILE_WIDTH - state.width) / 2.0);
        }
        if (opt.height !== TILE_HEIGHT) {
          state.offsetY = Math.round((TILE_HEIGHT - state.height) / 2.0);
        }

      }

      sprite.states[state.id] = state;

      // Check to see if there is an array of arrays which
      // are the frames to preload into this state.
      var frames = opt.frames;
      if (frames) {

        var frame;
        for (var f = 0; f < frames.length; ++f) {
          frame = frames[f];
          Sprite.addFrame(state, frame[0], frame[1]);
        }

      }

      return state;
    },

    create: function(stateOpt) {

      var s = {
        states: { }
      };

      if (!isNull(stateOpt)) {
        Sprite.addState(s, stateOpt);
      }

      return s;
    },

    timePerFrame: function(state) {
      return state.duration / state.frames.length;
    }

  };
})();