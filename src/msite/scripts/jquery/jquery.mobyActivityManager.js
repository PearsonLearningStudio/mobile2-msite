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
				boolForceRefresh: false,
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
				var strHtml = "",
					dateNow = Date.today(),
					dateToday = Date.today().add({days: -1}),
					dateYesterday = Date.today().add({days: -2}),
					intEnd = settings.intEndIndex,
					boolItems = false,
					//short cut
					objFeedItems = objFeed.activityStream.items, item, time, grade, type,
					strEndHtml = '<li data-role="list-divider" class="activity-scroll-indicator">Loading more...</li>\n';
					
					
				if ((intEnd > objFeedItems.length)|| (intEnd === -1)) {
					intEnd = objFeedItems.length;
					boolItems = true;
					strEndHtml = "";
				}
				
				for (var i = settings.intStartIndex; i < intEnd; i++) {
					//short cut for objFeedItems[i]
					item = objFeedItems[i];
					type = item.object.objectType;
					if (type === "grade") {
						strHtml += '<li class="' + type +'"><a class="listitem-activity grade_' + item.object.courseId + '_' + item.object.referenceId + '" href="activitydetail.html">';
						strHtml += '<span class="mobi-title">';
						strHtml += "Grade: " + item.target.title;
						strHtml += "</span><span class='mobi-summary'>";
						strHtml += grade  = GetGrade(item);
						strHtml += "</span>";
						strHtml += '<span class="mobi-hidden course-id">' +item.object.courseId+ '</span>';
						strHtml += '<span class="mobi-hidden grade-reference-id">' +item.target.referenceId + '</span>';
					} else if (type === "dropbox-submission") {
						strHtml += '<li class="' + type +'"><a class="listitem-activity dropbox-submission_' + item.object.courseId + '_'  + item.object.referenceId + '" href="/activitydetail.html">';
						strHtml += '<span class="mobi-title">';
						strHtml += "Dropbox: " + item.target.title;
						strHtml += "</span><span class='mobi-summary'>";
						strHtml += GetSummary(item);
						strHtml += "</span>";
					} else if (type === "remark") {
						strHtml += '<li class="' + type +'"><a class="listitem-activity remark_' + item.object.courseId + '_'  + item.object.referenceId + '" href="/activitydetail.html">';
						strHtml += '<span class="mobi-title">';
						strHtml += "Remark: " + item.object.title;
						strHtml += "</span><span class='mobi-summary'>";
						strHtml += GetSummary(item);
						strHtml += "</span>";
					} else if (type === "thread-topic") {
						strHtml += '<li class="' + type +'"><a class="listitem-activity thread-topic_' + item.object.courseId + '_'  + item.object.referenceId + '" href="discussiontopicdetail.html">';
						strHtml += '<span class="mobi-title">';
						strHtml += "Topic: " + item.object.title;
						strHtml += "</span><span class='mobi-summary'>";
						strHtml += GetSummary(item);
						strHtml += "</span>";
					} else if (type === "exam-submission") {
						strHtml += '<li class="' + type +'"><a class="listitem-activity exam-submission_' + item.object.courseId + '_'  + item.object.referenceId + '" href="/activitydetail.html">';
						strHtml += '<span class="mobi-title">';
						strHtml += "Exam: " + item.target.title;
						strHtml += "</span><span class='mobi-summary'>";
						strHtml += GetSummary(item);
						strHtml += "</span>";
					} else if (type === "thread-post") {
						strHtml += '<li class="' + type +'"><a class="listitem-activity thread-post_' + item.object.courseId + '_' + item.object.referenceId + '" href="/discussionthreaddetail.html">';
						strHtml += '<span class="mobi-title">';
						strHtml += "Re: " + item.object.title;
						strHtml += "</span><span class='mobi-summary'>";
						strHtml += GetSummary(item);
						strHtml += "</span>";
					}
					
					// Get course title 
					var strTitle = "";
					var courseId = item.object.courseId;
					for (var j = 0; j < arrCourses.length; j++) {
						if (arrCourses[j].id === courseId) {
							strTitle = arrCourses[j].number + ": " + arrCourses[j].title;
							strTitle = arrCourses[j].title;
						}
					}
					strHtml += '<span class="mobi-course-title">' +strTitle+ '</span>';
					
					// "Friendly dates": Yesterday, Today, nice formatted dates.
					strHtml += '<span class="mobi-date">';
					strHtml += time = friendlyDate(item.postedTime);
					strHtml += '</span>';
					strHtml += "</a></li>\n";
					objGlobalResources[item.object.referenceId] = item;
					objGlobalResources[item.object.referenceId]['courseTitle'] = strTitle;
					objGlobalResources[item.object.referenceId]['time']  = time;
					objGlobalResources[item.object.referenceId]['grade'] = grade;
				}
				strHtml += strEndHtml;
				var objReturn = {
					intActivities: objFeedItems.length,
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
					//strQueryUrl: configSettings.apiproxy + "/me/whatshappeningfeed",
					strQueryUrl: configSettings.apiproxy + "/me/whatshappeningfeed" + "?types=thread-topic,thread-post,grade,dropbox-submission",
					//strQueryUrl: configSettings.apiproxy + "/me/whatshappeningfeed" + "?types=grade,dropbox-submission",
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
						});
					},
					callbackError: function() {
						settings.callbackError();
					}
				} );
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