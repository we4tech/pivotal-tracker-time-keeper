var Application, App;
App = Application = {
  ptSettings:{},
  currentStoryId:null,
  currentProjectId:null,
  currentUserId:null,
  currentTaskStartedAt:null,
  currentTaskEndedAt:null,
  currentTaskTimer:null,
  timerPanel:null,
  lastClickedTime:null,
  exitable:false,

  EVENT_TYPES:{
    BTN_TIMER_START:'BTN_TIMER_START',
    BTN_TIMER_STOP:'BTN_TIMER_STOP',
    BTN_SYNC:'BTN_SYNC',
    WINDOW_SHOW_HIDE:'WINDOW_SHOW_HIDE',
    STOP_TIMER:'STOP_TIMER',
    START_TIMER:'START_TIMER',
    TIMER_STARTED_STOPPED:'TIMER_STOPPED_STARTED',
    LOAD_PROJECTS:'LOAD_PROJECTS',
    SELECT_PROJECT:'SELECT_PROJECT',
    SELECT_STORY:'SELECT_STORY',
    SYNC:'SYNC',
    SYNC_PROGRESS:'SYNC_PROGRESS',
    AUTHENTICATED:'AUTHENTICATED',
    EXIT:'EXIT'
  },

  init:function () {
    Application.makeDraggable();
    Application.addOnTray();
    Application.Events.initSystemEventsObservers();
    Application.Events.initApplicationEventsObservers();
    Application.determineFirstPage();
  },

  _eventData:{},

  watchOn:function (eventType, cb) {
    App.debug('Watching on ' + eventType + ' with ' + cb);
    Titanium.API.addEventListener(eventType, cb);
  },

  notifyOn:function (eventType, strOrObj) {
    App.debug('Notifing on ' + eventType + ' with ' + strOrObj);
    App._eventData[eventType] = strOrObj;
    Titanium.API.fireEvent(eventType, strOrObj);
  },

  getEventData:function (eventType) {
    return App._eventData[eventType];
  },

  isLoggedIn: function() {
    return Application.PTApi.AUT_REF != null;
  },

  makeDraggable:function () {
    Application.dragging = false;

    $(document).bind('mousemove', function () {
      if (!Application.dragging)
        return;

      Titanium.UI.currentWindow.setX(Titanium.UI.currentWindow.getX() + event.clientX - Application.xstart);
      Titanium.UI.currentWindow.setY(Titanium.UI.currentWindow.getY() + event.clientY - Application.ystart);

    });

    $(document).bind('mousedown', function () {
      Application.dragging = true;
      Application.xstart = event.clientX;
      Application.ystart = event.clientY;
    });

    $(document).bind('mouseup', function () {
      Application.dragging = false;
    });
  },

  loadStates:function () {
    var html = [];
    for (var i = 0; i < Application.PTApi.STATES.length; i++) {
      var state = Application.PTApi.STATES[i];
      html.push("<option value='" + state + "'>Set state to " + state + "</option>");
    }
    $('#states').html(html.join(' '));
  },

  loadDetailsPage:function () {
    Application.Utils.showNotice('Authenticating...');

    Application.PTApi.getUserToken()
        .then(function (status, tokenRef) {
          if (status) {
            Application.debug("User token found - " + tokenRef.guid);
            App.notifyOn(App.EVENT_TYPES.LOAD_PROJECTS);
          }
        })
        .fail(function (msg) {
          if (Application.PTApi.AUT_REF == null)
            Application.Utils.showNotice(msg);
        });
  },

  determineFirstPage:function () {
    Application.Utils.loadExistingSettings().then(function () {
      $('#settings_username').val(Application.ptSettings.username);
      $('#settings_password').val(Application.ptSettings.password);
      $('#settings_prefix').val(Application.ptSettings.prefix);
      Application.loadDetailsPage();
    });
  },


  addOnTray:function () {
    try {
      var sysMenu = Titanium.UI.createMenu();

      App.addMenuItem(sysMenu, {
        defaultLabel:'Hide',
        labels:['Show', 'Hide'],
        enabled:true,

        onClick:function () {
          App.Events.handleShowHide();
        },

        watchOn:App.EVENT_TYPES.WINDOW_SHOW_HIDE,
        notifyTo:function (bool) {
          App.debug('Window status - ' + bool);
          if (bool)
            this.item.setLabel(this.options.labels[1]);
          else
            this.item.setLabel(this.options.labels[0])
        }
      });

      App.addMenuItem(sysMenu, {
        defaultLabel:'Start Timer',
        labels:['Start Timer', 'Stop Timer'],
        enabled:false,

        onClick:function () {
          if (this.item.getLabel() == this.options.defaultLabel)
            App.notifyOn(App.EVENT_TYPES.START_TIMER);
          else
            App.notifyOn(App.EVENT_TYPES.STOP_TIMER);
        },

        watchOn:App.EVENT_TYPES.TIMER_STARTED_STOPPED,
        notifyTo:function (started) {
          this.item.enable();
          if (started)
            this.item.setLabel(this.options.labels[1]);
          else
            this.item.setLabel(this.options.labels[0]);
        }
      });

      App.addMenuItem(sysMenu, {
        defaultLabel:'Sync with Server',
        enabled:false,

        onClick:function () {
          App.notifyOn(App.EVENT_TYPES.SYNC);
        },

        watchOn:App.EVENT_TYPES.SYNC_PROGRESS,
        notifyTo:function (started) {
          if (started)
            this.item.disable();
          else
            this.item.enable();
        }
      });

      App.addMenuItem(sysMenu, {
        defaultLabel:'Exit',
        onClick:function () {
          App.notifyOn(App.EVENT_TYPES.EXIT);
        }
      });

      var tray = Application.sysTray = Titanium.UI.addTray("app://icons/logo_small.png");
      tray.setMenu(sysMenu);
    } catch (e) {
      Application.debug(e);
    }
  },

  addMenuItem:function (sysMenu, options) {
    var item = Titanium.UI.createMenuItem(
        options.defaultLabel, function (e) {
          App.debug('Menu selected - ' + item.getLabel());

          this.item = item;
          this.sysMenu = sysMenu;
          this.options = options;
          options.onClick.apply(this, [e]);
        });

    if (typeof(options.watchOn) != 'undefined')
      App.watchOn(options.watchOn, function (e) {
        App.debug('Menu (' + item.getLabel() + ') woke up on ' + options.watchOn);
        this.item = item;
        this.sysMenu = sysMenu;
        this.options = options;

        options.notifyTo.apply(this, [App.getEventData(options.watchOn)]);
      });

    if (typeof(options.enabled) != 'undefined')
      if (options.enabled)
        item.enable();
      else
        item.disable();

    sysMenu.appendItem(item);
    return item;
  },

  debug:function (msg) {
    if (typeof (console) != 'undefined')
      console.log(msg);
  }
};

$(document).ready(Application.init);
