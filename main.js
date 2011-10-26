/**
 * @author Nathan Potter
 */

goog.require('goog.net.XhrIo');
goog.require('goog.json');
goog.require('goog.dom');
goog.require('goog.uri.utils');
goog.require('goog.cssom');

if (typeof(cb) == 'undefined') cb = {};

cb.topWidget = function(){
	
	var MAX_ITEMS = 10
	var MAX_IMG = 3;
	
	getData = function(domain,cb_key,callback,opt_exlexp) {
		var exlExp;
		// Exclude home pages by defaulr
		if (typeof(opt_exlepp) == 'undefined') { exlExp = new RegExp(domain.concat("/*$")); } 
		else { exlExp = new RegExp(opt_exlepp); }
		// console.debug("exlExp: " + exlExp);
		var cbUrl ='http://api.chartbeat.com/live/toppages/?host='.concat(domain,'&limit=',MAX_ITEMS,'&apikey=',cb_key);
		var fbUrl = "https://api.facebook.com/method/fql.query?query=";
		var fbpgq="SELECT+url%2C+share_count%2C+like_count%2C+comment_count%2C+total_count%2C+commentsbox_count%2C+comments_fbid%2C+click_count+FROM+link_stat+WHERE+url+in(";
		var topPgs;
		// Fetch CB Daa=ta
		goog.net.XhrIo.send(cbUrl, function(cbe) {
			cbxhr = cbe.target;
			topPgs = cbxhr.getResponseJson();
			// If CB URLs don't have domain, add it.
			var fbDomain;
			if ( goog.uri.utils.getDomain("http://".concat(topPgs[0].path)) == null ) { fbDomain = domain; } 
			else { fbDomain = ""; }
			for ( i = 0; i < topPgs.length; i++ ) {
				pg = topPgs[i];
				pg.path = fbDomain.concat(pg.path);
				if ( pg.i.lastIndexOf("#") > 0 ) pg.i = pg.i.slice(0,pg.i.lastIndexOf("#"));
				if ( topPgs[i].path.match(exlExp) ) { 
					// console.debug("exclude: " + topPgs[i].path + " " + i);
					topPgs.splice(i,1);
					i--;
				} else {
					fbpgq = fbpgq.concat("'",topPgs[i].path,"'");
					if ( i+1 < topPgs.length ) fbpgq = fbpgq.concat('%2C'); else fbpgq = fbpgq.concat(')');
				}
			}
			fbUrl = fbUrl.concat(fbpgq);
			// console.debug(fbUrl);
			goog.net.XhrIo.send(fbUrl, function(fbe) {
				fbxhr = fbe.target;
				fbData = fbxhr.getResponseXml();
				links = fbData.getElementsByTagName("link_stat");
				len = links.length;
				console.debug(fbData);
				for (var itr = 0; itr < len; ++itr) {
					link = links[itr];
					pg = topPgs[itr];
					// relies on FB returning URLs in the order requested. Good to verify node match, safe?
					if(pg.path == link.getElementsByTagName("url")[0].textContent) {
						pg.shares = link.getElementsByTagName("share_count")[0].textContent;
						pg.likes = link.getElementsByTagName("like_count")[0].textContent;
						fbId = link.getElementsByTagName("comments_fbid")[0].textContent;
						if( fbId !== "" ) {
							pg.fbId = fbId;
							pg.imgLdr = new goog.net.XhrIo();
						}
					}
				}
				callback(topPgs);
			});
		});
	}
	
	var topNode;
	var that = this;
	
	var styles = {"cbwitem-img":""};
	
	drawWidget = function(topPgs) {
		var fbgUrl = "https://graph.facebook.com/"
		console.debug(topPgs);
		list = goog.dom.createDom('ul',{"class":"cbwidget","id":"cdwidgetId"});
		goog.dom.appendChild(topNode,list);
		len = topPgs.length;
		for (var itr = 0; itr < len; ++itr) {
			var pg = topPgs[itr];
			var item;
			goog.dom.appendChild(list, goog.dom.createDom("li",{"class":"cbwitem","id":"cbwitem-".concat(itr)},
					item = goog.dom.createDom('div',{"class":"cbwitem-div","id":"cbwitem-div-".concat(itr)},
					goog.dom.createDom('a',{"class":"cbwitem-a","id":"cbwitem-a-".concat(itr),"href":"http://".concat(pg.path)},
					pg.i))
			));
			if ( typeof(pg.fbId) != 'undefined' ) {
				pg.imgLdr.par = item
				pg.imgLdr.itmIdx = itr;
				goog.events.listen(pg.imgLdr, goog.net.EventType.COMPLETE, function(e) {
					if ( this.getLastError() !== "" ) return;
					fbgData = this.getResponseJson();
					goog.dom.appendChild(this.par,goog.dom.createDom("img",{"class":"cbwitem-img","id":"cbwitem-img-".concat(this.itmIdx),"src":fbgData.image[0].url}));
				});
				pg.imgLdr.send(fbgUrl.concat(pg.fbId));
			}
		}
		
		// Style it 
		var allSS = goog.cssom.getAllCssStyleSheets();
		var ss = allSS[allSS.length - 1];
		goog.cssom.addCssRule(ss,"ul.cbwidget { width: 300px;}");
		goog.cssom.addCssRule(ss,"img.cbwitem-img { width: 100px; float: left; }");
		goog.cssom.addCssRule(ss,"div.cbwitem-div { clear: left; }");
		console.debug(ss);
	}
	
	this.insertWidget = function(domain,cb_key,nodeId){
		topNode = goog.dom.getElement(nodeId);
		getData(domain,cb_key,drawWidget)
	}
}
