Pathfinder = (function() {

  /** @const @type {int} */
  var UNDEFINED = -1;

  var NEIGHBOR_Y_OFFSETS = [ -1, 0, 0, 1 ];
  var NEIGHBOR_X_OFFSETS = [ 0, -1, 1, 0 ];

  // Pool of reusable nodes for overlay resolution.
  var nodePool     = Pool.create(false, DEBUG ? "pathfinderNode" : null);

  var nodesByIndex = {};
  var openNodes    = [];
  var nodesInUse   = [];

  function addNodeByWeight(node) {

    if (openNodes.indexOf(node) === UNDEFINED) {

      var totalNodes = openNodes.length;
      if (totalNodes === 0) {
        openNodes.push(node);

      } else {

        var newWeight  = node.weight;

        // This is the most common case - we'll be pushing an entry
        // onto the end of the array.
        var existingNode = openNodes[totalNodes - 1];
        if (newWeight >= existingNode.weight) {
          openNodes.push(node);

        } else {

          var addAt = totalNodes - 2;
          for (; addAt >= 0; --addAt) {
            if (openNodes[addAt].weight < newWeight) {
              break;
            }
          }

          openNodes.splice(addAt + 1, 0, node);
        }

      }

    }

  }

  function reset() {

    var nodes = nodesInUse.length;

    var node;
    for (var i = 0; i < nodes; ++i) {
      node = nodesInUse[i];
      node.parent = null;

      nodesByIndex[node.i] = null;
      nodePool.deallocate(node);
    }

    nodesInUse.length = 0;

    Pathfinder.possibleNodes.length = 0;

  }

  var getNode = function(x, y) {

    var node = null;
    if (Map.onMap(x, y)) {

      var i = Map.toIndex(x, y);

      node = nodesByIndex[i];
      if (!node) {

        node = nodePool.allocate();
        node.x       = x;
        node.y       = y;
        node.i       = i;
        node.parent  = null;
        node.terrain = Map.terrainAt(x, y);
        node.unit    = Unit.at(x, y);
        node.weight  = UNDEFINED;

        nodesByIndex[i] = node;
        nodesInUse.push(node);

      }
    }

    return node;
  };

  return {

    getPath: function(unit, x, y) {

      var path = [];

      var node = Pathfinder.possibleNodeAt(x, y);
      while (node) {
        path.push(node);
        node = node.parent;
      }

      path.reverse();

      return path;
    },

    manhattanDistance: function(x1, y1, x2, y2) {

      var dx = x1 - x2;
      if (dx < 0) {
        dx = 0 - dx;
      }

      var dy = y1 - y2;
      if (dy < 0) {
        dy = 0 - dy;
      }

      return dx + dy;
    },

    nodeAt: getNode,

    possibleNodeAt: function(x, y) {

      var nodes = Pathfinder.possibleNodes.length;
      var node;

      for (var i = 0; i < nodes; ++i) {
        node = Pathfinder.possibleNodes[i];
        if (node && node.x == x && node.y == y) {
          return node;
        }
      }

      return null;
    },

    possibleNodes: [],

    plotAttackOverlay: function(unit) {

      reset();

      var unitType = unit.type;
      var unitX    = unit.x;
      var unitY    = unit.y;
      var player   = unit.player;

      var rangeMin = unitType.rangeMin;
      var rangeMax = unitType.rangeMax;

      var minY = Map.boundY(unitY - rangeMax);
      var maxY = Map.boundY(unitY + rangeMax);
      var minX = Map.boundX(unitX - rangeMax);
      var maxX = Map.boundX(unitX + rangeMax);

      var neighborNode;
      var ds;

      for (var y = minY; y <= maxY; ++y) {
        for (var x = minX; x <= maxX; ++x) {

          if (Unit.isInAttackRange(unit, x, y)) {

            neighborNode = getNode(x, y);
            if (neighborNode.unit && !neighborNode.unit.dead && neighborNode.unit.player !== player) {
              Pathfinder.possibleNodes.push(neighborNode);
              Cursor.setOverlayAt(x, y, OVERLAY_ATTACK_TARGET);

            } else {
              Cursor.setOverlayAt(x, y, OVERLAY_ATTACK_BLOCKED);

            }

          }

        }
      }

      Cursor.showOverlay = true;

    },

    plotMovementOverlay: function(unit) {

      reset();

      var unitType = unit.type;
      var player   = unit.player;

      var movement = unitType.movement;

      var currentNode = getNode(unit.x, unit.y);
      currentNode.weight = 0;

      openNodes.push(currentNode);

      var neighborNode;
      var neighborWeight;
      var neighborUnit;
      var terrainWeight;
      var addToOpenNodes;
      var i;
      var x;
      var y;

      while (openNodes.length > 0) {
        currentNode   = openNodes.shift();

        for (i = 0; i < 4; ++i) {
          y = currentNode.y + NEIGHBOR_Y_OFFSETS[i];
          x = currentNode.x + NEIGHBOR_X_OFFSETS[i];

          neighborNode = getNode(x, y);
          if (neighborNode) {

            terrainWeight       = UnitType.movementCost(unitType, neighborNode.terrain);
            neighborWeight      = currentNode.weight + terrainWeight;

            if (neighborNode.weight === UNDEFINED || neighborWeight < neighborNode.weight) {

              neighborNode.weight = neighborWeight;

              // Add this neighbor to the list of open nodes to evaluate if
              // the terrain is passable, it is within the unit's movement
              // range and if the neighbor has not already been visited or
              // if this node is reached via a cheaper route.
              addToOpenNodes = (terrainWeight < NOT_PASSABLE && neighborWeight <= movement &&
                  (neighborNode.unit === null || neighborNode.unit.player === player));

              if (addToOpenNodes) {

                neighborNode.parent = currentNode;

                if (neighborNode.unit === null) {
                  Cursor.setOverlayAt(neighborNode.x, neighborNode.y, OVERLAY_MOVE_TARGET);
                  Pathfinder.possibleNodes.push(neighborNode);

                } else {
                  Cursor.setOverlayAt(neighborNode.x, neighborNode.y, OVERLAY_MOVE_BLOCKED);

                }

                addNodeByWeight(neighborNode);

              }

            }

          }

        }

      }

      Cursor.showOverlay = true;

    },

    plotRaiseOverlay: function(unit) {

      reset();

      var unitType = unit.type;
      var player   = unit.player;

      var minY = Map.boundY(unit.y - RAISE_RANGE);
      var maxY = Map.boundY(unit.y + RAISE_RANGE);
      var minX = Map.boundX(unit.x - RAISE_RANGE);
      var maxX = Map.boundX(unit.x + RAISE_RANGE);

      var neighborNode;
      var grave;

      for (var y = minY; y <= maxY; ++y) {
        for (var x = minX; x <= maxX; ++x) {

          grave = Grave.at(x, y);
          if (grave && Unit.at(x, y) === null) {
            Pathfinder.possibleNodes.push(getNode(x, y));
            Cursor.setOverlayAt(x, y, OVERLAY_RAISE_TARGET);
          } else {
            Cursor.setOverlayAt(x, y, OVERLAY_RAISE_BLOCKED);
          }

        }
      }

      Cursor.showOverlay = true;

    },

    reset: reset,

    simpleDistance: function(x1, y1, x2, y2) {

      var dx = x2 - x1;
      if (dx < 0) {
        dx = 0 - dx;
      }

      var dy = y2 - y1;
      if (dy < 0) {
        dy = 0 - dy;
      }

      return dx > dy ? dx : dy;
    }

  };
})();
