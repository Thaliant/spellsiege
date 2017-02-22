var Editor = (function() {

  var PAINT_TERRAIN = "TERRAIN";
  var PAINT_UNIT    = "UNIT";

  // Variables used to track the mouse position when the
  // user is dragging.
  var lastMouseX;
  var lastMouseY;

  // The type of object being painted - e.g. PAINT_TERRAIN.
  var selectedPaint = null;

  // This is the selected terrain that is being painted
  // wherever the user clicks on the map.
  var selectedObject = null;

  // The currently selected Player, if any.
  var selectedPlayer = null;

  function setupMap() {

    var tileWidth  = parseInt($('#new-map-width').val(), 10);
    var tileHeight = parseInt($('#new-map-height').val(), 10);

    Map.load({ width: tileWidth, height: tileHeight });

    // Don't know the best way to mark this one the default.
    var water = Terrain.byId(TERRAIN_WATER_ID);

    // Border the map with water.
    for (var x = 0; x < Map.width(); ++x) {
      Map.setTerrainAt(x, 0, water);
      Map.setTerrainAt(x, Map.height() - 1, water);
    }
    for (var y = 1; y < Map.height() - 1; ++y) {
      Map.setTerrainAt(0, y, water);
      Map.setTerrainAt(Map.width() - 1, y, water);
    }

    // Move the focus to the center of the map.
    Renderer.focusOnTile(Math.round(tileWidth / 2), Math.round(tileHeight / 2), true);

  }

  function setupPlayers() {

    var $optTmpl = $('#player-option-tmpl');
    var $playerPicker = $('#player-picker').empty();

    // Add the default (neutral) option.
    $optTmpl.tmpl({ id: '', color: '#cccccc', name: '' }).appendTo($playerPicker);

    $('#new-player-list :checked').each(function() {

      // Activate the player.
      var player = Player.activate($(this).val(), false);

      // Append a selection to the player picker.
      $optTmpl.tmpl(player).appendTo($playerPicker);

    });

  }

  function setupTerrains() {

    var $picker = $('#terrain-palette');
    var $tmpl = $('#swatch-tmpl');
    var $swatch;

    var allTerrains = Terrain.all;
    var terrain;

    for (var i = 0; i < allTerrains.length; ++i) {
      terrain = allTerrains[i];

      $tmpl.tmpl(terrain).css({
        'background-position-x': -terrain.tileX,
        'background-position-y': -terrain.tileY
      }).appendTo($picker);

    }

  }

  function setupUnits(player) {

    var $picker = $('#unit-palette').empty();
    var $tmpl = $('#swatch-tmpl');
    var $swatch;

    var allUnitTypes = UnitType.all;
    var unitType;

    for (var i = 0; i < allUnitTypes.length; ++i) {
      unitType = allUnitTypes[i];

      $tmpl.tmpl(unitType).css({ 'background-position': (unitType.tileX * -TILE_WIDTH)+ "px 0" }).appendTo($picker);

    }

    $('#unit-picker').hide();

  }

  function clearSelection() {
    $('.palette a.selected').removeClass('selected');
  }

  function editUnitProperties(unit) {

    // Create checkboxes for each of the possible players.
    var $tmpl = $('#unit-properties-tmpl').tmpl(unit);

    $tmpl.find('#unit-must-survive').prop('checked', unit.mustSurvive);

    Dialog.show($tmpl);

  }

  // When SpellSiege indicates that a new map was loaded
  // trigger the same listener that responds to a new map
  // being initialized.  (This needs to be wrapped in an
  // anonymous function because Editor.newMap isn't defined
  // at the time this line is run.)
  Event.addListener(EVENT_LOADED, function() {

    var $optTmpl = $('#player-option-tmpl');
    var $playerPicker = $('#player-picker').empty();

    // Add the default (neutral) option.
    $optTmpl.tmpl({ id: '', color: '#cccccc', name: '' }).appendTo($playerPicker);

    $.each(Player.active, function() {
      var $opt = $optTmpl.tmpl(this);
      $($opt).appendTo($playerPicker);
    });

    setupUnits();

  });

  // Bind the touch listener to the SpellSiege object which is
  // called whenever the user clicks.
  SpellSiege.touchListener = function(tileX, tileY) {

    if (selectedPaint === PAINT_TERRAIN) {
      if (selectedObject !== null) {
        Map.setTerrainAt(tileX, tileY, selectedObject);
      }
    } else if (selectedPaint === PAINT_UNIT) {

      var unit = Unit.at(tileX, tileY);
      if (unit) {

        Cursor.unit = unit;
        Cursor.moveTo(unit.x, unit.y);

        Renderer.focusOnTile(unit.x, unit.y);

        editUnitProperties(unit);

      } else if (selectedPlayer !== null) {
        Unit.create(selectedObject, selectedPlayer, tileX, tileY);
      }

    }

  };

  $(function() {

    SpellSiege.init();

    var $gfx = $('#gfx');

    $('#player-picker').on('change', function() {

      var $unitPalette = $('#unit-palette');

      // Remove the previously selected player class.
      if (selectedPlayer) {
        $unitPalette.removeClass(selectedPlayer.id);
        selectedPlayer = null;
      }

      var newPlayerId = $(this).val();
      if (newPlayerId === '') {
        $('#unit-picker').slideUp('slow');
      } else {
        selectedPlayer = Player.byId(newPlayerId);
        $unitPalette.addClass(newPlayerId);
        $('#unit-picker').slideDown('slow');
      }

    });

    $('#terrain-palette').on('click', "a", function() {

      clearSelection();

      // Mark the clicked swatch as the selected one.
      var $swatch = $(this).addClass('selected');

      // Record the terrain being painted.
      selectedPaint  = PAINT_TERRAIN;
      selectedObject = Terrain.byId($swatch.attr('tid'));

      return false;
    });

    $('#unit-palette').on('click', "a", function() {

      clearSelection();

      // Mark the clicked swatch as the selected one.
      var $swatch = $(this).addClass('selected');

      // Record the terrain being painted.
      selectedPaint  = PAINT_UNIT;
      selectedObject = UnitType.byId($swatch.attr('tid'));

      return false;
    });

    $('#dialog').on('submit', '#new-map-form', function() {

      SpellSiege.clear();

      setupMap();
      setupPlayers();
      setupUnits();

      SpellSiege.setRendering(true);

      Dialog.hide();

      return false;
    });

    $('#dialog').on('submit', '#load-level-form', function() {

      var data = $('#load-data').val();
      if (data && data.length > 0) {
        SpellSiege.load(data);

        Dialog.hide();
      }

      return false;
    });

    $('#dialog').on('submit', '#unit-properties-form', function() {

      var unit = Cursor.unit;

      unit.hitpoints   = parseInt($('#unit-hitpoints').val(), 10);
      unit.attack      = parseInt($('#unit-attack').val(), 10);
      unit.defense     = parseInt($('#unit-defense').val(), 10);
      unit.mustSurvive = $('#unit-must-survive').prop('checked');

      unit.drawOverlay = (unit.hitpoints < unit.type.hitpoints);

      Cursor.reset();

      Dialog.hide();

      return false;
    });

    $('#dialog').on('focus', '#save-data', function() {

      $('#save-data').select();

    });

    $('body').on('focus', '#save-data', function() {

      var $this = $(this);
      $this.select();

      $this.on('mouseup', function() {
        $this.off('mouseup');
        return false;
      });

    });

    setupTerrains();

    Editor.newMap();

  });

  return {

    fill: function() {

      if (selectedObject !== null) {
        if (confirm('Fill the entire map with ' + selectedObject.name + '?')) {

          for (var y = 0; y < Map.height(); ++y) {
            for (var x = 0; x < Map.width(); ++x) {
              Map.setTerrainAt(x, y, selectedObject);
            }
          }

        }
      }

    },

    load: function() {
      Dialog.show($('#load-level-tmpl').tmpl());
    },

    newMap: function() {

      SpellSiege.setPlaying(false);

      // Create checkboxes for each of the possible players.
      var $players = $('#player-checkbox-tmpl').tmpl(Player.all);

      // Get the new map dialog.
      var $tmpl = $('#new-map-tmpl').tmpl();

      // Populate the player list and ensure the first is checked.
      $tmpl.find('#new-player-list').html($players);
      $tmpl.find('#new-player-blue').prop('checked', true);

      Dialog.show($tmpl);

    },

    save: function() {

      var $tmpl = $('#save-level-tmpl').tmpl({ data: SpellSiege.save() });

      Dialog.show($tmpl);

    }

  };
})();
