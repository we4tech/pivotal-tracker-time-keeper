(function() {
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };
  App.Modules = {};
  App.Modules.InPlaceEditor = (function() {
    function InPlaceEditor(el) {
      this.el = el;
      this.watch();
    }
    InPlaceEditor.prototype.watch = function() {
      var self;
      self = this;
      this.el.live('click', __bind(function(e) {
        return self.onFocus();
      }, this));
      return this.el.live('blur', __bind(function(e) {
        return self.onUnfocus();
      }, this));
    };
    InPlaceEditor.prototype.setCanEdit = function(can_edit_cb) {
      this.can_edit_cb = can_edit_cb;
      return this;
    };
    InPlaceEditor.prototype.ifChange = function(if_change_cb) {
      this.if_change_cb = if_change_cb;
      return this;
    };
    InPlaceEditor.prototype.onFocus = function() {
      if ((this.can_edit_cb != null) && this.can_edit_cb()) {
        if (this.el.find('input').length === 0) {
          this.existing_value = this.el.html();
          this.el.html(this.build_input_field());
          return App.notifyOn(App.EVENT_TYPES.BTN_TIMER_START, false);
        }
      }
    };
    InPlaceEditor.prototype.onUnfocus = function() {
      var new_value;
      if (this.el.find('input').length === 1) {
        new_value = this.el.find('input').val();
        if (new_value !== this.existing_value) {
          if (this.if_change_cb(this.existing_value, new_value)) {
            this.el.html(new_value);
          } else {
            this.el.html(this.existing_value);
          }
        } else {
          this.el.html(this.existing_value);
        }
        return App.notifyOn(App.EVENT_TYPES.BTN_TIMER_START, true);
      }
    };
    InPlaceEditor.prototype.build_input_field = function() {
      return '<input type="text" value="' + this.existing_value.trim() + '" class="in-place-editor-tf"/>';
    };
    return InPlaceEditor;
  })();
}).call(this);

