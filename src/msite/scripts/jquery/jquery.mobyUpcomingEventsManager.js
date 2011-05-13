/*
 * mobyUpcomingEventsManager: Plugin for managing upcoming events.
 * 
 * Methods:
 * 	toHtml:  Get an upcoming events feed and return the HTML for displaying it in the UI.  The feed will be fetched from the cache, 
 *    or if the cache is empty or out of date, from the service.  This is the default method for the plugin.
 *      boolForceRefresh: force the manager to get a fresh feed from the service. (defaults to false)
 *  	objFeed: an Activity Feed JSON object to use, otherwise the plugin will query the cache or the service as appropriate
 *  	boolReturnFirstSet: The plugin can return either the first set of results, as defined by configSettings.intNumberOfUpcomingEvents.
 *          If boolReturnFirstSet is true, the plugin will only return the first set.  If set to false, it will return all the items.
 *      strLastDivider: If returning all, the last divider that was created by the previous call.
 *  	callbackSuccess:  The callback to execute upon successful generation of the HTML.
 *  	callbackError:  The callback to execute if an error occurs.
 *  fetch: fetch a feed object from either the cache or the service.
 *      boolForceRefresh:  Force the manager to get a fresh feed from the service (defaults to false)
 *      callbackSuccess:  The callback to execute upon successful fetching of the feed
 *      callbackError: the callback to execute if an eerror occurs.
 */

(function($) {
	var methods = {
		toHtml : function(options) {
			var settings = {
				objFeed : "",
				boolReturnFirstSet: true,
				boolForceRefresh: false,
				strLastDivider : "",
				intStartIndex: 0,
				intEndIndex: configSettings.intNumberOfUpcomingEvents,
				callbackSuccess: function(objReturn) {
					return objReturn;
				},
				callbackError: function() {
					alert("Unable to get your upcoming activities. Please try again.");
				}
			};
			if (options) {
				$.extend(settings, options);
			};
			var strFeedHtml = "";
			var objReturn = {};
			var boolAllItems = false;
			

			
			// Helper function for parsing the date and returning a useful string
			var parseDateGroup = function(objDate) { 
				if (objDate < Date.today().add({days: 1})) {
					return "Today";
				}
				if (objDate < Date.today().add({days: 2})) {
					return "Tomorrow";
				}
				if (objDate < Date.today().add({days: 3})) {
					return "In 2 Days";
				}
				if (objDate < Date.today().add({days: 4})) {
					return "In 3 Days";
				}
				if (objDate < Date.today().add({days: 5})) {
					return "In 4 Days";
				}
				if (objDate < Date.today().add({days: 6})) {
					return "In 5 Days";
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
				var strHref = "#";
				var strLinkClass = "";
				var strCourseId = objItem.links[1].href.split("/courses/")[1];
				var strCourseNumber = "";
				var strYear = "";
				
				// Get the correct course information
				$().mobyCourseManager({
					callbackSuccess: function(arrCourses) {
						for (var l = 0; l < arrCourses.length; l++) {
							if (arrCourses[l].id === parseInt(strCourseId)) {
								strCourseNumber = arrCourses[l].title;
							}
						}
					}
				})
				
				// Get the correct date string
				// AM or PM?
				if (parseInt(dateItem.toString("HH")) > 12) {
					strSuffix = " PM";
				}
				
				// Maybe a different year?
				var intItemYear = parseInt(dateItem.toString("yyyy"), 10);
				var intThisYear = parseInt(Date.today().toString("yyyy"), 10);
				if (intItemYear != intThisYear) {
					strYear = intItemYear + " "
				}
				
				var strTime = dateItem.toString("h:mm");
				if (strTime === "0:00") {
					strTime = "12:00";
				}
				if (parseDateGroup(dateItem) === "Today") {
					strDate = "Today " + strTime + strSuffix;
				} else {
					strDate = friendlyDate(dateItem) + " "+ strYear + strTime + strSuffix;
				}
				
				
				// Get the correct icon type
				if ((objItem.type === "HTML") || (objItem.type === "MANAGED_OD") || (objItem.type === "MANAGED_HTML")) {
					strIconClass = "assignment";
					strHref = "/activitydetail.html";
					strLinkClass = "assignment";
				} else if ((objItem.type === "THREAD") || ( objItem.type === "MANAGED_THREADS")) {
					strIconClass = "discussion";
					strHref = "/thread-topics.html";
					strLinkClass = "thread";
				} else if (objItem.type === "IQT"){
					strIconClass = "exam-submission";
					strHref = "#";
					strLinkClass = "exam"
				} else {
					strIconClass = "mobi-hidden";
				}
				// Register the item in the objGlobalResources array
				objGlobalResources[objItem.id] = {};
				objGlobalResources[objItem.id].object = {};
				objGlobalResources[objItem.id].object.objectType = strLinkClass;
				
				strLinkClass += "_" + objItem.links[1].href.split("courses/")[1] + "_" + objItem.id;

				strReturnHtml += '<li class="'+strIconClass+'">';
				strReturnHtml += '<a class="listitem-activity '+strLinkClass+'" href="'+strHref+'">';
				strReturnHtml += '<span class="mobi-title">' + objItem.title + '</span>';
				strReturnHtml += '<span class="mobi-summary">' + objItem.category.charAt(0).toUpperCase() + objItem.category.slice(1) + " at " + strDate + '</span>'
				strReturnHtml += '<span class="mobi-course-title">' + strCourseNumber + '</span>';
				strReturnHtml += '</a></li>\n';
				
				
				return strReturnHtml;
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
				
				/*
				// Next we need to remove the items that we need to skip
				if (settings.boolReturnFirstSet) {
					// We're only returning the first set.  But what if the feed has less than intNumberOfUpcomingEvents?
					if (arrItems.length <= configSettings.intNumberOfUpcomingEvents) {
						boolAllItems = true;
					} else {
						var newArray = arrItems.slice(0, configSettings.intNumberOfUpcomingEvents);
						arrItems = newArray; 
					}
				} else {
					var newArray = arrItems.slice(configSettings.intNumberOfUpcomingEvents, -1);
					arrItems = newArray;
					boolAllItems = true;
				}
				*/
				// build the HTML.
				var strHtml = "";
				var strTodayHtml = ""; // for things happening today.
				var strTomorrowHtml = ""; // for things happening tomorrow.
				var str2DayHtml = ""; // for things happening in 2 days.
				var str3DayHtml = ""; // for things happening in 3 days.
				var str4DayHtml = ""; // for things happening in 4 days.
				var str5DayHtml = ""; // for things happening in 5 days.
				var strLaterHtml = ""; // for things happening later.
				var intEnd = settings.intEndIndex;
				var strEndHtml = '<li data-role="list-divider" class="upcoming-scroll-indicator">Loading more...</li>\n';
				
				
				if ((intEnd > arrItems.length)|| (intEnd === -1)) {
					intEnd = arrItems.length;
					boolAllItems = true;
					strEndHtml += "";
				}
				
				for (var i = settings.intStartIndex; i < intEnd; i++) {
					if (parseDateGroup(arrItems[i]) === "Today"){
						strTodayHtml += objItemToHtml(arrItems[i].objItem);
					} else if (parseDateGroup(arrItems[i]) === "Tomorrow") {
						strTomorrowHtml += objItemToHtml(arrItems[i].objItem);
					} else if (parseDateGroup(arrItems[i]) === "In 2 Days") {
						str2DayHtml += objItemToHtml(arrItems[i].objItem);
					} else if (parseDateGroup(arrItems[i]) === "In 3 Days") {
						str3DayHtml += objItemToHtml(arrItems[i].objItem);
					} else if (parseDateGroup(arrItems[i]) === "In 4 Days") {
						str4DayHtml += objItemToHtml(arrItems[i].objItem);
					} else if (parseDateGroup(arrItems[i]) === "In 5 Days") {
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
					if (settings.strLastDivider != "In 2 Days") {
						strHtml += '<li data-role="list-divider">In 2 Days</li>\n';
					}
					strHtml += str2DayHtml;
				}
				if (str3DayHtml != "") {
					if (settings.strLastDivider != "In 3 Days") {
						strHtml += '<li data-role="list-divider">In 3 Days</li>\n';
					}
					strHtml += str3DayHtml;
				}
				if (str4DayHtml != "") {
					if (settings.strLastDivider != "In 4 Days") {
						strHtml += '<li data-role="list-divider">In 4 Days</li>\n';
					}
					strHtml += str4DayHtml;
				}
				if (str5DayHtml != "") {
					if (settings.strLastDivider != "In 5 Days") {
						strHtml += '<li data-role="list-divider">In 5 Days</li>\n';
					}
					strHtml += str5DayHtml;
				}
				if (strLaterHtml != "") {
					if (settings.strLastDivider != "Later") {
						strHtml += '<li data-role="list-divider">Later</li>\n';
					}
					strHtml += strLaterHtml;
				}
				strHtml += strEndHtml;
				return strHtml;

			}

			// Either get the feed or process the one that was passed in  
			if (!options.objFeed) {
				$().mobyUpcomingEventsManager("fetch", {
					boolForceRefresh: settings.boolForceRefresh,
					callbackSuccess: function(jsonResponse, intIndex) {
						objReturn.strFeedHtml = produceHtml(jsonResponse);
						objReturn.boolAllItems = boolAllItems;
						settings.callbackSuccess(objReturn);
					},
					callbackError: function() {
						alert("Unable to get your upcoming activities. Please try again.");
					}
				})
			} else {
				strFeedHtml = produceHtml(objFeed);
				settings.callbackSuccess(strFeedHtml);
			}


			
		},
		
		fetch : function(options) {
			var settings = {
				boolForceRefresh: false,
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

			var strEventsUrl = configSettings.apiproxy + "/me/upcomingevents";
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
					},
					callbackError: function() {
						settings.callbackError();
					}						
			});
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