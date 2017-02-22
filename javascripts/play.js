var Play = (function() {

  function showFactory() {

    var gold = Player.current.gold;

    var $factory = $('#factory-tmpl').tmpl();
    var $units = $factory.find('#unit-picker');

    var $tmpl = $('#factory-unit-tmpl');
    var $swatch;

    var allUnitTypes = UnitType.all;
    var unitType;

    for (var i = 0; i < allUnitTypes.length; ++i) {
      unitType = allUnitTypes[i];

      if (unitType.cost > 0 && unitType.cost <= gold) {
        $tmpl.tmpl(unitType).css({ 'background-position': (unitType.tileX * -TILE_WIDTH)+ "px 0" }).appendTo($units);
      }
    }

    Dialog.show($factory);

  }

  SpellSiege.touchListener = function(tileX, tileY) {

    // Do nothing if there is no current player or if the player
    // is an AI.
    var player = Player.current;
    if (player === null || player.ai) {
      if (DEBUG) {
        console.log("It is not a human player's turn. Touch/click ignored.");
      }
      return;
    }

    var unit = Unit.at(tileX, tileY);

    if (Cursor.unit === null) {

      Cursor.moveTo(tileX, tileY);

      // If a unit was clicked and it belongs to the current player
      // then select it.
      if (unit && !unit.dead && unit.mode == MODE_READY && unit.player === player) {
        Unit.select(unit);

      } else {

        // Check to see if the player clicked a factory.
        var terrain = Map.terrainAt(tileX, tileY);
        if (terrain && terrain.factory && terrain.player === player) {
          showFactory();
        }

      }

    } else {

      // Always reset the arrow if it was previously displayed.
      Arrow.reset();

      // Touching the unit again advances it to the next state.
      if (Cursor.unit === unit) {
        Unit.nextMode(unit);

      } else if (Cursor.unit.mode === MODE_ATTACK) {
        if (Cursor.overlayAt(tileX, tileY) === OVERLAY_ATTACK_TARGET) {
          if (Cursor.targetAt(tileX, tileY)) {
            Cursor.clearOverlay();
            Unit.attack(Cursor.unit, Unit.at(tileX, tileY));
          } else {
            Cursor.target(tileX, tileY, MODE_ATTACK);
          }
        }

      } else if (Cursor.unit.mode === MODE_MOVE) {
        if (Cursor.overlayAt(tileX, tileY) === OVERLAY_MOVE_TARGET) {
          if (Cursor.targetAt(tileX, tileY)) {
            Unit.walk(Cursor.unit, tileX, tileY, true);
          } else {
            Cursor.target(tileX, tileY, MODE_MOVE);
            Arrow.showRoute(Cursor.unit, tileX, tileY);
          }
        }

      } else if (Cursor.unit.mode === MODE_RAISE) {
        if (Cursor.overlayAt(tileX, tileY) === OVERLAY_RAISE_TARGET) {
          if (Cursor.targetAt(tileX, tileY)) {
            Cursor.clearOverlay();
            Unit.raise(Cursor.unit, Pathfinder.possibleNodeAt(tileX, tileY));
          } else {
            Cursor.target(tileX, tileY, MODE_ATTACK);
          }
        }

      }

    }

  };

  Event.addListener(EVENT_TURN_START, function(e) {
    if (Player.turn > 1) {

      var ai = Player.current.ai;

      Tween.block();
      Dialog.showTmpl('#start-turn-tmpl', { income: e.player.ai ? '?' : e.income }, function() {
        if (ai) {
          setTimeout(Play.doStartTurn, DEBUG ? 10 : 1000);
        }
      });
    }
  });

  Event.addListener(EVENT_UNIT_MODE_CHANGE, function(unit) {

    var player = Player.current;
    if (unit.player === player && !player.ai) {

      if (unit.mode === MODE_CAPTURE) {
        Dialog.showTmpl('#capture-tmpl', Map.terrainAt(unit.x, unit.y));

      } else if (unit.mode === MODE_REPAIR) {
        Dialog.showTmpl('#repair-tmpl', Map.terrainAt(unit.x, unit.y));

      } else if (unit.mode === MODE_DONE) {
        Cursor.reset();

        var readyUnits = Unit.all.some(function(unit) {
          return (unit && !unit.dead && unit.player === player && unit.mode !== MODE_DONE);
        });

        if (!readyUnits) {
          Player.endTurn();
        }

      }


    }

  });

  Event.addListener(EVENT_UNIT_KILLED, function(unit) {

    // If the unit that was killed is also the currently selected
    // unit, then if the unit is controlled by a human player
    // we need to deselect the unit.
    if (Cursor.unit === unit) {

      var player = Player.current;
      if (unit.player === player && !player.ai) {
        Cursor.reset();

      }

    }
//    var unitsRemaining = allUnits.some(function(unit) {
//      return (unit && !unit.dead && unit.player === targetPlayer);
//    });
//
//    if (!unitsRemaining) {
//      Player.defeated(targetPlayer);
//    }

  });

  $(function() {

    SpellSiege.init();

    var $body = $('body');

    $body.on('click', '#unit-picker li', function() {

      var $li = $(this);
      var uid = $li.attr('uid');

      Play.doBuild(uid);

    });

    $body.on('keydown', function(e) {
      console.log(e.keyCode);

      if (e.keyCode === 32) {
        SpellSiege.pausePlay();
      } else if (e.keyCode === 83) {  // s
        SpellSiege.save();
      } else if (e.keyCode === 76) {  // l
        SpellSiege.load();
      } else if (e.keyCode === 80) {  // p
        SpellSiege.pause();
      } else if (e.keyCode === 81) { // q
        Player.endTurn();
      } else if (DEBUG) {

        if (Cursor.unit !== null) {
          if (e.keyCode === 69) { // e
            Effect.attack(Cursor.unit, function() {
              Effect.shake(Cursor.unit.actor);
            });
          } else if (e.keyCode === 70) { // f
            Effect.spark(Cursor.unit.actor.x, Cursor.unit.actor.y, function() {
              Cursor.unit.actor.visible = false;
              Effect.smoke(Cursor.unit.actor.x, Cursor.unit.actor.y, function() {
                Cursor.unit.actor.visible = true;
              });
            });
          } else if (e.keyCode === 71) { // g
            Unit.causeDamage(Cursor.unit, 100);
          } else if (e.keyCode === 72) { // h
            Effect.bounceText(Cursor.unit.actor, "+10");
          }
        }

      }
    });

    Level.start("2", function () {

      // During play, the first player is always human.
      Player.byId(PLAYER_BLUE).ai = false;

    });

  });

  return {

    doBuild: function(unitTypeId) {

      Dialog.hide(function() {
        var unitType = UnitType.byId(unitTypeId);
        Unit.build(Player.current, unitType, Cursor.tileX, Cursor.tileY);
      });

    },

    doCancel: function() {
      Dialog.hide(function() {
        Unit.nextMode(Cursor.unit);
      });

    },

    doCapture: function() {
      Dialog.hide(function() {
        Unit.capture(Cursor.unit);
      });
    },

    doRepair: function() {
      Dialog.hide(function() {
        Unit.repair(Cursor.unit);
      });
    },

    doStartTurn: function() {
      Dialog.hide(Tween.unblock);
    }

  };

})();
