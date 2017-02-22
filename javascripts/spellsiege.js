SpellSiege = (function() {

  /** @const @type {int} The maximum number of pixels the mouse can
   * move while the button is down to still trigger a click. */
  var MOUSE_CLICK_THRESHOLD = 3;

  /** @type {boolean} True if the rendering engine is running - otherwise paused. */
  var rendering = false;

  /** @type {boolean} True if the game is being processed. */
  var playing = false;

  /** @type {int} */
  var lastCycle = 0;

  /** @type {int} */
  var delta     = 0;

  var now;

  // Variables related to mouse/touch events and for signaling that
  // the user clicked.
  var firstMouseEvent = null;
  var lastMouseEvent  = null;
  var isClick = false;

  var requestAnimFrame = (function() {
    return window.requestAnimationFrame ||
           window.webkitRequestAnimationFrame ||
           window.mozRequestAnimationFrame ||
           window.oRequestAnimationFrame ||
           window.msRequestAnimationFrame ||
           function(callback, element) {
             window.setTimeout(callback, 1000 / 60);
           };
  })();

  var cycle = function() {
    if (rendering) {

      // Update timestamps
      now       = new Date();
      delta     = now - lastCycle;
      lastCycle = now;

      Actor.cycle(delta);
      Tween.cycle(delta);

      // Don't process the current player (AI) unless there are
      // no blocking tweens.
      if (playing && !Tween.isBlocked()) {
        Player.cycle(delta);
      }

      Renderer.render();

      if (rendering) {
        requestAnimFrame(cycle);
      }

    }
  };

  var onMouseDown = function(e) {

    if (Tween.isBlocked()) {
      if (DEBUG) {
        console.error("MOUSEDOWN ignored due to blocking tween.");
      }
      return;
    }

    // Register the listener that responds to mouse motion while
    // the mouse is down.
    CANVAS.onmousemove = onMouseMove;

    firstMouseEvent = e;
    lastMouseEvent  = e;

    // Initially assume this is a click and if the mouse moves less
    // than the allowed amount,
    isClick = true;

  };

  var onMouseClick = function(e) {

    if (Tween.isBlocked()) {
      if (DEBUG) {
        console.error("MOUSECLICK ignored due to blocking tween.");
      }
      return;
    }

    var x = e.offsetX + Renderer.offsetX() - CANVAS.width / 2;
    var y = e.offsetY + Renderer.offsetY() - CANVAS.height / 2;

    var tileX = Math.floor(x / TILE_WIDTH);
    var tileY = Math.floor(y / TILE_HEIGHT);

    if (Map.onMap(tileX, tileY)) {

      // Get a local handle on the installed touch listener and pass
      // the touch event to it.
      var listener = SpellSiege.touchListener;
      if (!isNull(listener)) {
        listener(tileX, tileY);
      }
    }

  };

  var onMouseMove = function(e) {

    if (Tween.isBlocked()) {
      if (DEBUG) {
        console.error("MOUSEMOVE ignore due to a blocking tween.");
      }
      return;
    }

    // If we still consider this mouse motion to be a click then
    // check to see if the mouse has moved sufficiently to disable
    // the mouse click event.
    if (isClick) {

      var dx = Math.abs(e.offsetX - firstMouseEvent.offsetX);
      var dy = Math.abs(e.offsetY - firstMouseEvent.offsetY);

      if (dx > MOUSE_CLICK_THRESHOLD || dy > MOUSE_CLICK_THRESHOLD) {
        isClick = false;
      }

    }

    // If this is no longer considered a click then shift the
    // rendering focus based on where the mouse is being dragged.
    if (!isClick) {
      Renderer.shiftFocus(
          lastMouseEvent.offsetX - e.offsetX,
          lastMouseEvent.offsetY - e.offsetY
      );
    }

    lastMouseEvent = e;

  };

  var onMouseUp = function(e) {

    // Since we're listening to mouse-up on the body, then we're only
    // interested in mouse up events when the mouse initially went down
    // on the canvas.  In those cases, firstMouseEvent will not be null.
    if (firstMouseEvent !== null) {

      // Stop listening for mouse motion.
      CANVAS.onmousemove = null;

      // If we still consider this mouse motion to be a click then
      // trigger the listener.
      if (isClick) {
        onMouseClick(e);
      }

      firstMouseEvent = null;
      lastMouseEvent  = null;

    }

  };


  return {

    clear: function() {

      SpellSiege.setPlaying(false);
      SpellSiege.setRendering(false);

      AI.endTurn();

      Cursor.reset();
      Tween.clear();
      Unit.clear();
      Player.clear();

    },

    gameOver: function() {

      if (Player.current) {
        Player.endTurn();
      }

      SpellSiege.setPlaying(false);

      if (DEBUG) {
        console.log("The game ended on turn " + Player.turn);
      }

      Event.dispatch(EVENT_GAME_OVER);

    },

    init: function() {

      CANVAS = document.getElementById('gfx');
      CANVAS_CTX = CANVAS.getContext('2d');

      CANVAS.onmousedown = onMouseDown;

      // In debug mode, where there is more on the page than just the
      // canvas, register the mouse up on the body.
      if (DEBUG) {
        document.getElementsByTagName("body")[0].onmouseup = onMouseUp;
      } else {
        CANVAS.onmouseup = onMouseUp;
      }

    },

    load: function(data) {

      SpellSiege.clear();

      var state = JSON.parse(LZW.decode(data));

      if (DEBUG) {
        console.log("Loading...", state);
      }

      Player.turn = state[PERSIST_TURN];

      Map.load(state[PERSIST_MAP]);
      Player.load(state[PERSIST_PLAYERS]);

      Event.dispatch(EVENT_LOADED);

      Renderer.focusOn((Map.width() * TILE_WIDTH) / 2, (Map.height() * TILE_HEIGHT) / 2, true);

      SpellSiege.setRendering(true);

    },

    pause: function() {
      SpellSiege.setRendering(!rendering);
    },

    pausePlay: function() {
      SpellSiege.setPlaying(!playing);
    },

    save: function() {

      // Caller can pass a false to disable compression.
      var compress = arguments[0] !== false;

      var state = { };

      state[PERSIST_TURN]    = Player.turn;
      state[PERSIST_MAP]     = Map.save();
      state[PERSIST_PLAYERS] = Player.save();

      if (DEBUG) {
        console.log("Save state", state);
      }

      var data = JSON.stringify(state);

      if (compress) {
        data = LZW.encode(data);
      }

      return data;
    },

    // Start or suspend gameplay.  Does not affect the
    // rendering cycles.
    setPlaying: function(_playing) {
      if (playing !== _playing) {
        playing = _playing;

        if (DEBUG) {
          if (playing) {
            console.log("Gameplay resumed");
          } else {
            console.log("Gameplay suspended");
          }
        }
      }
    },

    // Start or stop rendering.  Overrides game play cycles.
    setRendering: function(_rendering) {
      if (rendering !== _rendering) {

        rendering = _rendering;
        if (rendering) {

          if (DEBUG) {
            console.log("Rendering started");
          }

          lastCycle = new Date();
          requestAnimFrame(cycle);

        } else {
          if (DEBUG) {
            console.log("Rendering suspended");
          }
        }

      }
    },

    touchListener: null

  };
})();
