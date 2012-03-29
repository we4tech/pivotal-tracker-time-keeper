//pads left
// Taken from http://sajjadhossain.com/2008/10/31/javascript-string-trimming-and-padding/
String.prototype.lpad = function(padString, length) {
	var str = this;
	while(str.length < length)
		str = padString + str;
	return str;
}
//pads right
String.prototype.rpad = function(padString, length) {
	var str = this;
	while(str.length < length)
		str = str + padString;
	return str;
}

var Application = {
	ptSettings : {},
	currentTaskId : null,
	currentProjectId : null,
	currentUserId : null,
	currentTaskStartedAt : null,
	currentTaskTimer : null,
	timerPanel : null,
	lastClickedTime: null,

	Events : {
		handleSaveSettings : function(e) {
			var username = $('#settings_username').val();
			var password = $('#settings_password').val();

			if ((username && username.length > 0) && (password && password.length > 0)) {
				Application.ptSettings['username'] = username;
				Application.ptSettings['password'] = password;
				$.mobile.changePage("#home_page");
			} else {
				Application.showNotice('Please enter user name and password');
			}

			return false;
		},

		handleStartOrStopTimer : function(e) {
			if (Application.currentTaskTimer == null) {
				if ((Application.lastClickedTime && 
					(new Date().getTime() - Application.lastClickedTime.getTime()) > 1000) || 
					(Application.lastClickedTime == null && Application.currentTaskTimer == null)) {
					if (Application.currentTaskStartedAt == null)
						Application.currentTaskStartedAt = new Date();
					Application.currentTaskTimer = setInterval(Application.Events.handleTimerTick, 1000);
					$('#btn_start_timer').removeClass('ui-btn-up-b').addClass('ui-btn-up-e').find('.ui-btn-text').text('Stop');
				}
			} else {
				if (Application.lastClickedTime && (new Date().getTime() - Application.lastClickedTime.getTime()) > 1000) {
					clearInterval(Application.currentTaskTimer);
					Application.currentTaskTimer = null;
					$('#btn_start_timer').removeClass('ui-btn-up-e').addClass('ui-btn-up-b').find('.ui-btn-text').text('Start');
				}
			}
			
			Application.lastClickedTime = new Date();
		},

		handleTimerTick : function() {
			if (Application.timerPanel == null) {
				Application.timerPanel = $('#timer_panel');
			}

			var diffDate = new Date((new Date().getTime() - Application.currentTaskStartedAt.getTime()) + (Application.currentTaskStartedAt.getTimezoneOffset() * 60 * 1000));

			formattedDate = [diffDate.getHours().toString().lpad('0', 2), 
							 diffDate.getMinutes().toString().lpad('0', 2), 
							 diffDate.getSeconds().toString().lpad('0', 2)]
							 .join(':');
			Application.timerPanel.html(formattedDate);
		}
	},

	init : function() {
		Application.loadExistingSettings();
		Application.addEvents()
	},

	addEvents : function() {
		$('#btn_start_timer').click(Application.Events.handleStartOrStopTimer);
		$('#btn_save_settings').click(Application.Events.handleSaveSettings);
	},

	debug : function(msg) {
		if( typeof (console) != null) {
			console.log(msg);
		}
	},

	loadExistingSettings : function() {

	},

	showNotice : function(notice) {
		$('#status_message').html(notice).parent().show();
	}
};

$(document).bind('pageinit', Application.init);
