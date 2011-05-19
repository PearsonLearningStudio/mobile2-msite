/*
 * mobyUserTrackingManager: Plugin for managing user tracking in the application.
 * 
 * Methods:
 * 	start:  Send a ping to the tracking service for a given course and item.  Once tracking is started
 *   the course number is stored in a global variable so that a subsequent call to the stop method
 *   will automatically stop the tracking.  This is the default method.
 *      courseId: The ID of the course
 *      itemId: The ID of the item
 *  stop: Send an endPing to the tracking service.  By default this method will use the course ID
 *    stored in the global variable by the previously-called start method, but that can be overridden.
 *      courseId:  The course ID to use when sending the endPing.
 */

(function($) {
	var methods = {
		start : function(options) {
			var settings = {
				courseId: "",
				itemId: "",
				callbackSuccess: function() {
					return;
				},
				callbackError: function() {
					return;
				}
			};
			if ( options ) {
				$.extend( settings, options );
			}
			
			// If we start tracking and there's already a tracking in place,
			// we need to cancel it.
			if (strGlobalTracking) {
				$().mobyUserTrackingManager("stop");
			}
			
			// Call the tracking API
			$().mobiQueryApi("post", {
				strUrl : configSettings.apiproxy + "/me/courses/" + settings.courseId + "/items/"+options.itemId+"/activity/ping",
				successHandler : function(jsonResponse, intTransactionId) {
					// Set the global variable to the new course we are now tracking, 
					// so that we can cancel it later
					strGlobalTracking = options.courseId;
				},
				errorHandler : function() {
					return;
				}
			})
			

		},
		
		stop : function(options) {
			var settings = {
				courseId: strGlobalTracking,
				callbackSuccess: function() {
					return;
				},
				callbackError: function() {
					return;
				}
			};
			if ( options ) {
				$.extend( settings, options );
			}
			
			// Call the end tracking API
			if (settings.courseId) {
				$().mobiQueryApi("post", {
					strUrl : configSettings.apiproxy + "/me/courses/" + settings.courseId + "/activity/endPing",
					successHandler : function(jsonResponse, intTransactionId) {
						// Clear the global variable so we know we're not tracking anything anymore.
						strGlobalTracking = false;
					},
					errorHandler : function() {
						strGlobalTracking = false;
					}
				})
			}

		}
	}
	
	$.fn.mobyUserTrackingManager = function(method) {
		// Method calling logic
		if ( methods[method] ) {
			return methods[ method ].apply( this, Array.prototype.slice.call( arguments, 1 ));
	    } else if ( typeof method === 'object' || ! method ) {
			return methods.start.apply( this, arguments );
	    } else {
			$.error( 'Method ' +  method + ' does not exist' );
	    } 
	}
})(jQuery);