Pathfinder.routeFor = (function() {

  /** @const @type {int} */
  var UNDEFINED = -1;

  var NEIGHBOR_Y_OFFSETS = [ -1, 0, 0, 1 ];
  var NEIGHBOR_X_OFFSETS = [ 0, -1, 1, 0 ];

  // Reusable pool of node instances created during route resolution.
  var nodePool     = Pool.create(false, DEBUG ? "routeNode" : null);

  var nodesByIndex = {};
  var openNodes    = [];
  var nodesInUse   = [];

  function addOpenNode(node) {

    if (openNodes.indexOf(node) === UNDEFINED) {

      var totalNodes = openNodes.length;
      if (totalNodes === 0) {
        openNodes.push(node);

      } else {

        var heuristic = node.heuristic;

        // This is the most common case - we'll be pushing an entry
        // onto the end of the array.
        var existingNode = openNodes[totalNodes - 1];
        if (heuristic >= existingNode.heuristic) {
          openNodes.push(node);

        } else {

          var addAt = totalNodes - 2;
          for (; addAt >= 0; --addAt) {
            if (openNodes[addAt].heuristic < heuristic) {
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
    openNodes.length = 0;

  }

  function getNode(x, y) {

    var node = null;
    if (Map.onMap(x, y)) {

      var i = Map.toIndex(x, y);

      node = nodesByIndex[i];
      if (!node) {

        node = nodePool.allocate();
        node.x         = x;
        node.y         = y;
        node.i         = i;
        node.weight    = UNDEFINED; // Total movement weight to reach this node.
        node.distance  = UNDEFINED; // Estimated distance to the target.
        node.heuristic = UNDEFINED; // Sum of weight and distance
        node.parent    = null;
        node.terrain   = Map.terrainAt(x, y);
        node.unit      = Unit.at(x, y);

        nodesByIndex[i] = node;
        nodesInUse.push(node);

      }
    }

    return node;
  }

  return function(unit, targetX, targetY, minDistance, maxDistance) {

    minDistance = minDistance || 0;
    maxDistance = maxDistance || 0;

    if (false && DEBUG) {
      console.log("A* pathfinding for " + Unit.toString(unit) + " from " + unit.x + "," + unit.y + " to " + targetX + "," + targetY + " (" + minDistance + "-" + maxDistance + ")");
    }

    reset();

    var unitType = unit.type;
    var player = unit.player;

    var currentNode       = getNode(unit.x, unit.y);
    currentNode.distance  = Pathfinder.manhattanDistance(unit.x, unit.y, targetX, targetY);
    currentNode.heuristic = currentNode.distance;
    currentNode.weight    = 0;

    openNodes.push(currentNode);

    var distance;
    var neighborNode;
    var neighborWeight;
    var neighborUnit;
    var terrainWeight;
    var addToOpenNodes;
    var i;
    var x;
    var y;

    // If the path successfully resolves, this will point to the final point.
    var lastNode = null;

    while (openNodes.length > 0) {
      currentNode = openNodes.shift();

      if (currentNode.distance >= minDistance && currentNode.distance <= maxDistance) {
        lastNode = currentNode;
        break;
      }

      for (i = 0; i < 4; ++i) {
        y = currentNode.y + NEIGHBOR_Y_OFFSETS[i];
        x = currentNode.x + NEIGHBOR_X_OFFSETS[i];

        neighborNode = getNode(x, y);
        if (neighborNode) {

          // Calculate the node's distance from the target if it has not
          // already been calculated.
          if (neighborNode.distance === UNDEFINED) {
            neighborNode.distance = Pathfinder.manhattanDistance(x, y, targetX, targetY);
          }

          terrainWeight = UnitType.movementCost(unitType, neighborNode.terrain);
          neighborWeight = currentNode.weight + terrainWeight;

          if (neighborNode.weight === UNDEFINED || neighborWeight < neighborNode.weight) {

            neighborNode.parent    = currentNode;
            neighborNode.weight    = neighborWeight;
            neighborNode.heuristic = neighborWeight + neighborNode.distance;

            // Add this neighbor to the list of open nodes to evaluate if
            // the terrain is passable, it is within the unit's movement
            // range and if the neighbor has not already been visited or
            // if this node is reached via a cheaper route.
            addToOpenNodes = ((x === targetX && y === targetY) || (terrainWeight < NOT_PASSABLE && neighborNode.unit === null));
            if (addToOpenNodes) {
              addOpenNode(neighborNode);
            }

          }

        }

      }

    }

    // Initially assume the path can't be solved.  Return false
    // if there is no route to the destination.
    var path = false;

    if (lastNode === null) {
      if (DEBUG) {
        console.log("Destination is unreachable.");
      }

    } else {

      path = [];

      while (lastNode) {

        if (DEBUG) {
          Cursor.setOverlayAt(lastNode.x, lastNode.y,
              Pathfinder.possibleNodeAt(lastNode.x, lastNode.y) ? OVERLAY_ROUTE_TARGET : OVERLAY_ROUTE_BLOCKED);
        }

        path.push(lastNode);
        lastNode = lastNode.parent;
      }

      path.reverse();

      if (DEBUG) {
        Cursor.showOverlay = true;
      }

    }

    return path;
  };
})();
