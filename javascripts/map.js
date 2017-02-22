Map = (function() {

  /** @type {int} */
  var HEIGHT  = 10;

  /** @type {int} */
  var WIDTH   = 16;

  /** @type {Array.<Terrain>} */
  var TERRAIN = new Array(WIDTH * HEIGHT);

  return {

    boundX: function(x) {
      if (x < 0) {
        x = 0;
      } else if (x >= WIDTH) {
        x = WIDTH - 1;
      }
      return x;
    },

    boundY: function(y) {
      if (y < 0) {
        y = 0;
      } else if (y >= HEIGHT) {
        y = HEIGHT - 1;
      }
      return y;
    },

    height: function() {
      return HEIGHT;
    },

    load: function(state) {

      var height = state[PERSIST_HEIGHT];
      var width = state[PERSIST_WIDTH];

      var new_size = height * width;
      if (new_size !== (HEIGHT * WIDTH)) {

        HEIGHT = height;
        WIDTH  = width;

        TERRAIN.length = 0;
        TERRAIN.length = new_size;

      }

      Cursor.init(width, height);

      var defaultTerrain = Terrain.byId(TERRAIN_PLAIN_ID);
      var terrainIds     = (state[PERSIST_TERRAIN] || '').split(',');
      var terrainId;

      for (var i = 0; i < new_size; ++i) {
        terrainId  = terrainIds[i];
        TERRAIN[i] = Terrain.byId(terrainId) || defaultTerrain;
      }

    },

    onMap: function onMap(x, y) {
      return x >= 0 && y >= 0 && x < WIDTH && y < HEIGHT;
    },

    save: function() {

      var buffer = [];

      for (var i = 0; i < TERRAIN.length; ++i) {
        buffer.push(TERRAIN[i].id);
      }

      var state = {};

      state[PERSIST_WIDTH]  = WIDTH;
      state[PERSIST_HEIGHT] = HEIGHT;
      state[PERSIST_TERRAIN] = buffer.join(',');

      return state;
    },

    setTerrainAt: function(x, y, t) {
      TERRAIN[y * WIDTH + x] = t;
    },

    terrainAt: function(x, y) {
      return TERRAIN[y * WIDTH + x];
    },

    toIndex: function(x, y) {
      return y * WIDTH + x;
    },

    width: function() {
      return WIDTH;
    }

  };
}());
