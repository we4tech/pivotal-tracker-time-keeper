// Taken from http://sajjadhossain.com/2008/10/31/javascript-string-trimming-and-padding/
//pads left
String.prototype.lpad = function(padString, length) {
	var str = this;
	while(str.length < length)
		str = padString + str;
	return str;
};

//pads right
String.prototype.rpad = function(padString, length) {
	var str = this;
	while(str.length < length)
		str = str + padString;
	return str;
};


