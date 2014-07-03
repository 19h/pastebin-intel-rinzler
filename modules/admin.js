var net = require("net"),
    url = require("url");

var http = require("http"),
   https = require("https");

var crypto = require("crypto");

module.exports = function(irc) {

	var admins = irc.config.admins || [];

	var isAdmin = exports.isAdmin = function isAdmin(address) {
		var f = admins.filter(function(a) {
			return address.match(a);
		});
		return f.length;
	};

	var cmdchar = irc.config.chmdchar || ">";

	irc.on("privmsg", function(m) {
		if (m.text.length && isAdmin(m.source)) {
			var responder = {};

			var sendto = m.target[0] == "#" ? m.target : m.user.nick;
			responder.respond = irc.send.bind(irc, "privmsg", sendto);

			if ( m.target !== irc.config.info.nick ) return void 0;

			var _cmd = m.text.split(" "),
			     cmd = _cmd[0];

			if (cmds[cmd]) {
				return cmds[cmd].apply(responder, [ m, _cmd[1] ]);
			} else {
				return irc.send("notice", nick, "Unknown command: fuck you");
			}
		} else {
			return irc.send("notice", nick, "Unknown command: fuck you");
		}
	});

	irc.on("403", function (m) {
		if (!irc.config.bcnicks) return void 0;

		irc.config.bcnicks.forEach(function (nick) {
			irc.send("notice", nick, m.text)
		});
	})

	function saveConfig() {
		delete irc.config["$0"];
		delete irc.config["_"];
		irc.supervisor({
			save: JSON.stringify(irc.config, null, 4)
		});
	}

	var cmds = {};

	cmds.reload = function() {
		irc.supervisor({
			reload: true
		});
	};
	
	cmds.admin = function(m) {
		irc.send("notice", m.user.nick, "Yes you are");
	}

	cmds.join = function(m, chan) {
		if (!~irc.config.channels.indexOf(chan)) {
			irc.config.channels.push(chan);
			saveConfig();
		}
		irc.send("join", chan);
	};

	cmds.listusers = function(m, chan) {
		if (!global.chanstats[chan])
			return irc.send("notice", m.user.nick, "I'm not on that channel.");

		this.respond(JSON.stringify(global.chanstats[chan]));
	};

	cmds.listchans = function(m) {
		return irc.send("notice", m.user.nick, "I'm currently on these channels: " + Object.keys(global.chanstats).join(", "));
	};

	cmds.part = function(m, chan) {
		chan = chan || m.target;
		if (~irc.config.channels.indexOf(chan)) {
			irc.config.channels.splice(irc.config.channels.indexOf(chan), 1);
			saveConfig();
		}

		// cleanup stats
		delete global.chanstats[chan];

		irc.send("part", chan);
	};

	cmds.get = function(m, jpath) {
		path = jpath.split(/[\[\]\.]+/g);
		var c = irc.config;

		while (c && path.length)
			c = c[path.shift()];

		this.respond(JSON.stringify(c));
	};

	cmds.set = function(m, jpath, val) {
		path = jpath.split(/[\[\]\.]+/g);
		var c = irc.config;
		while (c && path.length > 1)
			c = c[path.shift()];
		var last = path.shift();
		c[last] = JSON.parse(val);
		saveConfig();
		this.respond(last + " = " + JSON.stringify(c[last]));
	}

	return cmds;
};