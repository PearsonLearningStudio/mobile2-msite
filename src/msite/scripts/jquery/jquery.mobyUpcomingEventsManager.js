(function($) {
	var methods = {
		init : function(options) {
			var settings = {
				callback: function() {}
			};
			if ( options ) {
				$.extend( settings, options );
			}
		},
		fetch : function(options) {
			var settings = {
				boolForceRefresh: false,
				intDaysOut: 14,
				strExpand: false,
				callbackSuccess: function(jsonResponse, intIndex) {
					return jsonResponse;
				},
				callbackError: function() {
					alert("Unable to get your upcoming activities. Please try again.");
				}
			};
			if (options) {
				$.extend(settings, options);
			};
			
			var getFeedFromService = function() {
				$().mobiQueryApi({
					strUrl : strEventsUrl,
					successHandler: function(jsonResponse, intIndex) {
						settings.callbackSuccess(jsonResponse);
					},
					errorHandler: function() {
						settings.callbackError();
					}
				})
			}
			
			// Build a query string
			var strEventsUrl = configSettings.apiproxy + "/me/whatshappeningfeed";
			var strQueryString = "";
			if (settings.intDaysOut) {
				var strDate = Date.today().add({days: settings.intDaysOut}).toString("M/d/yyyy");
				strQueryString = "?until=" + strDate;
			}
			if (settings.strExpand) {
				if (strQueryString != "") {
					strQueryString += "&expand=" + settings.strExpand;
				} else {
					strQueryString += "?expand=" + settings.strExpand;
				}
			}
			strEventsUrl += strQueryString;
			
			// First, is perhaps what we need stored in the cache?
			if (dataStorage.isSupported) {
				// What is currently stored? Anything?
				var intCachedDays = dataStorage.get("upcoming-days");
				if (intCachedDays === null) {
					// Nothing currently stored, so get the feed.
					getFeedFromService();
				}
				if (options.intDaysOut <= intCachedDays) {
					// We can probably get the feed from the cache.
					$().mobyCacheManager({
							boolForceRefresh: options.boolForceRefresh,
							strQueryUrl: strEventsUrl,
							strQueryType: "get",
							strCacheDate: "upcoming-timestamp",
							strCacheInfo: "upcoming",
							objCacheRefresh: {
								hours: 1
							},
							callbackSuccess : function(jsonResponse, intTransactionId) {
								options.callbackSuccess(jsonResponse, intTransactionId);
							},
							callbackError: function() {
								options.callbackError();
							}						
					});
					
					// Update the local storage information with the new storage info.
					dataStorage.set("upcoming-days", options.intDaysOut);
				}
				
			} else {
				// localStorage not supported, so we have to get what we need from the service.
				getFeedFromService();
			}
		}
	}

	$.fn.mobyUpcomingEventsManager = function(method) {
		// Method calling logic
		if ( methods[method] ) {
			return methods[ method ].apply( this, Array.prototype.slice.call( arguments, 1 ));
	    } else if ( typeof method === 'object' || ! method ) {
			return methods.init.apply( this, arguments );
	    } else {
			$.error( 'Method ' +  method + ' does not exist' );
	    } 
	}
})(jQuery);