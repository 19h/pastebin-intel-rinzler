var net = require("net"),
    url = require("url"),
   path = require("path");

var http = require("http"),
   https = require("https");

var crypto = require("crypto");

var r = require("request");

module.exports = function(irc) {
	var isIgnoredUser = module.exports.isIgnoredUser = function(address) {
		var _ref;
		var ignoredUsers = ((_ref = irc.config.ignore) != null ? _ref['users'] : void 0) || [];
		var f = ignoredUsers.filter(function(a) {
			return address.match(a);
		});
		return f.length;
	};

        var saveConfig = function () {
                delete irc.config["$0"];
                delete irc.config["_"];
                irc.supervisor({
                        save: JSON.stringify(irc.config, null, 4)
                });
        }

	var client;

	global.handlers = [];

	var hs_intv, hs_rc = false;
	var i = 0;

	var isConnected = false;

	irc.on("connect", function() {
		var core = irc.use(require("ircee/core"));
		core.login(irc.config.info);

		irc.config.channels.forEach(function (e) {
			irc.send("names", e);
		});
	});

	irc.on("001", function(e) {
		(irc.config.channels || []).forEach(function(c) {
			irc.send("join", c);
		});
	});

	irc.on("part", function (e) {
		if ( e.user.nick === irc.config.info.nick ) return void 0;

		// reload nicks
		irc.config.channels.forEach(function (e) {
			irc.send("names", e);
		});
	})

	irc.on("join", function (e) {
		if ( e.user.nick === irc.config.info.nick ) return void 0;

		// reload nicks
		irc.config.channels.forEach(function (e) {
			irc.send("names", e);
		});
	})

	irc.on("403", function (e) {
		irc.config.channels = irc.config.channels.filter(function (channel) {
			return channel && channel !== e.params[1] && channel[0] === "#"
		});

		saveConfig();
	})

	irc.on("464", function () {
		try {
			// apx: this kicks off the authentication process of my bnc.
			//      proceed to the catch for your authentication.
			require(path.join(process.cwd(), "lib/loginHandler.js"))(irc)
		} catch(e) {
			// apx: this is valid for ZNC.
			//      NickServ: change to ("privmsg", "nickserv", "identify username password")

			// irc.send("PASS", "username:password");
		}
	})

	irc.on("477", function (e) {
		irc.config.channels = irc.config.channels.filter(function (channel) {
			return channel && channel !== e.params[1] && channel[0] === "#"
		});

		saveConfig();
	})
}