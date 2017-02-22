/** @define {boolean} */
var DEBUG = true;

/** @define {boolean} */
var TRACE = false;

/** @define {boolean} */
var RANDOM_ATTACKS = true;

/** @const @type {int} */
var TILE_WIDTH  = 48;

/** @const @type {int} */
var TILE_HEIGHT = 48;

/** @const @type {string} */
var OVERLAY_OFF            = null;

/** @const @type {string} */
var OVERLAY_MOVE_TARGET    = "rgba(255, 255, 0, 0.4)";

/** @const @type {string} */
var OVERLAY_MOVE_BLOCKED   = "rgba(255, 255, 0, 0.2)";

/** @const @type {string} */
var OVERLAY_ATTACK_TARGET  = "rgba(255, 0, 0, 0.66)";

/** @const @type {string} */
var OVERLAY_ATTACK_BLOCKED = "rgba(255, 0, 0, 0.2)";

/** @const @type {string} */
var OVERLAY_RAISE_TARGET   = "rgba(0, 0, 255, 0.66)";

/** @const @type {string} */
var OVERLAY_RAISE_BLOCKED  = "rgba(0, 0, 255, 0.2)";

/** @const @type {string} */
var OVERLAY_ROUTE_TARGET   = "rgba(0, 128, 0, 0.66)";

/** @const @type {string} */
var OVERLAY_ROUTE_BLOCKED  = "rgba(0, 128, 0, 0.2)";

/** @const @type {int} */
var UNIT_DEFAULT_MOVEMENT  = 10;

/** @const @type {int} */
var RAISE_RANGE      = 1;

/** @const */
var MODE_READY   = DEBUG ? "READY"   : 0;

/** @const */
var MODE_MOVE    = DEBUG ? "MOVE"    : 1;

/** @const */
var MODE_ATTACK  = DEBUG ? "ATTACK"  : 2;

/** @const */
var MODE_CAPTURE = DEBUG ? "CAPTURE" : 3;

/** @const */
var MODE_RAISE   = DEBUG ? "RAISE"   : 4;

/** @const */
var MODE_REPAIR  = DEBUG ? "REPAIR"  : 5;

/** @const */
var MODE_DONE    = DEBUG ? "DONE"    : 6;

/** @const @type {int} */
var NOT_PASSABLE = 99;

/** @const */
var EVENT_GAME_OVER         = DEBUG ? "GAME_OVER"         : 0;

/** @const */
var EVENT_LOADED            = DEBUG ? "LOADED"            : 1;

/** @const */
var EVENT_PLAYER_DEFEATED   = DEBUG ? "PLAYER_DEFEATED"   : 2;

/** @const */
var EVENT_READY             = DEBUG ? "READY"             : 3;

/** @const */
var EVENT_TURN_END          = DEBUG ? "TURN_END"          : 4;

/** @const */
var EVENT_TURN_START        = DEBUG ? "TURN_START"        : 5;

/** @const */
var EVENT_UNIT_MODE_CHANGE  = DEBUG ? "UNIT_MODE_CHANGE"  : 6;

/** @const */
var EVENT_UNIT_MOVED        = DEBUG ? "UNIT_MOVED"        : 7;

/** @const */
var EVENT_UNIT_KILLED       = DEBUG ? "UNIT_KILLED"       : 8;

/** @const @type {int} */
var PLAYER_TYPE_HUMAN = DEBUG ? "HUMAN" : 1;

/** @const @type {int} */
var PLAYER_TYPE_AI    = DEBUG ? "AI"    : 2;

/** @const @type {string} */
var PLAYER_BLACK = "black";

/** @const @type {string} */
var PLAYER_BLUE = "blue";

/** @const @type {string} */
var PLAYER_GREEN = "green";

/** @const @type {string} */
var PLAYER_RED = "red";

/** @const @type {int} */
var Z_DEFAULT = 10;

/** @const @type {int} */
var Z_CURSOR = 100;

/** @const @type {int} */
var Z_ARROW = 9;

/** @const @type {string} */
var TERRAIN_WATER_ID = 'r';
var TERRAIN_PLAIN_ID = 'a';

var TILESET;
var TILESET_DISABLED;
var CANVAS;
var CANVAS_CTX;

// Forward declare game modules so we don't have any dependency issues.
var Actor;
var AI;
var Cursor;
var Dialog;
var Effect;
var Face;
var Grave;
var Level;
var LZW;
var Map;
var Mask;
var Pathfinder;
var Player;
var Pool;
var Renderer;
var Speech;
var SpellSiege;
var Sprite;
var Terrain;
var Tween;
var Unit;
var UnitType;

/** @const @type {string} */
var PERSIST_AI           = "ai";

/** @const @type {string} */
var PERSIST_ATTACK       = "attack";

/** @const @type {string} */
var PERSIST_ATTACKED     = "attacked";

/** @const @type {string} */
var PERSIST_CAPTURED     = "captured";

/** @const @type {string} */
var PERSIST_CURRENT      = "current";

/** @const @type {string} */
var PERSIST_DEFENSE      = "defense";

/** @const @type {string} */
var PERSIST_HEIGHT       = "height";

/** @const @type {string} */
var PERSIST_HITPOINTS    = "ai";

/** @const @type {string} */
var PERSIST_ID           = "id";

/** @const @type {string} */
var PERSIST_MAP          = "map";

/** @const @type {string} */
var PERSIST_MODE         = "mode";

/** @const @type {string} */
var PERSIST_MOVED        = "moved";

/** @const @type {string} */
var PERSIST_MUST_SURVIVE = "mustSurvive";

/** @const @type {string} */
var PERSIST_PLAYERS      = "players";

/** @const @type {string} */
var PERSIST_RAISED       = "raised";

/** @const @type {string} */
var PERSIST_TERRAIN      = "terrain";

/** @const @type {string} */
var PERSIST_TURN         = "turn";

/** @const @type {string} */
var PERSIST_TYPE         = "type";

/** @const @type {string} */
var PERSIST_UNITS        = "units";

/** @const @type {string} */
var PERSIST_WIDTH        = "width";

/** @const @type {string} */
var PERSIST_X            = "x";

/** @const @type {string} */
var PERSIST_Y            = "y";



Storage.prototype.setObject = function(key, value) {
  this.setItem(key, JSON.stringify(value));
};

Storage.prototype.getObject = function(key) {
  var value = this.getItem(key);
  return value && JSON.parse(value);
};

function isNull(val) {
  return val === null || typeof(val) === "undefined";
}

// Returns a number between 0 and (n-1).
function rand(n) {
  return Math.floor(Math.random() * n);
}

function coinToss() {
  return Math.random() < 0.5;
}

Array.prototype.last = function() {
  return this[this.length - 1];
};

Array.prototype.remove = function(key) {
  var i = this.indexOf(key);
  if (i >= 0) {
    this.splice(i, 1);
  }
};

Array.prototype.random = function() {
  return this.length === 0 ? null : this[rand(this.length)];
};

function trigger(callback) {
  if (!isNull(callback)) {
    callback();
  }
}

function loadTileset(fileWithoutPath) {
  var t = new Image();
  t.src = "images/" + fileWithoutPath;
  return t;
}
