Arrow = (function() {

  /** @const Needs to be base 1 otherwise the states
   * won't initialize properly because 0 == false */
  var LINE_HORIZONTAL = DEBUG ? "LINE_HORIZONTAL" : 1;

  /** @const */
  var LINE_VERTICAL   = DEBUG ? "LINE_VERTICAL"   : 2;

  /** @const */
  var ARROW_UP        = DEBUG ? "ARROW_UP"        : 3;

  /** @const */
  var ARROW_LEFT      = DEBUG ? "ARROW_LEFT"      : 4;

  /** @const */
  var START_LEFT      = DEBUG ? "START_LEFT"      : 5;


  /** @const */
  var TURN_UP_RIGHT   = DEBUG ? "TURN_UP_RIGHT"   : 6;

  /** @const */
  var TURN_UP_LEFT    = DEBUG ? "TURN_UP_LEFT"    : 7;

  /** @const */
  var ARROW_DOWN      = DEBUG ? "ARROW_DOWN"      : 8;

  /** @const */
  var START_RIGHT     = DEBUG ? "START_RIGHT"     : 9;

  /** @const */
  var ARROW_RIGHT     = DEBUG ? "ARROW_RIGHT"     : 10;


  /** @const */
  var TURN_DOWN_RIGHT = DEBUG ? "TURN_DOWN_RIGHT" : 11;

  /** @const */
  var TURN_DOWN_LEFT  = DEBUG ? "TURN_DOWN_LEFT"  : 12;

  /** @const */
  var START_DOWN      = DEBUG ? "START_DOWN"      : 13;

  /** @const */
  var START_UP        = DEBUG ? "START_UP"        : 14;


  // This will hold the array of arrow Actors that have
  // been instantiated during the plotting event.
  var activeArrows = [ ];

  // This is the sprite representing the various states
  // of the arrow.
  var sprite = Sprite.create();

  // Initialize each of the states of the arrow sprite.  Doing
  // this in a closure to prevent the variables from being global.
  (function () {

    var tileset = loadTileset("arrow.png");

    var allStates = [
        LINE_HORIZONTAL, LINE_VERTICAL, ARROW_UP, ARROW_LEFT, START_LEFT,
        TURN_UP_RIGHT, TURN_UP_LEFT, ARROW_DOWN, START_RIGHT, ARROW_RIGHT,
        TURN_DOWN_RIGHT, TURN_DOWN_LEFT, START_DOWN, START_UP
    ];

    var i = 0;
    var state;

    for (var y = 0; y < 3; ++y) {
      for (var x = 0; x < 5; ++x) {
        state = Sprite.addState(sprite, {
          id:      allStates[i],
          tileset: tileset
        });

        var frame = Sprite.addFrame(state, x, y);

        i++;
        if (i >= 14) {
          break;
        }
      }
    }
  })();

  function drawRoute(path, i) {


    // Get the current node that is going to be painted.
    var node = path[i];

    // Get the previous node so we know where we are coming from.
    var prevNode = i > 0 ? path[i - 1] : null;
    var prevDx = prevNode !== null ? prevNode.x - node.x : 0;
    var prevDy = prevNode !== null ? prevNode.y - node.y : 0;

    // Get the next node so we know where the path goes.
    var nextNode = i < path.length - 1 ? path[i + 1] : null;
    var nextDx = nextNode !== null ? nextNode.x - node.x : 0;
    var nextDy = nextNode !== null ? nextNode.y - node.y : 0;

    // This will hold the state of the actor that will represent
    // this part of the path.
    var state = LINE_HORIZONTAL;

    // Check for the start of the line.
    if (prevNode === null) {

      if (nextDy === 0) {
        state = nextDx < 0 ? START_LEFT : START_RIGHT;
      } else {
        state = nextDy < 0 ? START_UP : START_DOWN;
      }

    } else if (nextNode === null) {

      if (prevDy === 0) {
        state = prevDx < 0 ? ARROW_RIGHT : ARROW_LEFT;
      } else {
        state = prevDy < 0 ? ARROW_DOWN : ARROW_UP;
      }

    } else if (prevDy === 0 && nextDy === 0) {
      state = LINE_HORIZONTAL;

    } else if (prevDx === 0 && nextDx === 0) {
      state = LINE_VERTICAL;

    } else if ((prevDx === 1 && nextDy === 1) || (prevDy === 1 && nextDx === 1)) {
      state = TURN_UP_RIGHT;

    } else if ((prevDx === -1 && nextDy === -1) || (prevDy === -1 && nextDx === -1)) {
      state = TURN_DOWN_LEFT;

    } else if ((prevDx === 1 && nextDy === -1) || (prevDy === -1 && nextDx === 1)) {
      state = TURN_DOWN_RIGHT;

    } else {
      state = TURN_UP_LEFT;

    }

    // Create an actor.
    var arrow = Actor.create(sprite, node.x * TILE_WIDTH, node.y * TILE_HEIGHT, Z_ARROW, state);

    // Add the arrow to the list of those that will be
    activeArrows.push(arrow);

    // If we have not reached the end of the path, then plot the
    // next position.
    if (nextNode !== null) {
      drawRoute(path, i + 1);
    }

  }

  return {

    reset: function() {

      // Iterate through the list of active arrows and return
      // each Actor to the pool.
      var totalArrows = activeArrows.length;
      for (var i = 0; i < totalArrows; ++i) {
        Actor.destroy(activeArrows[i]);
      }

      // Clear the list of active arrows.
      activeArrows.length = 0;

    },

    showRoute: function(unit, x, y) {

      Arrow.reset();

      // Get the path this unit will follow from their current
      // location to the destination.
      var path = Pathfinder.getPath(unit, x, y);
      if (path && path.length > 0) {
        drawRoute(path, 0);
      }

    }

  };

})();
