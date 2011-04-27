/*
 * mobyAppInit:  Plugin for initializing application pages.
 * Each application page will have a set of initialization functions to handle click listeners, page transition handlers, etc.  This is where
 * they live.
 * 
 * Methods:
 * 	initIndex:  Initialize the index.html page.  This is the default method for the plugin.
 * 	initLogin:  Initialize the login.html page.
 * 	initError:  Generic error function to call when initialization fails.
 * 		strErrorMessage: The error message to display.
 * 		strRedirectUrl:  The URL to redirect to when the error happens.
 * 
 */

var objGlobalUser = {};
var objGlobalCourse = {};
var arrGlobalActivity = [];
var objGlobalResources = {};
(function($) {
	var methods = {
		initIndex : function(options) {
			var settings = {
					callback: function() {}
				};
			if ( options ) {
				$.extend( settings, options );
			}
/*
 * =====================================
 * Generic Initialization for index.html
 * =====================================
 */
			// Be sure the dropdown menu is hidden each time we change a page
			$(".container-page").die("pagebeforeshow pagebeforehide").live("pagebeforeshow pagebeforehide", function() {
				$.mobile.pageLoading();
			});
			
			$(".container-page").live("pagebeforeshow", function() {
				$("div.layout-header ul").hide();
				$(".layout-header .button-menu").removeClass("menu-active");
			});
			
			// Bind event listener to logout menu item
			$(".menu-logout, #profile-logout").live("click", function() { 
				$.mobile.pageLoading();
				sessionManager.logOut();
				if(dataStorage.isSupported){
					dataStorage.remove('user');
				}
				createCookie("access_grant", "", -1);
				// $(location).attr("href", "login.html");
				exitApp();
				return false;
			});
			
			// Initialize course cache
			// Force a refresh in case this is a new login
			$().mobyCourseManager({boolForceRefresh: true});
		
			// Initialize mobi-listview elements
			$(".mobi-listview li").click(function() {
				var strUrl = $(this).attr("id") + ".html";
				$.mobile.changePage(strUrl);
			});
			
			// Initialize click listener for what's due button
			$(".btn-whatsdue").die("click").live('click', function() {
				$("#pageHome div.subnav a").removeClass("ui-btn-active");
				$(this).addClass("ui-btn-active");
				$(".view-activity").hide();
				$(".view-whatsdue").show();
				$(window).unbind("scrollstop.infinite");
				if ($("#pageHome .view-whatsdue ul").length === 0) {
					getUpcomingFeed();
				}
				
			});


			// Initialize click listener for Activity button
			$(".btn-activity").die("click").live('click', function() {
				activityButtonClickHandler(false);
			});
			
			// bind the menu button click listener for this page
			$(".button-menu").bind("click", function() {
				showMenu(this);
			})
			
			$('.btn-refresh').live('click', function() { 
				// Fetch the feed and insert into DOM.
				// force refresh
				getActivities( { refresh: true } );
			});
			
			// If this is a new login, we need to clear out any previous information stored in localStorage,
			// otherwise the new user might gain access to the previous user's data.
			// Obviously we only need to do this if local storage is supported.
			if (dataStorage.isSupported) {
				// If we have different client strings then we definitely need to reset the cache.
				var strStoredClientString = dataStorage.get("clientstring");
				if (strStoredClientString === null) {
					dataStorage.clear();
					dataStorage.add("clientstring", configSettings.clientstring);
				} else if (strStoredClientString != configSettings.clientstring) {
					dataStorage.clear();
					dataStorage.add("clientstring")
				} else {
					// well, the client strings match, but do the user names?
					$().mobiQueryApi({
						strUrl : configSettings.apiproxy + "/me",
						successHandler : function(jsonResponse, intTransactionId) {
							var strCurrentUserName = jsonResponse.me.userName;
							var strStoredUserName = dataStorage.get("username");
							if (strStoredUserName === null) {
								// Just to be sure, let's clear the cache anyway.
								dataStorage.clear();
								dataStorage.add("username", strCurrentUserName);
							} else if (strCurrentUserName != strStoredUserName) {
								dataStorage.clear();
								dataStorage.add("username", strCurrentUserName);
							}
						},
						errorHandler : function() {
							// Fail silently and clear the cache anyway.
							dataStorage.clear();
						}
					});
				}
			}
/*
 * ================
 * Helper Functions
 * ================
 * 
 * event handlers, JSON parsers, etc.
 */
			// Helper function to show the menu, which must be bound in every page upon every show no matter what,
			function showMenu(ptrButton) {
				$this = $(ptrButton);
				$this.siblings("ul").slideToggle(0);
				$this.toggleClass("menu-active");
				return false;
			}
			
			
			//response click handler for clicking on any response	
			function responseClickHandler($this) { 
				// The user has tapped on a thread.  We need
				// to display the thread detail page.
				$.mobile.pageLoading();
				
				var responseId = $this.attr("id").split("_")[1],
					objInfo = {};
				//if response about to be viewed is unread...mark as read
				if( $this.hasClass('not-read') ) {
					$().mobiQueryApi( 'post', {
						strUrl: configSettings.apiproxy + '/me/responses/'  + responseId.split('-')[1] + '/readStatus',
						strData: JSON.stringify( {
							"readStatus": {
								"markedAsRead": true
							}
						} ),
						successHandler: function(){},
						errorHandler: function(){}
					} );
				}
				objInfo = {
					strNewId: responseId,
					strOldId: -1,
					strAuthorName: $this.find(".mobi-author").text(),
					strTitle: $this.find(".mobi-title").text(),
					strTotalResponseString: $this.find(".mobi-total-responses").text(),
					strUnreadResponseString: $this.find(".mobi-unread-responses").text(),
					strDescription: $this.find(".mobi-description").data("description"),
					strDate: $this.find(".mobi-date").text()
				}
				arrGlobalThreads.push(objInfo);
			}
			
			// Refresh the Activities feed
			function getActivities(options) { 
				var opts = options || {};
				if(opts.refresh) {
					$.mobile.pageLoading();
				}

				$().mobyActivityManager("toHtml", {
					boolForceRefresh: opts.refresh,			
					callbackSuccess: function(objReturn){ 
						var strFeedHtml = objReturn.strFeedHtml,
							strHtml = "", activityType, objInfo = {},
							activityArray = [], userId, response, 
							respObj, author, counts;
						
						strHtml += '<ul data-role="listview" class="mobi-listview">';
						strHtml += '<li data-role="list-divider">All Activity</li>';
						strHtml += strFeedHtml;
						
						$("#pageHome .view-activity").html(strHtml);
						$("#pageHome .view-activity .mobi-listview").listview();
						// add a click event handler to pass correct information to detail view
						$("#pageHome .view-activity ul li a").click(function() {
							var $this = $(this);
							if ($this.parents("li").hasClass("grade")) {
								objGlobalCourse.id = $this.find(".course-id").text(); 
								objGlobalCourse.referenceId = $this.find(".grade-reference-id").text();
							} else if ($this.parents("li").attr("class") === "dropbox-submisstion") {
								
							}
						})
						$.mobile.pageLoading(true);
						
						// When the user taps on an item
						$(".listitem-activity").die("click.details").live('click.details',  function(e){
							e.preventDefault();
							arrGlobalActivity =  this.className.match(/\w+[-]*\w+\d+/ig);
							activityArray = arrGlobalActivity[0].split('_');
							activityType = activityArray[0];
							if(activityType === 'thread-topic'){									
								arrGlobalTopics.push(strCurrentTopic);
							} else if(activityType === 'thread-post'){						
								// The user has tapped on a thread.  We need
								// to display the thread detail page.
								// pass the responseId 
								objInfo = {
									boolFromActivity: true,
									strNewId: activityArray[1] + '-' + activityArray[2],
									strOldId: -1
								}
								arrGlobalThreads.push(objInfo);
							} 
						});
					}
				});
			}
			
			// Get the Upcoming Feed
			var getUpcomingFeed = function() {
				$().mobyUpcomingEventsManager({
					callbackSuccess: function(strHtml){
						$("#pageHome .view-whatsdue").html(strHtml);
						$("#pageHome .view-whatsdue .mobi-listview").listview();
					}
				})
			}
			
			// event handler for bookmark popup scroll
			var handleBookmarkPopupScroll = function() {
				$(window).unbind("scroll.bookmark").bind("scroll.bookmark", function() {
					// always position the bookmark popup at the bottom of the viewport
					if ($("#pageHome .bookmark-popup:visible").length > 0){
						$("#pageHome .bookmark-popup").positionBottomOfViewport()
					}
				});
			}
			
			// event handler for infinite scrolling
			var handleInfiniteScroll = function() {
				$(window).unbind("scrollstop.infinite").bind("scrollstop.infinite", function() {
					if (($(window).scrollTop() + 150) >= ($(document).height() - $(window).height())) {

						// Do we have all the things?
						if (!configSettings.boolScrollUpdate) {
							$(window).unbind("scrollstop.infinite");
							return;
						}
						
						// No!  Get more things!
						configSettings.boolScrollUpdate = true;
						$.mobile.pageLoading();
						var doIt = function() {
							$().mobyActivityManager("toHtml", {
								intStartIndex: configSettings.intCurrentNumberOfActivities,
								intEndIndex: configSettings.intCurrentNumberOfActivities + configSettings.intNumberOfActivities,
								callbackSuccess: function(objReturn) {
									$(".activity-scroll-indicator").remove();
									var strFeedHtml = objReturn.strFeedHtml;
							
									$("#pageHome .view-activity .mobi-listview").append(strFeedHtml);
									$("#pageHome .view-activity .mobi-listview").listview("refresh");
									$.mobile.pageLoading(true);
									configSettings.intCurrentNumberOfActivities += configSettings.intNumberOfActivities;
									if (objReturn.boolAllItems) {
										// All items have been returned and displayed, so unbind the scroll event.
										$(window).unbind("scrollstop.infinite");
										configSettings.boolScrollUpdate = false;
									}
								}
							});
						}
						
						// We have to do this on a brief delay for older iphones, otherwise events happen crazy out of order.
						var otherDelay = setTimeout(function(){
							doIt()
						}, 200);
			
					}
				})
	
			}
			
			// Click handler for the activity button
			var activityButtonClickHandler = function(boolForceRefresh) {
				if ($(".btn-whatsdue").hasClass("ui-btn-active")) {
					// Rebind scroll listener?
					if (configSettings.boolScrollUpdate) {
						handleInfiniteScroll();
					}
				}
				$(".view-whatsdue").hide();
				$(".view-activity").show();
				$("#pageHome .btn-whatsdue").removeClass("ui-btn-active");
				$("#pageHome .btn-activity").addClass("ui-btn-active");
				
				// Are there already items on display?
				if ($("#pageHome .view-activity li").length < 5) {
					$.mobile.pageLoading();
					// Fetch the feed and insert into DOM.
					getActivities({refresh: boolForceRefresh});
				}
			}
			

			
/*
 * ==============
 * Bookmark Popup
 * ==============
 */

			// Check to see if we need to display a bookmark popup
			var boolShow = false;
			if (dataStorage.isSupported()) {
				var strPopupShownDate = dataStorage.get("popup-shown-date");
				
				// Show the popup if we've never shown it before, or if we haven't shown it in the last 5 days.
				if (strPopupShownDate == null) {
					boolShow = true;
				} else {
					if (Date.parse(strPopupShownDate) > Date.today().add({days: 5})) {
						boolShow = true;
					};
				};
				var boolStandalone = window.navigator.standalone;
				if ((boolStandalone != undefined) && (boolStandalone)) {
					// We're in fullscreen mode.  The only way to get there is by accessing the app via an icon on the home screen of an iOS browser.
					// So if we have that, we don't need to show the popup.
					boolShow = false;
				}
		
			};
			
			if (boolShow) {
				// Show the popup
				var intWidth = $(document).width() - 50;
				var strDevice = detectDevice();
				var strHtml = '<h3>You are on a not-iOS, not-Android device</h3>';
				strHtml += "<p>To add this app to your bookmarks, do whatever it is you need to do to do that.</p><p class='button-close'>X</p>"
				if (strDevice === "ios") {
					strHtml = '<h3>You are on an iOS device</h3><p>To add this app to your home screen, ';
					strHtml += 'tap the bookmark icon in the toolbar below and follow the prompts.</p><p class="button-close">X</p>';
				} else if (strDevice === "android") {
					strHtml = "<h3>You are on an Android device</h3><p>To add this app to your home screen, ";
					strHtml += "add it as a bookmark and follow the prompts.</p><p class='button-close'>X</p>";
				}
				$("#pageHome .bookmark-popup").html(strHtml).width(intWidth).positionBottomOfViewport().show().click(function(){
					$(this).hide();
					$(window).unbind('scroll.bookmark');
					if (dataStorage.isSupported()) {
						dataStorage.add("popup-shown-date", Date.today());
					}
				});
				
				// Set up the scroll handler
				handleBookmarkPopupScroll();
				
				// Need to move it in case of orientation change
				$(document).bind("orientationchange", function() {
					$("#pageHome .bookmark-popup").positionBottomOfViewport();
				})
			}

/*
 * =========
 * Home View
 * =========
 */
			
			// When we load this page, we must fill in the activity view.
			activityButtonClickHandler(true);
			handleInfiniteScroll();
			
			
			$("#pageHome").die("pageshow").live("pageshow", function() {
				// What is currently visible?

				if ($("#pageHome .btn-activity").hasClass("ui-btn-active")) {
					activityButtonClickHandler(false);
					$(".view-whatsdue").hide();
					$(".view-activity").show();

					if (configSettings.boolScrollUpdate) {
						handleInfiniteScroll();
					}
				} else {
					$(".view-whatsdue").show();
					$(".view-activity").hide();
				}
				// Highlight the correct tab in the navbar
				$(".container-navbar li a").removeClass("ui-btn-active");
				$(".container-navbar #home").addClass("ui-btn-active");
				$(".button-menu").unbind("click").bind("click", function() {
					showMenu(this);
				})
			})
			
			// Now that we've bound a scroll event listeners to the window, we need to unbind them if we change pages, because
			// other pages do not need it.
			$("#pageHome").unbind("pagebeforehide").bind("pagebeforehide", function() {
				$(window).unbind("scrollstop.infinite").unbind("scroll.bookmark");
			})
/*
 * ===============
 * Discussion View
 * ===============
 */
			// Initialize handler for discussions tab 
			$("#pageDiscuss").die("pageshow").live("pageshow", function() {
				
				// We are showing the Discussion tab.
				// First, show the loading spinner
				$.mobile.pageLoading();
				$(".button-menu").unbind("click").bind("click", function() {
					showMenu(this);
				})
				
				// Highlight the correct tab
				$(".container-navbar li a").removeClass("ui-btn-active");
				$(".container-navbar #discussions").addClass("ui-btn-active");
				
				// Reinitialize the navigation arrays.
				// This starts us over from scratch
				arrGlobalTopics = [];
				arrGlobalThreads = [];

				// Set up the discussion default view.
				// This is all of the discussions for the user, grouped by class.
				$().mobyDiscussionManager("userTopicsToHtml",  {
					callbackSuccess : function(strDiscussionHtml) {
						var strHtml = '<ul data-role="listview" class="mobi-listview">';
						strHtml += strDiscussionHtml;
						strHtml += "</ul>";
						$("#pageDiscuss .view-discussion").html(strHtml);
						$("#pageDiscuss .view-discussion .mobi-listview").listview();
						// fill in the filter
						$().mobyCourseManager({
							callbackSuccess: function(arrCourses) {
								var strHtml = '<select name="select-filter-discussions" id="select-filter-discussions" data-icon="dropdown">';
								strHtml += '<option value="all">All Courses</option>';
									
								for (var i = 0; i < arrCourses.length; i++) {
									//don't filter out courses with no discussions.
									//var strClass = ".course-" + arrCourses[i].id;
									//if ($(strClass).length > 0) {
										strHtml += '<option value="'+arrCourses[i].id+'">' +arrCourses[i].title+ '</option>';
									//}
								}
								
								strHtml += "</select>";
								
								$("#container-filter-discussions").html(strHtml);
								$("select").selectmenu();
								$("#select-filter-discussions").change(function() {
									var strValue = $(this).val();
									if (strValue === "all") {
										$(".view-discussion .mobi-listview li").show();
										$(".view-discussion .mobi-listview .ui-corner-top").removeClass("ui-corner-top");
										$(".view-discussion .mobi-listview .ui-li-divider:visible:first").addClass("ui-corner-top");
									} else {
										var strClass = ".course-" + strValue;
										var $items = $(strClass);
										//if ($items.length > 0) {
											$(".view-discussion .mobi-listview .ui-corner-top").removeClass("ui-corner-top");
											$(".view-discussion .mobi-listview li").hide();
											$items.show();
											$(".view-discussion .mobi-listview .ui-li-divider:visible:first").addClass("ui-corner-top");
										//}
									}
									//trying to prevent page refresh on Pre 
									return false;
								} );
								$(".listitem-topic").live('click', function() {
									// The user has tapped a topic to drill down.
									// Store the topic information in the global topics array.
									var strCurrentTopic = $(this).attr("id").split("_")[1];
									arrGlobalTopics.push(strCurrentTopic);
								} );
							}
						} );						
						
						$.mobile.pageLoading(true);
					}
				})
			});

/*
 * ====================
 * Activity Detail View
 * ====================
 */

			$("#pageActivityDetail").live("pagebeforeshow", function(event, ui) {
				$("#pageActivityDetail .container-topicinfo").css("visibility", "hidden");
				$("#pageActivityDetail .container-activity-detail").css("visibility", "hidden")
			})
						
			
			
			//Page show event for an activity feed detail page
			$("#pageActivityDetail").live("pageshow", function(event, ui){
				var $thisView = $(this), url, details = '', comments,
					$contMessage = $thisView.find('.container-message'),
					$contInfo = $thisView.find('.container-topicinfo'),
					refId = arrGlobalActivity[0].split('_')[2];
				var	activity = objGlobalResources[refId];
				var activityType = activity.object.objectType;

				$.mobile.pageLoading();
				
				$(".button-menu").unbind("click").bind("click", function() {
					showMenu(this);
				})
				/*
				 * The Activity Detail view has to display different kinds of 
				 * activity details: grades, dropbox submissions, etc.
				 * Each detail type has its own div in the activitydetail.html template,
				 * and these divs are hidden/shown based on CSS cascade.
				 * Here, we fill in the appropriate items in the divs and set the CSS classes.
				 */
				
				// Initial data passed via objGlobalResources
				$thisView.find(".mobi-course-title").html(activity.courseTitle);
				$thisView.find(".mobi-activity-type").html(activity.target.title);
				
				// Get the details
				if(activityType === 'grade') {
					$thisView.find(".container-activity-detail").addClass("detail-grade").removeClass("detail-dropbox");
					$thisView.find(".mobi-activity-type").html("Grade");
					$contMessage = $thisView.find(".container-grade");
					// Use the Cache Manager to fetch the gradebook information for the course.
					$().mobyCacheManager({
						boolForceRefresh: true,
						strQueryUrl: configSettings.apiproxy + '/me/courseitemgrades?courses=' + objGlobalCourse.id,
						strCacheDate: "grades-"+objGlobalCourse.id+"-timestamp",
						strCacheInfo: "grades-" + objGlobalCourse.id,
						objCacheRefresh: {
							hours: 1
						},
						callbackSuccess : function(jsonResponse, intTransactionId) {
							
							// find the relevant grade from the gradebook information, and then 
							// insert the information in the DOM.
							var objGrade = "";
							for (var i = 0; i < jsonResponse.courseitemgrades.length; i++) {
								if (jsonResponse.courseitemgrades[i].gradebookItem.id === objGlobalCourse.referenceId) {
									objGrade = jsonResponse.courseitemgrades[i];
								}
							}

							if (objGrade != "") {
								$contMessage.find(".mobi-activity-title").html(objGrade.gradebookItem.title);
								// If there is a letter grade, show it, otherwise hide that line.
								if (objGrade.grade.letterGradeSet) {
									$contMessage.find(".mobi-letter-grade span").text(objGrade.grade.letterGrade);
									$contMessage.find(".mobi-letter-grade").show();
								} else {
									$contMessage.find(".mobi-letter-grade").hide();
								}
								
								// If there is a numeric grade, show it, otherwise hide that line.
								if (objGrade.grade.pointsSet) {
									$contMessage.find(".mobi-numeric-grade span").text(objGrade.grade.points + "/" + objGrade.gradebookItem.pointsPossible);
									$contMessage.find(".mobi-numeric-grade").show();
								} else {
									$contMessage.find(".mobi-numeric-grade").hide();
								}
								
								// If there are comments, show them, otherwise hide that section.
								if (objGrade.grade.comments != "") {
									$contMessage.find("div.mobi-comments").html(objGrade.grade.comments);
									$contMessage.find(".mobi-comments").show();
								} else {
									$contMessage.find(".mobi-comments").hide();
								}
								
								$contMessage.find(".mobi-date").text(friendlyDate(objGrade.grade.updatedDate));
								$.mobile.pageLoading(true);
								$("#pageActivityDetail .container-topicinfo").css("visibility", "visible");
								$("#pageActivityDetail .container-activity-detail").css("visibility", "visible")
								
							} else {
								// Something bad happened, we weren't able to get the cache or it didn't have
								// a match...something.
								alert('Unable to fetch grade information, please retry.');
								$.mobile.pageLoading(true);
								$("#pageActivityDetail .container-topicinfo").css("visibility", "visible");
								$("#pageActivityDetail .container-activity-detail").css("visibility", "visible")
							}
						},
						callbackError: function() {
							alert('Unable to fetch grade information, please retry.');
							$.mobile.pageLoading(true);
						}
					})

				} else if(activityType === 'dropbox-submission') {
					url = '/courses/' + activity.object.courseId + '/dropboxBaskets/' + activity.target.referenceId + '/messages/' + activity.object.referenceId; 
					$contMessage.removeClass("detail-grade").addClass("detail-dropbox");
					$thisView.find(".mobi-activity-type").html("Dropbox Submission");
					$contMessage = $thisView.find(".container-dropbox");
					$thisView.find(".container-activity-detail").addClass("detail-dropbox").removeClass("detail-grade");
					
					$().mobiQueryApi("get", { 
						strUrl: configSettings.apiproxy + url,
						successHandler: function(jsonResponse, intTransactionId) {
							//console.log(jsonResponse, intTransactionId);
							$contMessage.find(".mobi-activity-title").html(activity.object.objectType.replace('-', ' '));
							$contMessage.find(".mobi-posted-by span").text(jsonResponse.messages[0].author.firstName + ' ' +jsonResponse.messages[0].author.lastName);
							$contMessage.find(".mobi-date").text(friendlyDate(jsonResponse.messages[0].date));
							
							
							// If there are comments, show them, otherwise hide that section.
							if (jsonResponse.messages[0].comments != "") {
								$contMessage.find("div.mobi-comments").html(jsonResponse.messages[0].comments);
								$contMessage.find(".mobi-comments").show();
							} else {
								$contMessage.find(".mobi-comments").hide();
							}

							$.mobile.pageLoading(true);
							$("#pageActivityDetail .container-topicinfo").css("visibility", "visible");
							$("#pageActivityDetail .container-activity-detail").css("visibility", "visible")
						},
						errorHandler: function() {
							alert("Unable to display the dropbox information.  Please try again.");
							$.mobile.pageLoading(true);
						}
					}); 
				}  
			} );
			
			//discussion topic and detail response
			function discussionReply( $thisView, topic, responseType, id) {
				var $this, responseStr = {}, newResponse,
					$listView = $thisView.find('.mobi-listview'),
					titleText = "Post a response to " + topic,
					response, $container, href, match, 
					$totResponses = $( $thisView.find('.mobi-total-responses')[0] ),
					numResponses = $totResponses.html(),
					$buttons = $thisView.find(".container-response-buttons"),
					$responseInputTitle = $thisView.find(".textarea-response-title"),
					intMaxTitleLength = 35,
					$responseInputBody = $thisView.find(".textarea-response-body");
				// Truncate text
				// First, how much?
				if ($(this).parents(".landscape").length > 0) {
					// We're in landscape mode, so it needs to be longer
					intMaxTitleLength = 70;
				}
				if (titleText.length > intMaxTitleLength) {
					var strTemp = titleText.slice(0, intMaxTitleLength) + "...";
					titleText = strTemp;
				}
				$responseInputTitle.val( titleText );		
				$responseInputBody.hide();
				function reset() {
					$responseInputTitle.val( titleText );
					$responseInputBody.val('');
					$responseInputBody.hide();
					$buttons.hide();
				}
				$responseInputTitle.bind( 'focus', function() { 
					$this = $(this);	
					if($responseInputTitle.val() === titleText) {	
						$responseInputTitle.setHintText('subject');
						$responseInputTitle.val('');
					}
					if($responseInputBody.val() === ''){
						$responseInputBody.setHintText('message');
					}
					$responseInputBody.show();
					$buttons.show();
				} );
				$buttons.find('.response-cancel').click( function() {
					//reset everything back to it's original state
					reset();
				} );				
				$buttons.find('.response-post').click( function() {
					if($responseInputBody.val() != '' || $responseInputBody.val() != 'message') { 
						//submit response using ecollege api
						responseStr.responses = {
							title: $responseInputTitle.val(),
							description: $responseInputBody.val()
						};
						$().mobiQueryApi('post', {
							strUrl: configSettings.apiproxy  + "/me/" + responseType + "/" + id + "/responses",
							strData: JSON.stringify(responseStr),
							successHandler: function(jsonResponse) { 
								//reset everything back to it's original state
								reset();
								//get a new set of data, or just add the message to the list...
								response = jsonResponse.responses[0];
								
								if( $thisView[0].id === 'pageDiscussionTopicDetail' || $thisView[0].id === 'pageDiscussionThreadDetail2' ) { 
									href = '/discussionthreaddetail.html';
								} else {
									href = '/discussionthreaddetail2.html';
								}
								newResponse = '<li class="no-responses response-'+ id +'">';
								newResponse += '<a href="' + href + '" class="listitem-response not-read" id="response_'+ response.author.id + '-' + response.id +'">';				
								newResponse += '<span class="mobi-title">'+response.title+'</span>';
								newResponse += '<span class="mobi-author">' +response.author.firstName + " " + response.author.lastName+ '</span>';
								newResponse += '<span class="mobi-total-responses">No responses</span>';
								newResponse += '<span class="mobi-summary">' +stripTags(response.description)+ '</span>';
								newResponse += '<span class="mobi-description" style="display: block">' +response.description + '</span>';
								newResponse += '<span class="mobi-date">'+friendlyDate(response.postedDate)+'</span>';
								newResponse += '</a></li>\n';
								if($listView.length){ 
									$listView.prepend(newResponse);
									$listView.listview('refresh');
								} else {
									newResponse = '<ul data-role="listview" data-inset="true" class="mobi-listview">' + newResponse + '</ul>';
									$container = $thisView.find('.container-threads');
									$container.empty().append(newResponse);
									$container.find('.mobi-listview').listview();
								}
								//update number of responses
								if( numResponses.match( /no responses/i ) ) {
									$totResponses.html( '1 response' );
								} else {
									match = numResponses.match(/\d+/);
									$totResponses.html( numResponses.replace( match, +match + 1 ) );
								}
								$(".listitem-response").live('click', function() { 
									// The user has tapped on a thread.  We need
									// to display the thread detail page.
									//moved click handler to external function to remove 
									//duplication from #pageDiscussionTopicDetail and 
									//discussionThreadDetail
									responseClickHandler($(this));
								} );
							},
							errorHandler: function() {
								alert("There was an error posting your response. Please try again");
							}
						} ); 
					}
				} );				
			}

/*
 * ============================
 * Discussion Topic Detail View
 * ============================
 */
			$("#pageDiscussionTopicDetail").live("pagebeforeshow", function(event, ui) {
				$("#pageDiscussionTopicDetail .container-discussion-detail").css("visibility", "hidden");
				$("#pageDiscussionTopicDetail .header-discussion-detail").css("visibility", "hidden")
			})
			
			
			// Page show event for a discussion topic detail page
			$("#pageDiscussionTopicDetail").live("pageshow", function(event, ui) {
				// We are showing the Discussion tab.
				// First, show the loading spinner
				$.mobile.pageLoading();
				$(".button-menu").unbind("click").bind("click", function() {
					showMenu(this);
				})
				
				// Next, empty out the detail info
				$(".header-disucssion-detail .mobi-title, .container-topicinfo .mobi-title, .container-topicinfo .mobi-author, .container-topicinfo .mobi-total-responses, .container-topicinfo .mobi-unread-responses, .container-message").html("");
				
				// What topic should we show?  This information should be contained in the
				// arrGlobalTopics array.  If it isn't, we should go back.
				if (arrGlobalTopics.length === 0) {
					// abort
					// TODO: Possibly we could fail more gracefully than just reshowing the
					// home page.
					alert('There is no topic to display.  Please try again.');
					$(location).attr("href", "index.html");
				}
				var $thisView = $("#" + event.currentTarget.id),
					 intLast = arrGlobalTopics.length -1, userTopicId, responseId, $this,
					 strCurrentUrl = configSettings.apiproxy + "/me/usertopics/" + arrGlobalTopics[intLast],
					 $contTopicInfo = $thisView.find('.container-topicinfo'), totResponses;
				$thisView.find(".container-discussion-detail .container-message").html("");
				$().mobiQueryApi("get", {
					strUrl: strCurrentUrl,
					successHandler: function(jsonResponse, intTransactionId) {
						var strTitle = jsonResponse.userTopics[0].topic.title;
						var strAuthor = jsonResponse.userTopics[0].topic.containerInfo.contentAuthor;
						var intTotalResponses = jsonResponse.userTopics[0].childResponseCounts.totalResponseCount;
						var intUnreadResponses = jsonResponse.userTopics[0].childResponseCounts.unreadResponseCount;
						var strMessage = jsonResponse.userTopics[0].topic.description;
						userTopicId =  jsonResponse.userTopics[0].topic.id;
						$thisView.find(".mobi-title").html(strTitle);
						if (strAuthor != undefined) {
							if (strAuthor != "") {
								 $contTopicInfo.find(".mobi-author").html(strAuthor);
							} 
						} else {
							 $contTopicInfo.find(".mobi-author").remove();
						}
						if (intTotalResponses === 0) {
							totResponses = "No responses";
							$contTopicInfo.addClass('no-responses');
						} else if (intTotalResponses === 1) {
							totResponses = "1 response";
							$contTopicInfo.addClass('responses');
						} else {
							totResponses = intTotalResponses + " total responses";
							if(jsonResponse.userTopics[0].childResponseCounts.last24HourResponseCounts >= 10){
								$contTopicInfo.addClass('hot-topic');
							} else {
								$contTopicInfo.addClass('responses');
							}
						}
						$contTopicInfo.find(".mobi-total-responses").text(totResponses);
						if (intUnreadResponses === 0) {
							 $contTopicInfo.find(".mobi-unread-responses").text("none").hide();
						} else {
							 $contTopicInfo.find(".mobi-unread-responses").text(intUnreadResponses);
						}
						
						var $thisMessage = $thisView.find(".container-message");
						// Quickly add 4 lines of text to the div to get the height.
						var intMinHeight = $thisMessage.addClass("container-message-open").html("<p>Lorem<br>Ipsum<br>dolor<br>sit</p>").height();
						$thisMessage.empty().html(strMessage);
						// if the message is higher than 4 lines, we must add the button, attach the click listener, and collapse the 
						// div
						if ($thisMessage.height() > intMinHeight) {
							var $button = $('<div class="layout-button-expand">&nbsp;</div>');
							$thisMessage.prepend($button);
							$("div.layout-button-expand").click(function() {
								var $this = $(this);
								$this.parents(".container-message").toggleClass("container-message-open");
							})
							$thisMessage.toggleClass("container-message-open");
						}
						// if there are responses, we need to get them.
						var $theseThreads = $thisView.find(".container-threads");

						$theseThreads.empty();
						if (intTotalResponses> 0) {
							var strNewUrl = configSettings.apiproxy + "/me/topics/" +userTopicId + "/userresponses";
							$().mobiQueryApi("get", {
								strUrl: strNewUrl,
								successHandler: function(jsonResponse, intTransactionId) {
									$().mobyDiscussionManager("userResponsesToHtml", {
										objUserResponses: jsonResponse,
										callbackSuccess: function(strReturnHtml) {
											var strHtml = '<ul data-role="listview" class="mobi-listview">';
											strHtml += strReturnHtml;
											strHtml += "</ul>"
											$theseThreads.html(strHtml)
											// Hide the full description HTML in a data object
											$(".mobi-description").each(function() {
												var $this = $(this);
												var strHtml = $(this).html();
												$this.data("description", strHtml);
												$this.empty();
											})
											$theseThreads.find(".mobi-listview").listview();
											
											// Tap event listener
											$(".listitem-response").die("click").live('click', function() {
												// The user has tapped on a thread.  We need
												// to display the thread detail page.
												//moved click handler to external function to remove 
												//duplication from #pageDiscussionTopicDetail and 
												//discussionThreadDetail
												responseClickHandler($(this));
											}); 
											//insert the discussion reply input and add event handling
											discussionReply( $thisView, strTitle, 'topics', userTopicId  );
											$.mobile.pageLoading(true);
											$("#pageDiscussionTopicDetail .container-discussion-detail").css("visibility", "visible");
											$("#pageDiscussionTopicDetail .header-discussion-detail").css("visibility", "visible")
										}
									});
								},
								errorHandler: function() {
									alert('Unable to fetch response information for topic.');
									
									$("#pageDiscussionTopicDetail .container-discussion-detail").css("visibility", "visible");
									$("#pageDiscussionTopicDetail .header-discussion-detail").css("visibility", "visible")
									$.mobile.pageLoading(true);
								}
							});
						} else {
							$theseThreads.html("<h4>No responses.</h4>");
							//insert the discussion reply input and add event handling
							discussionReply( $thisView, strTitle, 'topics', userTopicId  );
							$("#pageDiscussionTopicDetail .container-discussion-detail").css("visibility", "visible");
							$("#pageDiscussionTopicDetail .header-discussion-detail").css("visibility", "visible")
							$.mobile.pageLoading(true);
						}
						
					},
					errorHandler: function() {
						alert("Unable to fetch the topic's responses. Please try again.");
						
						$("#pageDiscussionTopicDetail .container-discussion-detail").css("visibility", "visible");
						$("#pageDiscussionTopicDetail .header-discussion-detail").css("visibility", "visible")
						$.mobile.pageLoading(true);
					}
				});
			});

			$(".container-discussion-detail .container-message div.layout-button-expand").click(function() {
				var $this = $(this);
				$this.parents(".container-message").toggleClass("container-message-open");
			});		
			
			//remove duplication from pageDiscussionThreadDetail and pageDiscussionThreadDetail2
			function discussionThreadDetail($thisView) {  
				var $this, intMinHeight, $button, $theseThreads, 
					iconClass, strCurrentUrl, strHtml, objInfo,
					intLast = arrGlobalThreads.length -1, 
					objThread = arrGlobalThreads[intLast],
					objThreadId = objThread.strNewId.split("-")[1] ,
					numResponses,					
					$thisMessage = $thisView.find(".container-discussion-detail .container-message"),
					$responseInput = $thisView.find("#textarea-response");	
				$.mobile.pageLoading();
				// get a single response. will simply return if single response is from the 
				// discussion page where all the info was already passed in
				$().mobyDiscussionManager('getSingleResponse', objThreadId, objThread, {
					callbackSuccess: function(objInfo) {
						$.extend(objThread, objInfo);
						numResponses = objThread.strTotalResponseString;
						
						// What thread should we show?  This information should be contained in the
						// arrGlobalThreads array.  If it isn't, we should go back.
						if (arrGlobalThreads.length === 0) {
							// Nothing left to show in the stack.  Go back to topic detail page.
							$.mobile.changePage("#pageDiscussionTopicDetail");
						}
						$thisView.find(".container-discussion-detail .container-message").html("");
						
						//set number of responses class
						if( typeof numResponses === 'number' ) {
							
						}
						if( numResponses.match( /no responses/i ) ) {
							iconClass = 'no-responses';
						} else {
							match = numResponses.match(/\d+/);
							if( match >= 10){
								iconClass = 'hot-topic';
							} else {
								iconClass = 'responses';
							}
						}					
						$thisView.find('.container-topicinfo').addClass(iconClass);
						// Fill in the thread detail information
						$thisView.find(".header-discussion-detail .mobi-title").html(objThread.strTitle);
						$thisView.find(".container-discussion-detail .container-topicinfo .mobi-title").html(objThread.strTitle);
						$thisView.find(".container-discussion-detail .container-topicinfo .mobi-author").text(objThread.strAuthorName);
						$thisView.find(".container-discussion-detail .container-topicinfo .mobi-total-responses").text(objThread.strTotalResponseString);
						$thisView.find(".container-discussion-detail .container-topicinfo .mobi-date").text(objThread.strDate);
		
						$thisView.find(".container-discussion-detail .container-topicinfo .mobi-unread-responses").text(objThread.strUnreadResponseString);
						if (objThread.strUnreadResponseString === "") {
							$thisView.find(".container-discussion-detail .container-topicinfo .mobi-unread-responses").hide();
						}
						
						// Quickly add 4 lines of text to the div to get the height.
						intMinHeight = $thisMessage.addClass("container-message-open").html("<p>Lorem<br>Ipsum<br>dolor<br>sit</p>").height();
						$thisMessage.empty().html(objThread.strDescription);
						// if the message is higher than 4 lines, we must add the button, attach the click listener, and collapse the div
						if ($thisMessage.height() > intMinHeight) {
							$button = $('<div class="layout-button-expand">&nbsp;</div>');
							$thisMessage.prepend($button);
							$("div.layout-button-expand").click(function() {
								$this = $(this);
								$this.parents(".container-message").toggleClass("container-message-open");
							})
							$thisMessage.toggleClass("container-message-open");
						}
												
						// Get any responses in the thread
						$theseThreads = $thisView.find(".container-threads");				
						$theseThreads.empty();
						
						//insert the discussion reply input and add event handling
						discussionReply( $thisView, $thisView.find(".container-discussion-detail .container-topicinfo .mobi-title").text(), 'responses', objThreadId );
						strCurrentUrl = configSettings.apiproxy + "/me/responses/" + objThreadId + "/userresponses";
						$().mobiQueryApi("get", {
							strUrl: strCurrentUrl,
							successHandler: function(jsonResponse, intTransactionId) {
								if (jsonResponse.userResponses.length > 0) {
									$().mobyDiscussionManager("userResponsesToHtml", {
										objUserResponses: jsonResponse,
										strUrl: $thisView[0].id === 'pageDiscussionThreadDetail' ? '/discussionthreaddetail2.html' : "/discussionthreaddetail.html",
										callbackSuccess: function(strReturnHtml) {
											strHtml = '<ul data-role="listview" class="mobi-listview">';
											strHtml += strReturnHtml;
											strHtml += "</ul>"
											$theseThreads.html(strHtml);
											// Hide the full description HTML in a data object
											$(".mobi-description").each(function() {
												$this = $(this);
												strHtml = $(this).html();
												$this.data("description", strHtml);
												$this.empty();
											} );
											$theseThreads.find(".mobi-listview").listview();
											$.mobile.pageLoading(true);
											$thisView.find(".container-topicinfo").css("visibility", "visible");
											$thisView.find(".header-discussion-detail .mobi-title").css("visibility", "visible");
											$thisView.find(".container-discussion-detail").css("visibility", "visible");
											$thisView.find(".container-threads").css("visibility", "visible");
											if ((objThread.strUnreadResponseString === 0)||(objThread.strUnreadResponseString === "")) {
												$thisView.find(".container-discussion-detail .container-topicinfo .mobi-unread-responses").hide();
											}
											// Tap event listener
											$(".listitem-response").die("click").live('click', function() {
												// The user has tapped on a thread.  We need
												// to display the next detail page.
												// moved click handler to external function to remove 
												// duplication from #pageDiscussionTopicDetail and 
												// discussionThreadDetail
												responseClickHandler($(this));
											} );
										},
										callbackError: function() {
											alert("Unable to create HTML for response list.");
											$.mobile.pageLoading(true);
										}
									})
								} else {
									$theseThreads.html("<h4>No responses.</h4>");
									$.mobile.pageLoading(true);
									$thisView.find(".container-topicinfo").css("visibility", "visible");
									$thisView.find(".header-discussion-detail .mobi-title").css("visibility", "visible");
									$thisView.find(".container-discussion-detail").css("visibility", "visible");
									$thisView.find(".container-threads").css("visibility", "visible");
									if ((objThread.strUnreadResponseString === 0)||(objThread.strUnreadResponseString === "")) {
										$thisView.find(".container-discussion-detail .container-topicinfo .mobi-unread-responses").hide();
									}
								}
							},
							errorHandler: function(){
								alert('unable to get the thread information');
								$.mobile.pageLoading(true);
							}		
						} );
					}
				} );
			}	
				
/*
 * ==============================
 * Discussion Thread Detail Views
 * ==============================
 */	
			
			$("#pageDiscussionThreadDetail").live("pagebeforeshow", function(event, ui) {
				$("#pageDiscussionThreadDetail .container-topicinfo").css("visibility", "hidden");
				$("#pageDiscussionThreadDetail .header-discussion-detail .mobi-title").css("visibility", "hidden");
				$("#pageDiscussionThreadDetail .container-discussion-detail").css("visibility", "hidden");
				$("#pageDiscussionThreadDetail .container-threads").css("visibility", "hidden");
			})
			
			// Page show event for the thread detail page
			$("#pageDiscussionThreadDetail").live("pageshow", function(event, ui) {
				$(".button-menu").unbind("click").bind("click", function() {
					showMenu(this);
				})
				discussionThreadDetail( $(this) );
				// Back button:  If we tap the back button, it will take us back to the prior screen.
				// We must therefore remove the current element from the array.
				$("#pageDiscussionThreadDetail #back-thread-detail").unbind(".myclick").bind("click.myclick", function() {
					$.mobile.pageLoading();
					arrGlobalThreads.pop();
				})
			});
			
			$("#pageDiscussionThreadDetail2").live("pagebeforeshow", function(event, ui) {
				$("#pageDiscussionThreadDetail2 .container-topicinfo").css("visibility", "hidden");
				$("#pageDiscussionThreadDetail2 .header-discussion-detail .mobi-title").css("visibility", "hidden");
				$("#pageDiscussionThreadDetail2 .container-discussion-detail").css("visibility", "hidden");
				$("#pageDiscussionThreadDetail2 .container-threads").css("visibility", "hidden");
			})
			
			// Page show event for the 
			$("#pageDiscussionThreadDetail2").live("pageshow", function(event, ui) {
				$(".button-menu").unbind("click").bind("click", function() {
					showMenu(this);
				})
				discussionThreadDetail( $(this) );
				// Back button:  If we tap the back button, it will take us back to the prior screen.
				// We must therefore remove the current element from the array.
				$("#pageDiscussionThreadDetail2 #back-thread-detail-2").unbind(".myclick").bind("click.myclick", function() {
					$.mobile.pageLoading();
					arrGlobalThreads.pop();
				})
			});
			
			function getClassList($this) {
				var courses = '', i, $classesList = $this.find('.view-courses .mobi-listview');
				$().mobyCourseManager( {
					callbackSuccess: function(arrCourses) { 
						if($this[0].id === 'pageProfile') {								
							$(arrCourses).each(function(i) { 
								courses +='<li class="course">';
								//courses +='<a id="' + i + '"  href="#" class="listitem-course">';
								courses +='<span class="mobi-title">' + this.title + '</span>';
								courses +='<span class="mobi-your-course">' + this.number + '</span>';
								//courses +='</a>';
								courses +='</li>';
							} ); 
						} else {
							$(arrCourses).each(function(i) { 
								courses +='<li class="course">';
								courses +='<a id="' + i + '"  href="/course.html" class="listitem-course">';
								courses +='<span class="mobi-title">' + this.title + '</span>';
								courses +='<span class="mobi-your-course">' + this.number + '</span>';
								courses +='</a>';
								courses +='</li>';
							} ); 
						}
						$classesList.html(courses);
						$classesList.listview('refresh');
						$classesList.find('.listitem-course').click(function(e) {
							//add the current course data into the arrGlobalCourse array for #pageCourseDetail
							objGlobalCourse = arrCourses[this.id];
						} );
						$.mobile.pageLoading(true);
					},
					callbackError: function(){
						alert('No courses found');
						$.mobile.pageLoading(true);
					}
				} );
			}
/*
 * ============
 * Classes View
 * ============
 */
			$("#pageClasses").live("pageshow", function() { //localStorage.removeItem('courses');
				$.mobile.pageLoading();
				$(".button-menu").unbind("click").bind("click", function() {
					showMenu(this);
				})
				// Highlight the correct tab
				$(".container-navbar li a").removeClass("ui-btn-active");
				$(".container-navbar #courses").addClass("ui-btn-active");
				getClassList($(this));
			} );
			
			function  getSummary(text) {
				var strReturn = "",
					strStrippedSummary = stripTags(text);
				if (strStrippedSummary.length > 200) {
					strReturn = strStrippedSummary.substr(0, 100);
				} else if (strStrippedSummary.length === 0) {
					strReturn = "";
				} else {
					strReturn = strStrippedSummary;
				}
				return strReturn;
			}
			
/*
 * ==================
 * Course Detail View
 * ==================
 */
			$("#pageCourseDetail").live("pagebeforeshow", function() {
				$("#pageCourseDetail .container-topicinfo").css("visibility", "hidden");
				$("#pageCourseDetail .announcement-subject").css("visibility", "hidden");
				$("#pageCourseDetail .announcement-message").css("visibility", "hidden");
				
			});
			
			$("#pageCourseDetail").live("pageshow", function() {
				var $this = $(this), info, instructor, announcement, 
				$contInfo = $this.find('.container-topicinfo'),
				$contAnn = $this.find('.container-announcement');
				$.mobile.pageLoading();
				$(".button-menu").unbind("click").bind("click", function() {
					showMenu(this);
				})
				$contInfo.empty();
				$contAnn.empty();
				if (objGlobalCourse.number === "SOT") {
					// Hide the People link for Student Orientation Tutorials, as they have a gajillion people in them
					// and hitting the service will return ALL OF THEM.
					$this.find(".item-people").hide();
				} else {
					// Because we might have previously hidden it...
					$this.find(".item-people").show();
				}
				$().mobiQueryApi('get', {
					strUrl: configSettings.apiproxy + '/courses/' + objGlobalCourse.id + '/instructors',
					successHandler: function(jsonResponse){
						instructor = jsonResponse.instructors[0];
						info = '<p class="mobi-course-title">' + objGlobalCourse.number + '</p>';
						info += '<p class="mobi-activity-type">' + objGlobalCourse.title + '</p>';
						if(instructor) {
		  					info += '<p class="mobi-instructor-name">' + instructor.firstName + ' ' + instructor.lastName + '</p>';
	  					}
		  				$contInfo.html(info);
						$("#pageCourseDetail .container-topicinfo").css("visibility", "visible");
					},
					errorHandler: function(){
						$.mobile.pageLoading(true);
					}
				} ); 
				$().mobiQueryApi('get', { 
					strUrl: configSettings.apiproxy + '/courses/' + objGlobalCourse.id + '/announcements',
					successHandler: function(jsonResponse){
						announcement = jsonResponse.announcements[0];
						if(announcement) {					
						    var info = "";
							var strSubject = stripTags(announcement.subject);
							var strSummary = getSummary(announcement.text);
							if (strSubject.length > 0) {
								info += '<h5 class="announcement-subject"><a href="/course-announcement-detail.html">' + strSubject + '</a></h5>';
							}
							if (strSummary.length > 5) {
								info += '<p class="announcement-message"><a href="/course-announcement-detail.html">' + strSummary + '</a></p>';
							}
							$contAnn.html(info);
							
							objGlobalResources.announcement = {};
							objGlobalResources.announcement.course = objGlobalCourse.number;
							objGlobalResources.announcement.title = announcement.subject;
							objGlobalResources.announcement.detail = announcement.text;
							
						}
						$("#pageCourseDetail .announcement-subject").css("visibility", "visible");
						$("#pageCourseDetail .announcement-message").css("visibility", "visible");
						$.mobile.pageLoading(true);
					},
					errorHandler: function(){
						$.mobile.pageLoading(true);
					}
				});
				//remove the current course from the global variable when clicking on the back button
				$("#pageCourseDetail #back-classes").unbind(".myclick").bind("click.myclick", function() {
					$.mobile.pageLoading();
					objGlobalCourse = {};
				} );
			} );
			
/*
 * =========================
 * Course Announcements View
 * =========================
 */	
			
			$("#pageCourseAnnouncements").live("pagebeforeshow", function() {
				$("#pageCourseAnnouncements .container-topicinfo").css("visibility", "hidden");
				$("#pageCourseAnnouncements .view-course-announcements").css("visibility", "hidden");
				
			});
			
			$("#pageCourseAnnouncements").live("pageshow", function() {
				var $this = $(this), info, instructor, announcement, 
				$contInfo = $this.find('.container-topicinfo'),
				$contAnn = $this.find('.view-course-announcements');
				$.mobile.pageLoading();
				$(".button-menu").unbind("click").bind("click", function() {
					showMenu(this);
				});
				
				// Fill in the header
				$contInfo.find(".mobi-course-title").text(objGlobalCourse.number);

				// Get the list of announcements for the course. 
				$().mobiQueryApi('get', { 
					strUrl: configSettings.apiproxy + '/courses/' + objGlobalCourse.id + '/announcements',
					successHandler: function(jsonResponse){
						
						var strHtml = '<ul data-role="listview" class="mobi-listview"></ul>';
						$contAnn.html(strHtml);
						
						if (jsonResponse.announcements.length > 0) {
							for (var i = 0; i < jsonResponse.announcements.length; i++) {
								var objCurrAnn = jsonResponse.announcements[i];
								var strId = "id-" + objCurrAnn.id;
								strHtml = '<li><a href="/course-announcement-detail.html" id="'+strId+'" class="course-announcement">';
								strHtml += '<span class="mobi-title">' + stripTags(objCurrAnn.subject)+ '</span>';
								strHtml += '<span class="mobi-summary">' + stripTags(objCurrAnn.text)+ '</span>';
								strHtml += '</a></li>\n';
								$contAnn.find("ul").append(strHtml);
								
								// Store the full detail info in the data for this element
								$contAnn.find("#" + strId).data("detail", objCurrAnn.text);
							}
						} else {
							strHtml = '<li><span class="mobi-title">No announcements.</span></li>';
							$contAnn.find("ul").append(strHtml);
						}
						$contAnn.find(".mobi-listview").listview();
						
						// Loop through each announcement and create and save a JSON string to its local data,
						// for passing to the detail page when clicked.
						$("#pageCourseAnnouncements .view-course-announcements li a.course-announcement").each(function() {
							var $this = $(this);
							var objJSON = {};
							objJSON.id = $this.attr("id").split("-")[1];
							objJSON.course = $this.parents("#pageCourseAnnouncements").find(".container-topicinfo .mobi-mobi-course-title").text();
							objJSON.title = $this.find(".mobi-title").text();
							objJSON.detail = $this.data("detail");
							var strJSON = JSON.stringify(objJSON);
							$this.data("info", strJSON);
							
						})
						
						$.mobile.pageLoading(true);
						$("#pageCourseAnnouncements .container-topicinfo").css("visibility", "visible");
						$("#pageCourseAnnouncements .view-course-announcements").css("visibility", "visible");
						
						
						// Attach an event listener to the list items so that when
						// a user taps on them we can pass info to the next page
						$("#pageCourseAnnouncements .view-course-announcements li a").click(function() {
							var $this = $(this);
							var strJSON = $this.data("info");
							var objJSON = JSON.parse(strJSON);
							objGlobalResources.announcement = {};
							objGlobalResources.announcement = objJSON;
						})
					},
					errorHandler: function(){
						$.mobile.pageLoading(true);
						$("#pageCourseAnnouncements .container-topicinfo").css("visibility", "visible");
						$("#pageCourseAnnouncements .view-course-announcements").css("visibility", "visible");
					}
				});
			});
/*
 * ===============================
 * Course Announcement Detail View
 * ===============================
 */

			$("#pageCourseAnnouncementDetail").live("pagebeforeshow", function() {
				$("#pageCourseAnnouncements .container-topicinfo").css("visibility", "hidden");
				$("#pageCourseAnnouncements .container-activity-detail").css("visibility", "hidden");
				
			});
			
			$("#pageCourseAnnouncementDetail").live("pageshow", function() {
				var $this = $(this), info, instructor, announcement, 
				$contInfo = $this.find('.container-topicinfo'),
				$contAnn = $this.find('.container-activity-detail .container-message');
				$.mobile.pageLoading();
				$(".button-menu").unbind("click").bind("click", function() {
					showMenu(this);
				});
				
				// Fill in the header
				$contInfo.find(".mobi-course-title").text(objGlobalResources.announcement.course);
				$contInfo.find(".mobi-activity-type").text(objGlobalResources.announcement.title);
				
				// Fill in the Detail
				var strStrippedDetail = stripTags(objGlobalResources.announcement.detail);
				if (strStrippedDetail.length > 5) {
					$contAnn.html(objGlobalResources.announcement.detail);
					$("#pageCourseAnnouncementDetail .container-activity-detail").show();
				} else {
					$("#pageCourseAnnouncementDetail .container-activity-detail").hide();
				}
				
				// Show everything
				$("#pageCourseAnnouncements .container-topicinfo").css("visibility", "visible");
				$("#pageCourseAnnouncements .container-activity-detail").css("visibility", "visible");
				$.mobile.pageLoading(true);
				
				
			});
			
/*
 * ==================
 * Course People View
 * ==================
 */
			$("#pageCoursePeople").live("pagebeforeshow", function(event, ui) {
				$("#pageCoursePeople .container-topicinfo").css("visibility", "hidden");
				$("#pageCoursePeople .view-course-sections").css("visibility", "hidden");
			})
			
			$('#pageCoursePeople').live("pageshow", function() {
				$.mobile.pageLoading();
				$(".button-menu").unbind("click").bind("click", function() {
					showMenu(this);
				})
				var $this = $(this), info, 
					$contInfo = $this.find('.container-topicinfo'),
					$userList = $this.find(".view-course-sections");
				$contInfo.empty();
				info = '<p class="mobi-course-title">' + objGlobalCourse.number + '</p>';
				info += '<p class="mobi-activity-type">' + objGlobalCourse.title + '</p>';
				if(objGlobalCourse.instructor) {
					info += '<p class="mobi-instructor-name">' + objGlobalCourse.instructor + '</p>';
				}
				$contInfo.html(info);
				
				
				// Filter buttons.
				$this.find(".btn-everyone").unbind("click").bind("click", function() {
					// Show everyone.
					var $this = $(this).parents("#pageCoursePeople");
					$(this).addClass("ui-btn-active");
					$this.find(".btn-classmates").removeClass("ui-btn-active");
					$this.find(".btn-instructors").removeClass("ui-btn-active");
					$this.find(".view-course-sections .mobi-listview .STUD").show();
					$this.find(".view-course-sections .mobi-listview .PROF").show();
				});
				$this.find(".btn-classmates").unbind("click").bind("click", function() {
					// Show only classmates..
					var $this = $(this).parents("#pageCoursePeople");
					$(this).addClass("ui-btn-active");
					$this.find(".btn-everyone").removeClass("ui-btn-active");
					$this.find(".btn-instructors").removeClass("ui-btn-active");
					$this.find(".view-course-sections .mobi-listview .PROF").hide();
					$this.find(".view-course-sections .mobi-listview .STUD").show();
				});
				$this.find(".btn-instructors").unbind("click").bind("click", function() {
					// Show only professors.
					var $this = $(this).parents("#pageCoursePeople");
					$(this).addClass("ui-btn-active");
					$this.find(".btn-classmates").removeClass("ui-btn-active");
					$this.find(".btn-everyone").removeClass("ui-btn-active");
					// The order in which we hide and show things matters.
					$this.find(".view-course-sections .mobi-listview .STUD").hide();
					$this.find(".view-course-sections .mobi-listview .PROF").show();
				})
				
	
					$().mobiQueryApi('get', {
						strUrl: configSettings.apiproxy + "/courses/" + objGlobalCourse.id + "/roster",
						successHandler: function(jsonResponse) {
							var arrRoster = [];
							for (var i = 0; i < jsonResponse.roster.length; i++) {
								var objCurrent = jsonResponse.roster[i];
								// Sort by last name, first name
								var strArrayContent = objCurrent.lastName + ", " + objCurrent.firstName + "|" + JSON.stringify(objCurrent);
								arrRoster.push(strArrayContent);
							}
							// It's a beautiful thing
							arrRoster.sort();
							
							var strCurrentLetter = "";
							var strDividerClass = "";
							var strList = '<ul class="mobi-listview">';
							var strChunk = "";
							var strDivider = "";
							for (var i = 0; i < arrRoster.length; i++) {
								
								// Get the current JSON object from the now-sorted array.
								var objCurrent = JSON.parse(arrRoster[i].split("|")[1]);
								
								// What role is the user?
								var strRole = "Student";
								if (objCurrent.roleType === "PROF") {
									strRole = "Professor";
								} else if (objCurrent.roleType === "TA") {
									strRole = "Teaching Assistant";
								}
	
								// Do we need a new letter divider?
								var strFirstLetter = arrRoster[i].charAt(0);
								if (strFirstLetter != strCurrentLetter) {
									// create new letter divider
									if (strChunk != "") {
										strDivider += strCurrentLetter + '</li>';
										strList += '<li data-role="list-divider" class="' +strDividerClass+ '">' + strDivider;
										strList += strChunk;
										strChunk = "";
										strDivider = "";
										strDividerClass = "";
									}
									strCurrentLetter = strFirstLetter;
								}
								
								// Do we need to add the role to the divider class?
								if (strDividerClass.search(objCurrent.roleType)=== -1) {
									if (strDividerClass.length != 0) {
										strDividerClass += " ";
									}
									strDividerClass += objCurrent.roleType;
								}
								
								strChunk += '<li class="person '+objCurrent.roleType+'">';
								strChunk += '<a href="/person.html" class="listitem-topic">';
								strChunk += '<span class="mobi-title">' + objCurrent.firstName + " " + objCurrent.lastName + '</span>';
								strChunk += '<span class="mobi-your-responses">' + strRole + '</span></a></li>\n';
							}
							// We should have built a full list, so insert it into the DOM
							strList +=  "</ul>\n";
							$userList.html(strList);
							// Need to wait for DOM to settle a bit before messing with it more
							var ptrTimeout = setTimeout(function() {
								$userList.find(".mobi-listview").listview()
								$userList.css("visibility", "visible");
								$contInfo.css("visibility", "visible");
								$.mobile.pageLoading(true);
							}, 200)
							
							// Add a click listener to the link so that we pass needed info on to the next page
							$("#pageCoursePeople .listitem-topic").click(function() {
								var $this = $(this);
								objGlobalUser = {};
								objGlobalUser.name = $this.find(".mobi-title").text();
								objGlobalUser.role = $this.find(".mobi-your-responses").text();
							})
							
						},
						errorHandler : function() {
							alert('Unable to get the people in this course.  Please try again.');
							$mobile.pageLoading(true);
						}
					});

			} );
			
/*
 * ===================
 * Gradebook List View
 * ===================
 */
			$("#pageGradeBook").live("pagebeforeshow", function() {
				$("#pageGradeBook .container-topicinfo").css("visibility", "hidden");
				$("#pageGradeBook .view-course-grades").css("visibility", "hidden");
				
			});
			
			$("#pageGradeBook").live("pageshow", function() {
				var $this = $(this), info, instructor, announcement, 
				$contInfo = $this.find('.container-topicinfo'),
				$contAnn = $this.find('.view-course-grades');
				$.mobile.pageLoading();
				$(".button-menu").unbind("click").bind("click", function() {
					showMenu(this);
				});
				$contInfo.find(".mobi-course-title").html(objGlobalCourse.title);
				
				$().mobyCacheManager({
					boolForceRefresh: true,
					strQueryUrl: configSettings.apiproxy + '/me/courseitemgrades?courses=' + objGlobalCourse.id,
					strCacheDate: "grades-"+objGlobalCourse.id+"-timestamp",
					strCacheInfo: "grades-" + objGlobalCourse.id,
					objCacheRefresh: {
						hours: 1
					},
					callbackSuccess : function(jsonResponse, intTransactionId) {
						var objGrades = {};
						var strHtml = '<ul data-role="listview" class="mobi-listview">';
						var strListHtml = "";
						var strDate = "";
						for (var i = 0; i < jsonResponse.courseitemgrades.length; i++) {
							var objCurrItem = jsonResponse.courseitemgrades[i];
							var strItemHtml = '<li>';
							var strCloseAnchor = "";
							var strPointsGrade = "";
							var strLetterGrade = "";
							var strGrade = "";
							if (objCurrItem.grade.letterGradeSet) {
								strLetterGrade = objCurrItem.grade.letterGrade;
							}
							if (objCurrItem.gradebookItem.pointsPossibleSet && objCurrItem.grade.pointsSet) {
								strPointsGrade = objCurrItem.grade.points + "/" + objCurrItem.gradebookItem.pointsPossible;
							}
							if (strLetterGrade.length>0) {
								strGrade = strLetterGrade;
							} else {
								strGrade = strPointsGrade;
							}
							if (strGrade.length === 0) {
								strDate = "No grade yet."
							} else {
								strItemHtml += '<a href="/gradebook-detail.html" class="listitem-topic">';
								strCloseAnchor = '</a>';
								strDate = friendlyDate(objCurrItem.grade.updatedDate);
							}
							
							strItemHtml += '<span class="mobi-title">'+objCurrItem.gradebookItem.title+'</span>';
							strItemHtml += '<span class="mobi-grade">'+strGrade+'</span>';
							strItemHtml += '<span class="mobi-date">' +strDate+ '</span>';
							strItemHtml += '<span class="mobi-letter-grade mobi-hidden">' +strLetterGrade+ '</span>';
							strItemHtml += '<span class="mobi-numeric-grade mobi-hidden">' +strPointsGrade+ '</span>';
							strItemHtml += '<span class="mobi-comments mobi-hidden">' +objCurrItem.grade.comments+ '</span>';
							strItemHtml += strCloseAnchor + '</li>\n';
							strListHtml += strItemHtml;
						}
						if (strListHtml.length <3) {
							strListHtml = '<li><span class="mobi-title">No grades for this course.</span></li>';
						}
						strHtml += strListHtml + "</ul>\n";
						$contAnn.html(strHtml);
						$contAnn.find(".mobi-listview").listview();
						// Apply click listeners to the list items
						$contAnn.find("a.listitem-topic").click(function() {
							var $this = $(this);
							objGlobalResources.objGradeItemInfo = {};
							objGlobalResources.objGradeItemInfo.strCourseTitle = $this.parents("#pageGradeBook").find(" .detail-header .mobi-course-title").text();
							objGlobalResources.objGradeItemInfo.strLetterGrade = $this.find(".mobi-letter-grade").text();
							objGlobalResources.objGradeItemInfo.strNumericGrade = $this.find(".mobi-numeric-grade").text();
							objGlobalResources.objGradeItemInfo.strComments = $this.find(".mobi-comments").html();
							objGlobalResources.objGradeItemInfo.strAssignmentTitle = $this.find(".mobi-title").html();
							objGlobalResources.objGradeItemInfo.strDate = $this.find(".mobi-date").text();
						})
						$.mobile.pageLoading(true);
						$("#pageGradeBook .container-topicinfo").css("visibility", "visible");
						$("#pageGradeBook .view-course-grades").css("visibility", "visible");
					},
					callbackError: function() {
						alert('Unable to fetch grade information for this course, please retry.');
						$.mobile.pageLoading(true);
						$("#pageGradeBook .container-topicinfo").css("visibility", "visible");
						$("#pageGradeBook .view-course-grades").css("visibility", "visible");
					}
				})
				
				/*
				$().mobiQueryApi('get', { 
					strUrl: configSettings.apiproxy + '/me/courseitemgrades?courses=' + objGlobalCourse.id,
					successHandler: function(jsonResponse){
						var objGrades = {};
						var strHtml = '<ul data-role="listview" class="mobi-listview">';
						var strListHtml = "";
						var strDate = "";
						for (var i = 0; i < jsonResponse.courseitemgrades.length; i++) {
							var objCurrItem = jsonResponse.courseitemgrades[i];
							var strItemHtml = '<li>';
							var strCloseAnchor = "";
							var strPointsGrade = "";
							var strLetterGrade = "";
							var strGrade = "";
							if (objCurrItem.grade.letterGradeSet) {
								strLetterGrade = objCurrItem.grade.letterGrade;
							}
							if (objCurrItem.gradebookItem.pointsPossibleSet && objCurrItem.grade.pointsSet) {
								strPointsGrade = objCurrItem.grade.points + "/" + objCurrItem.gradebookItem.pointsPossible;
							}
							if (strLetterGrade.length>0) {
								strGrade = strLetterGrade;
							} else {
								strGrade = strPointsGrade;
							}
							if (strGrade.length === 0) {
								strDate = "No grade yet."
							} else {
								strItemHtml += '<a href="/gradebook-detail.html" class="listitem-topic">';
								strCloseAnchor = '</a>';
								strDate = friendlyDate(objCurrItem.grade.updatedDate);
							}
							
							strItemHtml += '<span class="mobi-title">'+objCurrItem.gradebookItem.title+'</span>';
							strItemHtml += '<span class="mobi-grade">'+strGrade+'</span>';
							strItemHtml += '<span class="mobi-date">' +strDate+ '</span>';
							strItemHtml += '<span class="mobi-letter-grade mobi-hidden">' +strLetterGrade+ '</span>';
							strItemHtml += '<span class="mobi-numeric-grade mobi-hidden">' +strPointsGrade+ '</span>';
							strItemHtml += '<span class="mobi-comments mobi-hidden">' +objCurrItem.grade.comments+ '</span>';
							strItemHtml += strCloseAnchor + '</li>\n';
							strListHtml += strItemHtml;
						}
						if (strListHtml.length <3) {
							strListHtml = '<li><span class="mobi-title">No grades for this course.</span></li>';
						}
						strHtml += strListHtml + "</ul>\n";
						$contAnn.html(strHtml);
						$contAnn.find(".mobi-listview").listview();
						// Apply click listeners to the list items
						$contAnn.find("a.listitem-topic").click(function() {
							var $this = $(this);
							objGlobalResources.objGradeItemInfo = {};
							objGlobalResources.objGradeItemInfo.strCourseTitle = $this.parents("#pageGradeBook").find(" .detail-header .mobi-course-title").text();
							objGlobalResources.objGradeItemInfo.strLetterGrade = $this.find(".mobi-letter-grade").text();
							objGlobalResources.objGradeItemInfo.strNumericGrade = $this.find(".mobi-numeric-grade").text();
							objGlobalResources.objGradeItemInfo.strComments = $this.find(".mobi-comments").html();
							objGlobalResources.objGradeItemInfo.strAssignmentTitle = $this.find(".mobi-title").html();
							objGlobalResources.objGradeItemInfo.strDate = $this.find(".mobi-date").text();
						})
						$.mobile.pageLoading(true);
						$("#pageGradeBook .container-topicinfo").css("visibility", "visible");
						$("#pageGradeBook .view-course-grades").css("visibility", "visible");
					},
					errorHandler: function() {
						alert('Unable to fetch grade information for this course, please retry.');
						$.mobile.pageLoading(true);
						$("#pageGradeBook .container-topicinfo").css("visibility", "visible");
						$("#pageGradeBook .view-course-grades").css("visibility", "visible");
					}
				});
				*/
			});


/*
 * =================
 * Grade Detail View
 * =================
 */
			$("#pageGradebookDetail").live("pagebeforeshow", function() {
				$("#pageGradebookDetail .container-topicinfo").css("visibility", "hidden");
				$("#pageGradebookDetail .container-activity-detail").css("visibility", "hidden");
				
			});
			
			$("#pageGradebookDetail").live("pageshow", function() {
				var $this = $(this), info, instructor, announcement, 
				$contInfo = $this.find('.container-topicinfo'),
				$contAnn = $this.find('.container-activity-detail');
				$.mobile.pageLoading();
				$(".button-menu").unbind("click").bind("click", function() {
					showMenu(this);
				});
				
				$contInfo.find(".mobi-course-title").text(objGlobalResources.objGradeItemInfo.strCourseTitle);
				$contAnn.find(".mobi-activity-title").text(objGlobalResources.objGradeItemInfo.strAssignmentTitle);
				
				// If there is a letter grade, show it, otherwise hide that line.
				if (objGlobalResources.objGradeItemInfo.strLetterGrade != "") {
					$contAnn.find(".mobi-letter-grade span").text(objGlobalResources.objGradeItemInfo.strLetterGrade);
					$contAnn.find(".mobi-letter-grade").show();
				} else {
					$contAnn.find(".mobi-letter-grade").hide();
				}
				
				// If there is a numeric grade, show it, otherwise hide that line.
				if (objGlobalResources.objGradeItemInfo.strNumericGrade != "") {
					$contAnn.find(".mobi-numeric-grade span").text(objGlobalResources.objGradeItemInfo.strNumericGrade);
					$contAnn.find(".mobi-numeric-grade").show();
				} else {
					$contAnn.find(".mobi-numeric-grade").hide();
				}
				
				// If there are comments, show them, otherwise hide that section.
				if (objGlobalResources.objGradeItemInfo.strComments != "") {
					$contAnn.find(".container-message div.mobi-comments").html(objGlobalResources.objGradeItemInfo.strComments);
					$contAnn.find(".container-message .mobi-comments").show();
				} else {
					$contAnn.find(".container-message .mobi-comments").hide();
				}
				
				$contAnn.find(".mobi-date").text(objGlobalResources.objGradeItemInfo.strDate);
				
				$("#pageGradebookDetail .container-topicinfo").css("visibility", "visible");
				$("#pageGradebookDetail .container-activity-detail").css("visibility", "visible");
				$.mobile.pageLoading(true);
			});
			
			
/*
 * =======================
 * Individual Student View
 * =======================
 */		
			$("#pagePerson").live("pagebeforeshow", function(event, ui) {
				$("#pagePerson .detail-header").css("visibility", "hidden");
			})
			
			$('#pagePerson').live('pageshow', function() {
				var $this = $(this), info, 
				$contInfo = $this.find('.container-personinfo');
				$.mobile.pageLoading();
				$(".button-menu").unbind("click").bind("click", function() {
					showMenu(this);
				})
				$contInfo.find(".mobi-student-name").html(objGlobalUser.name);
				$contInfo.find(".mobi-student-role").html(objGlobalUser.role);
				$contInfo.find(".mobi-student-class").html(objGlobalCourse.title);
				$("#pagePerson .detail-header").css("visibility", "visible");
				$.mobile.pageLoading(true);
			} );
/*
 * ============
 * Profile View
 * ============
 */
			$("#pageProfile").live("pageshow", function() {
				var user, $contInfo = $(this).find('.container-topicinfo');
				$.mobile.pageLoading();
				$(".button-menu").unbind("click").bind("click", function() {
					showMenu(this);
				})
				// Highlight the correct tab
				$(".container-navbar li a").removeClass("ui-btn-active");
				$(".container-navbar #my_profile").addClass("ui-btn-active");
				$.mobyProfileManager( {
					callbackSuccess: function(user) { 
						$contInfo.html('<p class="mobi-student-name">' + user.firstName + ' ' + user.lastName + '</p>');
		  				$.mobile.pageLoading(true);
					},
					callbackError: function() {
						$.mobile.pageLoading(true);
					}
				} );
				getClassList($(this));
			} );
			
			$("body").removeClass("ui-loading");

		},
		
		
		initError: function(options){
			var settings = {
				strErrorMessage: "Unable to initialize the application.  Please log in and try again.",
				strRedirectUrl: "login.html",
				callback: function(){
				}
			};
			if (options) {
				$.extend(settings, options);
			}
			// TODO:  Better error messaging, possibly make this more robust by retrying the initializer?
			alert(settings.strErrorMessage);
			$(location).attr("href", settings.strRedirectUrl);
			
		},
		
		initLogin: function(options) {
			var settings = {
				callback: function() {
					
				}
			}
			if (options) {
				$.extend(settings, options);
			}
			
			var signInClickHandler = function() {
				if ($("#userId").val == "" || $("#password").val() == "") {
					$("#dialogError .errorMessage").html(msite.localization.index["username-password-required"]);
					$("#show-error-message").click();
					return;
				}
				
				$.mobile.pageLoading();
				clientStringManager.setClientString(cs);	// just in case the user clears their cookies after page loads
				// get only the client string part of the entire client sort string (the text before the first ".")
				var epClientString = cs.split(".", 1)[0];
				sessionManager.logIn(epClientString, $("#userId").val(), $("#password").val(), $("#rememberMe")[0].checked, signInHandler);
			};
			
			/**
				Handler for a response to authorize a user. If a user was authorized successfully, 
				redirect them to the main page. Otherwise show them an error.
				@param		{Boolean}	p_isLoggedIn	true if the user was authorized successfully, false otherwise
				@param		{String}	p_errorCode		the HTTP error code on the response
			*/
			var signInHandler = function(p_isLoggedIn, p_errorCode) { 
				if (p_isLoggedIn) {
					eraseCookie("currentPage");
					$.mobyProfileManager( {
						callbackSuccess: function() {
							$(location).attr("href", "index.html");
						}
					} );
					return;
				}
				//not logged in, what went wrong?
				switch(p_errorCode) {
					case "400":
						// if the response was a "bad request", show message that login credentials were incorrect.
						$("#dialogError div.errorMessage").html(msite.localization.index["username-password-incorrect"]);
						break;
					case "500":
						// if the response was a 500 "internal server error", show a message of the likely cause.
						$("#dialogError div.errorMessage").html(msite.localization.index["generic-server-error"]);
						break;
					default:
						// otherwise show a general message that the communication was unsuccessful.
						$("#dialogError div.errorMessage").html(msite.localization.index["generic-server-error"]);
				}
				$.mobile.pageLoading(true);
				$("#show-error-message").click();
			};
			
			/**
				When the user clicks the register button, attempt to register them
			*/
			var registerClickHandler = function() {
				if ($("#lastName").val == "" || $("#systemEmail").val() == "") {
					$("#dialogError div.errorMessage").html(msite.localization.index["lastname-email-required"]);
					$("#show-error-message").click();
					return;
				}
				$.mobile.pageLoading();
				sessionManager.register(clientStringManager.getClientString(), $("#lastName").val(), $("#systemEmail").val(), registerHandler);
			};
			
			/**
				Handler for a response to authorize a user. If a user was authorized successfully, 
				redirect them to the main page. Otherwise show them an error.
				@param		{Boolean}	p_success	true if the user was authorized successfully, false otherwise
				@param		{String}	p_errorCode		the HTTP error code on the response
			*/
			var registerHandler = function(p_success, p_errorCode)
			{
				$("#registerButton").show();
				$("#loadingImage").hide();
				if (p_success) 	{
					eraseCookie("currentPage");
					$("#emailSentTo").html($("#systemEmail").val());
					$.mobile.changePage("#dialogSuccess", "flip");
					return false;
				}
				//not logged in, what went wrong?
				switch(p_errorCode) {
					case "400":
						// if the response was a "bad request", show message that login credentials were incorrect.
						$("#dialogError div.errorMessage").html(msite.localization.index['unable-to-verify']);
						break;
					case "500":
						// if the response was a 500 "internal server error", show a message of the likely cause.
						$("#dialogError div.errorMessage").html(msite.localization.index["generic-server-error"]);
						break;
					default:
						// otherwise show a general message that the communication was unsuccessful.
						$("#dialogError div.errorMessage").html(msite.localization.index["timeout"]);
				}
				$.mobile.pageLoading(true);
				$("#show-error-message").click();
				return false;
			};
			
			// assign actions to the sign in button
			$("#signInBtn").unbind("click").bind("click", signInClickHandler);
			
			// listen for form submit events, and forward them to the sign in click handler
			$("#loginForm").unbind("submit").bind("submit", function(p_event) {
				p_event.preventDefault();
				signInClickHandler();
			});
			
			// assign actions to the register button
			$("#registerButton").unbind("click").bind("click", registerClickHandler);
			
			// listen for form submit events, and forward them to the sign in click handler
			$("#registerFormContainer").unbind("submit").bind("submit", function(p_event) {
				p_event.preventDefault();
				registerClickHandler();
			});
		
			// Check to see if there is a valid authorization grant in the url
			var accessGrant = getQueryStringValue("access_grant");
			if (accessGrant.length > 0) {
				$.mobile.pageLoading();
				var timeout = setTimeout(function() {
						sessionManager.loginWithEmailGrant(accessGrant, function(boolSuccessful, strErrorCode) {
							if(boolSuccessful) {
								$(location).attr("href", "index.html");
							} else {
								$("#dialogError div.errorMessage").html(msite.localization.index['invalid-email-access']);
								$.mobile.pageLoading(false);
								$("#show-error-message").click();
							};
						});
				}, 5000);
			};
		
			$("body").removeClass("ui-loading");
		}
	}
	
	$.fn.mobyAppInit = function(method) {
		// Method calling logic
		if ( methods[method] ) {
			return methods[ method ].apply( this, Array.prototype.slice.call( arguments, 1 ));
	    } else if ( typeof method === 'object' || ! method ) {
			return methods.initIndex.apply( this, arguments );
	    } else {
			$.error( 'Method ' +  method + ' does not exist' );
	    } 
	}
})(jQuery);


(function($){
	$.fn.extend( {
		setHintText: function(hintText) {
			var $this = $(this),
				ht = hintText; 
			$this.val(ht);
			$this.bind('focus', function() {
				if($this.val() === ht) {
					$this.val('');
				}
			} );
			$this.bind('blur', function(){
				if($this.val() === '') {
					$this.val(ht);
				}	
			} );
		},
		positionBottomOfViewport: function(options) {
			var pos = {
				sTop : function() {
					return window.pageYOffset || document.documentElement && document.documentElement.scrollTop ||	document.body.scrollTop;
				},
				wHeight : function() {
					return window.innerHeight || document.documentElement && document.documentElement.clientHeight || document.body.clientHeight;
				}
			};
		    return this.each(function(index) {
				if (index == 0) {
					var $this = $(this);
					var elHeight = $this.outerHeight();
					var elTop = pos.sTop() + (pos.wHeight()) - (elHeight);
			        $this.css({
						position: 'absolute',
						margin: '0',
						top: elTop,
						left: (($(window).width() - $this.outerWidth()) / 2) + 'px'
					});
				}
			});
		}
	} );
})(jQuery);