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
boolClicked = true;
(function($) {
	var methods = {
		initIndex : function(options) {
			var settings = {
					callback: function() {}
				};
			if ( options ) {
				$.extend( settings, options );
			}
			
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
				$(location).attr("href", "login.html");
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
			$(".btn-whatsdue").live('click', function() {
				$("div.subnav a").removeClass("ui-btn-active");
				$(this).addClass("ui-btn-active");
				$(".view-activity").hide();
				$(".view-whatsdue").show();
				$(window).unbind("scroll");
			}).click(); // default view for page, set on load.
			
			// Helper function to show the menu, which must be bound in every page upon every show no matter what,
			function showMenu(ptrButton) {
				$this = $(ptrButton);
				$this.siblings("ul").slideToggle(0);
				$this.toggleClass("menu-active");
				return false;
			}
			
			// bind the menu button click listener for this page
			$(".button-menu").bind("click", function() {
				showMenu(this);
			})
			
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
						$.mobile.pageLoading(true);
					}
				});
			}
			
			$('.btn-refresh').live('click', function() { 
				// Fetch the feed and insert into DOM.
				// force refresh
				getActivities( { refresh: true } );
			} );
			
			var activityButtonClickHandler = function(boolForceRefresh) {
				$(".btn-whatsdue").removeClass("ui-btn-active");
				$(".view-whatsdue").hide();
				$(".view-activity").show();
				
				// Are there already items on display?
				if ($(".view-activity li").length < 24) {
					$.mobile.pageLoading();
					// Fetch the feed and insert into DOM.
					getActivities({refresh: boolForceRefresh});
					//when a user taps on an activity
					$(".listitem-activity").live('click',  function(e){
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
				
				
				
				// Add scroll event for infinite scroll and positioning bookmark alert div
				$(window).unbind("scroll").scroll(function() {
					// always position the bookmark popup at the bottom of the viewport
					if ($("#pageHome .bookmark-popup:visible").length > 0){
						$("#pageHome .bookmark-popup").positionBottomOfViewport()
					}
					
					// Infinite scroll
					if (($(window).scrollTop() + 150) >= ($(document).height() - $(window).height())) {
						// Get more things
						if (configSettings.boolScrollUpdate) {
							return;
						}
						configSettings.boolScrollUpdate = true;
						$.mobile.pageLoading();
						
						// Fetch the feed and insert into DOM.
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
										$(window).unbind("scroll");
									}
									configSettings.boolScrollUpdate = false;
								}
							});
							
						}
						// We have to do this on a brief delay for older iphones, otherwise events happen crazy out of order.
						var otherDelay = setTimeout(function(){
							doIt()
						}, 500);
			
					}
				})
		
				// Now that we've bound a scroll event listener to the window, we need to unbind it if we change pages, because
				// other pages do not need it.
				$("#pageHome").die("pagebeforehide").live("pagebeforehide", function() {
					$(window).unbind("scroll");
				})


			}
			
			// Initialize click listener for Activity button
			$(".btn-activity").die("click").live('click', function() {
				$(this).addClass("ui-btn-active");
				activityButtonClickHandler(false);
			});
			
		
		
			// Check to see if we need to display a bookmark popup
			var boolShow = false;
			if (dataStorage.isSupported()) {
				var strPopupShownDate = dataStorage.get("popup-shown-date");
				
				// Show the popup if we've never shown it before, or if we haven't shown it in the last 5 days.
				if (strPopupShownDate == null) {
					boolShow = true;
				}
				else {
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
				strHtml += "<p>To add this app to your bookmarks, do whatever it is you need to do to do that.</p>"
				if (strDevice === "ios") {
					strHtml = '<h3>You are on an iOS device</h3><p>To add this app to your home screen, ';
					strHtml += 'tap the bookmark icon in the toolbar below and follow the prompts.</p>';
				} else if (strDevice === "android") {
					strHtml = "<h3>You are on an Android device</h3><p>To add this app to your home screen, ";
					strHtml += "add it as a bookmark and follow the prompts.</p>";
				}
				$("#pageHome .bookmark-popup").html(strHtml).width(intWidth).positionBottomOfViewport().show().click(function(){
					$(this).hide();
					if (dataStorage.isSupported()) {
						dataStorage.add("popup-shown-date", Date.today());
					}
				});
				
				// Need to move it in case of orientation change
				$(document).bind("orientationchange", function() {
					$("#pageHome .bookmark-popup").positionBottomOfViewport();
				})
			}
			
			
			// Every time we show the home page, we need to show the activities.
			$(".btn-activity").addClass("ui-btn-active");
			activityButtonClickHandler(true);
			$("#pageHome").die("pageshow").live("pageshow", function() {
				$(".btn-activity").click();
				// Highlight the correct tab
				$(".container-navbar li a").removeClass("ui-btn-active");
				$(".container-navbar #home").addClass("ui-btn-active");
				$(".button-menu").unbind("click").bind("click", function() {
					showMenu(this);
				})
			})
			
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
								var strHtml = '<select name="select-filter-discussions" id="select-filter-discussions">';
								strHtml += '<option value="all">All</option>';
									
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
								})
							}
						});
						
						$(".listitem-topic").click(function() {
							// The user has tapped a topic to drill down.
							// Store the topic information in the global topics array.
							var strCurrentTopic = $(this).attr("id").split("_")[1];
							arrGlobalTopics.push(strCurrentTopic);
						})
						
						
						$.mobile.pageLoading(true);
					}
				})
			});
			
			//Page show event for an activity feed detail page
			$("#pageActivityDetail").live("pageshow", function(event, ui){
				var $thisView = $(this), url, details = '', comments,
					$contMessage = $thisView.find('.container-message'),
					//activityType = arrGlobalActivity[0].split('_')[0],
					//courseId = arrGlobalActivity[0].split('_')[1],
					refId = arrGlobalActivity[0].split('_')[2],
					activity = objGlobalResources[refId],
					activityType = activity.object.objectType;
					
					//console.log(objGlobalResources[referenceId]);
				// We are showing the activity tab.
				// First, show the loading spinner
				$.mobile.pageLoading();
				$(".button-menu").unbind("click").bind("click", function() {
					showMenu(this);
				})
				
				$contMessage.addClass(activityType);
				$contMessage.html("");
				
				//initial data passed via objGlobalResources
				$thisView.find(".mobi-course-title").html(activity.courseTitle);
				//$thisView.find(".mobi-activity-type").html(activity.object.objectType.replace('-', ' '));
				$thisView.find(".mobi-activity-type").html(activity.target.title);
				//get the details
				if(activityType === 'grade') {
					url = '/me/courses/' + activity.target.courseId + '/gradebookItems/' + activity.target.referenceId +'/grade';
				} else if(activityType === 'dropbox-submission') {
					url = '/courses/' + activity.object.courseId + '/dropboxBaskets/' + activity.target.referenceId + '/messages/' + activity.object.referenceId; 
				}
				$().mobiQueryApi("get", { 
					strUrl: configSettings.apiproxy + url,
					successHandler: function(jsonResponse, intTransactionId) {
						//console.log(jsonResponse, intTransactionId);
						details += ' <div class="activity-info-header">';
						if(activityType === 'grade') { 
							details += '<p class="mobi-activity-title">Grade: ' + activity.grade + '</p>';
							details += '<p class="mobi-activity-comments">Comments: '+ jsonResponse.grade.comments + '</p>';
						} else if(activityType === 'dropbox-submission') {
							details += '<p class="mobi-activity-title">' + activity.object.objectType.replace('-', ' ') + '</p>';
							details += '<p class="mobi-activity-author">Posted by: ' + jsonResponse.messages[0].author.firstName + ' ' +jsonResponse.messages[0].author.lastName + '</p>';
							details += '<p class="mobi-activity-comments">Comments: '+ jsonResponse.messages[0].comments + '</p>';
						}
						details += '<p class="mobi-date">' + activity.time + '</p>';
						details += '</div>';
						details += '<div class="activity-detail-links"><p><a id="btn-viewall-activity" class="detail-link ui-link" data-transition="slide" data-direction="reverse" data-role="button" href="/activitiesviewall.html">View All Course ' + activity.object.objectType.replace('-', ' ') + 's</a></p></div>';	
						$contMessage.html(details);	
						$.mobile.pageLoading(true);
					},
					errorHandler: function() {
						//alert("Unable to fetch the topic's responses. Please try again.");
					}
				});   
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
					$responseInputBody = $thisView.find(".textarea-response-body");
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
										}
									});
								},
								errorHandler: function() {
									alert('Unable to fetch response information for topic.');
									
									$.mobile.pageLoading(true);
								}
							});
						} else {
							$theseThreads.html("<h4>No responses.</h4>");
							//insert the discussion reply input and add event handling
							discussionReply( $thisView, strTitle, 'topics', userTopicId  );
							$.mobile.pageLoading(true);
						}
						
					},
					errorHandler: function() {
						alert("Unable to fetch the topic's responses. Please try again.");
						
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
						// Next, empty out the detail info
						$(".header-disucssion-detail .mobi-title, .container-topicinfo .mobi-title, .container-topicinfo .mobi-author, .container-topicinfo .mobi-total-responses, .container-topicinfo .mobi-unread-responses, .container-message").html("");
						
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
						$thisView.find(".container-discussion-detail .container-topicinfo .mobi-title").text(objThread.strTitle);
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
						
						$(arrCourses).each(function(i) { 
							courses +='<li class="course">';
							courses +='<a id="' + i + '"  href="/course.html" class="listitem-course">';
							courses +='<span class="mobi-title">' + this.title + '</span>';
							courses +='<span class="mobi-your-course">' + this.number + '</span>';
							courses +='</a>';
							courses +='</li>';
						} ); 
						$classesList.html(courses);
						$classesList.listview('refresh');
						$classesList.find('.listitem-course').click(function(e) {
							//add the current course data into the arrGlobalCourse array for #pageCourseDetail
							varGlobalCourse = arrCourses[this.id];
							if($this[0].id === 'pageProfile') {
								return false;
							}
						} );
						$.mobile.pageLoading(true);
					},
					callbackError: function(){
						alert('No courses found');
						$.mobile.pageLoading(true);
					}
				} );
			}
			
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
				$().mobiQueryApi('get', {
					strUrl: configSettings.apiproxy + '/courses/' + varGlobalCourse.id + '/instructors',
					successHandler: function(jsonResponse){
						instructor = jsonResponse.instructors[0];
						info = '<p class="mobi-course-title">' + varGlobalCourse.number + '</p>';
						info += '<p class="mobi-activity-type">' + varGlobalCourse.title + '</p>';
						if(instructor) {
		  					info += '<p class="mobi-instructor-name">' + instructor.firstName + ' ' + instructor.lastName + '</p>';
	  					}
		  				$contInfo.html(info);
					},
					errorHandler: function(){
						$.mobile.pageLoading(true);
					}
				} ); 
				$().mobiQueryApi('get', { 
					strUrl: configSettings.apiproxy + '/courses/' + varGlobalCourse.id + '/announcements',
					successHandler: function(jsonResponse){
						announcement = jsonResponse.announcements[0];
						if(announcement) {							
							info = '<h5 class="announcement-subject">' + announcement.subject + '</h5>';
							info += '<p class="announcement-message">' + announcement.text + '</p>';
							$contAnn.html(info);
						}
						$.mobile.pageLoading(true);
					},
					errorHandler: function(){
						$.mobile.pageLoading(true);
					}
				} );
				
				//remove the current course from the global var when clicking on the back button
				$("#pageCourseDetail #back-classes").unbind(".myclick").bind("click.myclick", function() {
					$.mobile.pageLoading();
					varGlobalCourse = '';
				} );
			} ) ;
			
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
					return;
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
				
			};
			
			// assign actions to the sign in button
			$("#signInBtn").bind("click", signInClickHandler);
			
			// listen for form submit events, and forward them to the sign in click handler
			$("#loginForm").bind("submit", function(p_event) {
				p_event.preventDefault();
				signInClickHandler();
			});
			
			// assign actions to the register button
			$("#registerButton").bind("click", registerClickHandler);
			
			// listen for form submit events, and forward them to the sign in click handler
			$("#registerFormContainer").bind("submit", function(p_event) {
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