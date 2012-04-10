var Application = {
  ptSettings:{},
  currentStoryId:null,
  currentProjectId:null,
  currentUserId:null,
  currentTaskStartedAt:null,
  currentTaskTimer:null,
  timerPanel:null,
  lastClickedTime:null,
  exitable: false,

  init:function () {
    try {
      Application.makeDraggable();
      Application.addOnTray();
      Application.Utils.loadExistingSettings();
      Application.addEventsObservers();
      Application.determineFirstPage();
    } catch (e) {
      alert(e);
    }
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

    Application.PTApi.getUserToken(function (status, tokenRef) {
      if (status) {
        Application.debug("User token found - " + tokenRef.guid);
        Application.Utils.showNotice('Loading projects...');
        Application.loadProjects();
      } else {
        if (Application.PTApi.AUT_REF == null)
          Application.Utils.showNotice('Please enter valid user & password.');
      }
    });
  },

  loadProjects:function () {
    var dfr = $.Deferred();
    Application.PTApi.getProjects(function (status, projects) {
      if (status) {
        Application.Utils.hideNotice();
        Application._loadProjectsElements(projects);
        $.mobile.changePage("#home_page");
        dfr.resolve();
      } else {
        Application.Utils.showNotice(projects);
        dfr.reject();
      }
    });

    return dfr.promise();
  },

  _loadProjectsElements:function (projects) {
    var projectEl = $('#projects');
    var html = [];
    html.push("<option>Select Project</option>");

    for (var i = 0; i < projects.length; i++) {
      var project = projects[i];
      html.push("<option value='" + project.id + "'>" +
          project.name + " ( " + project.account + ")" + "</option>");
    }
    projectEl.html(html.join(' '));
  },

  determineFirstPage:function () {
    if (Application.ptSettings.username != null &&
        Application.ptSettings.password != null &&
        Application.ptSettings.prefix != null) {
      $('#settings_username').val(Application.ptSettings.username);
      $('#settings_password').val(Application.ptSettings.password);
      $('#settings_prefix').val(Application.ptSettings.prefix);
      Application.loadDetailsPage();
    }
  },


  eventsObserversInitiated:false,

  addEventsObservers:function () {
    if (!Application.eventsObserversInitiated) {
      $('#btn_start_timer').click(Application.Events.handleStartOrStopTimer);
      $('#btn_save_settings').click(Application.Events.handleSaveSettings);
      $('#projects').bind('change', Application.Events.handleProjectSelection);
      $('#stories').bind('change', Application.Events.handleStorySelection);
      $('#btn_sync').bind('click', Application.Events.handleSyncByClick);
      $('#btn_finished').click(Application.Events.handleTaskSetAsFinished);
      $('#btn_refresh').click(Application.Events.handleRefreshPage);

      Titanium.API.addEventListener(Titanium.EXIT, function (event) {
        if (!Application.exitable) {
          event.stopPropagation();
          Titanium.UI.getCurrentWindow().hide();
        }
      });

      Application.eventsObserversInitiated = true;
    }
  },

  addOnTray:function () {
    try {
      var sysMenu = Titanium.UI.createMenu();

      var toggleView = Application.stopTimer = Titanium.UI.createMenuItem(
          'Show / Hide', function () {
            if (Titanium.UI.getCurrentWindow().isVisible())
              Titanium.UI.getCurrentWindow().hide();
            else
              Titanium.UI.getCurrentWindow().show();
          });

      var stopTimer = Application.stopTimer = Titanium.UI.createMenuItem(
          'Stop Timer', Application.Events.handleStartOrStopTimer);
      stopTimer.disable();

      var startTimer = Application.startTimer = Titanium.UI.createMenuItem(
          'Start Timer', Application.Events.handleStartOrStopTimer);
      startTimer.disable();

      var syncTimer = Application.syncTimer = Titanium.UI.createMenuItem(
          'Sync with PT', Application.Events.handleSyncByClick);
      syncTimer.disable();

      var exit = Titanium.UI.createMenuItem('Exit', Application.Events.handleExit);

      sysMenu.appendItem(stopTimer);
      sysMenu.appendItem(startTimer);
      sysMenu.appendItem(syncTimer);
      sysMenu.addSeparatorItem();
      sysMenu.appendItem(exit);

      var tray = Application.sysTray = Titanium.UI.addTray("app://icons/logo_small.png");
      tray.setMenu(sysMenu);
    } catch (e) {
      Application.debug(e);
    }
  },

  debug:function (msg) {
    if (typeof (console) != 'undefined')
      console.log(msg);
  }
};

$(document).ready(Application.init);
