/** @define {boolean} */
var DEBUG_REUSE  = false;

/** @define {boolean} */
var DEBUG_RETURN = false;

/** @define {boolean} */
var DEBUG_SPAWN  = false;

Pool = (function() {

  return {

    create: function(trackActive, name) {

      // Ensure we receive a boolean.
      trackActive = (trackActive === true);

      /** @type {int} */
      var id = 0;

      /** @type {Array} */
      var pooledItems = [];

      /** @type {Array} */
      var activeItems = trackActive ? [] : null;

      // This is the pool object that will be returned to the caller capable
      // of spawning objects and returning objects.  If trackActive is enabled,
      // additional attributes will be added to it.
      var p = {

        allocate: function() {

          var o = null;

          if (pooledItems.length > 0) {
            o = pooledItems.pop();

            if (DEBUG && DEBUG_REUSE) {
              console.log("Reusing " + name + "#" + o.id);
            }

          } else {

            o = {
              id: ++id
            };

            if (DEBUG && DEBUG_SPAWN) {
              console.log("Spawned " + name + "#" + o.id);
            }

          }

          if (trackActive) {
            activeItems.push(o);
          }

          return o;
        },

        deallocate: function(o) {

          if (trackActive) {
            activeItems.remove(o);
          }

          pooledItems.push(o);

          if (DEBUG && DEBUG_RETURN) {
            console.log("Returned " + name + "#" + o.id + " to pool");
          }
        }

      };

      // If active objects are being tracked, expose the active array
      // of items.
      if (trackActive) {
        p.active = activeItems;
      }

      return p;
    }
  };
})();