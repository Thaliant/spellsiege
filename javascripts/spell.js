var SPELL_DISBELIEVE;

Spell = (function() {

  /** @const @type {int} */
  var ALIGNMENT_EVIL = -1;

  /** @const @type {int} */
  var ALIGNMENT_NEUTRAL = 0;

  /** @const @type {int} */
  var ALIGNMENT_GOOD = 1;

  /** @const @type {int} */
  var DEFAULT_RARITY = 7;

  /** @const @type {int} */
  var DEFAULT_CAST_CHANCE = 45;

  /** @const @type {int} */
  var ALIGNMENT_MODIFIER = 5;

  /** @const @type {int} */
  var MIN_CAST_CHANCE    = 0;

  /** @const @type {int} */
  var MAX_CAST_CHANCE    = 9;

  /** @const @type {int} */
  var DEFAULT_PRIORITY   = 18;

  /** @type {int} */
  var id           = 0;

  var allSpells    = [ ];
  var spellsById   = { };

  function create(name, opt, onCast) {

    var s = {
      id:          ++id,
      name:        name,
      alignment:   opt.alignment   || ALIGNMENT_NEUTRAL,
      castChance:  opt.castChance  || DEFAULT_CAST_CHANCE,
      priority:    opt.priority    || DEFAULT_PRIORITY,
      rarity:      opt.rarity      || DEFAULT_RARITY,
      rangeMin:    opt.rangeMin    || 1,
      rangeMax:    opt.rangeMax    || 2
    };

    // If the spell supports being cast at a target (at will point to the
    // target resolution function) then set the max number of targets too.
    if (opt.at) {
      s.at        = opt.at;
      s.targetMax = opt.targetMax || 1;
    } else {
      s.targetMax = 0;
    }

    s.onCast = onCast;

    allSpells.push(s);
    spellsById[id] = s;

    return s;
  }

  var ANY_UNIT_TARGET = function(unit, spell, at) {
    return (at.unit && !at.unit.dead);
  };

  var ENEMY_TARGETS = function(unit, spell, at) {
    return (at.unit && !at.unit.dead && at.unit.player !== unit.player);
  };

  var FRIENDLY_TARGETS = function(unit, spell, at) {
    return (at.unit && !at.unit.dead && at.unit.player === unit.player);
  };

  var PASSABLE_TARGETS = function(unit, spell, at) {
    return !at.unit && Terrain.isPassable(at.terrain, spell.unittype);
  };

  var SUMMON_SPELL = function(unit, spell, at) {
    if (DEBUG) {
      console.log(Unit.toString(unit) + " summons " + UnitType.toString(spell.unittype) + " (" + (Cursor.illusionary ? 'Illusionary' : 'Real') + ") at " + at.x + "," + at.y);
    }
    Unit.create(spell.unittype, unit.player, at.x, at.y, { illusionary: Cursor.illusionary });
  };

  SPELL_DISBELIEVE = create("Disbelieve", { castChance: 100, rangeMax: 8, at: ENEMY_TARGETS }, function(unit, spell, at) {
    if (at.unit.illusionary) {
      Unit.kill(at.unit);
    }
  });

  create("Darkness", { alignment: ALIGNMENT_EVIL, castChance: 9 }, function(unit, spell, at) {
    Map.alignment -= 1;
  });

  create("Genocide", { alignment: ALIGNMENT_EVIL, castChance: 4, rarity: 4, rangeMax: 2, at: ANY_UNIT_TARGET  }, function(unit, spell, at) {

    var targetType = at.unit.type;

    if (DEBUG) {
      console.log("Genocide was cast on " + UnitType.toString(targetType));
    }

    var units = Unit.all;
    var totalUnits = units.length - 1;
    var target;

    for (var i = totalUnits; i >= 0; --i) {
      target = units[i];

      if (target.type === targetType) {
        if (!target.illusionary && Unit.savingThrow(target, rand(11))) {
          Unit.kill(target);
        } else if (DEBUG) {
          console.log(Unit.toString(target) + " survived genocide!");
        }
      }

    }

  });

  create("Heal", { alignment: ALIGNMENT_NEUTRAL, castChance: 7, rangeMax: 5, at: FRIENDLY_TARGETS }, function(unit, spell, at) {
    at.unit.hitpoints = at.unit.type.hitpoints;
  });

  create("Light", { alignment: ALIGNMENT_GOOD, castChance: 9 }, function(unit, spell, at) {
    Map.alignment += 1;
  });

  create("Subvert", { castChance: 9, rangeMax: 4, at: ENEMY_TARGETS }, function(unit, spell, at) {

    var target = at.unit;
    if (!target.illusionary && Unit.savingThrow(target, rand(10))) {
      target.player = unit.player;
      target.mode   = MODE_DONE;
      if (DEBUG) {
        console.log(Unit.toString(target) + " is now controlled by " + Player.toString(unit.player));
      }
    } else {
      if (DEBUG) {
        console.log("Subversion of " + Unit.toString(target) + " fails");
      }
    }

  });

  create("Turmoil", { castChance: 9, rarity: 1 }, function(unit, spell, at) {

    var units = Unit.all;

    // Move all of the units (except the one that cast the spell) off
    // the map.
    Unit.all.forEach(function(otherUnit) {
      if (otherUnit !== unit) {
        otherUnit.x = -1;
        otherUnit.y = -1;
      }
    });

    var height = Map.height();
    var width  = Map.width();

    var otherUnitType;
    var x;
    var y;

    // Randomly reposition all of the units back on the map.  Make a
    // reasonable attempt to put them somewhere where they are otherwise
    // allowed to go and not on top of other units.
    Unit.all.forEach(function(otherUnit) {
      if (otherUnit !== unit) {

        otherUnitType = otherUnit.type;

        for (var i = 0; i < 10; ++i) {

          x = rand(width);
          y = rand(height);

          if (Terrain.isPassable(Map.terrainAt(x, y), otherUnitType)) {
            if (Unit.at(x, y) === null) {
              break;
            }
          }

        }

        otherUnit.x = x;
        otherUnit.y = y;

      }
    });

  });

  return {

    byId: function(id) {
      return spellsById[id];
    },

    cast: function(unit, spell, node) {

      if (DEBUG) {
        console.log(Unit.toString(unit) + " casts " + Spell.toString(spell) + (node ? " at " + node.x + "," + node.y : ""));
      }

      if (spell.type !== SPELL_DISBELIEVE) {
        unit.spells.remove(spell);
      }

      // Illusionary spells always succeed, otherwise determine if the spell
      // is successfully cast.
      var castChance = Cursor.illusionary ? 10 : Spell.getCastChance(spell);
      var castRoll   = rand(10);

      if (DEBUG) {
        console.log(Unit.toString(unit) + " must roll a " + castChance + " or less to cast " + Spell.toString(spell));
        console.log(Unit.toString(unit) + " rolls " + castRoll);
      }

      if (castRoll <= castChance) {

        if (DEBUG) {
          console.log(Unit.toString(unit) + " successfully casts " + Spell.toString(spell));
        }

        // This is the callback that triggers the spell to be cast
        // and which must be executed
        var afterEffect = function() {
          spell.onCast(unit, spell, node);
          Unit.nextMode(unit);
        };

        if (!isNull(node)) {
          Effect.projectile(unit.x, unit.y, node.x, node.y, afterEffect);
        } else {
          afterEffect();
        }

      } else {

        if (DEBUG) {
          console.log(Unit.toString(unit) + " fails to cast " + Spell.toString(spell));
        }

        Unit.nextMode(unit);
      }

    },

    createSummon: function(unittype, castChance) {

      var s = create(unittype.name, { alignment:  unittype.alignment, castChance: castChance, at: PASSABLE_TARGETS }, SUMMON_SPELL);

      // The spell's callback functions need this property to perform the summon.
      s.unittype    = unittype;
      s.illusionary = true;

    },

    getCastChance: function(spell) {

      var chance = spell.castChance;

      // This will hold the computed alignment adjustment based on the
      // world's state and all of the units that are currently in
      // the game.
      var alignment = Spell.alignment;

      Unit.all.forEach(function(unit) {
        alignment += unit.type.alignment;
      });

      if (alignment !== ALIGNMENT_NEUTRAL) {

        var modifier = alignment / ALIGNMENT_MODIFIER;

        // Only modify the cast chance if the alignment of the world
        // matches the alignment of the spell.
        if ((spell.alignment === ALIGNMENT_GOOD && alignment > 0) ||
            (spell.alignment === ALIGNMENT_EVIL && alignment < 0)) {
          chance += modifier;
        }

      }

      if (chance < MIN_CAST_CHANCE) {
        chance = MIN_CAST_CHANCE;
      } else if (chance > MAX_CAST_CHANCE) {
        chance = MAX_CAST_CHANCE;
      }

      return chance;
    },

    isTarget: function(unit, spell, node) {

      var possible = false;

      if (spell.at) {
        possible = spell.at(unit, spell, node);
      }

      return possible;
    },

    learn: function(unit, spell) {

      if (!spell) {

        var totalRarity = 0;
        var totalSpells = allSpells.length;
        var minSpellID  = SPELL_DISBELIEVE.id + 1;

        // Starting at index in order to skip DISBELIEVE.  All wizards
        // always know DISBELIEVE.
        for (var i = minSpellID; i < totalSpells; ++i) {
          totalRarity += allSpells[i].rarity;
        }

        var rarity = rand(totalRarity);

        for (i = minSpellID; i < totalSpells; ++i) {
          spell = allSpells[i];

          rarity -= spell.rarity;
          if (rarity <= 0) {
            break;
          }

        }

      }

      unit.spells.push(spell);

      if (DEBUG) {
        console.log(Unit.toString(unit) + " has learned " + Spell.toString(spell));
      }

    },

    select: function(spell) {

      if (DEBUG) {
        console.log(Unit.toString(Cursor.unit) + " has selected " + Spell.toString(spell));
      }

      if (spell.targets > 0) {

        Cursor.spell = spell;

        Pathfinder.plotCastOverlay(Cursor.unit, spell);

      } else {
        Spell.cast(Cursor.unit, spell, null);

      }

    },

    // This function can be used to sort.
    sort: function(s1, s2) {
      return s1.name.localeCompare(s2.name);
    },

    toString: function(spell) {
      return "Spell#" + spell.id + spell.name;
    }

  };
})();