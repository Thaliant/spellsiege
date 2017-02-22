Wizard = (function() {

  var MOVEMENT_COSTS = { };

  [ TERRAIN_BRUSH, TERRAIN_FOREST, TERRAIN_PLAINS ].forEach(function(t) {
    MOVEMENT_COSTS[t] = UNIT_DEFAULT_MOVEMENT;
  });
  
  function scale(l, n) {
    return Math.floor(l / n);
  }

  function stat(n) {
    return Math.floor((rand(10) - 1) / n);
  }

  return {
    create: function(player, level, x, y) {

      var basetype = UnitType.byIcon('w');

      var wizardtype = { };

      for (var key in basetype) {
        if (basetype.hasOwnProperty(key)) {
          wizardtype[key] = basetype[key];
        }
      }

      wizardtype.attack        = 1 + stat(2) + scale(level, 2);
      wizardtype.defense       = 1 + stat(2) + scale(level, 2);
      wizardtype.movementCosts = MOVEMENT_COSTS;
      wizardtype.resistance    = 6 + stat(4);
      wizardtype.alignment     = (rand(10) > (5 - scale(level, 2)) ? stat(4) : 0);
      wizardtype.wizard        = true;

      var wizard = Unit.create(wizardtype, player, x, y);

      var spells = Math.min(20, 12 + stat(2)) - 1;
      for (var i = 0; i < spells; ++i) {
        Spell.learn(wizard);
      }

      return wizard;
    }
  };
})();
