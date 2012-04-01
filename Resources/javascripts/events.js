Application['Events'] = {
	lastSync: null,
	lastRequest: null,
	
	handleSaveSettings : function(e) {
		var username = $('#settings_username').val();
		var password = $('#settings_password').val();

		if((username && username.length > 0) && (password && password.length > 0)) {
			Application.ptSettings['username'] = username;
			Application.ptSettings['password'] = password;

			// Store configuration
			var user = new Application.Database.PTUser(username, password);
			user.save();

			Application.loadDetailsPage();
		} else {
			Application.showNotice('Please enter user name and password');
		}
		
		return false;
	},
	
	handleStartOrStopTimer : function(e) {
		if(Application.currentTaskTimer == null) {
			if ((Application.lastClickedTime && 
				(new Date().getTime() - Application.lastClickedTime.getTime()) > 1000) || 
				(Application.lastClickedTime == null)) {
					
				if(Application.currentTaskStartedAt == null)
					Application.currentTaskStartedAt = new Date();
					Application.currentTaskTimer = setInterval(Application.Events.handleTimerTick, 1000);
				$('#btn_start_timer').removeClass('ui-btn-up-b').addClass('ui-btn-up-e').find('.ui-btn-text').text('Stop');
			}
		} else {
			if(Application.lastClickedTime && (new Date().getTime() - Application.lastClickedTime.getTime()) > 1000) {
				Application.Events.stopSyncTimer();
			}
		}

		Application.lastClickedTime = new Date();
	},
	
	stopSyncTimer: function() {
		
		if (Application.currentTaskTimer != null)
			clearInterval(Application.currentTaskTimer);
			
		Application.currentTaskTimer = null;
		
		if ($('#btn_start_timer').hasClass('ui-btn-up-e'))
			$('#btn_start_timer').removeClass('ui-btn-up-e').
								  addClass('ui-btn-up-b').
								  find('.ui-btn-text').text('Start');
	},
	
	handleTimerTick : function() {
		if(Application.timerPanel == null) {
			Application.timerPanel = $('#timer_panel');
		}

		var diffDate = new Date((new Date().getTime() - Application.currentTaskStartedAt.getTime()) + (Application.currentTaskStartedAt.getTimezoneOffset() * 60 * 1000));
		formattedDate = [diffDate.getHours().toString().lpad('0', 2), diffDate.getMinutes().toString().lpad('0', 2), diffDate.getSeconds().toString().lpad('0', 2)].join(':');
		Application.timerPanel.html(formattedDate);
		
		Application.Events.syncOnServer(diffDate, formattedDate);
		
		if (Application.Events.lastSync == null)
			Application.Events.lastSync = diffDate;
	},
	
	syncOnServer: function(nowDiff, formattedDate) {
		
		if (Application.Events.lastSync != null) {
			var diff = nowDiff.getTime() - Application.Events.lastSync.getTime();
			if (Application.currentProjectId != null && Application.currentStoryId !=null && diff > 10000) {
				Application.Events.lastSync = nowDiff;
				Application.PTApi.syncOnServer(formattedDate, function(status, msg) {
					var now = new Date();
					$('#sync_status').html('Syncd with Pivotal Tracker on ' + now.getHours() + 
										   ':' + now.getMinutes() + ':' + now.getSeconds());
				});
			}
		}		
	},
	
	handleProjectSelection: function(e) {
		var projectId = $(this).val();
		Application.PTApi.ACTIVE_PROJECT_ID = projectId;
		var $stories = $('#stories');
		$stories.html('<option>Loading Stories...</option>');
		$stories.selectmenu('refresh');
		
		//$('#sync_status').html('Not yet sync with server.' );
		
		Application.showNotice('Loading Stories...');
		Application.PTApi.getStories(function(status, stories) {
			Application.hideNotice();
			
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
				Application.showNotice(stories);
			}
		});
	},
	
	handleStorySelection: function(e) {
		try {
			$('#sync_status').html('Not yet sync with server.' );
			
			var $option = $(e.target.getElementsByTagName('option')[this.selectedIndex]);
			var index = Application.PTApi.STATES.indexOf($option.attr('pt_current_state'));
			var labels = $option.attr('pt_labels').toString().split(',');
			
			//Application.currentTaskStartedAt = null;
			Application.currentTaskStartedAt = new Date(new Date().getTime());
			Application.currentProjectId = $option.attr('pt_project_id');
			Application.currentStoryId = $option.attr('value');
			Application.currentElementRef = $option;			
			
			
			if (labels.length > 0) {
				for (var i = 0; i < labels.length; i++) {
					if (labels[i].match(/^spent:/i)) {
						var parts = decodeURI(labels[i]).split(/:/);
						var hours = parts[1].trim();
						var minutes = parts[2].trim();
						var seconds = parts[3].trim();
						var timestamp = (hours * 60 * 60 * 1000) +
										(minutes * 60 * 1000) +
										(seconds * 1000);
						Application.currentTaskStartedAt = new Date(new Date().getTime() - timestamp);
					}
				}	
			}
			
			
			// Stop currently running timer
			Application.Events.stopSyncTimer();
			
			// Refresh timer display
			Application.Events.handleTimerTick();
			
			if (index != -1) {
				$($('#states').find('option')[index]).attr('selected', 'selected');
				$('#states').selectmenu('refresh');
			}
		} catch (e) {
			Application.debug(e);
		}
	},
	
	goBackPage : function (e)
	{
		$.mobile.changePage("#home_page");
			
	},
	_groupStoriesByState: function(stories) {
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
