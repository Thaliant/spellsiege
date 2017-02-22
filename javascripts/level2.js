Level.create("2", "Temple Assault", {

  init: function() {
    console.error("LEVEL 2 init()");
  },

  onComplete: function() {
    console.error("LEVEL 2 onComplete()");
  },

  onEnd: function() {
    console.error("LEVEL 2 onEnd()");
  },

  onStart: function() {
    console.error("LEVEL 2 onStart()");

    SpellSiege.setPlaying(true);
  },

  onTurnEnd: function(player) {
    console.error("LEVEL 2 onTurnEnd(" + Player.toString(player) + ")");
  },

  onTurnStart: function(e) {
    console.error("LEVEL 2 onTurnStart(" + Player.toString(e.player) + ")");
  },

  onUnitMoved: function(unit) {
    console.error("LEVEL 2 onUnitMoved(" + Unit.toString(unit) + ")");
  },

  onUnitKilled: function(unit) {
    console.error("LEVEL 2 onUnitKilled(" + Unit.toString(unit) + ")");
  }

});
