/*
 * mobyDiscussionManager: Plugin for managing discussions.
 * 
 * Methods:
 * 	getUserTopics: Get the user topics object from the service for a given user
 * 		callbackSuccess: the callback to execute upon successful return of the user topics object
 * 		callbackError: the callback to execute if an error occurs.
 * 	userTopicsToHtml: Return the html for displaying a user topic object in the UI.  This is the default method of the plugin.
 * 		objUserTopics: a user topics object to use.  If one is not supplied, the method will call the getUserTopics method.
 * 		callbackSuccess:  The callback to execute upon successful creation of the HTML.
 * 		callbackError: the callback to execute if an error occurs.
 */

(function($) {
	var methods = {
		
		getUserTopics : function(options) {
			var settings = {
				callbackSuccess: function(objJson) {
					return objJson;
				},
				callbackError: function() {
					alert('Unable to fetch course list: data was stale or not present, server does not respond.');
				}
			} 
			if (options) {
				$.extend(settings, options);
			}

			// Get the course list from the course manager, and create a course list string delimited by ;
			$().mobyCourseManager({
				callbackSuccess : function(arrCourses) {
					var strCourseList = "";
					var strDelimiter = ";";
					for (var i = 0; i < arrCourses.length; i++) {
						strCourseList += arrCourses[i].id + strDelimiter;
						if (i === arrCourses.length -1) {
							strDelimiter = "";
						}
					}

					// Fetch the user topic object from the service.
					$().mobiQueryApi("get", {
						strUrl: configSettings.apiproxy + "/me/userTopics?courses=" + strCourseList,
						successHandler: function(jsonResponse, intTransactionId){
							options.callbackSuccess(jsonResponse);
						},
						errorHandler: function(){
							options.callbackError();
						}
					});
				}
			})
		},
		
		userTopicsToHtml : function(options) {
			var settings = {
				objUserTopics: "",
				callbackSuccess: function(strHtml) {
					return strHtml;
				},
				callbackError: function() {
					alert('Unable to get topics.');
				}
			}
			if (options) {
				$.extend(settings, options);
			}
			
			// Given a user topics object, return the HTML needed for a formatted list for display in the UI.
			
			if (settings.objUserTopics === "") {
				// We were not supplied a user topics object, so we need to query the service to get one.
				$().mobyDiscussionManager("getUserTopics",{
					callbackSuccess: function(objUserTopics) {
						var strReturn = toHtml(objUserTopics);
						settings.callbackSuccess(strReturn);
					}
				});
			} else {
				// Make html from the supplied user topics object
				var strReturn = toHtml(settings.objUserTopics);
				settings.callbackSuccess(strReturn);
			}
			
			// Helper function to translate a user topics object into HTML.
			var toHtml = function(objUserTopics) {
				// build the unordered list for the discussion topics.  First, use the course manager to get the courses...
				var strHtml = "";
				$().mobyCourseManager({
					callbackSuccess : function(arrCourses) {
						// For each course, build a list-divider + list items.  Only include a course if
						// it has one or more list items.
						for (var i = 0; i < arrCourses.length; i++) {
							var strCurrentCourse = arrCourses[i].id;
							// build a temporary html string with the divider and the list items.  We will only append it to the full
							// html if the course has one or more discussions.
							var tempHtml = '<li data-role="list-divider" class="course-'+strCurrentCourse+'">'+arrCourses[i].title+'</li>';
							boolDiscussions = false;
							for (var j = 0; j < objUserTopics.userTopics.length; j++) {
								if (objUserTopics.userTopics[j].topic.containerInfo.courseID === strCurrentCourse) {
									boolDiscussions = true;
									// Build the text for "total responses"
									var strTotalResponsesText = "";
									if (objUserTopics.userTopics[j].childResponseCounts.totalResponseCount === 0) {
										strTotalResponsesText = "No responses";
									} else if (objUserTopics.userTopics[j].childResponseCounts.totalResponseCount === 1) {
										strTotalResponseText = "1 response";
									} else {
										strTotalResponsetext = objUserTopics.userTopics[j].childResponseCounts.totalResponseCount + " responses";
									}
									tempHtml += '<li class="course-'+objUserTopics.userTopics[j].topic.containerInfo.courseID+'">';
									// To do: Link this off to a detail page.
									tempHtml += '<a href="#">';
									
									tempHtml += '<span class="mobi-title">'+objUserTopics.userTopics[j].topic.containerInfo.contentItemTitle+'</span>';
									tempHtml += '<span class="mobi-response-count">'+strTotalResponseText+'</span>';
									// Build the "your responses" string
									if (objUserTopics.userTopics[j].childResponseCounts.personalResponseCount === 1) {
										tempHtml += '<span class="mobi-your-responses">'+objUserTopics.userTopics[j].childResponseCounts.personalResponseCount+' response by you</span>';
									
									} else if (objUserTopics.userTopics[j].childResponseCounts.personalResponseCount>1) {
										tempHtml += '<span class="mobi-your-responses">'+objUserTopics.userTopics[j].childResponseCounts.personalResponseCount+' responses by you</span>';
									
									}
									// Only show the number of unread items if there are any.
									if (objUserTopics.userTopics[j].childResponseCounts.unreadResponseCount > 0 ) {
										tempHtml += '<span class="mobi-icon-response-count">'+objUserTopics.userTopics[j].childResponseCounts.unreadResponseCount+'</span>';
									}
									tempHtml += '<span class="mobi-icon-arrow-r">&gt;</span>';
									tempHtml += '</a></li>';
								}
							}
							if (boolDiscussions) {
								// There is at least one discussion
								strHtml += tempHtml;
							}
						}
					}
				})
				if (strHtml === "") {
					// we must not have had any discussions.
					strHtml = "<h3>There are no discussions in your courses.</h3>";
				}
				return strHtml;
			}
		}
		
		
	}
	

	
	$.fn.mobyDiscussionManager = function(method) {
		// Method calling logic
		if ( methods[method] ) {
			return methods[ method ].apply( this, Array.prototype.slice.call( arguments, 1 ));
	    } else if ( typeof method === 'object' || ! method ) {
			return methods.userTopicsToHtml.apply( this, arguments );
	    } else {
			$.error( 'Method ' +  method + ' does not exist' );
	    } 
	}
})(jQuery);