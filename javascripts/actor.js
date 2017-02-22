Actor = (function() {

  // The array of actors that have been previously
  // instantiated but are not currently in use.
  var actorPool = Pool.create(false, DEBUG ? "actor" : null);

  /** @type {Array.<Object>} The array of all active actors. */
  var allActors = [];

  function sortActor(actor) {

    // Initially assume the actor goes at the beginning
    // of the array.
    var insertAt;

    // Get a local handle the new actor's z.
    var z = actor.z;

    // Get the total number of actors.
    var totalActors = allActors.length;
    for (insertAt = 0; insertAt < totalActors; ++insertAt) {
      if (allActors[insertAt].z > z) {
        break;
      }
    }

    if (insertAt === allActors.length) {
      allActors.push(actor);
    } else {
      allActors.splice(insertAt, 0, actor);
    }

  }

  return {

    all: allActors,

    create: function(sprite, x, y, z, stateId) {

      var a = actorPool.allocate();

      a.frame          = 0;
      a.onStateEnded   = null;
      a.overlay        = null;
      a.sprite         = sprite;
      a.state          = null;
      a.stateStartedAt = 0;
      a.timeInFrame    = 0;
      a.totalCycles    = 0;
      a.visible        = true;
      a.x              = x;
      a.y              = y;
      a.z              = z || Z_DEFAULT;

      Actor.setState(a, stateId || MODE_READY, true);

      sortActor(a);

      return a;
    },

    cycle: function(delta) {

      var actor;
      var state;
      var totalFrames;
      var timePerFrame;

      var totalActors = allActors.length - 1;
      for (var i = totalActors; i >= 0; --i) {
        actor = allActors[i];

        state = actor.state;
        if (state) {

          totalFrames = state.frames.length;
          if (totalFrames > 1) {

            timePerFrame = Sprite.timePerFrame(state);
            if (timePerFrame > 0) {

              actor.timeInFrame += delta;
              if (actor.timeInFrame >= timePerFrame) {

                actor.timeInFrame -= timePerFrame;
                actor.frame += 1;

                if (actor.frame >= totalFrames) {

                  actor.frame = 0;
                  actor.totalCycles += 1;

                  if (actor.onStateEnded !== null) {
                    actor.onStateEnded(actor);
                  }

                }

              }

            }
          }

        }
      }

    },

    destroy: function(actor) {

      actor.visible = false;

      // Remove the actor from the array of those in action.
      allActors.remove(actor);

      // Push the actor back into the pool making it available
      // for future use.
      actorPool.deallocate(actor);

    },

    setState: function(actor, stateId, force) {

      var newState = actor.sprite.states[stateId];
      if (newState && (actor.state != newState || force)) {
        actor.state          = newState;
        actor.frame          = 0;
        actor.timeInFrame    = 0;
        actor.totalCycles    = 0;
        actor.stateStartedAt = new Date();
      }

    },

    timeInState: function(sprite) {
      return new Date() - sprite.stateStartedAt;
    },

    toString: function(actor) {
      return "Actor #" + actor.id;
    }

  };
})();