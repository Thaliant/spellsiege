Grave = (function() {

  /** @const @type {int} */
  var MAX_AGE_IN_TURNS = 3;

  // The factory which manages the pool of available graves.
  var gravePool = Pool.create(true, DEBUG ? "grave" : null);

  /** @type {array} A local reference to the array of active graves. */
  var allGraves = gravePool.active;

  var GRAVE_SPRITE = Sprite.create({
    tileset: loadTileset('grave.png'),
    frames: [ [0,0] ]
  });

  function expireGrave(grave) {
    if (DEBUG) {
      console.log(Grave.toString(grave) + " has expired.");
    }

    Effect.shake(grave.actor, function() {

      Effect.smoke(grave.x * TILE_WIDTH, grave.y * TILE_HEIGHT);

      Grave.destroy(grave);

    });
  }

  var expireGraves = function() {

    // This is the oldest grave that will be allowed.  Any
    // grave created prior to this turn will be destroyed.
    var oldestGrave = Player.turn - MAX_AGE_IN_TURNS;

    // The total number of expired graves.
    var gravesExpired = 0;

    var grave;
    for (var i = allGraves.length - 1; i >= 0; --i) {
      grave = allGraves[i];

      if (grave.turn < oldestGrave) {
        expireGrave(grave);
      }

    }

  };

  Event.addListener(EVENT_TURN_END, expireGraves);

  return {

    all: allGraves,

    at: function(x, y) {

      var grave;
      for (var i = 0; i < allGraves.length; ++i) {
        grave = allGraves[i];

        if (grave.x === x && grave.y === y) {
          return grave;
        }
      }

      return null;
    },

    create: function(unit) {

      var actor = Actor.create(GRAVE_SPRITE, unit.x * TILE_WIDTH, unit.y * TILE_HEIGHT, Z_DEFAULT - 1);

      var g = gravePool.allocate();

      g.actor  = actor;
      g.attack = unit.attack;
      g.type   = unit.type;
      g.turn   = Player.turn;
      g.x      = unit.x;
      g.y      = unit.y;

      return g;
    },

    destroy: function(grave) {

      Actor.destroy(grave.actor);

      grave.actor = null;
      grave.type  = null;

      gravePool.deallocate(grave);

      if (TRACE) {
        console.log("Grave #" + grave.id + " returned to pool");
      }

    },

    raise: function(grave, player, callback) {

      Effect.shake(grave.actor, function() {

        var unitType = UnitType.byId(grave.type.grave);

        var unit = Unit.create(unitType, player, grave.x, grave.y);

        // Restore bonuses to the resurrected unit.
        unit.attack = grave.attack;

        Unit.setMode(unit, MODE_DONE);

        Effect.smoke(grave.x * TILE_WIDTH, grave.y * TILE_HEIGHT, callback);

        Grave.destroy(grave);


      });

    },

    toString: function(g) {
      return "Grave#" + g.id + ": " + UnitType.toString(g.type);
    }

  };
})();