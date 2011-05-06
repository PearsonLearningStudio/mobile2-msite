/*
 * mobyDiscussionManager: Plugin for managing discussions.
 * 
 * Methods:
 * 	getUserTopics: Get the user topics object from the service.
 * 		strCourseId: Get the topics for just the given course ID. Defaults to none.
 * 		callbackSuccess: the callback to execute upon successful return of the user topics object
 * 		callbackError: the callback to execute if an error occurs.
 * 	userTopicsToHtml: Return the html for displaying a user topic object in the UI.  Items will be grouped
 *      by class and unit.  This is the default method of the plugin.
 * 		objUserTopics: a user topics object to use.  If one is not supplied, the method will call the getUserTopics method.
 * 		boolOnlyActive:  Return only the "active" topics (unread count > 0 or last 24 hour response count > 0). Defaults to true.
 *      strCourseId:  Return just the items for the given course ID. Defaults to none.
 * 		callbackSuccess:  The callback to execute upon successful creation of the HTML.
 * 		callbackError: the callback to execute if an error occurs.
 * 	userResponsesToHtml: Return the HTML for displaying a user response object in the UI.
 * 		objUserResponses: A user responses object to use.
 *      strUrl: The url a given response should link to. Defaults to "discussionthreaddetail.html".
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
				strCourseId: "",
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
			var strLocalUrl = configSettings.apiproxy + "/me/userTopics?courses=";

			// Get the course list from the course manager, and create a course list string delimited by ;
			if (settings.strCourseId.length != 0) {
				strLocalUrl += settings.strCourseId;
				// Fetch the user topic object from the service.
				$().mobiQueryApi("get", {
					strUrl: strLocalUrl,
					successHandler: function(jsonResponse, intTransactionId){
						options.callbackSuccess(jsonResponse);
					},
					errorHandler: function(){
						options.callbackError();
					}
				});
			} else {
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
						strLocalUrl += strCourseList;
						// Fetch the user topic object from the service.
						$().mobiQueryApi("get", {
							strUrl: strLocalUrl,
							successHandler: function(jsonResponse, intTransactionId){
								options.callbackSuccess(jsonResponse);
							},
							errorHandler: function(){
								options.callbackError();
							}
						});
	
					}
				})
			}
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
				boolOnlyActive: true,
				strCourseId: "",
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
			
			/*
			 * WARNING: Messy nested loops ahead. Proceed with caution.
			 */
			
			// Given a user topics object, return the HTML needed for a formatted list for display in the UI.
			if (settings.objUserTopics === "") {
				// We were not supplied a user topics object, so we need to query the service to get one.
				$().mobyDiscussionManager("getUserTopics",{
					strCourseId : settings.strCourseId,
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
			
				// strHtml will carry our HTML string as we build it.
				var strHtml = "";
				
				// First, we have to make it possible to sort our topics by units.  To do this,
				// we'll create an array of units from the user topic list.  Then we'll have
				// something that can be conveniently iterated over for comparison and grouping.
				var arrUnits = [];
				for (var i = 0; i < objUserTopics.userTopics.length; i++) {
					var objUnit = {};
					objUnit.number = objUserTopics.userTopics[i].topic.containerInfo.unitNumber;
					objUnit.header = objUserTopics.userTopics[i].topic.containerInfo.unitHeader;
					objUnit.title = objUserTopics.userTopics[i].topic.containerInfo.unitTitle;
					objUnit.hash = objUserTopics.userTopics[i].topic.containerInfo.unitHeader + "|" + objUserTopics.userTopics[i].topic.containerInfo.unitNumber + "|" + objUserTopics.userTopics[i].topic.containerInfo.unitTitle;
					objUnit.divider = '<li data-role="list-divider">' + objUserTopics.userTopics[i].topic.containerInfo.unitHeader + " " + objUserTopics.userTopics[i].topic.containerInfo.unitNumber + ": " + objUserTopics.userTopics[i].topic.containerInfo.unitTitle + "</li>";


					for (var j = 0; j < arrUnits.length; j++) {
						if ((arrUnits[j].number === objUnit.number) && (arrUnits[j].header === objUnit.header) && (arrUnits[j].title === objUnit.title)) {
							objUnit = "";
						}
					}
					if (typeof(objUnit) != "string") {
						arrUnits.push(objUnit);
					}
				}
				
				
				// First, we need to call the course manager to get a list of courses, so that we can
				// get all the topics for the user.
				// Note that we might have called this method with the strCoursesId parameter, in which
				// case we'll only be using the specified course information.  Either way, we need
				// a course array to iterate over.
				$().mobyCourseManager({
					callbackSuccess : function(arrCourses) {
						// For each course, build a list-divider + list items.  Only include a course if
						// it has one or more list items.
						// We only need to do this once if we have passed a course number in.
						var intEnd = arrCourses.length;
						if (settings.strCourseId.length > 0) {
							intEnd = 1;
						}
						// Here's where the nested loops start.  Hang on, it's going to be a bumpy ride.
						// Loop through the course array; for each course we'll need to do two more loops:
						// once over the units array and within that once over the topics object.
						for (var i = 0; i < intEnd; i++) {
							var strCurrentCourse = "";
							var tempHtml = "";
							
							// If we have passed in a course ID to the method, we need to ONLY get the
							// information for that course.
							// If we haven't passed in a course ID, then we need to get all the topics
							// for all the courses, grouped by course, with each course group given its
							// own header.
							if (settings.strCourseId.length > 0) {
								strCurrentCourse = settings.strCourseId;
							} else {
								// This is where we build the course header for a multi-course list
								strCurrentCourse = arrCourses[i].id
								tempHtml = '<li data-role="list-divider" class="course-'+strCurrentCourse+'">'+arrCourses[i].title+'</li>';
							}
							iconClass = '', uTopics = objUserTopics.userTopics;
							boolDiscussions = false;
							boolAllActive = true;
							var intNumberOfTopics = 0;
							var intNumberOfActiveTopics = 0;
							
							// Next loop: we need to iterate over the units array and produce the HTML 
							// for topics for each unit.
							for (var k = 0; k < arrUnits.length; k++) {
								// If we have passed in a course ID, then we need to provide a divider
								// for each unit.
								if (settings.strCourseId.length > 0) {
									tempHtml += arrUnits[k].divider;
								}
								
								// Next loop: Now that we're within the desired course, and within the
								// desired unit, we need to get all the topics that match.
								for (var j = 0; j < uTopics.length; j++) {
									// This is a convenient way to compare unit information,
									// which is otherwise spread out across three different properties
									// within the topic object.									
									var strCurrentHash = uTopics[j].topic.containerInfo.unitHeader + "|" + uTopics[j].topic.containerInfo.unitNumber + "|" +uTopics[j].topic.containerInfo.unitTitle;
									
									// If it matches, build the HTML!
									if ((uTopics[j].topic.containerInfo.courseID === parseInt(strCurrentCourse)) && 
									    (strCurrentHash === arrUnits[k].hash)) {

										boolDiscussions = true;
										intNumberOfTopics++;
										// Build the text for "total responses"
										var strTotalResponsesText = "";
										var strHiddenClass = "";
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
										if (settings.boolOnlyActive) {
											if ((uTopics[j].childResponseCounts.last24HourResponseCount===0) && (uTopics[j].childResponseCounts.unreadResponseCount===0)) {
												strHiddenClass = " mobi-hidden";
												boolAllActive = false;
											} else {
												intNumberOfActiveTopics++;
											}
										}
										
										tempHtml += '<li class="' + iconClass + ' course-'+uTopics[j].topic.containerInfo.courseID+ strHiddenClass +'">';
										tempHtml += '<a href="/discussiontopicdetail.html" class="listitem-topic" id="topic_'+uTopics[j].id+'">';
										
										tempHtml += '<span class="mobi-title">'+uTopics[j].topic.title+'</span>';
										tempHtml += '<span class="mobi-response-count">'+strTotalResponsesText+'</span>';
										tempHtml += '<span class="mobi-hidden mobi-course-number">'+uTopics[j].topic.containerInfo.courseID+'</span>';
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
							}
							if (boolDiscussions) {
								// There is at least one discussion
								strHtml += tempHtml;
								if (settings.boolOnlyActive) {
									if (intNumberOfActiveTopics === 0) {
										strHtml += '<li class="course-'+strCurrentCourse+ '">No active topics for this course</li>';
									}
									// If there are any topics that we have hidden, we should show a 
									// link to allow the user to go show all topics
									if (intNumberOfTopics > intNumberOfActiveTopics) {
										strHtml += '<li data-role="list-divider" class="course-'+strCurrentCourse+ '">';
										strHtml += '<a href="/discussionfullview.html" class="listitem-viewall" id="class-'+strCurrentCourse+'">';
										strHtml += '<span class="mobi-hidden mobi-course-name">'+arrCourses[i].title+'</span>';
										strHtml += '<span class="mobi-title">View all topics for this course</span></a></li>'
									}
								}
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