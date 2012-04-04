var Application = {
  ptSettings:{},
  currentStoryId:null,
  currentProjectId:null,
  currentUserId:null,
  currentTaskStartedAt:null,
  currentTaskTimer:null,
  timerPanel:null,
  lastClickedTime:null,

  init:function () {
    try {
      Application.Utils.loadExistingSettings();
      Application.addEventsObservers()
      Application.loadStates();
      Application.determineFirstPage();
    } catch (e) {
      alert(e);
    }
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
        Application.PTApi.getProjects(function (status, projects) {
          if (status) {
            Application.Utils.hideNotice();
            Application.loadProjects(projects);
            $.mobile.changePage("#home_page");
          } else {
            Application.Utils.showNotice(projects);
          }
        });
      } else {
        if (Application.PTApi.AUT_REF == null)
          Application.Utils.showNotice('Please enter valid user & password.');
      }
    });
  },

  loadProjects:function (projects) {
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
      $('#states').bind('change', Application.Events.handleStateChange);
      Application.eventsObserversInitiated = true;
    }
  },

  debug:function (msg) {
    if (typeof (console) != null) {
      console.log(msg);
    }
  }
};

$(document).bind('pageinit', Application.init);
