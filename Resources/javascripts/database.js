Application.Database = {
	Utils : {

	},

	PTUser : function(userName, password, prefix) {
    this.userName = userName;
    this.password = password;
    this.prefix = prefix;

		this.save = function() {
			var dataDir = Titanium.Filesystem.getApplicationDataDirectory();
			var configFile = Titanium.Filesystem.getFile(dataDir, '.active-user');
			configFile.write(this.userName + "|" + this.password + "|" + this.prefix);
		}
	},
	PTUserUtils : {
		loadSystemUser : function() {
      var dfr = $.Deferred();

			var dataDir = Titanium.Filesystem.getApplicationDataDirectory();
			var configFile = Titanium.Filesystem.getFile(dataDir, '.active-user');
			
			if (configFile.exists()) {
				var content = configFile.read();
        App.debug('Active user file found - ' + configFile +
                  ' - content : ' + content);

				if(content != null && content.length > 0) {
					var parts = content.split('|');
					Application.ptSettings.username = parts[0];
					Application.ptSettings.password = parts[1];
					Application.ptSettings.prefix = parts[2];
          dfr.resolve(Application.ptSettings);
				} else {
          dfr.reject();
        }
			} else {
        dfr.reject();
      }

      return dfr.promise();
		}
	}
};