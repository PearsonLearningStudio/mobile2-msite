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
			var createHtml = function (objFeed) {
				// Create the HTML from the data
				var strHtml = "";
				var dateNow = Date.today();
				var dateToday = Date.today().add({days: -1});
				var dateYesterday = Date.today().add({days: -2});
				var intEnd = settings.intEndIndex;
				var boolItems = false;
				var strEndHtml = '<li data-role="list-divider" class="activity-scroll-indicator">Loading more...</li>';
				if ((intEnd > objFeed.activityStream.items.length)|| (intEnd === -1)) {
					intEnd = objFeed.activityStream.items.length;
					boolItems = true;
					strEndHtml = "";
				}
				for (var i = settings.intStartIndex; i < intEnd; i++) {
					var dateActivity = Date.parse(objFeed.activityStream.items[i].postedTime.split("T")[0]);
					strHtml += '<li><a href="#pageActivityDetail">';
					strHtml += '<span class="mobi-activity-title">';
					if (objFeed.activityStream.items[i].object.objectType === "grade") {
						strHtml += "Grade Posted";
					} else if (objFeed.activityStream.items[i].object.objectType === "dropbox-submission") {
						strHtml += "Dropbox Submission";
					} else if (objFeed.activityStream.items[i].object.objectType === "remark") {
						strHtml += "Student Remark";
					} else if (objFeed.activityStream.items[i].object.objectType === "thread-topic") {
						strHtml += "New Discussion Topic";
					} else if (objFeed.activityStream.items[i].object.objectType === "exam-submission") {
						strHtml += "Exam";
					} else if (objFeed.activityStream.items[i].object.objectType === "thread-post") {
						strHtml += "Thread Post";
					}
					strHtml += "</span><span class='mobi-course-title'>";
					strHtml += objFeed.activityStream.items[i].target.title;
					strHtml += "</span>";
					
					// "Friendly dates": Yesterday, Today, nice formatted dates.
					strHtml += '<span class="mobi-course-date">';
					if (dateActivity.between(dateToday, dateNow)) {
						strHtml += "Today";
					} else if (dateActivity.between(dateYesterday, dateNow)) {
						strHtml += "Yesterday";
					} else {
						strHtml += dateActivity.toString("MMM d");
					}
					strHtml += '</span>';
					strHtml += "</a></li>";
				}
				strHtml += strEndHtml;
				var objReturn = {
					intActivities: objFeed.activityStream.items.length,
					strFeedHtml : strHtml,
					boolAllItems : boolItems
				}
				return objReturn;
			}
			
			// If a feed object has been included in the function call, parse that
			// otherwise, we need to get a new one.
			if (settings.objFeed === "") {
				// get the feed
				$().activityFeed("get", {
					boolForceRefresh: settings.boolForceRefresh,
					callbackSuccess: function(objFeed, intIndex){
						objReturn = createHtml(objFeed);
						settings.callbackSuccess(objReturn);
					}
				});
			} else {
				objFeed = settings.objFeed;
				objReturn = createHtml(objFeed);
				settings.callbackSuccess(objReturn);
			}
			
		},
		get : function(options) {
			var settings = {
				boolForceRefresh: false,
				callbackSuccess : function(jsonResponse, intTransactionId) {
					return jsonResponse;
				},
				callbackError: function() {
					alert('Error getting feed information from server. Please retry.');
				}
			};
			if ( options ) {
				$.extend( settings, options );
			}
			
			
			// Get Activity Feed:
			// If there is a feed stored in localStorage AND it is recent enough, return that.
			// Otherwise, return a new feed fetched from the server.
			// Browsers that do not grok localStorage will just hit the service every time.

			var queryUrl = configSettings.apiproxy + "/me/whatshappeningfeed";
			
			if (dataStorage.isSupported()) {;
				var strCachedFeedDate = dataStorage.get("activity-feed-fetch-date");
				var strCachedFeed = dataStorage.get("activity-feed");
				var queryUrl = configSettings.apiproxy + "/me/whatshappeningfeed";
				
				// Do we need to refetch the cache?
				var boolRefetch = false;
				if ((strCachedFeedDate == null) || (strCachedFeed == null)) {
					boolRefetch = true;
				} else {
					if(strCachedFeed.length < 10) {
						boolRefetch = true;
					}
					if (Date.parse(strCachedFeedDate) > Date.today().add({hours: 1})) {
						boolRefetch = true;
					}
				}
				
				if (boolRefetch || settings.boolForceRefresh) {
					// Fetch a new feed and cache it.
					$().QueryApi("get", {
						strUrl: queryUrl,
						successHandler: function(jsonResponse, intTransactionId){
							dataStorage.add("activity-feed", JSON.stringify(jsonResponse));
							dataStorage.add("activity-feed-fetch-date", Date.today());
							settings.callbackSuccess(jsonResponse, intTransactionId);
						},
						errorHandler: function(){
							settings.callbackError();
						}
					});
				} else {
					// Use cached feed 
					objFeed = JSON.parse(strCachedFeed);
					settings.callbackSuccess(objFeed, -100);
				}
			} else {
				// This browser does not support localStorage, so we need to get the feed.
				$().QueryApi("get", {
					strUrl: queryUrl,
					successHandler: function(jsonResponse, intTransactionId){
						settings.callbackSuccess();
					},
					errorHandler: function(){
						settings.callbackError();
					}
				});
			}
		}
		
	}
	
	$.fn.activityFeed = function(method) {
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