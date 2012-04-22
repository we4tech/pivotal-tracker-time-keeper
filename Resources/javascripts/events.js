Application.Events = {
  lastSync:null,
  lastRequest:null,

  initSystemEventsObservers:function () {
    try {
      App.watchOn(App.EVENT_TYPES.EXIT, App.Events.handleExit);
      App.watchOn(App.EVENT_TYPES.LOAD_PROJECTS, App.Events.loadProjects);
      App.watchOn(App.EVENT_TYPES.SELECT_STORY, App.Events.selectStory);
      App.watchOn(App.EVENT_TYPES.SELECT_PROJECT, App.Events.selectProject);
      App.watchOn(App.EVENT_TYPES.START_TIMER, App.Events.startSyncTimer);
      App.watchOn(App.EVENT_TYPES.STOP_TIMER, App.Events.stopSyncTimer);
      App.watchOn(App.EVENT_TYPES.SYNC, App.Events.sync);
      App.watchOn(App.EVENT_TYPES.BTN_TIMER_START, App.Events.showOrHideButtonStart);
    } catch (e) {
      alert('Failed to setup system event observers - ' + e);
    }
  },

  eventsObserversInitiated:false,

  initApplicationEventsObservers:function () {
    if (!App.Events.eventsObserversInitiated) {
      $('#btn_start_timer').click(App.Events.handleStartOrStopTimer);
      $('#btn_save_settings').click(App.Events.handleSaveSettings);
      $('#projects').click(App.Events.handleProjectSelection);
      $('#stories').click(App.Events.handleStorySelection);
      $('#btn_sync').click(App.Events.handleSyncByClick);
      $('#btn_finished').click(App.Events.handleTaskSetAsFinished);
      $('#btn_refresh').click(App.Events.handleRefreshPage);

      new App.Modules.InPlaceEditor($('#timer_panel'))
          .setCanEdit(function() {
            if (App.currentTaskTimer != null) {
              if (confirm("Do you want to stop timer ?\nTo manually change time you have to stop currently running timer.")) {
                App.notifyOn(App.EVENT_TYPES.STOP_TIMER);
              }
            }

            return App.currentProjectId && App.currentStoryId && App.currentTaskTimer == null;
          })

          .ifChange(function(oldValue, newValue) {
            if (newValue == null || newValue.length == 0 || newValue.split(':').length != 3) {
              alert('Please enter valid format, ie- 00:00:00 (hours, mins, secs)');
              return false;
            } else {
              if (confirm("Do you want to set `" + newValue + "` ?")) {
                App.currentTaskStartedAt = App.Utils.buildDateFromString(newValue);
                App.currentTaskEndedAt = new Date();
                App.notifyOn(App.EVENT_TYPES.SYNC);
                return true;
              } else {
                return false;
              }
            }
          });

      App.watchOn(Titanium.CLOSE, function (event) {
        if (!App.exitable) {
          event.stopPropagation();
          Titanium.UI.getCurrentWindow().hide();
          App.notifyOn(App.EVENT_TYPES.WINDOW_SHOW_HIDE, false);
          return false;
        }
      });

      App.Events.eventsObserversInitiated = true;
    }
  },

  showOrHideButtonStart: function() {
    var state = App.getEventData(App.EVENT_TYPES.BTN_TIMER_START);

    if (state)
      $('#btn_start_timer').removeClass('ui-disabled');
    else
      $('#btn_start_timer').addClass('ui-disabled');
  },

  handleSaveSettings:function (e) {
    var username = $('#settings_username').val();
    var password = $('#settings_password').val();
    var prefix = $('#settings_prefix').val();

    if ((username && username.length > 0) &&
        (password && password.length > 0) &&
        (prefix && prefix.length > 0)) {
      Application.ptSettings.username = username;
      Application.ptSettings.password = password;
      Application.ptSettings.prefix = prefix;

      // Store configuration
      var user = new Application.Database.PTUser(username, password, prefix);
      user.save();
      Application.loadDetailsPage();
    } else {
      Application.Utils.showNotice('Please enter user name and password');
    }

    return false;
  },

  handleStartOrStopTimer:function (e) {
    if (Application.currentTaskTimer == null)
      App.notifyOn(App.EVENT_TYPES.START_TIMER);
    else
      App.notifyOn(App.EVENT_TYPES.STOP_TIMER);
  },

  startSyncTimer:function () {
    if (Application.currentTaskStartedAt == null) {
      Application.currentTaskStartedAt = new Date();
    } else if (Application.currentTaskEndedAt != null) {
      Application.currentTaskStartedAt = new Date(new Date().getTime() - (Application.currentTaskEndedAt.getTime() - Application.currentTaskStartedAt.getTime()));
    }

    Application.currentTaskTimer = setInterval(Application.Events.handleTimerTick, 1000);
    $('#btn_start_timer')
        .removeClass('ui-btn-up-b').removeClass('timer-stop')
        .addClass('ui-btn-up-e').addClass('timer-start')
        .find('.ui-btn-text').text('Stop');

    $('#btn_finished, #btn_start_timer').removeClass('ui-disabled');
    $('#btn_sync').removeClass('ui-disabled');

    App.notifyOn(App.EVENT_TYPES.TIMER_STARTED_STOPPED, true);
  },

  stopSyncTimer:function () {
    if (Application.currentTaskTimer != null) {
      clearInterval(Application.currentTaskTimer);
      Application.currentTaskTimer = null;
      App.notifyOn(App.EVENT_TYPES.TIMER_STARTED_STOPPED, false);
      App.notifyOn(App.EVENT_TYPES.SYNC);
      App.currentTaskEndedAt = new Date();
    }

    if ($('#btn_start_timer').hasClass('ui-btn-up-e'))
      $('#btn_start_timer')
          .removeClass('ui-btn-up-e').removeClass('timer-start')
          .addClass('ui-btn-up-b').addClass('timer-stop')
          .find('.ui-btn-text').text('Start');

    $('#btn_sync, #btn_finished').addClass('ui-disabled');
    $('#btn_start_timer').removeClass('ui-disabled');
  },

  resetTimer: function() {
    $('#timer_panel').html('00:00:00');
  },

  handleTimerTick:function () {
    if (Application.timerPanel == null) {
      Application.timerPanel = $('#timer_panel');
    }

    var diffDate = Application.Utils.getDateDiffFromNow();
    var formattedDate = Application.Utils.buildFormattedDate(diffDate);
    Application.timerPanel.html(formattedDate);

    Application.Events.syncOnServer(diffDate, formattedDate);

    if (Application.Events.lastSync == null)
      Application.Events.lastSync = diffDate;
  },

  syncOnServer:function (nowDiff, formattedDate) {
    try {
      if (Application.Events.lastSync != null) {
        Application.debug('Last sync time found - ' +
            Application.Events.lastSync);

        var diff = nowDiff.getTime() - Application.Events.lastSync.getTime();
        Application.debug('Diff - ' + diff);

        if (Application.currentProjectId != null &&
            Application.currentStoryId != null &&
            diff > (5 * 60 * 1000)) {
          Application.Events.lastSync = nowDiff;
          Application.PTApi.syncOnServer(
              formattedDate, Application.Events.handleSyncResponse);
        }
      }
    } catch (e) {
      Application.debug(e);
    }
  },

  handleSyncResponse:function (status, msg) {
    var now = new Date();
    $('#sync_status').html('Syncd with Pivotal Tracker on ' + now.getHours() +
        ':' + now.getMinutes() + ':' + now.getSeconds());
    $('#btn_sync').removeClass('ui-disabled');

    Application.Utils.systemNotice('Syncd with Pivotal Tracker!');
  },

  handleProjectSelection:function (e) {
    Application.PTApi.ACTIVE_PROJECT_ID = $(this).val();

    if (Application.PTApi.ACTIVE_PROJECT_ID != null &&
        !Application.PTApi.ACTIVE_PROJECT_ID.match(/Select\s*Project/i))
      App.notifyOn(App.EVENT_TYPES.SELECT_PROJECT);
  },

  selectProject:function () {
    var $stories = $('#stories');
    $stories.html('<option>Loading Stories...</option>');
    $stories.selectmenu('refresh');

    // Refresh timer display
    App.Events.resetTimer();

    App.Utils.showNotice('Loading Stories...');
    App.PTApi.getStories()
        .then(
        function (status, stories) {
          App.Utils.hideNotice();

          if (status) {
            var html = [];
            html.push('<option>Select Story</option>');
            var groupedStories = App.Events._groupStoriesByState(stories);
            var stories;

            for (var key in groupedStories) {
              stories = groupedStories[key];
              html.push('<optgroup label="' + key + '">');
              for (var i = 0; i < stories.length; i++) {
                var story = stories[i];
                html.push('<option value="' + story.id + '"' +
                    ' pt_project_id="' + story.project_id + '"' +
                    ' pt_url="' + story.url + '"' +
                    ' pt_estimate="' + story.estimate + '"' +
                    ' pt_labels="' + encodeURI(story.labels) + '"' +
                    ' pt_current_state="' + story.current_state + '"' +
                    ' pt_story_type="' + story.story_type + '">' +
                    story.name + '(' + story.estimate + ')' + '</option>')
              }
              html.push('</optgroup>');
            }
            $stories.html(html.join(' '));
            $stories.selectmenu('refresh');
          }
        }).fail(function (msg) {
          App.Utils.showNotice(msg);
        });
  },

  handleStorySelection:function (e) {
    var $option = $(e.target.getElementsByTagName('option')[this.selectedIndex]);
    if ($option.length > 0)
      App.notifyOn(App.EVENT_TYPES.SELECT_STORY, $option);
  },

  selectStory:function () {
    var dfr = $.Deferred();
    var $option = App.getEventData(App.EVENT_TYPES.SELECT_STORY);

    try {
      var index = Application.PTApi.STATES.
          indexOf($option.attr('pt_current_state'));
      var labels =
          decodeURI($option.attr('pt_labels').toString()).split(',');

      Application.currentTaskStartedAt = null;
      Application.currentProjectId = $option.attr('pt_project_id');
      Application.currentStoryId = $option.attr('value');
      Application.currentElementRef = $option;

      App.Events._retrieveExistingHours(labels);

      if (Application.currentTaskStartedAt == null)
        Application.currentTaskStartedAt = new Date();

      // Change status text
      $('#sync_status').html('Not yet sync with server.');

      // Stop currently running timer
      App.notifyOn(App.EVENT_TYPES.STOP_TIMER);

      // Refresh timer display
      Application.Events.handleTimerTick();

      if (index != -1) {
        $($('#states').find('option')[index]).
            attr('selected', 'selected');
        $('#states').selectmenu('refresh');
      }
    } catch (e) {
      Application.debug(e);
      dfr.reject(e);
    }

    return dfr.promise();
  },

  _retrieveExistingHours:function (labels) {
    if (labels.length > 0) {
      for (var i = 0; i < labels.length; i++) {
        if (labels[i].toLowerCase().
            match('^' + Application.ptSettings.prefix + ' spent:')) {
          var parts = decodeURI(labels[i]).split(/:/);
          var hours = parts[1].trim();
          var minutes = parts[2].trim();
          var seconds = parts[3].trim();
          var timestamp = (hours * 60 * 60 * 1000) +
              (minutes * 60 * 1000) +
              (seconds * 1000);
          Application.currentTaskStartedAt =
              new Date(new Date().getTime() - timestamp);
        }
      }
    }
  },

  BUTTONS:['#btn_sync', '#btn_finished', '#btn_start_timer'],
  _enableButtons:function () {
    for (var i in Application.Events.BUTTONS) {
      var $button = $(Application.Events.BUTTONS[i]);
      $button.removeClass('ui-disabled');
    }
  },

  handleSyncByClick:function (e) {
    App.notifyOn(
        App.EVENT_TYPES.SYNC);
  },

  sync:function () {
    var eventObj = App.getEventData(App.EVENT_TYPES.SYNC);
    var state, successCb, failureCb;

    if (eventObj) {
      if (eventObj instanceof String) {
        state = eventObj;
      } else {
        state = eventObj.state;
        successCb = eventObj.success;
        failureCb = eventObj.failure;
      }
    }

    var dfr = $.Deferred();
    App.debug('Sync NOW!');

    if (App.currentTaskStartedAt != null) {
      App.debug('Requesting for sync');
      App.Events._requestForServerSync(dfr, state, successCb, failureCb);
    } else {
      dfr.reject();
      if (failureCb)
        failureCb(msg);
    }

    return dfr.promise();
  },

  _requestForServerSync:function (dfr, state, successCb, failureCb) {
    var diffDate = App.Utils.getDateDiffFromNow();
    var formattedDate = App.Utils.buildFormattedDate(diffDate);

    // Disable sync button
    $('#btn_sync').addClass('ui-disabled');

    // Dispatch event about SYNC in progress
    App.notifyOn(App.EVENT_TYPES.SYNC_PROGRESS, true);

    // Request server sync
    App.PTApi
        .syncOnServer(formattedDate, state)

      // If sync is completed
        .then(function (status, msg) {
          dfr.resolve(status, msg);
          App.Events.handleSyncResponse(status, msg);

          if ('function' == typeof(successCb))
            successCb(status, msg);
        })

      // If sync has failed
        .fail(function (msg) {
          dfr.reject(msg);

          if (failureCb)
            failureCb(msg);
        })

      // Dispatch SYNC progress is done.
        .always(function () {
          // Dispatch event about SYNC is done
          App.notifyOn(App.EVENT_TYPES.SYNC_PROGRESS, false);
        });
  },

  handleStateChange:function (e) {
    try {
      if (Application.currentProjectId && Application.currentStoryId) {
        var $option = $(e.target.
            getElementsByTagName('option')[this.selectedIndex]);
        var state = $option.attr('value');

        Application.Utils.showNotice('Setting state to "' + state + '"');
        Application.PTApi.updateAttribute('current_state', state, function (status, value) {
          Application.Utils.showNotice(value);
          $('option[value="' + Application.currentStoryId + '"]').
              attr('pt_current_state', state);
        });
      } else {
        alert('You have to select project and story before performing this task.');
        return false;
      }
    } catch (e) {
      alert(e);
    }
  },

  handleTaskSetAsFinished:function (e) {
    if (Application.currentProjectId && Application.currentStoryId &&
        Application.currentElementRef) {
      $('#btn_finished').addClass('ui-disabled');
      App.notifyOn(App.EVENT_TYPES.STOP_TIMER);
      App.notifyOn(App.EVENT_TYPES.SYNC, {
            state:'finished', success:function (status, msg) {
              if (!status) {
                Application.Utils.showNotice(msg);
                $('#btn_finished').removeClass('ui-disabled');
              } else {
                Application.currentElementRef.attr('pt_current_state', 'finished');
              }
            },
            'failure':function (msg) {
              Application.Utils.showNotice(msg);
            }}
      );
    }
  },

  handleRefreshPage:function (e) {
    if (Application.currentProjectId && Application.currentStoryId) {
      App.notifyOn(App.EVENT_TYPES.STOP_TIMER);
      App.notifyOn(App.EVENT_TYPES.SELECT_PROJECT);
    }
  },

  handleExit:function (e) {
    Application.exitable = true;
    App.Utils.showNotice('Sync with server.');
    Application.Events.sync().always(function () {
      Titanium.App.exit();
    });
  },

  _groupStoriesByState:function (stories) {
    var stateMap = {};
    for (var i = 0; i < stories.length; i++) {
      var story = stories[i];
      var array = stateMap[story.current_state] || [];
      array.push(story);
      stateMap[story.current_state] = array;
    }
    delete stateMap['accepted'];

    return stateMap;
  },

  handleShowHide:function () {
    if (Titanium.UI.getCurrentWindow().isVisible()) {
      Titanium.UI.getCurrentWindow().hide();
      App.notifyOn(App.EVENT_TYPES.WINDOW_SHOW_HIDE, false);
    } else {
      Titanium.UI.getCurrentWindow().show();
      App.notifyOn(App.EVENT_TYPES.WINDOW_SHOW_HIDE, true);
    }
  },

  loadProjects:function () {
    var dfr = $.Deferred();
    App.Utils.showNotice('Loading Projects...');
    Application.PTApi.getProjects()
        .then(function (status, projects) {
          if (status) {
            Application.Utils.hideNotice();
            Application.Events._loadProjectsElements(projects);
            $.mobile.changePage("#home_page");
            dfr.resolve(projects);
          }
        })
        .fail(function (msg) {
          Application.Utils.showNotice(msg);
          dfr.reject(msg);
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
  }

};

