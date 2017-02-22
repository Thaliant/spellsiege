Player = (function() {

  /** @const @type {int} */
  var DEFAULT_AGGRESSIVENESS = 1;

  // The cast of all available players that can play
  // in a given game.
  var allPlayers    = [ ];

  // All possible players indexed by their color id.
  var playersById  = { };

  // The array of active players.
  var activePlayers = [ ];

  // This is the most recently activated player.
  var lastActivePlayer = null;

  function create(id, name, opt) {

    var p = {
      id:             id,
      active:         false,
      ai:             true,
      color:          opt.color,
      gold:           0,
      lastIncome:     0,
      name:           name,
      tileset:        loadTileset("units-" + id + ".png")
    };

    if (p.ai) {
      p.bias = {

        // The higher this score, the more likely the AI will be to
        // attack an enemy unit.
        aggression:        1,

        // The higher the value, the more attack values are weighed
        // over defense attributes.
        attackMultiplier:  1,

        // The higher this value the higher the changes that the
        // AI will attempt to capture buildings.
        captureModifier:   0,

        // The higher the value, the more defense values are valued
        // against attack values.
        defenseMultiplier: 1,

        // The higher this value, the more likely the AI will be to
        // engage in combat based on how a friendly unit's strength
        // compares an enemy unit.
        equalityModifier:  0,

        // Modifies the AI's desire to grab a factory.
        factoryModifier:   0,

        // The higher this value, the more likely it is that the AI
        // will try to heal a damaged unit.
        healModifier:      0,

        // Used to influence the likelihood that a unit will attack
        // an emey that is currently in range or can be moved to
        // during the next round.
        inRangeBias:       1,

        // Used to influence the likelihood a unit will attack if it
        // is capable of killing it's target.
        instantKillBias:   1,

        // The higher this value the more likely the AI will be to
        // try and resurrect fallen units.
        necromancy:        0,

        randomness:        0.75,

        // The higher this value the more likely the AI will try to
        // repair a damaged building.
        repairModifier:    0,

        // The higher this value the more likely the AI will try to
        // take over a building owned by another player.
        takeoverModifier:  0

      };
    }

    allPlayers.push(p);

    playersById[id] = p;

  }

  function savePlayer(player) {

    var initialStateOnly = (Player.turn === 0);

    var units = [];
    var unit;

    var allUnits = Unit.all;
    for (var i = 0; i < allUnits.length; ++i) {
      unit = allUnits[i];
      if (unit.player === player) {
        units.push(Unit.save(unit));
      }
    }

    var state = {};

    state[PERSIST_ID]    = player.id;
    state[PERSIST_AI]    = player.ai;
    state[PERSIST_UNITS] = units;

    return state;
  }

  // Initialize the default players.
  create(PLAYER_BLUE,  "Galamar",   { color: '#0000cc' });
  create(PLAYER_RED,   "Valadorn",  { color: '#ff0000' });
  create(PLAYER_GREEN, "Saeth",     { color: '#009900' });
  create(PLAYER_BLACK, "Nimweaver", { color: '#999999', aggressiveness: 2 });

  return {

    activate: function(id, ai) {

      var player = playersById[id];

      player.active     = true;
      player.ai         = true;
      //player.ai         = (id !== PLAYER_BLUE);
      player.gold       = 0;
      player.lastIncome = 0;

      activePlayers.push(player);

      if (DEBUG) {
        console.log(Player.toString(player) + " activated" + (ai ? " as AI" : ""));
      }

      return player;
    },

    active: activePlayers,

    all: allPlayers,

    byId: function(id) {
      return playersById[id];
    },

    clear: function() {

      activePlayers.length = 0;

      lastActivePlayer = null;

      Player.current = null;
      Player.turn    = 0;

    },

    cycle: function(delta) {

      var player = Player.current;
      if (player === null) {

        if (DEBUG) {
          console.log("There is no current player. Choosing one.");
        }

        // Need to pick the next active player.
        player = Player.nextPlayer();

      }

      if (player.ai) {
        AI.cycle(delta);
      }

    },

    current: null,

    defeated: function(player) {

      if (DEBUG) {
        console.log(Player.toString(player) + " has been defeated!");
      }

      // If the player that was defeated is the currently selected
      // player, then force their turn to be over immediately.
      if (Player.current === player) {
        Player.endTurn();
      }

      player.active = false;

      activePlayers.remove(player);

      // Notify listeners that the player has been defeated.
      Event.dispatch(EVENT_PLAYER_DEFEATED, player);

    },

    endTurn: function() {

      var player = Player.current;

      if (DEBUG) {
        console.log(Player.toString(player) + "'s turn is now over.");
      }

      Player.current = null;

      if (player.ai) {
        AI.endTurn();
      }

      // Notify each unit that the player's turn has ended.
      Unit.eachForPlayer(player, Unit.endTurn);

      // Notify listeners that the current player's turn has ended.
      Event.dispatch(EVENT_TURN_END, player);

    },

    load: function(states) {

      var state;
      var units;
      var player;
      for (var i = 0; i < states.length; ++i) {
        state  = states[i];
        player = Player.activate(state[PERSIST_ID], state[PERSIST_AI]);

        units = state[PERSIST_UNITS];
        for (var u = 0; u < units.length; ++u) {
          Unit.load(units[u], player);
        }
      }

    },

    nextPlayer: function() {

      var nextIndex = 0;

      if (lastActivePlayer) {

        nextIndex = activePlayers.indexOf(lastActivePlayer) + 1;
        if (nextIndex < 0 || nextIndex >= activePlayers.length) {
          nextIndex = 0;
        }

      }

      var player = activePlayers[nextIndex];

      Player.startTurn(player);

      return player;
    },

    save: function() {

      var p = [];
      for (var i = 0; i < activePlayers.length; ++i) {
        p.push(savePlayer(activePlayers[i]));
      }

      return p;
    },

    startTurn: function(player) {

      Player.turn += 1;
      Player.current = player;

      // Store this as the last active player so that when we
      // look for the next player we will start after this one.
      lastActivePlayer = player;

      if (DEBUG) {
        console.log("It's " + Player.toString(player) + "'s turn (#" + Player.turn + ")");
      }

      // Notify each unit that the player's turn has started.
      Unit.eachForPlayer(player, Unit.startTurn);

      var unit = null;
      var allUnits = Unit.all;
      var totalUnits = allUnits.length;
      for (var i = 0; i < totalUnits; ++i) {
        unit = allUnits[i];
        if (unit.player == player && !unit.dead) {
          Renderer.focusOnTile(unit.x, unit.y);
          break;
        }
      }

      var income = 0;

      var width = Map.width();
      var height = Map.height();
      var terrain = null;

      for (var y = 0; y < height; ++y) {
        for (var x = 0; x < width; ++x) {
          terrain = Map.terrainAt(x, y);
          if (terrain && terrain.player === player && terrain.income > 0) {
            income += terrain.income;
          }
        }
      }

      player.lastIncome = income;
      player.gold      += income;

      if (DEBUG) {
        console.log(Player.toString(player) + " has earned " + income + " gold");
      }

      Cursor.reset();

      // If the player is an AI, then initiate turn processing.
      if (player.ai) {
        AI.startTurn(player);
      }

      Event.dispatch(EVENT_TURN_START, {
        player: player,
        income: income
      });

    },

    toString: function(player) {
      return "@" + player.id;
    },

    turn: 0

  };
})();
