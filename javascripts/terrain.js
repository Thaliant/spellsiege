Terrain = (function() {

  var all  = [ ];
  var byId = { };

  return {

    all: all,

    byId: function(id) {
      return byId[id];
    },

    create: function create(id, name, opt) {

      var t = {
        id:       id,
        name:     name,
        category: (opt.category || null),
        defense:  (opt.defense  || 0),
        demolish: (opt.demolish || null),
        factory:  (opt.factory === true),
        heal:     (opt.heal     || 0),
        movement: (opt.movement || NOT_PASSABLE),
        repair:   (opt.repair   || null),
        tileX:    opt.tileX * TILE_WIDTH,
        tileY:    opt.tileY * TILE_HEIGHT
      };

      var capture = opt.capture  || 0;
      if (capture > 0) {
        t.capture  = capture;
        t.income   = opt.income || 0;
        t.player   = Player.byId(opt.player);
      }

      all.push(t);

      byId[id] = t;

      return t;
    },

    isCaptureable: function(terrain, unit) {
      return (terrain && unit && terrain.capture && unit.type.capture >= terrain.capture && terrain.player !== unit.player);
    },

    isPassable: function(terrain, unitType) {
      var cost = UnitType.movementCost(unitType, terrain);
      return (cost > 0 && cost < NOT_PASSABLE);
    },

    isRepairable: function(terrain, unit) {
      return (terrain && unit && terrain.repair && unit.type.repair);
    },

    willHeal: function(terrain, unit) {
      return (terrain && unit && terrain.heal > 0 && (isNull(terrain.player) || terrain.player === unit.player));
    },

    toString: function(t) {
      return t.name;
    }
  };
})();
