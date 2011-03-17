/*
 * mobyActivityManager: Plugin for managing activities.
 * 
 * Methods:
 * 	toHtml:  Get a feed and return the HTML for displaying it in the UI.  The feed will be fetched from the cache, or if the cache is empty
 *  out of date, from the service.
 *  	objFeed: an Activity Feed JSON object to use, otherwise the plugin will query the cache or the service as appropriate
 *  	intStartIndex: the starting point in the zero-indexed items array
 *  	intEndIndex: The ending point in the array; -1 for the end of array
 *  	boolForceRefresh: Force a refresh of the cached feed.
 *  	callbackSuccess:  The callback to execute upon successful generation of the HTML.
 *  	callbackError:  The callback to execute if an error occurs.
 */

(function($) {
	var methods = {
		toHtml : function(options) {
			var settings = {
				objFeed : "",
				intStartIndex: 0,
				intEndIndex: configSettings.intNumberOfActivities,
				boolForceRefresh: true,
				callbackSuccess: function(objReturn) {
					return objReturn;
				},
				callbackError: function() {
					alert('Unable to get the activities list.  The cache was out of date and the server is not responding.');
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
					strHtml += '<span class="mobi-title">';
					
					if (objFeed.activityStream.items[i].object.objectType === "grade") {
						strHtml += "Grade: " + objFeed.activityStream.items[i].target.title;
						strHtml += "</span><span class='mobi-summary'>";
						strHtml += GetGrade(objFeed.activityStream.items[i]);
						strHtml += "</span>";
					} else if (objFeed.activityStream.items[i].object.objectType === "dropbox-submission") {
						strHtml += "Dropbox: " + objFeed.activityStream.items[i].target.title;
						strHtml += "</span><span class='mobi-summary'>";
						strHtml += GetSummary(objFeed.activityStream.items[i]);
						strHtml += "</span>";
					} else if (objFeed.activityStream.items[i].object.objectType === "remark") {
						strHtml += "Remark: " + objFeed.activityStream.items[i].object.title;
						strHtml += "</span><span class='mobi-summary'>";
						strHtml += GetSummary(objFeed.activityStream.items[i]);
						strHtml += "</span>";
					} else if (objFeed.activityStream.items[i].object.objectType === "thread-topic") {
						strHtml += "Topic: " + objFeed.activityStream.items[i].object.title;
						strHtml += "</span><span class='mobi-summary'>";
						strHtml += GetSummary(objFeed.activityStream.items[i]);
						strHtml += "</span>";
					} else if (objFeed.activityStream.items[i].object.objectType === "exam-submission") {
						strHtml += "Exam: " + objFeed.activityStream.items[i].target.title;
						strHtml += "</span><span class='mobi-summary'>";
						strHtml += GetSummary(objFeed.activityStream.items[i]);
						strHtml += "</span>";
					} else if (objFeed.activityStream.items[i].object.objectType === "thread-post") {
						strHtml += "Re: " + objFeed.activityStream.items[i].object.title;
						strHtml += "</span><span class='mobi-summary'>";
						strHtml += GetSummary(objFeed.activityStream.items[i]);
						strHtml += "</span>";
					}
					
					// Get course title 
					var strTitle = "";
					var courseId = objFeed.activityStream.items[i].object.courseId;
					for (var j = 0; j < arrCourses.length; j++) {
						if (arrCourses[j].id === courseId) {
							strTitle = arrCourses[j].number + ": " + arrCourses[j].title;
						}
					}
					strHtml += '<span class="mobi-course-title">' +strTitle+ '</span>';
					
					// "Friendly dates": Yesterday, Today, nice formatted dates.
					strHtml += '<span class="mobi-date">';
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
					strReturn = "";
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
					strCacheDate: "activities-timestamp",
					strCacheInfo: "activities",
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
					},
					callbackError: function() {
						settings.callbackError();
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