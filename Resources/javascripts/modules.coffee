App.Modules = {}

class App.Modules.InPlaceEditor
  constructor: (@el) ->
    @watch()

  watch: ->
    self = @
    @el.live 'click', (e) =>
      self.onFocus()

    @el.live 'blur', (e) =>
      self.onUnfocus()

  setCanEdit: (@can_edit_cb) ->
    @

  ifChange: (@if_change_cb) ->
    @


  onFocus: ->
    if @can_edit_cb? && @can_edit_cb()
      if @el.find('input').length == 0
        @existing_value = @el.html();
        @el.html @build_input_field()
        App.notifyOn App.EVENT_TYPES.BTN_TIMER_START, false

  onUnfocus: ->
    if @el.find('input').length == 1
      new_value = @el.find('input').val()

      if new_value isnt @existing_value
        if @if_change_cb(@existing_value, new_value)
          @el.html(new_value)
        else
          @el.html(@existing_value)
      else
        @el.html(@existing_value)

      App.notifyOn App.EVENT_TYPES.BTN_TIMER_START, true

  build_input_field: ->
    '<input type="text" value="' + @existing_value.trim() +
    '" class="in-place-editor-tf"/>'


