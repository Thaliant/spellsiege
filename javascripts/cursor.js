Cursor = (function() {

  /** @type {Array.<int>} */
  var overlay = [];

  /** @type {Array.<string>} */
  var text = [];

  /** @const @type {int} */
  var CURSOR_READY_DIMENSIONS = 52;

  // This is the sprite for the unit-selection cursor.
  var sprite = Sprite.create({
    id:       MODE_READY,
    tileset:  loadTileset('cursor.gif'),
    width:    CURSOR_READY_DIMENSIONS,
    height:   CURSOR_READY_DIMENSIONS,
    duration: 1250,
    offset:   true,
    frames:   [
      [0,0],
      [1,0]
    ]
  });

  var cursorActor = Actor.create(sprite, 0, 0, Z_CURSOR);

  // This is the sprite that displays which target is going to
  // be attacked.
  sprite = Sprite.create({
    id:       MODE_ATTACK,
    tileset:  loadTileset('cursor-attack.png'),
    width:    79,
    height:   81,
    duration: 1500,
    offset: true,
    frames:   [
      [0,0],
      [1,0],
      [2,0]
    ]
  });

  // This is the sprite that displays where a unit will move.
  Sprite.addState(sprite, {
    id:      MODE_MOVE,
    tileset: loadTileset('cursor-move.gif'),
    width:   36,
    height:  38,
    offset:   true,
    frames:   [
      [0,0]
    ]
  });

  var targetActor = Actor.create(sprite, 0, 0, Z_CURSOR + 1);

  return {

    clearOverlay: function() {

      Cursor.clearTarget();

      Cursor.showOverlay = false;

      // Clear all of the overlay entries.
      for (var i = 0; i < overlay.length; ++i) {
        overlay[i] = OVERLAY_OFF;
      }

      if (DEBUG) {
        for (i = 0; i < overlay.length; ++i) {
          text[i] = null;
        }
      }

    },

    clearTarget: function() {
      targetActor.visible     = false;
      targetActor.x           = -100;
      targetActor.y           = -100;
    },

    hide: function() {

      Cursor.hideCursor();
      Cursor.clearTarget();

      Cursor.showOverlay = false;

    },

    hideCursor: function() {
      cursorActor.visible     = false;
    },

    init: function(width, height) {

      var size = height * width;
      if (size !== overlay.length) {

        overlay.length = 0;
        overlay.length = size;

        text.length    = 0;
        text.length    = size;

      }

    },

    moveTo: function(x, y) {

      Cursor.tileX = x;
      Cursor.tileY = y;

      cursorActor.x       = x * TILE_WIDTH;
      cursorActor.y       = y * TILE_HEIGHT;
      cursorActor.visible = true;

    },

    overlayAt: function(x, y) {
      return overlay[Map.toIndex(x, y)];
    },

    reset: function() {

      // Deselect any unit.
      Cursor.unit = null;

      Cursor.hideCursor();

      Cursor.clearOverlay();

    },

    setOverlayAt: function(x, y, o) {
      overlay[Map.toIndex(x, y)] = o;
    },

    setTextAt: function(x, y, t) {
      text[Map.toIndex(x, y)] = t;
    },

    showOverlay: false,

    target: function(x, y, mode) {

      Actor.setState(targetActor, mode);

      targetActor.x       = x * TILE_WIDTH;
      targetActor.y       = y * TILE_HEIGHT;
      targetActor.visible = true;

    },

    targetAt: function(x, y) {
      return targetActor.x === x * TILE_WIDTH && targetActor.y === y * TILE_HEIGHT;
    },

    textAt: function(x, y) {
      return text[Map.toIndex(x, y)];
    },

    // Tile position of the cursor.
    tileX: -1,
    tileY: -1,

    // Unit selected by the player or AI.
    unit: null

  };
})();
