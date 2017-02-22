Renderer = (function() {

  var TERRAIN_TILESET = loadTileset("terrain.png");

  /** @const @type {int} Used when calculating the tiles to
   * render based on the offset and how many tiles fit on the
   * canvas.
   */
  var FOCUS_PAN_DIVISOR = 4;

  // Counters for use during rendering.
  var lastFrame  = 0;
  var now        = 0;
  var frameCount = 0;
  var totalTime  = 0;
  var fps        = "0";

  var WHITE      = 'rgba(255, 255, 255, 255);';
  var BLACK      = 'rgba(0, 0, 0, 255);';

  /** @const @type {int} */
  var FPS_X      = 4;

  /** @const @type {int} */
  var FPS_Y      = 11;

  /** @const @type {int} */
  var MAX_OFFSET_ADJUST = 10;

  // The x- and y-pixels the renderer should be focused on
  // centered in the viewport.
  var targetX = 0;
  var targetY = 0;
  var targetActor = null;

  // The current x- and y-pixels the renderer is focused on
  // which is moved toward the focus point if they are not
  // equal to one another.
  var focusX = 0;
  var focusY = 0;

  // Transient working variables used during render.
  var actor;
  var allActors;
  var allUnits;
  var endTileX;
  var endTileY;
  var endX;
  var endY;
  var frame;
  var sprite;
  var startTileX;
  var startTileY;
  var startX;
  var startY;
  var state;
  var terrain;
  var total;
  var unit;
  var unitType;
  var tileY;
  var tileX;
  var visible;

  // Used for rendering text, an offscreen buffer.
  var offscreenCanvas = null;
  var offscreenCtx    = null;

  function drawActors() {

    // Get a local handle on the actors array.
    allActors = Actor.all;

    total = allActors.length;
    for (var i = 0; i < total; ++i) {
      actor = allActors[i];

      if (actor.visible) {

        state = actor.state;
        if (state !== null) {

          // Determine if the actor is actually on-screen at this moment.
          visible = !(actor.x + state.width < startX || actor.x > endX ||
              actor.y + state.height < startY || actor.y > endY);

          if (visible) {

            frame = state.frames[actor.frame];

            CANVAS_CTX.drawImage(
                state.tileset,
                frame.tileX, frame.tileY, state.width, state.height,
                actor.x - startX + state.offsetX, actor.y - startY + state.offsetY, state.width, state.height
            );

            if (actor.overlay !== null) {
              CANVAS_CTX.drawImage(
                  actor.overlay,
                  actor.x - startX,
                  actor.y + TILE_HEIGHT - startY - actor.overlay.height
              );
            }

          }

        }

      }

    }


  }

  function drawOverlay() {

    if (Cursor.showOverlay) {

      var overlay;
      for (tileY = startTileY; tileY <= endTileY; ++tileY) {
        for (tileX = startTileX; tileX <= endTileX; ++tileX) {

          overlay = Cursor.overlayAt(tileX, tileY);
          if (overlay !== OVERLAY_OFF) {
            CANVAS_CTX.fillStyle = overlay;
            CANVAS_CTX.fillRect(
                tileX * TILE_WIDTH - startX,
                tileY * TILE_HEIGHT - startY,
                TILE_WIDTH,
                TILE_HEIGHT
            );
          }

        }
      }

    }

  }

  function drawTerrain() {

    var y;
    for (tileY = startTileY; tileY < endTileY; ++tileY) {
      y = tileY * TILE_HEIGHT - startY;

      for (tileX = startTileX; tileX < endTileX; ++tileX) {
        terrain = Map.terrainAt(tileX, tileY);
        if (terrain) {
          CANVAS_CTX.drawImage(
              TERRAIN_TILESET, terrain.tileX, terrain.tileY, TILE_WIDTH, TILE_HEIGHT,
              tileX * TILE_WIDTH - startX, y, TILE_WIDTH, TILE_HEIGHT
          );
        }
      }
    }

  }

  function drawText(text, x, y) {
    CANVAS_CTX.fillStyle = BLACK;
    CANVAS_CTX.fillText(text, x - 1, y - 1);
    CANVAS_CTX.fillText(text, x - 1, y + 1);
    CANVAS_CTX.fillText(text, x + 1, y - 1);
    CANVAS_CTX.fillText(text, x + 1, y + 1);
    CANVAS_CTX.fillStyle = WHITE;
    CANVAS_CTX.fillText(text, x, y);
  }

  function updateGeometry() {

    if (focusX !== targetX) {
      if (focusX > targetX) {
        focusX -= Math.max(Math.round((focusX - targetX) / FOCUS_PAN_DIVISOR), 1);
      } else {
        focusX += Math.max(Math.round((targetX - focusX) / FOCUS_PAN_DIVISOR), 1);
      }
    }

    if (focusY !== targetY) {
      if (focusY > targetY) {
        focusY -= Math.max(Math.round((focusY - targetY) / FOCUS_PAN_DIVISOR), 1);
      } else {
        focusY += Math.max(Math.round((targetY - focusY) / FOCUS_PAN_DIVISOR), 1);
      }
    }

    var mapWidth = Map.width();
    var mapHeight = Map.height();

    startX = Math.floor(focusX - (CANVAS.width / 2));
    startY = Math.floor(focusY - (CANVAS.height / 2));

    if (false) {
      if (startX < 0) {
        startX = 0;
      } else {
        var maxX = mapWidth * TILE_WIDTH - CANVAS.width;
        if (startX > maxX) {
          startX = maxX;
        }
      }

      if (startY < 0) {
        startY = 0;
      } else {
        var maxY = mapHeight * TILE_HEIGHT - CANVAS.height;
        if (startY > maxY) {
          startY = maxY;
        }
      }
    }

    endX = startX + CANVAS.width;
    endY = startY + CANVAS.height;

    startTileX = Math.max(Math.floor(startX / TILE_WIDTH) - 1, 0);
    startTileY = Math.max(Math.floor(startY / TILE_HEIGHT) - 1, 0);
    endTileX   = Math.min(Math.floor(endX / TILE_WIDTH) + 1, mapWidth);
    endTileY   = Math.min(Math.floor(endY / TILE_HEIGHT) + 1, mapHeight);

    if (targetActor) {
      Renderer.focusOn(targetActor.x, targetActor.y);
    }

  }

  function updateUnits() {

    allUnits = Unit.all;
    total    = allUnits.length;

    for (var i = 0; i < total; ++i) {
      unit  = allUnits[i];
      actor = unit.actor;

      if (!unit.dead && unit.drawOverlay && actor.overlay === null && unit.hitpoints < unit.type.hitpoints) {
        actor.overlay = Renderer.renderNumbers(unit.hitpoints);
      }

    }

  }

  return {

    focusOn: function(x, y, instantly) {

      var minX = Math.floor(CANVAS.width / 2);
      var maxX = Map.width() * TILE_WIDTH - minX;

      if (x < minX) {
        x = minX;
      } else if (x > maxX) {
        x = maxX;
      }

      var minY = Math.floor(CANVAS.height / 2);
      var maxY = Map.height() * TILE_HEIGHT - minY;
      if (y < minY) {
        y = minY;
      } else if (y > maxY) {
        y = maxY;
      }

      targetX = x;
      targetY = y;

      if (instantly === true) {
        focusX = x;
        focusY = y;
      }

    },

    focusOnActor: function(actor) {

      if (DEBUG) {
        if (actor) {
          console.log("Renderer is now tracking on " + Actor.toString(actor));
        } else {
          console.log("Renderer is no longer tracking " + Actor.toString(targetActor));
        }
      }

      targetActor = actor;
    },

    focusOnTile: function(x, y, instantly) {
      Renderer.focusOn((x * TILE_WIDTH) + (TILE_WIDTH / 2), (y * TILE_HEIGHT) + (TILE_HEIGHT / 2));
    },

    offsetX: function() {
      return focusX;
    },

    offsetY: function() {
      return focusY;
    },

    render: function() {

      if (DEBUG) {
        now = new Date();
        if (lastFrame > 0) {

          totalTime += (now - lastFrame);
          if (totalTime >= 1000) {
            fps = frameCount.toString(10);
            frameCount = 0;
            totalTime -= 1000;
          }
        }

        frameCount++;
        lastFrame = now;

      }

      CANVAS_CTX.clearRect(0, 0, CANVAS.width, CANVAS.height);

      updateGeometry();
      updateUnits();

      drawTerrain();
      drawOverlay();
      drawActors();

      if (DEBUG) {

        var text;
        for (tileY = startTileY; tileY < endTileY; ++tileY) {
          for (tileX = startTileX; tileX < endTileX; ++tileX) {

            text = Cursor.textAt(tileX, tileY);
            if (text) {
              drawText(text, tileX * TILE_WIDTH - startX + 5, tileY * TILE_HEIGHT  - startY + 24);
            }
          }
        }

        drawText(fps, FPS_X, FPS_Y);
      }

    },

    renderNumbers: function(val, font) {

      if (offscreenCanvas === null) {
        offscreenCanvas = document.createElement('canvas');

        offscreenCtx = offscreenCanvas.getContext('2d');
      }

      offscreenCtx.fillStyle = "rgba(0, 0, 0, 0.0)";
      offscreenCtx.clearRect(0, 0, TILE_WIDTH, TILE_HEIGHT);

      font = font || Renderer.fontSmall;

      // Convert the value provided to a string.
      var sval   = "" + val;
      var length = sval.length;
      var x      = 0;

      offscreenCanvas.width  = length * font.width;
      offscreenCanvas.height = font.height;

      var digit;
      var tileX;

      for (var i = 0; i < length; ++i) {
        digit = sval.charAt(i);
        if (digit === '-') {
          tileX = 11;
        } else if (digit === '+') {
          tileX = 12;
        } else {
          tileX = parseInt(digit, 10);
        }

        offscreenCtx.drawImage(
            font.tileset,
            tileX * font.width, 0, font.width, font.height,
            x, 0, font.width, font.height
        );

        x += font.width;

      }

      var image    = new Image();
      image.src    = offscreenCanvas.toDataURL();
      image.width  = offscreenCanvas.width;
      image.height = offscreenCanvas.height;

      return image;
    },

    shiftFocus: function(dx, dy) {

      // Always forget a tracked actor if the focus is being manually shifted.
      if (targetActor !== null) {
        Renderer.focusOnActor(null);
      }

      Renderer.focusOn(focusX + dx, focusY + dy, true);

    },

    fontLarge: {
      tileset: loadTileset("numbers-large.png"),
      height: 22,
      width: 16
    },

    fontSmall: {
      tileset: loadTileset("numbers.png"),
      height: 14,
      width: 12
    }

  };

})();
