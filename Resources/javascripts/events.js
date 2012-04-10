Application.Events = {
  lastSync:null,
  lastRequest:null,

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
    var now = new Date();

    if (Application.currentTaskTimer == null) {
      if ((Application.lastClickedTime &&
          (now.getTime() - Application.lastClickedTime.getTime()) > 1000) ||
          (Application.lastClickedTime == null)) {
        Application.Events.startSyncTimer();
      }
    } else {
      if (Application.lastClickedTime && (now.getTime() - Application.lastClickedTime.getTime()) > 1000) {
        Application.Events.stopSyncTimer();
      }
    }

    Application.lastClickedTime = new Date();
    Application.Events._enableButtons();
  },

  startSyncTimer:function () {
    if (Application.currentTaskStartedAt == null)
      Application.currentTaskStartedAt = new Date();

    Application.currentTaskTimer = setInterval(Application.Events.handleTimerTick, 1000);
    $('#btn_start_timer').removeClass('ui-btn-up-b')
        .addClass('ui-btn-up-e')
        .find('.ui-btn-text').text('Stop');

  },

  stopSyncTimer:function () {
    if (Application.currentTaskTimer != null)
      clearInterval(Application.currentTaskTimer);

    Application.currentTaskTimer = null;

    if ($('#btn_start_timer').hasClass('ui-btn-up-e'))
      $('#btn_start_timer').removeClass('ui-btn-up-e').
          addClass('ui-btn-up-b').
          find('.ui-btn-text').text('Start');
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
    Application.debug('Requested for sync on server');

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
    var projectId = $(this).val();
    Application.PTApi.ACTIVE_PROJECT_ID = projectId;
    var $stories = $('#stories');
    $stories.html('<option>Loading Stories...</option>');
    $stories.selectmenu('refresh');

    Application.Utils.showNotice('Loading Stories...');
    Application.PTApi.getStories(function (status, stories) {
      Application.Utils.hideNotice();

      if (status) {
        var html = [];
        html.push('<option>Select Story</option>');
        var groupedStories = Application.Events._groupStoriesByState(stories);

        for (var key in groupedStories) {
          var stories = groupedStories[key];
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
      } else {
        Application.Utils.showNotice(stories);
      }
    });
  },

  handleStorySelection:function (e) {
    try {
      var $option = $(e.target.
          getElementsByTagName('option')[this.selectedIndex]);
      var index = Application.PTApi.STATES.indexOf(
          $option.attr('pt_current_state'));
      var labels = decodeURI(
          $option.attr('pt_labels').toString()).split(',');

      Application.currentTaskStartedAt = null;
      Application.currentProjectId = $option.attr('pt_project_id');
      Application.currentStoryId = $option.attr('value');
      Application.currentElementRef = $option;

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

      if (Application.currentTaskStartedAt == null)
        Application.currentTaskStartedAt = new Date();

      // Change status text
      $('#sync_status').html('Not yet sync with server.');

      // Stop currently running timer
      Application.Events.stopSyncTimer();

      // Refresh timer display
      Application.Events.handleTimerTick();

      if (index != -1) {
        $($('#states').find('option')[index]).
            attr('selected', 'selected');
        $('#states').selectmenu('refresh');
      }

      // Enable buttons
      Application.Events._enableButtons();
    } catch (e) {
      Application.debug(e);
    }
  },

  BUTTONS : ['#btn_sync', '#btn_finished', '#btn_start_timer'],
  _enableButtons:function () {
    for (var i in Application.Events.BUTTONS) {
      var $button = $(Application.Events.BUTTONS[i]);
      $button.removeClass('ui-disabled');
    }
  },

  handleSyncByClick:function (e, callback, state) {
    Application.debug('Sync NOW!');

    if (Application.currentTaskStartedAt != null) {
      Application.debug('Requesting for sync');
      var diffDate = Application.Utils.getDateDiffFromNow();
      var formattedDate = Application.Utils.buildFormattedDate(diffDate);
      $('#btn_sync').addClass('ui-disabled');

      if (callback == null) {
        Application.PTApi.syncOnServer(
            formattedDate, Application.Events.handleSyncResponse, state);
      } else {
        Application.PTApi.syncOnServer(
            formattedDate, function(status, msg) {
              callback(status, msg);
              Application.Events.handleSyncResponse(status, msg);
            }, state);
      }
    }
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

  handleTaskSetAsFinished: function(e) {
    if (Application.currentProjectId && Application.currentStoryId &&
        Application.currentElementRef) {
      $('#btn_finished').addClass('ui-disabled');
      Application.Events.stopSyncTimer();
      Application.Events.handleSyncByClick(e, function(status, msg) {
        if (!status) {
          Application.Utils.showNotice(msg);
          $('#btn_finished').removeClass('ui-disabled');
        } else {
          Application.currentElementRef.attr('pt_current_state', 'finished');
        }
      }, 'finished');
    }
  },

  handleRefreshPage: function(e) {
    if (Application.currentProjectId && Application.currentStoryId) {
      Application.Events.stopSyncTimer();
    }

    Application.loadProjects()
        .then(function() {
          var $stories = $('#stories');
          $stories.html('<option>Select project</option>');
          $('#projects, #stories').selectmenu('refresh');
        });

  },

  handleExit: function(e) {
    Application.Events.handleSyncByClick(e);
    Application.exitable = true;
    Titanium.App.exit();
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
  }
};
