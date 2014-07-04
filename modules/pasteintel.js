var jsdom = require("jsdom"), http = require("http"), fs = require("fs");

var filters = {
	credlist: /^[a-z0-9\-\._]+@[a-z0-9\-\.]+\.[a-z]{2,4}[ \t;,:\|]+\S+/,
	hacknotif: /(h[a4]ck[e3]d|[p0]wn[e3]d|d[e3]f[a4]c[e3]d) by/,
	leakedby: /leaked (by|from)/,
	visacc: /[ \t:="']+4[0-9]{12}(?:[0-9]{3})?/,
	mastercc: /\s+5[1-5][0-9]{14}\s+/,
	mysqlpwddump: /[\s\|,;']+[a-z0-9\-\._]+@[a-z0-9\-\.]+\.[a-z]{2,4}[\s\|,;:']+/,
	apikey: /(api|private)[-_]key[ "']*=[ ="']*\w+/,
	cvereference: /CVE\-20[0-1]{1}[0-9]{1}\-[0-9]{4}/
}, fmp = Object.keys(filters);

module.exports = function(irc) {
	var htrq = function (url, cb) {
		http.get(url, function (s) {
			var data = Buffer(0);

			s.on("data", function (c) {
				data = Buffer.concat([data, c]);
			}), s.on("end", function () {
				cb(data)
			})
		})
	}

	var items = {}, initd, i = 0;

	var queue = []; var Q = false;

	var queueIterator = function () {
		if (!queue.length) return setTimeout(queueIterator, 500)

		var item = queue.shift();

		htrq("http://pastebin.com/raw.php?i=" + item, function (data) {
			console.log("Obtaining:", item, "(Queue: " + queue.length + ")");

			var ds = data.toString();

			fmp.forEach(function (f) {
				if(filters[f].test(ds)) {
					irc.send("notice", "#rtdox", "Found a match of type " + f + ": " + item + " - http://pastebin.com/raw.php?i=" + item)
					fs.writeFileSync("./track/" + f + "." + Date.now(), data);
				}
			})

			setTimeout(queueIterator, 3500 + (Math.random() * 3000));
		})
	}

	var _next = function () {
		console.log("Updating..", ++i);
		jsdom.env(
			"http://pastebin.com/archive", ["http://code.jquery.com/jquery.js"],
			function(errors, window) {
				var $ = window.$;
				var _items = {};

				$("table tr").each(function(i, k){
					k = $(k);

					if ( k.attr("class") ) return;

					var as = k.find("a");

					_items[as[0].getAttribute("href").slice(1)] = as[1].getAttribute("href").split("/").pop();
				});

				Object.keys(_items).filter(function (v) {
					return !items[v]
				}).forEach(function (v) {
					console.log("Queued:", v);

					queue.push(v);

					items[v] = _items[v];
				})

				setTimeout(_next, 15000)
			}
		);
	}

	_next();
	queueIterator();
}