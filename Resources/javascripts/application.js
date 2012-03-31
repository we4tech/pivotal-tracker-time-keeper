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

	addEvents : function() {
		$('#btn_start_timer').click(Application.Events.handleStartOrStopTimer);
		$('#btn_save_settings').click(Application.Events.handleSaveSettings);
		$('#projects').bind('change', Application.Events.handleProjectSelection);
		$('#stories').bind('change', Application.Events.handleStorySelection);
	},

	debug : function(msg) {
		if( typeof (console) != null) {
			console.log(msg);
		}
	},

	loadExistingSettings : function() {
		Application.Database.PTUserUtils.loadSystemUser();
	},

	showNotice : function(notice) {
		$.mobile.loadingMessage = notice;
		$.mobile.showPageLoadingMsg()
	},
	
	hideNotice: function() {
		$.mobile.hidePageLoadingMsg();
	}
};

$(document).bind('pageinit', Application.init);
