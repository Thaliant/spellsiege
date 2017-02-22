UnitType = (function() {

  var UNIT_GREY_TILESET = loadTileset("units-grey.png");

  /** @const @type {int} */
  var DEFAULT_ACTIVE_DURATION = 1000;

  var allTypes    = [ ];
  var typesById   = { };

  return {

    all: allTypes,

    attackBonus: function(attackerType, defenderType) {
      return (defenderType && attackerType.attackBonuses[defenderType.id]) || 0;
    },

    byId: function(id) {
      return typesById[id];
    },

    create: function(id, name, opt) {

      var u = {
        id:               id,
        name:             name,

        // Stats
        attack:           opt.attack,
        attackBonus:      opt.attackBonus,
        bash:             opt.bash      || 0,
        berzerk:          opt.berzerk   || 0,
        bless:            opt.bless     || 0,
        capture:          opt.capture   || 0,
        cost:             opt.cost,
        defense:          opt.defense,
        explosive:        opt.explosive || 0,
        grave:            opt.grave,
        hitpoints:        opt.hitpoints,
        movement:         opt.movement  || UNIT_DEFAULT_MOVEMENT,
        poison:           opt.poison    || 0,
        rangeMin:         opt.rangeMin,
        rangeMax:         opt.rangeMax,
        tileX:            opt.tileX,

        // Flags
        attackBeforeMove: (opt.attackBeforeMove === true),
        attackOrMove:     (opt.attackOrMove === true),
        demolish:         (opt.demolish === true),
        firstStrike:      (opt.firstStrike === true),
        raise:            (opt.raise === true),
        repair:           (opt.repair === true),
        undead:           (opt.undead === true),

        // Stat hashes
        attackBonuses:    { },
        movementCosts:    { }

      };

      allTypes.push(u);
      typesById[id] = u;

      return u;
    },

    movementCost: function(type, terrain) {

      var costs = type.movementCosts;
      return (costs && costs[terrain.id]) || terrain.movement;

    },

    spriteFor: function(type, player) {

      // Instantiate the player's hash of sprites by unit
      // ID if it doesn't already exist.
      if (isNull(player.unitSprites)) {
        player.unitSprites = { };
      }

      // Check to see if this sprite has already been created.
      // If not, create it.
      var sprite = player.unitSprites[type.id];
      if (isNull(sprite)) {

        sprite = Sprite.create();

        var x = type.tileX;

        var frames = [ [x, 0], [x, 1] ];

        Sprite.addState(sprite, {
          id:       MODE_DONE,
          tileset:  UNIT_GREY_TILESET,
          duration: [ frames[0] ],     // Only the first frame when not ready.
          frames:   frames
        });

        Sprite.addState(sprite, {
          id:       MODE_READY,
          tileset:  player.tileset,
          duration: DEFAULT_ACTIVE_DURATION,
          frames:   frames
        });

        Sprite.addState(sprite, {
          id:       MODE_MOVE,
          tileset:  player.tileset,
          duration: Math.round(DEFAULT_ACTIVE_DURATION / 6),
          frames:   frames
        });

        player.unitSprites[type.id] = sprite;

      }

      return sprite;
    },

    toString: function(u) {
      return u.name;
    }

  };
})();
