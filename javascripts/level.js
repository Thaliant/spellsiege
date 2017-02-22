Level = (function() {

  /** @const @type {int} Constant per XMLHttpRequest */
  var READY = 4;

  // All levels by unique ID.
  var levelsById = { };

  // This is the current level.
  var currentLevel = null;

  // True if we're currently loading a level.
  var loading = false;

  // Default onUnitKilled handler that marks a player as
  // defeated when their last unit has been killed.
  var onUnitKilled = function(unit) {

    if (DEBUG) {
      console.log("Level.onUnitKilled() triggered ...");
    }

    // If there is a current level, provide it with a chance
    // to handle the unit's death.  If this returns false then
    // the normal handling (below) is avoided.
    if (currentLevel && currentLevel.onUnitKilled) {
      if (currentLevel.onUnitKilled(unit) === false) {
        return;
      }
    }

    var player = unit.player;

    // If the unit has been marked as "must survive" then the
    // player is defeated as soon as the unit is killed.
    if (unit.mustSurvive) {
      if (DEBUG) {
        console.log(Player.toString(player) + " lost " + Unit.toString(unit) + " - game ends immediately.");
      }

      Player.defeated(player);

      return;
    }

    // Initially assume that the player has no remaining units.
    var unitsRemaining = false;
    var otherUnit;

    var allUnits = Unit.all;
    for (var i = allUnits.length - 1; i >= 0; --i) {
      otherUnit = allUnits[i];
      if (otherUnit && !otherUnit.dead && otherUnit.player === player) {
        unitsRemaining = true;
        break;
      }
    }

    if (!unitsRemaining) {
      if (DEBUG) {
        console.log(Player.toString(player) + " has no remaining units");
      }

      Player.defeated(player);

    }

  };

  // Default onPlayerDefeated handler that marks the level as
  // complete if all AI players are defeated and lost if all
  // of the human players are defeated.
  var onPlayerDefeated = function(player) {

    if (DEBUG) {
      console.log("Level.onPlayerDefeated() triggered ...");
    }

    // If there is a current level installed, provide it with
    // a chance to handle the player's defeat.  If it returns
    // false, it cancels the default behavior below.
    if (currentLevel && currentLevel.onPlayerDefeated) {
      if (currentLevel.onPlayerDefeated(player) === false) {
        return;
      }
    }

    if (player.id === PLAYER_BLUE) {
      console.log("GAME OVER! " + Player.toString(player) + " loses.");

      // Trigger the game over.
      SpellSiege.gameOver();

    } else if (Player.active.length === 1) {
      console.log("LEVEL OVER! " + Player.toString(player) + " wins!");

      Level.complete();

    }

  };

  Event.addListener(EVENT_PLAYER_DEFEATED, onPlayerDefeated);

  Event.addListener(EVENT_TURN_END, function(player) {
    if (currentLevel && currentLevel.onTurnEnd) {
      currentLevel.onTurnEnd(player);
    }
  });

  Event.addListener(EVENT_TURN_START, function(player) {
    if (currentLevel && currentLevel.onTurnStart) {
      currentLevel.onTurnStart(player);
    }
  });

  Event.addListener(EVENT_UNIT_MOVED, function(unit) {
    if (currentLevel && currentLevel.onUnitMoved) {
      currentLevel.onUnitMoved(unit);
    }
  });

  Event.addListener(EVENT_UNIT_KILLED, onUnitKilled);

  function loadLevelData(level, callback) {

    // Level already has data embedded within it so immediately
    // notify the callback.
    var data = level.data;
    if (!isNull(data)) {
      callback(data);

    } else {

      // This is the name of the file as it will be requested
      // from the levels directory.
      var file = "levels/" + level.id + ".txt";

      var request = new XMLHttpRequest();

      request.onreadystatechange = function() {

        // Upon loading complete, notify the callback with the
        // level data.
        if (request.readyState === READY) {

          if (DEBUG) {
            console.log("Loaded " + file + " (" + request.responseText.length + " bytes)");
          }

          callback(request.responseText);

        }

      };

      request.open("GET", file);
      request.send();

    }

  }

  return {

    complete: function() {

      trigger(currentLevel.onComplete);

      var nextLevel = currentLevel.next;

      Level.end();

      if (nextLevel) {
        Level.start(nextLevel);
      }

    },

    create: function(id, name, level) {

      if (!isNull(levelsById[id])) {
        throw "Level#" + id + " already exists";
      }

      // Ensure the level object has an ID.
      level.id   = id;
      level.name = name;

      // Index the level by it's unqiue ID.
      levelsById[id] = level;

    },

    end: function() {

      // Rendering continues but gameplay is suspended.
      SpellSiege.setPlaying(false);

      if (currentLevel) {

        // Notify the level that is has ended so that it can perform
        // any necessary cleanup.
        trigger(currentLevel.onEnd);

        if (DEBUG) {
          console.log(Level.toString(currentLevel) + " has ended");
        }

        currentLevel = null;

      }

    },

    load: function(opt) {

      // Restore the current level.

    },

    save: function() {

      // Save the current level.

    },

    start: function(levelId, callback) {

      if (loading) {
        if (DEBUG) {
          console.log("Start call ignored because loading is in-progress ...");
        }
        return;
      }

      Level.end();

      var level = levelsById[levelId];
      if (isNull(level)) {
        throw "Level " + levelId + " does not exist";
      }

      // Activate the new level to be loaded.
      currentLevel = level;

      if (DEBUG) {
        console.log("Starting " + Level.toString(currentLevel) + " ...");
      }

      // Prevent any other levels from being loaded.
      loading = true;

      // Provide the level with a chance to init if necessary.
      trigger(level.init);

      loadLevelData(level, function(data) {

        // Load the map and units.
        SpellSiege.load(data);

        // Loading is complete.
        loading = false;

        // Provide the level with a chance to finalize the world.
        // Unless the default behavior is prevented, automatically
        // start the turn of the first active player.
        if (!level.onStart || level.onStart() !== false) {
          if (Player.current === null) {
            Player.startTurn(Player.active[0]);
          }

          SpellSiege.setPlaying(true);
        }

        // Notify the provided callback that the level has been
        // successfully loaded.
        trigger(callback);

      });

    },

    toString: function(level) {
      return "Level#" + level.id + " " + level.name;
    },

    turnStarted: function(turn) {
      if (currentLevel && currentLevel.onTurnStarted) {
        currentLevel.onTurnStarted(turn);
      }
    },

    unitKilled: function(unit) {
      if (currentLevel && currentLevel.onUnitKilled) {
        currentLevel.onUnitKilled(unit);
      }
    }

  };
})();