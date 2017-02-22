Effect = (function() {

  /** @const @type {int} */
  var WALK_SPEED = 200;

  /** @const @type {int} */
  var SHAKE_DURATION = 300;

  /** @const @type {int} */
  var SHAKE_STRENGTH = 7;

  /** @const @type {int} */
  var DUST_SIZE = 26;

  /** @const @type {int} */
  var DUST_Z = Z_DEFAULT - 1;

  var DUST_SPRITE = Sprite.create({
    duration: 750,
    tileset: loadTileset('dust.gif'),
    width: DUST_SIZE,
    height: DUST_SIZE,
    frames: [ [0,0], [1,0], [2,0], [3,0] ]
  });

  var DAMAGE_SPRITE = Sprite.create({
    duration: 500,
    tileset: loadTileset('attack.png'),
    width: 40,
    height: 40,
    frames: [ [0,0], [1,0], [2,0], [3,0], [4,0], [5,0] ]
  });

  /** @const @type {int} */
  var SMOKE_DURATION = 500;

  var SMOKE_SPRITE = Sprite.create({
    duration: SMOKE_DURATION,
    tileset: loadTileset('smoke.png'),
    width: 48,
    height: 40,
    frames: [ [3,0], [2,0], [1,0], [0,0]  ]
  });

  var SPARK_SPRITE = Sprite.create({
    duration: 500,
    tileset: loadTileset('spark.png'),
    width: 48,
    height: 48,
    frames: [ [0,0], [1,0], [2,0], [3,0], [4,0], [5,0] ]
  });

  // Create the projectile sprite.
  //var PROJECTILE_SPRITE = Sprite.createDefault(13, 4);

  function moveStraight(actor, endX, endY, duration, callback) {

    // Get the actor's starting position.
    var startX = actor.x;
    var startY = actor.y;

    // Calculate the x- and y-distance to the destination position.
    var dx = endX - startX;
    var dy = endY - startY;

    var percent;

    Tween.create(function(totalTime, delta) {

      percent = totalTime / duration;
      if (percent > 1.0) {
        percent = 1.0;
      }

      actor.x = Math.round(startX + (dx * percent));
      actor.y = Math.round(startY + (dy * percent));

      return (percent < 1.0);
    }, callback, true);

  }

  return {

    attack: function(actor, callback) {

      Tween.block();

      Actor.create(DAMAGE_SPRITE, actor.x, actor.y, actor.z + 1).onStateEnded = function(a) {
        Actor.destroy(a);
        Tween.unblock();
        trigger(callback);
      };

    },

    bounceText: function(actor, amount, callback) {

      var tileset = Renderer.renderNumbers(amount, Renderer.fontLarge);

      var textSprite = Sprite.create({
        tileset: tileset,
        width: tileset.width,
        height: tileset.height,
        frames: [ [0,0] ]
      });

      var maxY = actor.y + TILE_HEIGHT - tileset.height;

      var textActor = Actor.create(textSprite, actor.x, maxY, Z_CURSOR + 1);

      var maxSpeed = 12;
      var speed = maxSpeed;
      var rising = true;
      var running = true;

      Tween.create(function(t, d) {
        if (running) {
          if (rising) {

            textActor.y -= Math.round(speed);

            // "Gravity" asserts itself on the text as it rises so
            // it's speed is decreased by half.  Once we've reached
            // a speed less than one pixel, the text will start falling.
            speed = speed / 2;
            if (speed < 1) {
              rising = false;
              speed = 1;
            }

          } else {

            textActor.y += speed;

            // Accelerate toward the bottom of the unit.
            speed += speed;

            // If we've reached the maximum position the object
            // is allowed to move, then bounce back up with less
            // speed than before.
            if (textActor.y >= maxY) {
              textActor.y = maxY;
              rising = true;

              maxSpeed = Math.round(maxSpeed / 2);
              speed = maxSpeed;

              // Stop bouncing once the text has insufficent
              // speed to bounce more than two pixels high.
              running = maxSpeed > 2;

            }

          }
        }

        return t < 1000;
      }, function() {
        Actor.destroy(textActor);
        trigger(callback);
      }, true);

    },

    dust: function(x, y, z) {
      Actor.create(DUST_SPRITE, x, y, z || DUST_Z).onStateEnded = Actor.destroy;
    },

    flash: function(actor, rate, callback) {

      var duration = 1000;

      var localDuration = 0;

      Tween.create(function(tweenTime, delta) {

        localDuration += delta;
        if (localDuration >= rate) {
          actor.visible = !actor.visible;
          localDuration -= rate;
        }

        return (tweenTime < duration);
      }, function() {

        actor.visible = true;
        trigger(callback);

      }, true);

    },

    shake: function(actor, callback) {

      // So we can put the actor back in their original location
      // at the end of the effect.
      var originalx = actor.x;

      var strength = SHAKE_STRENGTH;
      var direction = 1;
      var offsetx;

      Tween.create(function(total, delta) {

        offsetx   = direction * strength;
        actor.x   = originalx + offsetx;
        strength  = SHAKE_STRENGTH * (1 - total / SHAKE_DURATION);
        direction = 0 - direction;

        return total < SHAKE_DURATION;
      }, function() {
        actor.x = originalx;
        trigger(callback);
      }, true);

    },

    smoke: function(x, y, callback) {

      Tween.block();

      var smoke = Actor.create(SMOKE_SPRITE, x, y, 100);

      smoke.onStateEnded = function(actor) {
        Tween.unblock();
        Actor.destroy(actor);
        trigger(callback);
      };

      moveStraight(smoke, x, y - 18, SMOKE_DURATION);

    },

    spark: function(x, y, callback) {

      Tween.block();

      Actor.create(SPARK_SPRITE, x, y, 100).onStateEnded = function(actor) {
        Tween.unblock();
        Actor.destroy(actor);
        trigger(callback);
      };

    },

    walk: function(unit, path, callback, i) {

      i = i || 1;

      // Pick the next destination along the path.  If there isn't one
      // then the unit has reached it's destination so trigger the callback.
      var destination = path[i];
      if (isNull(destination)) {
        trigger(callback);

      } else {

        Effect.dust(
            unit.actor.x,
            unit.actor.y + (TILE_HEIGHT / 2)- Math.round(DUST_SIZE / 2)
        );

        moveStraight(unit.actor, destination.x * TILE_WIDTH, destination.y * TILE_HEIGHT, WALK_SPEED, function() {
          Effect.walk(unit, path, callback, ++i);
        });

      }

    }

  };
})();