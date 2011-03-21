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
			$(document).bind("pagebeforeshow", function() {
				$("div.layout-header ul").hide();
				$(".layout-header .button-menu").removeClass("menu-active");
			});
			
			// Logout button
			$(".menu-logout").bind("click", function() {
				$.mobile.pageLoading();
				sessionManager.logOut();
				createCookie("access_grant", "", -1);
				$(location).attr("href", "login.html");
				return false;
			});
			
			// Initialize course cache
			// Force a refresh in case this is a new login
			$().mobyCourseManager();
			
		
			$(".layout-header .button-menu").bind("click", function() {
				$(this).siblings("ul").slideToggle(0);
				$(this).toggleClass("menu-active");
				return false;
			});
		
			// Initialize mobi-listview elements
			$(".mobi-listview li").click(function() {
				var strUrl = $(this).attr("id") + ".html";
				$.mobile.changePage(strUrl);
			});
			
			// Initialize click listener for what's due button
			$(".btn-whatsdue").click(function() {
				$("div.subnav a").removeClass("ui-btn-active");
				$(this).addClass("ui-btn-active");
				$(".view-activity").hide();
				$(".view-whatsdue").show();
				
				$(window).unbind("scroll");
			}).click(); // default view for page, set on load.
			
			// Initialize click listener for Activity button
			$(".btn-activity").click(function() {
				$(".btn-whatsdue").removeClass("ui-btn-active");
				$(this).addClass("ui-btn-active");
				$(".view-whatsdue").hide();
				$(".view-activity").show();
				
				// If this view is empty, we need to get the Activities list.
				
				if ($("#pageHome .view-activity .mobi-listview").length === 0) {
				
					$.mobile.pageLoading();
					
					// Fetch the feed and insert into DOM.
					$().mobyActivityManager("toHtml", {
						callbackSuccess: function(objReturn){
							var strFeedHtml = objReturn.strFeedHtml;
							var strHtml = "";
							
							strHtml += '<ul data-role="listview" data-inset="true" class="mobi-listview">';
							strHtml += '<li data-role="list-divider">All Activity</li>';
							strHtml += strFeedHtml;
							
							$("#pageHome .view-activity").html(strHtml);
							$("#pageHome .view-activity .mobi-listview").listview();
							$.mobile.pageLoading(true);
						}
					});
				}
		
				// Add scroll event for infinite scroll and positioning bookmark alert div
				$(window).scroll(function() {
					
					// always position the bookmark popup at the bottom of the viewport
					if ($("#pageHome .bookmark-popup:visible").length > 0){
						$("#pageHome .bookmark-popup").positionBottomOfViewport()
					}
					
					// Infinite scroll
					if (($(window).scrollTop() + 150) >= ($(document).height() - $(window).height())) {
						// Get more goodies!
						$.mobile.pageLoading();
						
						// Fetch the feed and insert into DOM.
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
							}
						});
			
					}
				})
		
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
			
			// Initialize handler for discussions tab 
			$("#pageDiscuss").bind("pageshow", function() {
				
				$.mobile.pageLoading();

				$().mobyDiscussionManager("userTopicsToHtml",  {
					callbackSuccess : function(strDiscussionHtml) {
						var strHtml = '<ul data-role="listview" data-inset="true" class="mobi-listview">';
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
									var strClass = ".course-" + arrCourses[i].id;
									if ($(strClass).length > 0) {
										strHtml += '<option value="'+arrCourses[i].id+'">' +arrCourses[i].title+ '</option>';
									}
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
										if ($items.length > 0) {
											$(".view-discussion .mobi-listview .ui-corner-top").removeClass("ui-corner-top");
											$(".view-discussion .mobi-listview li").hide();
											$items.show();
											$(".view-discussion .mobi-listview .ui-li-divider:visible:first").addClass("ui-corner-top");
										}
										
									}
								})
							}
						});
						$.mobile.pageLoading(true);
					}
				})
			})
			
			$(".container-discussion-detail .container-message div.layout-button-expand").click(function() {
				var $this = $(this);
				$this.parents(".container-message").toggleClass("container-message-open");
			})
			alert(location.hash);
		
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
					$(location).attr("href", "index.html");
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
	$.fn.positionBottomOfViewport = function(options) {
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
	};
})(jQuery);