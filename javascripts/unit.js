Unit = (function() {

  // An array of unit objects available to be reused.
  var unitPool = Pool.create(true, DEBUG ? "unit" : null);

  // An array of all active units.
  var allUnits  = unitPool.active;

  // Internal handler for applying a specific amount of damage
  // to the designated target.  If the damage exceeds the target's
  // remaining hitpoints, the target is killed.
  function applyDamage(target, amount, callback) {

    if (amount > 0) {

      var afterAnimation = function() {

        // Re-enable the hitpoints overlay.
        target.drawOverlay = true;

        if (amount >= target.hitpoints) {
          Unit.kill(target, callback);

        } else {
          setHitpoints(target, target.hitpoints - amount);

          // Target takes a defense penalty for having sustained damage.
          target.defense -= 1;

          trigger(callback);

        }
      };

      // Temporarily disable the hitpoints overlay.
      target.drawOverlay = false;

      var actor = target.actor;
      actor.overlay = null;

      Effect.shake(actor, function() {
        Effect.bounceText(actor, "-" + amount, afterAnimation);
      });

    } else {
      trigger(callback);

    }

  }

  function performAttack(attacker, defender, callback) {

    if (Unit.isUnitInAttackRange(attacker, defender)) {

      // If the attacker is capable of splash damage, we need to get
      // the adjacent units /first/ because if the defender is killed
      // during the attack, we can't get them later.
      var splashDamage = attacker.type.explosive;
      var splashUnits  = null;
      if (splashDamage > 0) {
        splashUnits = Unit.adjacentUnits(defender);
      }

      var damage = Unit.calculateDamage(attacker, defender, RANDOM_ATTACKS);
      Unit.causeDamage(defender, damage, function() {

        // If the defender was killed in the attack, the attacker
        // earns an attack bonus.
        if (defender.dead) {
          attacker.attack += 1;
        }

        // If there are units to receive splash damage, iterate through
        // them and apply the damage.
        if (splashUnits !== null) {

          splashDamage = scaleByDamaged(attacker, splashDamage);

          // This will hold the number of units affected by the
          // splash damage.  Each time a unit completes it's animation
          // cycle, this will be decremented and when it reaches zero
          // the original callback will be triggered.
          var totalUnitsAffected = splashUnits.length;

          var afterDamage = function() {
            totalUnitsAffected--;
            if (totalUnitsAffected === 0) {
              trigger(callback);
            }
          };

          var adjacentUnit;
          for (var i = 0; i < totalUnitsAffected; ++i) {
            adjacentUnit = splashUnits[i];

            damage = splashDamage - Unit.calculateDefense(adjacentUnit);
            if (damage < 0) {
              damage = 0;
            } else if (RANDOM_ATTACKS) {
              damage = rand(damage);
            }

            if (DEBUG) {
              console.log(Unit.toString(adjacentUnit) + " receives " + damage + " splash damage");
            }

            Unit.causeDamage(adjacentUnit, damage, afterDamage);

          }

        } else {
          trigger(callback);
        }

      });

    } else {
      trigger(callback);

    }

  }

  function performBash(attacker, from, callback) {

    // Determine which direction the attacker was moving by getting
    // the difference from their current position and their previous
    // position - this dictates where we'll look for the bash.
    var dx = attacker.x - from.x;
    var dy = attacker.y - from.y;

    // Calculate the position that will be bashed based on the
    // direction that the attacker was moving.
    var bx = attacker.x + dx;
    var by = attacker.y + dy;

    var target = Unit.at(bx, by);
    if (target && target.player !== attacker.player) {

      // Calculate the amount of damage done as a result of this bash.
      var damage = scaleByDamaged(target, target.type.bash);
      if (RANDOM_ATTACKS) {
        damage = rand(damage);
      }

      if (DEBUG) {
        console.log(Unit.toString(attacker) + " does " + damage + " bash damage to " + Unit.toString(target));
      }

      if (damage > 0) {
        applyDamage(target, damage, callback);

      } else {

        // Let's animate the bash so the player understands it happens
        // but no damage was caused.
        Effect.shake(target.actor, callback);

      }

    } else {
      trigger(callback);
    }

  }

  function scaleByDamaged(unit, amount) {
    return Math.round(amount * (unit.hitpoints / unit.type.hitpoints));
  }

  function setHitpoints(target, hitpoints) {

    if (hitpoints < 0) {
      hitpoints = 0;
    } else if (hitpoints > target.type.hitpoints) {
      hitpoints = target.type.hitpoints;
    }

    target.hitpoints = hitpoints;

    // Clear the prerendered hitpoints image so that it will
    // be re-rendered with the updated value.
    target.actor.overlay = null;

  }

  return {

    adjacentUnits: function(unit, cb) {

      var totalUnits = allUnits.length;

      // Check to see if a callback has been provided.  If not, we're
      // returning an array of the adjacent units.
      var callbackProvided = !isNull(cb);

      // Will be populated and returned if there is no callback provided.
      var otherUnits = null;

      var minX = unit.x - 1;
      var minY = unit.y - 1;
      var maxX = unit.x + 1;
      var maxY = unit.y + 1;

      var otherUnit;
      for (var i = 0; i < totalUnits; ++i) {
        otherUnit = allUnits[i];

        if (otherUnit && otherUnit !== unit && !otherUnit.dead) {
          if (otherUnit.x >= minX && otherUnit.x <= maxX) {
            if (otherUnit.y >= minY && otherUnit.y <= maxY) {

              // Notify the callback if one was provided otherwise
              // instantiate the array if necessary and then add the
              // adjacent unit to the list.
              if (callbackProvided) {
                cb(otherUnit);
              } else {
                if (otherUnits === null) {
                  otherUnits = [];
                }

                otherUnits.push(otherUnit);
              }

            }
          }
        }
      }

      return otherUnits;
    },

    all: allUnits,

    at: function(x, y) {

      var totalUnits = allUnits.length;

      var unit;
      for (var i = 0; i < totalUnits; ++i) {
        unit = allUnits[i];
        if (unit.x == x && unit.y == y) {
          return unit;
        }
      }

      return null;
    },

    attack: function(attacker, defender, callback) {

      if (DEBUG) {
        console.log(Unit.toString(attacker) + " is attacking " + Unit.toString(defender));
      }

      var originalAttacker = attacker;

      // Ensure that the attacker is always marked as having
      // performed their attack
      attacker.attacked = true;

      // If the unit is only allowed to attack or move during their
      // turn, then prohibit future movement.
      if (attacker.type.attackOrMove) {
        attacker.moved = true;
      }

      // The attacker always gets first strike unless the defender
      // has strike advantage and the attacker is not also flagged
      // for firstStrike.
      if (defender.type.firstStrike && !attacker.type.firstStrike) {

        if (DEBUG) {
          console.log(Unit.toString(defender) + " strikes first!");
        }

        attacker = defender;
        defender = originalAttacker;

      }

      // This is what needs to be done at the conclusion of the attack
      // which ensures the original attacking unit is marked as having
      // completed their attack and then the original callback to the
      // method is triggered.
      var afterAttack = function() {
        Unit.nextMode(originalAttacker);
        trigger(callback);
      };

      // Need to double-check the viability of the attack because
      // the attacker and defender may have switched if the defender
      // gets first attack.
      performAttack(attacker, defender, function() {
        if (!defender.dead) {
          performAttack(defender, attacker, afterAttack);
        } else {
          afterAttack();
        }
      });

    },

    build: function(player, unitType, x, y) {
      var unit = null;

      if (unitType && unitType.cost <= player.gold) {

        player.gold -= unitType.cost;

        unit = Unit.create(unitType, player, x, y);

        // Newly constructed units can not be moved until
        // the next turn.
        Unit.setMode(unit, MODE_DONE);

        if (DEBUG) {
          console.log(Player.toString(player) + " has built " + UnitType.toString(unitType) + " at " + x + "," + y + " and has " + player.gold + " left");
        }

      }

      return unit;
    },

    calculateAttack: function(attacker, defender) {

      var player       = attacker.player;
      var attackerType = attacker.type;
      var berzerkBonus = 0;

      // Sum the berzerk bonus for all adjacent units.
      Unit.adjacentUnits(attacker, function(otherUnit) {
        if (otherUnit.player === player) {
          berzerkBonus += otherUnit.type.berzerk;
        }
      });

      // Check to see if the attacker earns a bonus against the
      // defender's type.
      var targetBonus = UnitType.attackBonus(attackerType, defender.type);

      return attackerType.attack + attacker.attack + berzerkBonus + targetBonus;
    },

    calculateDefense: function(unit) {

      var terrainBonus = Map.terrainAt(unit.x, unit.y).defense;
      var blessBonus   = 0;

      var unitType     = unit.type;
      var player       = unit.player;

      Unit.adjacentUnits(unit, function(otherUnit) {
        if (otherUnit.player === player) {
          blessBonus += otherUnit.type.bless;
        }
      });

      return unitType.defense + unit.defense + blessBonus + terrainBonus;
    },

    calculateDamage: function(attacker, defender, randomize) {

      var damage  = 0;

      var attack  = Unit.calculateAttack(attacker, defender);
      var defense = Unit.calculateDefense(defender);
      if (attack > defense) {

        var attackerType  = attacker.type;

        damage = scaleByDamaged(attacker, attack - defense);

        if (randomize) {
          damage += rand(attackerType.attackBonus);

        } else {

          // The AI passes false when evaluating units so in this
          // case we're returning the maximum possible damage that
          // the unit is capable of inflicting.
          damage += attackerType.attackBonus;

        }

        if (false && DEBUG) {
          console.log(Unit.toString(attacker) + "(" + attack + ") vs " + Unit.toString(defender) + "(" + defense + ") = " + damage + " damage");
        }

      }

      return damage;
    },

    capture: function(unit) {

      var terrain = Map.terrainAt(unit.x, unit.y);
      if (terrain && Terrain.isCaptureable(terrain, unit)) {

        var allTerrain = Terrain.all;
        var totalTerrain = allTerrain.length;
        var newTerrain;

        for (var i = 0; i < totalTerrain; ++i) {
          newTerrain = allTerrain[i];

          if (newTerrain.capture === terrain.capture) {
            if (newTerrain.player === unit.player) {

              Map.setTerrainAt(unit.x, unit.y, newTerrain);

              Unit.setMode(unit, MODE_DONE);

              if (DEBUG) {
                console.log(Unit.toString(unit) + " has captured " + Terrain.toString(newTerrain));
              }

              return true;

            }
          }

        }

      }

      if (DEBUG) {
        console.log(Unit.toString(unit) + " could not capture " + Terrain.toString(terrain));
      }

      return false;
    },

    causeDamage: function(target, amount, callback) {

      Effect.attack(target.actor, function() {
        applyDamage(target, amount, callback);
      });

    },

    clear: function() {
      while (allUnits.length > 0) {
        Unit.destroy(allUnits[allUnits.length - 1]);
      }
    },

    create: function(type, player, tileX, tileY) {

      var sprite = UnitType.spriteFor(type, player);

      var actor = Actor.create(sprite, tileX * TILE_WIDTH, tileY * TILE_HEIGHT);

      var u = unitPool.allocate();

      u.type             = type;
      u.player           = player;
      u.actor            = actor;
      u.hitpoints        = type.hitpoints;
      u.mode             = MODE_READY;
      u.x                = tileX;
      u.y                = tileY;

      // modifiers and totals
      u.attack           = 0;
      u.defense          = 0;
      u.aiActualWeight   = 0;
      u.aiRelativeWeight = 0;

      // flags
      u.dead             = false;
      u.drawOverlay      = false;
      u.moved            = false;
      u.mustSurvive      = false;
      u.attacked         = false;
      u.captured         = false;
      u.raised           = false;

      return u;
    },

    destroy: function(unit) {

      Actor.destroy(unit.actor);

      unit.actor  = null;
      unit.dead   = true;
      unit.type   = null;
      unit.player = null;
      unit.x      = -1;
      unit.y      = -1;

      unitPool.deallocate(unit);

    },

    eachForPlayer: function(player, callback) {

      var unit;
      var totalUnits = allUnits.length;
      for (var i = 0; i < totalUnits; ++i) {
        unit = allUnits[i];
        if (unit.player === player && !unit.dead) {
          callback(unit);
        }
      }

    },

    endTurn: function(unit) {

      // Mark the unit as having completed it's action.
      Unit.setMode(unit, MODE_DONE);

      // Force the actor back to ready state so it shows up in
      // color to all the other players.
      Actor.setState(unit.actor, MODE_READY);

    },

    isInAttackRange: function(attacker, x, y) {
      var ds = Pathfinder.manhattanDistance(attacker.x, attacker.y, x, y);
      var attackerType = attacker.type;
      return (ds >= attackerType.rangeMin && ds <= attackerType.rangeMax);
    },

    isUnitInAttackRange: function(attacker, target) {
      return Unit.isInAttackRange(attacker, target.x, target.y);
    },

    kill: function(target, callback) {

      setHitpoints(target, 0);

      target.dead      = true;
      target.mode      = MODE_DONE;

      var x = target.actor.x;
      var y = target.actor.y;

      Effect.spark(x, y, function() {

        target.actor.visible = false;

        if (!isNull(target.type.grave)) {
          Grave.create(target);
        }

        Effect.smoke(x, y, function() {

          Event.dispatch(EVENT_UNIT_KILLED, target);

          Unit.destroy(target);

          trigger(callback);

        });

      });

    },

    load: function(state, player) {

      var u = Unit.create(
          UnitType.byId(state[PERSIST_TYPE]),
          player,
          state[PERSIST_X],
          state[PERSIST_Y]
      );

      if (state[PERSIST_ATTACK]) {
        u.attack = state.attack;
      }
      if (state[PERSIST_DEFENSE]) {
        u.defense = state.defense;
      }
      if (state[PERSIST_HITPOINTS]) {
        u.hitpoints   = state.hitpoints;

        // Ensure the draw overlay is set properly.
        u.drawOverlay = u.hitpoints < u.type.hitpoints;

      }
      if (state[PERSIST_MUST_SURVIVE]) {
        u.mustSurvive = true;
      }

      var current = state[PERSIST_CURRENT];
      if (!isNull(current)) {
        u.moved            = current[PERSIST_MOVED];
        u.attacked         = current[PERSIST_ATTACKED];
        u.captured         = current[PERSIST_CAPTURED];
      }

    },

    move: function(unit, x, y) {

      unit.x     = x;
      unit.y     = y;

      // Reset the unit's capture flag because they may moved from a
      // non-captured building to another one, not capturing the first
      // but wanting the second.
      unit.captured = false;

      unit.actor.x = x * TILE_WIDTH;
      unit.actor.y = y * TILE_HEIGHT;

      // If the unit is only allowed to attack or move during their
      // turn, then make sure the attack flag is set.
      if (unit.type.attackOrMove) {
        unit.attacked = true;
      }

      Unit.nextMode(unit);

      Event.dispatch(EVENT_UNIT_MOVED, unit);

    },

    nextMode: function(unit) {

      if (unit.mode !== MODE_DONE) {

        var newMode = MODE_DONE;

        if (!unit.dead) {

          if (unit.mode === MODE_CAPTURE || unit.mode === MODE_REPAIR) {
            unit.captured = true;

          } else if (unit.mode === MODE_RAISE) {
            unit.raised = true;

          } else if (unit.mode === MODE_ATTACK) {
            unit.attacked = true;

          } else if (unit.mode === MODE_MOVE) {
            unit.moved = true;

          }

          var unitType = unit.type;
          var terrain  = Map.terrainAt(unit.x, unit.y);

          if (!unit.captured && Terrain.isCaptureable(terrain, unit)) {
            newMode = MODE_CAPTURE;

          } else if (!unit.captured && Terrain.isRepairable(terrain, unit)) {
            newMode = MODE_REPAIR;

          } else if (!unit.raised && unitType.raise && unit.moved) {
            newMode = MODE_RAISE;

          } else if (!unit.attacked && (unit.moved || unitType.attackBeforeMove)) {
            newMode = MODE_ATTACK;

          } else if (!unit.moved) {
            newMode = MODE_MOVE;

          }
        }

        Unit.setMode(unit, newMode);
      }

    },

    raise: function(unit, targetNode, callback) {

      var grave = Grave.at(targetNode.x, targetNode.y);

      Grave.raise(grave, unit.player, function() {
        Unit.setMode(unit, MODE_DONE);
        trigger(callback);
      });

    },

    repair: function(unit) {

      var oldTerrain = Map.terrainAt(unit.x, unit.y);
      if (oldTerrain && Terrain.isRepairable(oldTerrain, unit)) {

        var newTerrain = Terrain.byId(oldTerrain.repair);
        if (newTerrain) {

          Map.setTerrainAt(unit.x, unit.y, newTerrain);
          Unit.setMode(unit, MODE_DONE);

          return true;
        }

      }

      return false;
    },

    save: function(unit) {

      var state = {};

      state[PERSIST_TYPE] = unit.type.id;
      state[PERSIST_X]    = unit.x;
      state[PERSIST_Y]    = unit.y;

      if (unit.attack !== 0) {
        state[PERSIST_ATTACK] = unit.attack;
      }
      if (unit.defense !== 0) {
        state[PERSIST_DEFENSE] = unit.defense;
      }
      if (unit.hitpoints < unit.type.hitpoints) {
        state[PERSIST_HITPOINTS] = unit.hitpoints;
      }
      if (unit.mustSurvive) {
        state[PERSIST_MUST_SURVIVE] = true;
      }

      // Only save the extended attributes for this unit
      // if the game has progressed beyond the first turn.
      if (Player.turn !== 0) {

        var current = {};

        current[PERSIST_MODE]     = unit.mode;
        current[PERSIST_MOVED]    = unit.moved;
        current[PERSIST_ATTACKED] = unit.attacked;
        current[PERSIST_CAPTURED] = unit.captured;
        current[PERSIST_RAISED]   = unit.raised;

        state[PERSIST_CURRENT] = current;

      }

      return state;
    },

    select: function(unit) {

      Cursor.unit = unit;
      Cursor.moveTo(unit.x, unit.y);

      Renderer.focusOnTile(unit.x, unit.y);

      if (Player.current === unit.player) {
        if (unit.mode === MODE_READY) {
          Unit.nextMode(unit);
        }

      } else {
        Pathfinder.plotAttackOverlay(unit);

      }

    },

    setMode: function(unit, mode) {
      if (unit.mode !== mode) {

        Cursor.clearOverlay();

        unit.mode = mode;

        if (mode === MODE_ATTACK) {
          Pathfinder.plotAttackOverlay(unit);
        } else if (mode === MODE_RAISE) {
          Pathfinder.plotRaiseOverlay(unit);
        } else if (mode === MODE_MOVE) {
          Pathfinder.plotMovementOverlay(unit);
        } else if (mode === MODE_DONE) {
          Actor.setState(unit.actor, MODE_DONE);
        }

        Event.dispatch(EVENT_UNIT_MODE_CHANGE, unit);

      }
    },

    startTurn: function(unit) {

      unit.defense  = 0;
      unit.mode     = MODE_READY;
      unit.moved    = false;
      unit.attacked = false;
      unit.captured = false;
      unit.raised   = false;

      // Check to see if the unit is damaged.
      var damage = unit.type.hitpoints - unit.hitpoints;
      if (damage > 0) {

        // Check to see if the unit is standing on terrain that
        // will heal them.  If the terrain belongs to a specific
        // player it will only heal the unit if it belongs to
        // the player.
        var terrain = Map.terrainAt(unit.x, unit.y);
        if (Terrain.willHeal(terrain, unit)) {

          var heal = terrain.heal;
          if (heal > damage) {
            heal = damage;
          }

          Effect.bounceText(unit.actor, "+" + heal, function() {
            setHitpoints(unit, unit.hitpoints + heal);
          });

        }

      }

    },

    toString: function(unit) {
      return Player.toString(unit.player) + " " + unit.type.name + "#" + unit.id;
    },

    walk: function(unit, x, y, track, callback) {

      // This is the ID of the unit's current state which it will
      // return to once it has completed it's walk.
      var preWalkStateId = unit.actor.state.id;

      // Resolve the path that unit will follow to reach the destination.
      var path = Pathfinder.getPath(unit, x, y);

      // True if the path is valid.
      var isPathValid = (path && path.length > 0);

      // The callback triggered once the unit has reached its destination
      // (after animation, etc.).
      var afterWalk = function() {

        if (track) {
          Renderer.focusOnActor(null);
          Cursor.moveTo(x, y);
        }

        Actor.setState(unit.actor, preWalkStateId);
        Unit.move(unit, x, y);

        // Check to see if the unit is capable of performing bash attacks
        // by running into other units.  If so, grab the 2nd-to-last position
        // the unit moved from (so that the bash direction can be resolved)
        // and then perform the bash attack.
        if (unit.type.bash > 0 && path.length > 1) {
          var from = path[path.length - 2];
          performBash(unit, from, callback);

        } else {
          trigger(callback);

        }
      };

      if (track) {
        Cursor.hide();
        Renderer.focusOnActor(Cursor.unit.actor);
      }

      if (isPathValid) {
        Actor.setState(unit.actor, MODE_MOVE);
        Effect.walk(unit, path, afterWalk);
      } else {
        afterWalk();
      }

    }

  };
})();

