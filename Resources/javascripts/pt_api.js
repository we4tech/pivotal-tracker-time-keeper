Application.PTApi = {
	URI : 'https://www.pivotaltracker.com/services/v3/',
	AUT_REF: null,
	ACTIVE_PROJECT_ID: null,
	STATES: ['unscheduled', 'unstarted', 'started', 'finished', 'delivered', 'accepted', 'rejected'],

	getUserToken : function(callback) {
		Application.debug("Retrieving user authentication token");
		
		Application.PTApi._call('tokens/active', function(e) {
			Application.debug('Response - ' + e.responseText);
			
			if (e == null || e.responseText == null) 
				return callback(false, 'Error while authenticating.');
				
			if (e.responseText && e.responseText.match(/Access\s*Denied/i)) {
				callback(false, null);
			} else {
				var doc = (new DOMParser()).parseFromString(e.responseText, "text/xml");
				var guidEls = doc.documentElement.getElementsByTagName('guid');
				
				if (guidEls && guidEls.length > 0) {
					var _id = doc.documentElement.getElementsByTagName('id')[0];
					Application.PTApi.AUT_REF = {guid: guidEls[0].textContent, id: _id};
					callback(true, Application.PTApi.AUT_REF)
				}
			}	
		});
	},
	
	getProjects : function(callback) {
		if (Application.PTApi.AUT_REF != null) {
			Application.debug("Retrieving user projects");
			Application.PTApi._call('projects', function(e) {
				var doc = new DOMParser().parseFromString(e.responseText, 'text/xml');
				var projectsEle = doc.documentElement.getElementsByTagName('project');
				
				if (projectsEle && projectsEle.length > 0) {
					var projects = [];
					var projectEle;

					for (var i = 0; i < projectsEle.length; i++) {
						projectEle = projectsEle[i];
						var projectRef = {};
						projectRef.name = projectEle.
                getElementsByTagName('name')[0].textContent;
						projectRef.account = projectEle.
                getElementsByTagName('account')[0].textContent;
						projectRef.id = projectEle.
                getElementsByTagName('id')[0].textContent;
						
						projects.push(projectRef);
					}
					callback(true, projects);
				} else {
					callback(false, 'No project found');
				}
			});
		} else {
			Application.debug("Authentication token requires first.");
			callback(false, 'Authentication token is required.');
		}
	},
	
	getStories : function(callback) {
		if (Application.PTApi.AUT_REF != null) {
			Application.debug("Retrieving project stories");
			
			Application.PTApi._call('projects/' + Application.PTApi.ACTIVE_PROJECT_ID + '/stories', function(e) {
				var doc = new DOMParser().parseFromString(e.responseText, 'text/xml');
				var storiesEle = doc.documentElement.getElementsByTagName('story');
				if (storiesEle && storiesEle.length > 0) {
					var stories = [];
					var storyEle;
					
					for (var i = 0; i < storiesEle.length; i++) {
						storyEle = storiesEle[i];
						var storyRef = Application.PTApi._loadXmlToObject(storyEle);
						stories.push(storyRef);
					}
					callback(true, stories);
				} else {
					callback(false, 'No stories found');
				}
			});
		} else {
			callback(false, 'Authentication token is required.');
		}
	},
	
	syncOnServer: function(hoursMinSecStr, callback, state) {
		Application.debug('Syncing time log on server.');
		try {
			var labels = [];
      var existingLabels = null;
      state = state || 'started';

			if (Application.currentElementRef != null) {
				var lblStr = decodeURI(Application.currentElementRef.attr('pt_labels'));
				if (lblStr != null) {
					existingLabels = lblStr.split(',');
				}
				
				for (var i = 0; i < existingLabels.length; i++) {
					var lbl = existingLabels[i];
          Application.debug('Label - ' + lbl);
					if (lbl != null && lbl.length > 0 &&
              !lbl.toLowerCase().match('^' + Application.ptSettings.prefix + ' spent:') &&
              !lbl.match(/^undefined/))
						labels.push(lbl);
				}
				Application.debug(labels);
			}
			
			labels.push(Application.ptSettings.prefix.trim() + ' spent: ' + hoursMinSecStr);
			Application.debug(labels);

      Application.PTApi._call('projects/' + Application.currentProjectId +
          '/stories/' + Application.currentStoryId,
          function (e) {
            if (e.responseText.toString().indexOf('<id') != -1) {
              callback(true, 'Syncd with server.');

              if (Application.currentElementRef != null) {
                Application.currentElementRef.
                    attr('pt_labels', encodeURI(labels.join(','))).
                    attr('pt_current_state', state);
              }
            } else {
              callback(false, 'Failed to sync.');
            }
          },
          'PUT', {'Content-type':'application/xml'},
          '<story><labels>' + labels.join(',') + '</labels>' +
              '<current_state>' + state + '</current_state></story>'
      );
		} catch (e) {
			Application.debug(e);
		}
	},

  updateAttribute: function(field, value, callback) {
    Application.PTApi._call(
        'projects/' + Application.currentProjectId +
        '/stories/' + Application.currentStoryId,

        function (e) {
          Application.debug(e.responseText);
          if (e.responseText.toString().indexOf('<id') != -1) {
            callback(true, 'Updated Successfully!');
          } else {
            callback(false, 'Failed to update!');
          }
        },
        'PUT', {'Content-type':'application/xml'},
        '<story>' + '<' + field + '>' + value + '</' + field + '>' + '</story>'
    );
  },
	
	_loadXmlToObject: function(el) {
		var obj = {};
		var nodes = el.childNodes;
		for (var i = 0; i < nodes.length; i++) {
			var node = nodes[i];
			obj[node.nodeName] = node.textContent;
		}
		
		return obj;
	},
	
	_call: function(method, callback, httpMethod, headers, body) {
		var client = Titanium.Network.createHTTPClient();
		client.setTimeout(60000);
		
		if (Application.PTApi.AUT_REF != null) {
			client.setRequestHeader('X-TrackerToken', Application.PTApi.AUT_REF.guid);
		}
		
		if (headers != null) {
			for (var key in headers) {
				Application.debug('Header: ' + key + ': ' + headers[key].toString());
				client.setRequestHeader(key, headers[key].toString());
			}	
		}
		
		client.onreadystatechange = function(e) {
			if (e.readyState == e.DONE) {
				callback(e);	
			}
		};
		
		client.onerror = function(e) {
			return null;
		};
		
		client.open((httpMethod || 'GET'), Application.PTApi.URI + method, true, 
					Application.ptSettings.username, 
					Application.ptSettings.password);
					
		if (body == null)
			client.send();
		else
			client.send(body);
	}
};