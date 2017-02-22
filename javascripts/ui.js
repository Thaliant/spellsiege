/** @define @type {string} */
var UI_SPEED = 'fast';

Mask = (function() {

  // Constant reference to the mask UI.
  var $MASK = null;

  $(function() {

    // Disable clicks passing through the mask to the canvas
    // behind the mask.
    $MASK = $('#mask').on('click', false);

  });

  return {

    hide: function(callback) {
      $MASK.fadeOut(UI_SPEED, callback);
    },

    show: function(callback) {
      $MASK.fadeIn(UI_SPEED, callback);
    }

  };

})();

var Dialog = (function() {

  // Constant reference to the dialog UI.
  var $DIALOG = null;

  // Constant reference to the message area.
  var $CONTENT = null;

  $(function() {
    $DIALOG = $('#dialog-wrap');
    $CONTENT = $('#dialog-content');
  });

  return {

    hide: function(callback) {

      $DIALOG.fadeOut('fast', function() {
        Mask.hide(callback);
      });

    },

    show: function(html, callback) {

      $CONTENT.html(html);

      // Center the dialog in the UI window.
      $DIALOG.css({
        top: Math.round((CANVAS.height - $DIALOG.outerHeight()) / 2),
        left: Math.round((CANVAS.width - $DIALOG.outerWidth()) / 2)
      });

      Mask.show(function() {
        $DIALOG.fadeIn('fast', callback);
      });

    },

    showTmpl: function(id, data, callback) {
      Dialog.show($(id).tmpl(data), callback);
    }

  };

})();

Speech = (function() {

  // Static reference to the single face element.
  var $SPEECH = null;

  // Static reference to the portrait.
  var $PORTRAIT = null;

  // Static reference to the message area.
  var $MESSAGE = null;

  /** @type {boolean} True if the face is currently displaying. */
  var showing = false;

  // The callback triggered once the face is done
  // displaying it's message.
  var callback = null;

  $(function() {

    $PORTRAIT = $('#portrait');
    $SPEECH   = $('#speech-wrap');
    $MESSAGE  = $('#speech-content');

  });

  return {

    show: function(id, message, _callback) {

      // Store the callback to be triggered at the end
      // of the message.
      callback = _callback;

      // Ensure the speech area is at the bottom of the canvas.
      $SPEECH.css({
        top: CANVAS.height - $PORTRAIT.height(),
        width: CANVAS.width
      });

      // Ensure the correct portrait is displaying.
      $PORTRAIT.css({
        'background-position': $PORTRAIT.width() * -id
      });

      $MESSAGE.html(message);

      $SPEECH.fadeIn('fast');

    }

  };

})();
