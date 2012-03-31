Application['Database'] = {
	Utils : {

	},

	PTUser : function(userName, password) {this.userName = userName, this.password = password;

		this.save = function() {
			var dataDir = Titanium.Filesystem.getApplicationDataDirectory();
			var configFile = Titanium.Filesystem.getFile(dataDir, '.active-user');
			configFile.write(this.userName + "|" + this.password);
		}
	},
	PTUserUtils : {
		loadSystemUser : function() {
			var dataDir = Titanium.Filesystem.getApplicationDataDirectory();
			var configFile = Titanium.Filesystem.getFile(dataDir, '.active-user');

			var content = configFile.read();
			var config = {};

			if(content != null && content.length > 0) {
				var parts = content.split('|');
				Application.ptSettings.username = parts[0];
				Application.ptSettings.password = parts[1];
			}
		}
	}
};