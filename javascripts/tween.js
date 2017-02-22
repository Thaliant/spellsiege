Tween = (function() {

  var tweenPool = Pool.create(true, DEBUG ? "tween" : null);

  /** @type {Array} A local reference to the array of active objects
   * created by the tweenPool.
   */
  var allTweens = tweenPool.active;

  /** @type {int} The number of blocking tweens that
   * must complete before the system will respond to
   * the user or AI again.
   */
  var blockingTweens = 0;

  function block() {
    blockingTweens++;
  }

  function unblock() {
    blockingTweens--;
  }

  function returnTween(tween) {

    // Decrement the blocking indicator.
    if (tween.blocking) {
      unblock();
    }

    // Clear references.
    tween.cycle = null;
    tween.complete = null;
    tween.blocking = false;

    tweenPool.deallocate(tween);

  }

  return {

    block: block,

    clear: function() {
      while (allTweens.length > 0) {
        returnTween(allTweens[allTweens.length - 1]);
      }
    },

    create: function(onCycle, onComplete, blocking) {

      // Ensure this tween is really a blocking event.
      blocking = (blocking === true);

      // Get a tween from the pool.
      var tween = tweenPool.allocate();

      tween.cycle     = onCycle;
      tween.complete  = onComplete;
      tween.blocking  = blocking;
      tween.totalTime = 0;

      if (blocking) {
        block();
      }

    },

    cycle: function(delta) {

      // Get the total number of tweens that need to be processed.
      var totalTweens = allTweens.length;
      if (totalTweens > 0) {

        var tween;

        // Iterate through each of the tweens.  Provide their logic
        // function with a chance to cycle
        for(var i = totalTweens - 1; i >= 0; --i) {
          tween = allTweens[i];
          tween.totalTime += delta;

          if (!tween.cycle(tween.totalTime, delta)) {
            trigger(tween.complete);
            returnTween(tween);
          }

        }

      }

    },

    isBlocked: function() {
      return blockingTweens > 0;
    },

    unblock: unblock

  };
})();