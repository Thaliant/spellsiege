var Event = (function() {

  // Hash of arrays of listeners by event type.
  var listenersByType = { };

  return {

    addListener: function(type, callback) {

      // Get a local handle on the array of callbacks associated with
      // the specified event.  If the array doesn't exist, create it.
      var listeners = listenersByType[type];
      if (isNull(listeners)) {
        listenersByType[type] = listeners = [];
      }

      listeners.push(callback);

    },

    dispatch: function(type, event) {

      if (DEBUG) {
        console.log("Dispatching " + type + " event ...");
      }

      var listeners = listenersByType[type];
      if (!isNull(listeners)) {

        var listener;

        for (var i = listeners.length - 1; i >= 0; --i) {
          listener = listeners[i];
          if (!isNull(listener)) {
            listener(event);
          }
        }

      }

    },

    removeListener: function(type, callback) {

      // Get a local handle on the array of callbacks associated with
      // the specified event.  If the array doesn't exist, create it.
      var listeners = listenersByType[type];
      if (!isNull(listeners)) {
        listenersByType.remove(callback);
      }

    }

  };

})();