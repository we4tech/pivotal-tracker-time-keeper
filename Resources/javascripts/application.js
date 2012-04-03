var Application = {
	ptSettings : {},
	currentStoryId : null,
	currentProjectId : null,
	currentUserId : null,
	currentTaskStartedAt : null,
	currentTaskTimer : null,
	timerPanel : null,
	lastClickedTime: null,
	
	init : function() {
		Application.loadExistingSettings();
		Application.addEvents()
		Application.loadStates();
		Application.determineFirstPage();
	},
	
	loadStates: function() {
		var html = [];
		for (var i = 0; i < Application.PTApi.STATES.length; i++) {
			var state = Application.PTApi.STATES[i];
			html.push("<option value='" + state + "'>" + state + "</option>");
		}
		$('#states').html(html.join(' '));
	},
	
	loadDetailsPage: function() {
		Application.showNotice('Authenticating...');
		
		Application.PTApi.getUserToken(function(status, tokenRef) {
			if (status) {
				Application.debug("User token found - " + tokenRef.guid);
				Application.showNotice('Loading projects...');
				Application.PTApi.getProjects(function(status, projects) {
					if (status) {
						Application.hideNotice();
						Application.loadProjects(projects);
						$.mobile.changePage("#home_page");
					} else {
						Application.showNotice(projects);
					}	
				});				
			} else {
				if (Application.PTApi.AUT_REF == null)
					Application.showNotice('Please enter valid user & password.');
			}	
		});
	},
	
	loadProjects: function(projects) {
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
	
	determineFirstPage: function() {
		if (Application.ptSettings.username != null && Application.ptSettings.password != null) {
			$('#settings_username').val(Application.ptSettings.username);
			$('#settings_password').val(Application.ptSettings.password);
			Application.loadDetailsPage();
		}
	},


  eventInitiated: false,

	addEvents : function() {
    if (!Application.eventInitiated) {
      $('#btn_start_timer').click(Application.Events.handleStartOrStopTimer);
      $('#btn_save_settings').click(Application.Events.handleSaveSettings);
      $('#projects').bind('change', Application.Events.handleProjectSelection);
      $('#stories').bind('change', Application.Events.handleStorySelection);
      $('#btn_sync').bind('click', Application.Events.handleSyncByClick);
      Application.eventInitiated = true;
    }
	},

	debug : function(msg) {
		if( typeof (console) != null) {
			console.log(msg);
		}
	},

  getDateDiffFromNow: function() {
    var diff = (new Date().getTime() - Application.currentTaskStartedAt.getTime());
    var tzDiff = (Application.currentTaskStartedAt.getTimezoneOffset() * 60 * 1000);
		return new Date(diff + tzDiff);
  },

  buildFormattedDate: function(diffDate) {
    return [diffDate.getHours().toString().lpad('0', 2),
            diffDate.getMinutes().toString().lpad('0', 2),
            diffDate.getSeconds().toString().lpad('0', 2)].join(':');
  },

  loadExistingSettings : function() {
		Application.Database.PTUserUtils.loadSystemUser();
	},
	
	noticeTimer: null,
	
	showNotice : function(notice) {
		$.mobile.loadingMessage = notice;
		$.mobile.showPageLoadingMsg();
		
		if (Application.noticeTimer != null)
			clearTimeout(Application.noticeTimer);
			
		Application.noticeTimer = setTimeout(function() {
			$.mobile.hidePageLoadingMsg();
		}, 10000);
	},
	
	hideNotice: function() {
		$.mobile.hidePageLoadingMsg();
	}
};

$(document).bind('pageinit', Application.init);
