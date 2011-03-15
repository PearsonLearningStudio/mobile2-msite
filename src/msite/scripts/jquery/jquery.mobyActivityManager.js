(function($) {
	var methods = {
		/*
		 * Methods for activityFeed plugin
		 * toHtml: Return the HTML for a given section of the feed
		 * 	options:
		 * 		objFeed: an Activity Feed JSON object to use, otherwise plugin will fetch one
		 * 		intStartIndex: The starting point in the zero-indexed items array
		 * 		intEndIndex: The ending point in the array; -1 for end of array
		 * 		boolForceRefresh: Force a refresh of the cached feed.
		 * 		callbackSuccess: the callback function 
		 * 
		 * get: Get a feed and return it as a JSON object, either from the service or from local storage
		 * 	options:
		 * 		boolForceRefresh: Force a refresh from the service, rather than looking at local storage
		 * 		callback: a function to execute just before returning the JSON
		 */
		toHtml : function(options) {
			var settings = {
				objFeed : "",
				intStartIndex: 0,
				intEndIndex: configSettings.intNumberOfActivities,
				boolForceRefresh: false,
				callbackSuccess: function(objReturn) {
					return objReturn;
				}
			};
			if ( options ) {
				$.extend( settings, options );
			}
			// Internal function to create the HTML from an Activity Feed json object
			var createHtml = function (objFeed, arrCourses) {
				// Create the HTML from the data
				var strHtml = "";
				var dateNow = Date.today();
				var dateToday = Date.today().add({days: -1});
				var dateYesterday = Date.today().add({days: -2});
				var intEnd = settings.intEndIndex;
				var boolItems = false;
				var strEndHtml = '<li data-role="list-divider" class="activity-scroll-indicator">Loading more...</li>\n';
				if ((intEnd > objFeed.activityStream.items.length)|| (intEnd === -1)) {
					intEnd = objFeed.activityStream.items.length;
					boolItems = true;
					strEndHtml = "";
				}
				for (var i = settings.intStartIndex; i < intEnd; i++) {
					// Parse the activity date: it is an ISO8601 format
					var dateActivity = Date.parseExact(objFeed.activityStream.items[i].postedTime, "yyyy-MM-ddTHH:mm:ssZ");
					var strSuffix = " AM";
					if (parseInt(dateActivity.toString("HH")) > 12) {
						strSuffix = " PM";
					}
					strHtml += '<li><a href="#pageActivityDetail">';
					strHtml += '<span class="mobi-activity-title">';
					if (objFeed.activityStream.items[i].object.objectType === "grade") {
						strHtml += "Grade: " + objFeed.activityStream.items[i].target.title;
						strHtml += "</span><span class='mobi-course-summary'>";
						strHtml += GetGrade(objFeed.activityStream.items[i]);
						strHtml += "</span>";
					} else if (objFeed.activityStream.items[i].object.objectType === "dropbox-submission") {
						strHtml += "Dropbox: " + objFeed.activityStream.items[i].target.title;
						strHtml += "</span><span class='mobi-course-summary'>";
						strHtml += GetSummary(objFeed.activityStream.items[i]);
						strHtml += "</span>";
					} else if (objFeed.activityStream.items[i].object.objectType === "remark") {
						strHtml += "Remark: " + objFeed.activityStream.items[i].object.title;
						strHtml += "</span><span class='mobi-course-summary'>";
						strHtml += GetSummary(objFeed.activityStream.items[i]);
						strHtml += "</span>";
					} else if (objFeed.activityStream.items[i].object.objectType === "thread-topic") {
						strHtml += "Topic: " + objFeed.activityStream.items[i].object.title;
						strHtml += "</span><span class='mobi-course-summary'>";
						strHtml += GetSummary(objFeed.activityStream.items[i]);
						strHtml += "</span>";
					} else if (objFeed.activityStream.items[i].object.objectType === "exam-submission") {
						strHtml += "Exam: " + objFeed.activityStream.items[i].target.title;
						strHtml += "</span><span class='mobi-course-summary'>";
						strHtml += GetSummary(objFeed.activityStream.items[i]);
						strHtml += "</span>";
					} else if (objFeed.activityStream.items[i].object.objectType === "thread-post") {
						strHtml += "Re: " + objFeed.activityStream.items[i].object.title;
						strHtml += "</span><span class='mobi-course-summary'>";
						strHtml += GetSummary(objFeed.activityStream.items[i]);
						strHtml += "</span>";
					}
					
					// "Friendly dates": Yesterday, Today, nice formatted dates.
					strHtml += '<span class="mobi-course-date">';
					if (dateActivity.between(dateToday, dateNow)) {
						strHtml += dateActivity.toString("h:mm") + strSuffix;
					} else if (dateActivity.between(dateYesterday, dateNow)) {
						strHtml += dateActivity.toString("h:mm") + strSuffix + " Yesterday";
					} else {
						strHtml += dateActivity.toString("MMM d");
					}
					strHtml += '</span>';
					strHtml += "</a></li>\n";
				}
				strHtml += strEndHtml;
				var objReturn = {
					intActivities: objFeed.activityStream.items.length,
					strFeedHtml : strHtml,
					boolAllItems : boolItems
				}
				return objReturn;
			}
			// GetGrade: Helper method for getting a prettily-formatted grade from an activity list item.
			var GetGrade = function(objItem) {
				var strLetterGrade = objItem.object.letterGrade;
				var strPointsAchieved = objItem.object.pointsAchieved;
				var strPointsPossible = objItem.target.pointsPossible;
				var strReturn = "";
				if (strLetterGrade != null) {
					if (strLetterGrade != "") {
						strReturn = strLetterGrade;
					}
				}
				if ((strPointsAchieved != null) && (strPointsPossible != null)) {
					strReturn += " (" + strPointsAchieved + "/" + strPointsPossible + ")";
				}
				return strReturn;
			}
			
			// GetSummary: Helper method for getting the text of the summary from an activity list item.
			var GetSummary = function(objItem) {
				var strSummary = objItem.object.summary;
				var strReturn = "";
				var strStrippedSummary = strSummary.replace(/(<([^>]+)>)/ig,"");
				if (strStrippedSummary.length > 200) {
					strReturn = strStrippedSummary.substr(0, 200);
				} else if (strStrippedSummary.length === 0) {
					strReturn = "&nbsp;";
				} else {
					strReturn = strStrippedSummary;
				}
				return strReturn;
			}
			
			// If a feed object has been included in the function call, parse that
			// otherwise, we need to get a new one.
			if (settings.objFeed === "") {
				// get the feed
				$().mobyCacheManager({
					boolForceRefresh: settings.boolForceRefresh,
					strQueryUrl: configSettings.apiproxy + "/me/whatshappeningfeed",
					strQueryType: "get",
					strQueryData: "",
					strCacheDate: "activity-feed-fetch-date",
					strCacheInfo: "activity-feed",
					objCacheRefresh: {
						hours: 1
					},
					callbackSuccess : function(jsonResponse, intTransactionId) {
						$().mobyCourseManager({
							callbackSuccess : function(arrCourses) {
								objReturn = createHtml(jsonResponse, arrCourses);
								settings.callbackSuccess(objReturn);
							}
						})
					}
				})
			} else {
				objFeed = settings.objFeed;
				objReturn = createHtml(objFeed);
				settings.callbackSuccess(objReturn);
			}
		}
		
	}
	
	$.fn.mobyActivityManager = function(method) {
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