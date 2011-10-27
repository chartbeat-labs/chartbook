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
	
	var MAX_ITEMS = 10;
	var title;
	var noStyle;
	
	getData = function(domain,cb_key,callback,opt_exlexp) {
		var exlExp;
		// Exclude home pages by default
		if(typeof(opt_exlexp) == 'undefined' || opt_exlexp == null ) { exlExp = new RegExp(domain.concat("/*$")); } 
		else { exlExp = new RegExp(opt_exlepp); }
		// console.debug("exlExp: " + exlExp);
		var cbUrl ='http://api.chartbeat.com/live/toppages/?host='.concat(domain,'&limit=',MAX_ITEMS,'&apikey=',cb_key);
		var fbUrl = "https://api.facebook.com/method/fql.query?query=";
		var fbpgq="SELECT+url%2C+share_count%2C+like_count%2C+comment_count%2C+total_count%2C+commentsbox_count%2C+comments_fbid%2C+click_count+FROM+link_stat+WHERE+url+in(";
		var topPgs;
		// Fetch CB Data
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
			console.debug(fbUrl);
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
		// List
		for (var itr = 0; itr < len; ++itr) {
			var pg = topPgs[itr];
			var item;
			var pos = (itr%2 == 0) ? "even" : "odd";
			goog.dom.appendChild(list, goog.dom.createDom("li",{"class":"cbwitem","id":"cbwitem-".concat(itr)},
					goog.dom.createDom('div',{"class":"cbwitem-div " + pos,"id":"cbwitem-div-".concat(itr)},
							imgNode = goog.dom.createDom('div',{"class":"cbwimg-div","id":"cbwimg-div-".concat(itr)}),
							goog.dom.createDom('div',{"class":"cbwtextonly-div","id":"cbwtext-div-".concat(itr)},
							aNode = goog.dom.createDom('a',{"class":"cbwitem-a","id":"cbwitem-a-".concat(itr),"href":"http://".concat(pg.path)}),
							goog.dom.createDom('br',null),goog.dom.createDom('span',{"class":"cbwvisits","id":"cbwvisits-".concat(itr)},"Current Visitors: ".concat(pg.visitors)),
							goog.dom.createDom('br',null),goog.dom.createDom('span',{"class":"cbwlikes","id":"cbwvisits-".concat(itr)},"Shares: ".concat(pg.shares))
							),
						goog.dom.createDom('div',{"class":"cbwclear","id":"cbwclear-".concat(itr)}))
			));
			aNode.innerHTML = pg.i;
			if ( typeof(pg.fbId) != 'undefined' ) {
				pg.imgLdr.par = imgNode
				pg.imgLdr.itmIdx = itr;
				goog.events.listen(pg.imgLdr, goog.net.EventType.COMPLETE, function(e) {
					if ( this.getLastError() !== "" ) return;
					fbgData = this.getResponseJson();
					goog.dom.setProperties(goog.dom.getNextElementSibling(this.par), {"class":"cbwtext-div"});
					goog.dom.insertChildAt(this.par,goog.dom.createDom("img",{"class":"cbwitem-img","id":"cbwitem-img-".concat(this.itmIdx),"src":fbgData.image[0].url}),0);
				});
				pg.imgLdr.send(fbgUrl.concat(pg.fbId));
			} else {
				pg.imgLdr = null;
			}
		}
		
		// Header
		if ( typeof(title) == 'undefined' || title == null) title = "Top Pages";
		goog.dom.insertChildAt(list,goog.dom.createDom("li",{"class":"cbwheader","id":"cbwheader"},title),0);
		// Logo
		goog.dom.appendChild(list,goog.dom.createDom("li",{"class":"cbwlogoitem","id":"cbwlogoitem"},
				goog.dom.createDom('a',{"class":"cbwlogo-a","id":"cbwlogo-a","href":"http://www.chartbeat.com"},"Powered By:",
				goog.dom.createDom("img",{"class":"cbwlogo","id":"cbwlogo","src":"/chartbook/logo_chartbeat_small.gif"})),
				goog.dom.createDom('div',{"class":"cbwclear","id":"cbwclear"})
			));
		
		// Style it 
		console.debug(typeof(noStyle));
		if ( (typeof(noStyle) == 'undefined' || noStyle == null ) || !Boolean(noStyle) ) {
			var allSS = goog.cssom.getAllCssStyleSheets();
			var ss = allSS[allSS.length - 1];
			goog.cssom.addCssRule(ss,"ul.cbwidget { width: 300px; list-style-type: none; border: 2px solid black; padding: 0px }");
			goog.cssom.addCssRule(ss,"div.cbwitem-div { padding:3px }");
			goog.cssom.addCssRule(ss,"div.even { background-color:white }");
			goog.cssom.addCssRule(ss,"div.odd { background-color:#e5e5e5 }");
			goog.cssom.addCssRule(ss,"div.cbwtext-div { width:200px; padding:3px; float: right; font-family: 'Helvetica'; font-size: 10pt; }");
			goog.cssom.addCssRule(ss,"div.cbwtextonly-div { width:100%; padding:3px; font-family: 'Helvetica'; font-size: 10pt; }");
			goog.cssom.addCssRule(ss,"a.cbwitem-a { font-weight: bold }");
			goog.cssom.addCssRule(ss,"a.cbwitem-a:link { text-decoration:none; }");
			goog.cssom.addCssRule(ss,"div.cbwimg-div { width:75px; float: left; }");
			goog.cssom.addCssRule(ss,"img.cbwitem-img { width: 75px; }");
			goog.cssom.addCssRule(ss,"div.cbwclear { clear:both; }");
			goog.cssom.addCssRule(ss,"li.cbwheader { padding:3px; background-color:black; color: white; font: bold 12pt Helvetica }");
			goog.cssom.addCssRule(ss,"li.cbwlogoitem { padding:3px; background-color:black; color: white; font: bold 10pt Helvetica }");
			goog.cssom.addCssRule(ss,"img.cbwlogo { float:right;}");
			goog.cssom.addCssRule(ss,"a.cbwlogo-a:link { text-decoration:none; color: white;}");
			goog.cssom.addCssRule(ss,"a.cbwlogo-a:active { text-decoration:none; color: white;}");
			goog.cssom.addCssRule(ss,"a.cbwlogo-a:visited { text-decoration:none; color: white;}");
		}
	}
	
	this.insertWidget = function(domain,cb_key,nodeId,opt_exlexp,opt_title,opt_nostyle){
		title = opt_title;
		noStyle = opt_nostyle;
		topNode = goog.dom.getElement(nodeId);
		getData(domain,cb_key,drawWidget,opt_exlexp);
	}
}
