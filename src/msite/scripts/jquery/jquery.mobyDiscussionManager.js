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
 * 	userResponsesToHtml: Return the HTML for displaying a user response object in the UI.
 * 		objUserResponses: A user responses object to use.  
 */

var arrGlobalTopics = [];
var arrGlobalThreads = [];

(function($) {
	var methods = {
		
		getSingleResponse: function(responseId, objThread, options) {
			var settings = {
					callbackSuccess: function() {
						
					},
					callbackError: function() {
						
					}
				},
				respObj, response, counts, author, 
				strTotalResponsesText = "", objInfo = {};
			if(options) {
				$.extend(settings, options)
			}
			if(objThread.boolFromActivity) {
				$.mobyProfileManager( {
					callbackSuccess: function(user) { 
						$().mobiQueryApi('get', {
							strUrl: configSettings.apiproxy + "/me/userresponses/" + user.id + '-' + responseId,
							successHandler: function(jsonResponse){
								respObj = jsonResponse.userResponses[0];
								response = respObj.response;
								counts =respObj.childResponseCounts;
								author = response.author;
								
								if (counts.totalResponseCount === 0) {
									strTotalResponsesText = "No responses";
								} else if (counts.totalResponseCount === 1) {
									strTotalResponsesText = "1 response";
								} else {
									strTotalResponsesText = counts.totalResponseCount + " total responses";
								}
								
								objInfo = {
									strAuthorName: author.firstName + ' ' + author.lastName,
									strTitle: response.title,									
									strTotalResponseString: strTotalResponsesText,
									strUnreadResponseString: counts.unreadResponseCount,
									strDescription: response.description							
								}
								settings.callbackSuccess(objInfo);
							}
						} ); 
					} 
				} );
			} else {
				settings.callbackSuccess(objInfo);
			}
		},
		
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
						if (i === arrCourses.length -1) {
							strDelimiter = "";
						}
						strCourseList += arrCourses[i].id + strDelimiter;
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
		
		userResponsesToHtml : function(options) {
			var settings = {
				objUserResponses: "",
				strUrl: "discussionthreaddetail.html",
				callbackSuccess: function(strHtml) {
					return strHtml;
				},
				callbackError: function() {
					alert('Unable to get topics.');
				}
			}, uResponses, strHml, tempHtml, read,
			strTotalResponsesText, iconClass = '';
			if (options) {
				$.extend(settings, options);
			}
			
			if (settings.objUserResponses == "") {
				strHtml = false;
				settings.callbackSuccess(strHtml);
			}
			
			// Given a userresponses object, return the HTML necessary for a formatted list.
			strHtml = "";
			if (settings.objUserResponses === "") {
				// Abort
				strHtml = "<h3>No responses.</h3>";
				callbackSuccess(strHtml);
			}
			uResponses = settings.objUserResponses.userResponses;
			for (var i = 0; i < uResponses.length; i++) {
				// Build the text for "total responses"
				strTotalResponsesText = "";
				tempHtml = "";
				if (uResponses[i].childResponseCounts.totalResponseCount === 0) {
					strTotalResponsesText = "No responses";
					iconClass = 'no-responses';
				} else if (uResponses[i].childResponseCounts.totalResponseCount === 1) {
					strTotalResponsesText = "1 response";
					iconClass = 'responses';
				} else {
					strTotalResponsesText = uResponses[i].childResponseCounts.totalResponseCount + " total responses";
					if(uResponses[i].childResponseCounts.last24HourResponseCount >= 10){
						iconClass = 'hot-topic';
					} else {
						iconClass = 'responses';
					}
				}
				read = uResponses[i].markedAsRead ? 'read' : 'not-read';
				tempHtml += '<li class="' + iconClass + ' response-'+uResponses[i].response.id+'">';
				tempHtml += '<a href="'+settings.strUrl+'" class="listitem-response ' + read  + '" id="response_'+uResponses[i].id+'">';				
				tempHtml += '<span class="mobi-title">'+uResponses[i].response.title+'</span>';
				tempHtml += '<span class="mobi-author">' +uResponses[i].response.author.firstName + " " + uResponses[i].response.author.lastName+ '</span>';
				tempHtml += '<span class="mobi-total-responses">' + strTotalResponsesText + '</span>';
				tempHtml += '<span class="mobi-summary">' +stripTags(uResponses[i].response.description)+ '</span>';
				tempHtml += '<span class="mobi-description" style="display: block">' + uResponses[i].response.description + '</span>';
				
				var intNumberOfUnreadResponses = uResponses[i].childResponseCounts.unreadResponseCount;
				if (intNumberOfUnreadResponses > 0) {
					tempHtml += '<span class="mobi-icon-response-count">'+intNumberOfUnreadResponses+'</span>';
				}
				var strDate = uResponses[i].response.postedDate;
				tempHtml += '<span class="mobi-date">'+friendlyDate(strDate)+'</span>';
				//tempHtml += '<span class="mobi-icon-arrow-r">&gt;</span>';
				tempHtml += '</a></li>\n';
				strHtml += tempHtml;
			}
			settings.callbackSuccess(strHtml);

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
							var strCurrentCourse = arrCourses[i].id,
							iconClass = '', uTopics = objUserTopics.userTopics;
							// build a temporary html string with the divider and the list items.  We will only append it to the full
							// html if the course has one or more discussions.
							var tempHtml = '<li data-role="list-divider" class="course-'+strCurrentCourse+'">'+arrCourses[i].title+'</li>';
							boolDiscussions = false;
							for (var j = 0; j < uTopics.length; j++) {
								// ("Object topic number"+j+": " + uTopics[j].topic.containerInfo.courseID);
								if (uTopics[j].topic.containerInfo.courseID === strCurrentCourse) {
									boolDiscussions = true;
									// Build the text for "total responses"
									var strTotalResponsesText = "";
									if (uTopics[j].childResponseCounts.totalResponseCount === 0) {
										strTotalResponsesText = "No responses";
										iconClass = 'no-responses';
									} else if (uTopics[j].childResponseCounts.totalResponseCount === 1) {
										strTotalResponsesText = "1 response";
										iconClass = 'responses';
									} else {
										strTotalResponsesText = uTopics[j].childResponseCounts.totalResponseCount + " total responses";
										if(uTopics[j].childResponseCounts.last24HourResponseCount >= 10) {
											iconClass = 'hot-topic';
										} else {
											iconClass = 'responses'
										}
									}
									
									tempHtml += '<li class="' + iconClass + ' course-'+uTopics[j].topic.containerInfo.courseID+'">';
									// To do: Link this off to a detail page.
									tempHtml += '<a href="/discussiontopicdetail.html" class="listitem-topic" id="topic_'+uTopics[j].id+'">';
									
									tempHtml += '<span class="mobi-title">'+uTopics[j].topic.title+'</span>';
									tempHtml += '<span class="mobi-response-count">'+strTotalResponsesText+'</span>';
									// Build the "your responses" string
									
									if (uTopics[j].childResponseCounts.personalResponseCount === 1) {
										tempHtml += '<span class="mobi-your-responses">'+uTopics[j].childResponseCounts.personalResponseCount+' response by you</span>';
									
									} else if (uTopics[j].childResponseCounts.personalResponseCount>1) {
										tempHtml += '<span class="mobi-your-responses">'+uTopics[j].childResponseCounts.personalResponseCount+' responses by you</span>';
									
									}
									// Only show the number of unread items if there are any.
									var intUnreadResponseCount = uTopics[j].childResponseCounts.unreadResponseCount;
									if (uTopics[j].childResponseCounts.unreadResponseCount > 0 ) {
										tempHtml += '<span class="mobi-icon-response-count">'+uTopics[j].childResponseCounts.unreadResponseCount+'</span>';
									}
									//tempHtml += '<span class="mobi-icon-arrow-r">&gt;</span>';
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
			
			
		}// End method list
		
		
	}// end methods
	

	
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