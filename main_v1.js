/**
 * @author Nathan Potter
 */

goog.require('goog.net.XhrIo');
goog.require('goog.json');

if (typeof(cb) == 'undefined') cb = {};
cb.topWidget = {};

cb.topWidget.getData = function(dm,ky) {
	var cbUrl ='http://api.chartbeat.com/live/toppages/?host='+ dm +'&limit=10&apikey=' + ky;
	console.debug('Sending simple request for ['+ cbUrl + ']');
	goog.net.XhrIo.send(cbUrl, function(cbe) {
		cbxhr = cbe.target;
		topPgs = cbxhr.getResponseJson();
		console.debug(topPgs); 
		fbUrl = "https://api.facebook.com/method/fql.query?query=";
		fbpgq="SELECT+share_count%2C+like_count%2C+comment_count%2C+total_count%2C+commentsbox_count%2C+comments_fbid%2C+click_count+FROM+link_stat+WHERE+url+in(";
		pgcnt = topPgs.length;
		for ( i = 0; i < pgcnt; i++ ) {
			fbpgq = fbpgq.concat("'",topPgs[i].path,"'");
			if ( i+1 < pgcnt ) fbpgq = fbpgq.concat('%2C'); else fbpgq = fbpgq.concat(')');
		}
		fbUrl = fbUrl.concat(fbpgq);
		console.debug(fbUrl); 
		goog.net.XhrIo.send(fbUrl, function(fbe) {
			fbxhr = fbe.target;
			fbData = fbxhr.getResponseXml();
			console.debug(fbData);
			fbgq = "batch=[{'method': 'GET', 'relative_url': '10150363423004588'},{'method': 'GET', 'relative_url': '10150358264649361'}]";
			fbgUrl = "https://graph.facebook.com/"
			goog.net.XhrIo.send(fbgUrl.concat('10150363423004588'), function(fbge) {
				fbgxhr = fbge.target;
				fbgData = fbgxhr.getResponseText();
				console.debug(fbgData);
			});
		});
	});
}