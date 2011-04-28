/*
 * mobyUpcomingEventsManager: Plugin for managing upcoming events.
 * 
 * Methods:
 * 	toHtml:  Get an upcoming events feed and return the HTML for displaying it in the UI.  The feed will be fetched from the cache, 
 *    or if the cache is empty or out of date, from the service.  This is the default method.
 *      boolForceRefresh: force the manager to get a fresh feed from the service. (defaults to false)
 *  	objFeed: an Activity Feed JSON object to use, otherwise the plugin will query the cache or the service as appropriate
 *  	intDaysOut: How many days out to fetch in the feed (defaults to 14, all = get all items)
 *  	strExpand: An expand parameter to pass to the service (defaults to "")
 *  	callbackSuccess:  The callback to execute upon successful generation of the HTML.
 *  	callbackError:  The callback to execute if an error occurs.
 *  fetch: fetch a feed object from either the cache or the service.
 *      boolForceRefresh:  Force the manager to get a fresh feed from the service (defaults to false)
 *      intDaysOut: How many days out to fetch the feed (defaults to 14, all = get all items)
 *      strExpand: an expand parameter to pass to the service (defaults to "")
 *      callbackSuccess:  The callback to execute upon successful fetching of the feed
 *      callbackError: the callback to execute if an eerror occurs.
 */

(function($) {
	var methods = {
		toHtml : function(options) {
			var settings = {
				boolForceRefresh: false,
				objFeed : false,
				intDaysOut: 14,
				intSkip: 0,
				strLastDivider : "",
				strExpand: false,
				callbackSuccess: function(strFeedHtml) {
					return strFeedHtml;
				},
				callbackError: function() {
					alert("Unable to get your upcoming activities. Please try again.");
				}
			};
			if ( options ) {
				$.extend( settings, options );
			}
			
			var strFeedHtml = "";
			if (!options.objFeed) {
				$().mobyUpcomingEventsManager("fetch", {
					boolForceRefresh: settings.boolForceRefresh,
					intDaysOut: settings.intDaysOut,
					strExpand: false,
					callbackSuccess: function(jsonResponse, intIndex) {
						strFeedHtml = produceHtml(jsonResponse);
						settings.callbackSuccess(strFeedHtml);
					},
					callbackError: function() {
						alert("Unable to get your upcoming activities. Please try again.");
					}
				})
			} else {
				strFeedHtml = produceHtml(objFeed);
				settings.callbackSuccess(strFeedHtml);
			}
			
			var produceHtml = function(jsonResponse) {
				// First thing we need to do is sort the data by date, because the service has no facility for doing so.
				var arrItems = [];
				for (var i = 0; i < jsonResponse.upcomingEvents.length; i++) {
					arrItems[i] = Date.parseExact(jsonResponse.upcomingEvents[i].when.time, "yyyy-MM-ddTHH:mm:ssZ").setTimezone('GMT');
					arrItems[i].objItem = jsonResponse.upcomingEvents[i];
				}
				arrItems.sort(function(date1, date2) {
					if (date1 > date2) return 1;
					if (date1 < date2) return -1;
					return 0;
				})
				
				// Next we need to remove the items that we need to skip
				if (settings.intSkip >0) {
					var newArray = arrItems.slice(settings.intSkip, -1);
					arrItems = newArray;
				}
				
				// Helper function for parsing the date and returning a useful string
				var parseDateGroup = function(objDate) { 
					if (objDate < Date.today().add({days: 1})) {
						return "Today";
					}
					if (objDate < Date.today().add({days: 2})) {
						return "Tomorrow";
					}
					if (objDate < Date.today().add({days: 3})) {
						return "2 Days";
					}
					if (objDate < Date.today().add({days: 4})) {
						return "3 Days";
					}
					if (objDate < Date.today().add({days: 5})) {
						return "4 Days";
					}
					if (objDate < Date.today().add({days: 6})) {
						return "5 Days";
					}
					return "Later";
				}
				
				// Helper function for translating an upcoming event JSON object into HTML
				var objItemToHtml = function(objItem) {
					var strReturnHtml = "";
					var dateItem = Date.parseExact(objItem.when.time, "yyyy-MM-ddTHH:mm:ssZ").setTimezone('GMT');
					var strDate ="";
					var strSuffix = " AM";
					var strIconClass = "";
					
					// Get the correct date string
					// AM or PM?
					if (parseInt(dateItem.toString("HH")) > 12) {
						strSuffix = " PM";
					}
					if (parseDateGroup(dateItem) === "Today") {
						strDate = "Today " + dateItem.toString("hh:mm") + strSuffix;
					} else {
						strDate = dateItem.toString("MMMM d hh:mm") + strSuffix;
					}
					// Get the correct icon type
					if ((objItem.type === "HTML") || (objItem.type === "MANAGED_OD") || (objItem.type === "MANAGED_HTML")) {
						strIconClass = "assignment";
					} else if ((objItem.type === "THREAD") || ( objItem.type === "MANAGED_THREADS") || (objItem.type === "IQT")) {
						strIconClass = "exam-submission";
					} else {
					}
					strReturnHtml += '<li class="'+strIconClass+'">';
					strReturnHtml += '<a class="listitem-activity" href="#">';
					strReturnHtml += '<span class="mobi-title">' + objItem.title + '</span>';
					strReturnHtml += '<span class="mobi-summary">' + objItem.category.charAt(0).toUpperCase() + objItem.category.slice(1) + " at " + strDate + '</span>'
					strReturnHtml += '</a></li>\n';
					return strReturnHtml;
				}
				
				// build the HTML.
				var strHtml = "";
				var strTodayHtml = ""; // for things happening today.
				var strTomorrowHtml = ""; // for things happening tomorrow.
				var str2DayHtml = ""; // for things happening in 2 days.
				var str3DayHtml = ""; // for things happening in 3 days.
				var str4DayHtml = ""; // for things happening in 4 days.
				var str5DayHtml = ""; // for things happening in 5 days.
				var strLaterHtml = ""; // for things happening later.
				
				for (var i = 0; i < arrItems.length; i++) {
					if (parseDateGroup(arrItems[i]) === "Today"){
						strTodayHtml += objItemToHtml(arrItems[i].objItem);
					} else if (parseDateGroup(arrItems[i]) === "Tomorrow") {
						strTomorrowHtml += objItemToHtml(arrItems[i].objItem);
					} else if (parseDateGroup(arrItems[i]) === "2 Days") {
						str2DayHtml += objItemToHtml(arrItems[i].objItem);
					} else if (parseDateGroup(arrItems[i]) === "3 Days") {
						str3DayHtml += objItemToHtml(arrItems[i].objItem);
					} else if (parseDateGroup(arrItems[i]) === "4 Days") {
						str4DayHtml += objItemToHtml(arrItems[i].objItem);
					} else if (parseDateGroup(arrItems[i]) === "5 Days") {
						str5DayHtml += objItemToHtml(arrItems[i].objItem);
					} else {
						strLaterHtml += objItemToHtml(arrItems[i].objItem);
					}
				}
				
				// Only include dividers if we haven't already.
				if (strTodayHtml != "") {
					if (settings.strLastDivider != "Today") {
						strHtml += '<li data-role="list-divider">Today</li>\n';
					}
					strHtml += strTodayHtml;
				}
				if (strTomorrowHtml != "") {
					if (settings.strLastDivider != "Tomorrow") {
						strHtml += '<li data-role="list-divider">Tomorrow</li>\n';
					}
					strHtml += strTomorrowHtml;
				}
				if (str2DayHtml != "") {
					if (settings.strLastDivider != "2 Days") {
						strHtml += '<li data-role="list-divider">2 Days</li>\n';
					}
					strHtml += str2DayHtml;
				}
				if (str3DayHtml != "") {
					if (settings.strLastDivider != "3 Days") {
						strHtml += '<li data-role="list-divider">3 Days</li>\n';
					}
					strHtml += str3DayHtml;
				}
				if (str4DayHtml != "") {
					if (settings.strLastDivider != "4 Days") {
						strHtml += '<li data-role="list-divider">4 Days</li>\n';
					}
					strHtml += str4DayHtml;
				}
				if (str5DayHtml != "") {
					if (settings.strLastDivider != "5 Days") {
						strHtml += '<li data-role="list-divider">5 Days</li>\n';
					}
					strHtml += str5DayHtml;
				}
				if (strLaterHtml != "") {
					if (settings.strLastDivider != "Later") {
						strHtml += '<li data-role="list-divider">Later</li>\n';
					}
					strHtml += strLaterHtml;
				}
				return strHtml;
				
				
				
					/*
					var strCourseId = jsonResponse.upcomingEvents[0].links[1].href.split("/courses/")[1];
					var strNewUrl = configSettings.apiproxy + "/courses/" +strCourseId+ "/textMultimedias/" + jsonResponse.upcomingEvents[0].id + "/content.html";
					$().mobiQueryApi({
					
					strUrl : strNewUrl,
					successHandler : function(jsonResponse, intTransactionId) {
					alert(jsonResponse)
					},
					errorHandler : function() {}
					})
					},
					callbackError: function() {
					alert("Unable to get upcoming activities, please try again.");
					
					}	
					*/
			}

		},
		fetch : function(options) {
			var settings = {
				boolForceRefresh: false,
				intDaysOut: 14,
				strExpand: false,
				callbackSuccess: function(jsonResponse, intIndex) {
					return jsonResponse;
				},
				callbackError: function() {
					alert("Unable to get your upcoming activities. Please try again.");
				}
			};
			if (options) {
				$.extend(settings, options);
			};
			
			var getFeedFromService = function() {
				$().mobyCacheManager({
						boolForceRefresh: true,
						strQueryUrl: strEventsUrl,
						strQueryType: "get",
						strCacheDate: "upcoming-timestamp",
						strCacheInfo: "upcoming",
						objCacheRefresh: {
							hours: 1
						},
						callbackSuccess : function(jsonResponse, intTransactionId) {
							if (dataStorage.isSupported) {
								dataStorage.add("upcoming-days", jsonResponse.upcomingEvents.length);
							}
							settings.callbackSuccess(jsonResponse, intTransactionId);
						},
						callbackError: function() {
							settings.callbackError();
						}						
				});
			}
			
			// Build a query string
			var strEventsUrl = configSettings.apiproxy + "/me/upcomingevents";
			var strQueryString = "";
			if (settings.intDaysOut != "all") {
				var strDate = Date.today().add({days: settings.intDaysOut}).toString("M/d/yyyy");
				strQueryString = "?until=" + strDate;
			}
			if (settings.strExpand) {
				if (strQueryString != "") {
					strQueryString += "&expand=" + settings.strExpand;
				} else {
					strQueryString += "?expand=" + settings.strExpand;
				}
			}
			strEventsUrl += strQueryString;
			
			// First, is perhaps what we need stored in the cache?
			if (dataStorage.isSupported) {
				// What is currently stored? Anything?
				var intCachedDays = dataStorage.get("upcoming-days"); 
				if (intCachedDays === undefined) {
					// Nothing currently stored, so get the feed.
					getFeedFromService();
				} else if (intCachedDays === null) {
					// Nothing currently stored, so get the feed.
					getFeedFromService();
				} else if (settings.intDaysOut === intCachedDays) {
					// We can probably get the feed from the cache.
					$().mobyCacheManager({
							boolForceRefresh: settings.boolForceRefresh,
							strQueryUrl: strEventsUrl,
							strQueryType: "get",
							strCacheDate: "upcoming-timestamp",
							strCacheInfo: "upcoming",
							objCacheRefresh: {
								hours: 1
							},
							callbackSuccess : function(jsonResponse, intTransactionId) {
								settings.callbackSuccess(jsonResponse, intTransactionId);
								dataStorage.add("upcoming-days", settings.intDaysOut);
							},
							callbackError: function() {
								settings.callbackError();
							}						
					});
				} else if (settings.intDaysOut < intCachedDays) {
					// We can probably get the feed from the cache.
					$().mobyCacheManager({
							boolForceRefresh: settings.boolForceRefresh,
							strQueryUrl: strEventsUrl,
							strQueryType: "get",
							strCacheDate: "upcoming-timestamp",
							strCacheInfo: "upcoming",
							objCacheRefresh: {
								hours: 1
							},
							callbackSuccess : function(jsonResponse, intTransactionId) {
								settings.callbackSuccess(jsonResponse, intTransactionId);
								dataStorage.add("upcoming-days", settings.intDaysOut);
							},
							callbackError: function() {
								settings.callbackError();
							}						
					});
				} else {
					// Need something more than what we have in cache
					getFeedFromService();
				}
				
			} else {
				// localStorage not supported, so we have to get what we need from the service.
				getFeedFromService();
			}
		}
	}

	$.fn.mobyUpcomingEventsManager = function(method) {
		// Method calling logic
		if ( methods[method] ) {
			return methods[ method ].apply( this, Array.prototype.slice.call( arguments, 1 ));
	    } else if ( typeof method === 'object' || ! method ) {
			return methods.toHtml.apply( this, arguments );
	    } else {
			$.error( 'Method ' +  method + ' does not exist' );
	    } 
	}
})(jQuery);