/*
 * mobyCacheData: Plugin for caching information locally in localStorage, retrieving the cached information,
 * and refreshing the cache.
 * Browsers that do not have localStorage capabilities will be required to fetch data live.
 * 
 * Options:
 * 	boolForceRefresh: force a refresh of the cache (boolean)
 * 	strQueryUrl: the URL of the service
 * 	strQueryType: the type of the query ("get" or "post");
 * 	strQueryData: post data to pass to service
 * 	strCacheDate: the name of the timestamp of the cache in localStorage
 * 	strCacheInfo: the name of the cached info in localStorge
 * 	objCacheRefresh: How often to refresh the cache, using date.js-type object
 * 	callbackSuccess:  The callback to execute when information is ready. Receives the json object and transaction ID.
 * 	callbackError: the callback to execute if anything goes wrong
 * 
 * Calling the plugin without any arguments will fetch the courses information for the current users.
 */

(function($) {
	var methods = {
		init : function(options) {
			var settings = {
				boolForceRefresh: false,
				strQueryUrl: configSettings.apiproxy + "/me/courses",
				strQueryType: "get",
				strQueryData: "",
				strCacheDate: "classes-timestamp",
				strCacheInfo: "classes",
				objCacheRefresh: {
					days: 5
				},
				callbackSuccess : function(jsonResponse, intTransactionId) {
					return jsonResponse;
				},
				callbackError: function() {
					alert('Error getting information from server. Please retry.');
				}
			};
			if ( options ) {
				$.extend( settings, options );
			}
			
			if (dataStorage.isSupported()) {
				var strCacheDate = dataStorage.get(settings.strCacheDate);
				var strCache = dataStorage.get(settings.strCacheInfo);
				var dateToday = new Date();
				var dateCache = new Date(strCacheDate);
				dateCache.add(settings.objCacheRefresh);
				
				// Do we need to refresh the cache?
				var boolRefresh = false;
				if ((strCacheDate == null) || (strCache == null)) {
					boolRefresh = true;
				} else {
					if (strCache.length < 1) {
						boolRefresh = true;
					}
					if(dateCache < dateToday) {
						boolRefresh = true;
					}
				}
				
				if (boolRefresh || settings.boolForceRefresh) {
					$().mobiQueryApi(settings.strQueryType, {
						strUrl: settings.strQueryUrl,
						strData: settings.strQueryData,
						successHandler: function(jsonResponse, intTransactionId){
							// TODO: Validate that the info has been stored correctly, watch out for 5Mb limit
							dataStorage.add(settings.strCacheInfo, JSON.stringify(jsonResponse));
							dataStorage.add(settings.strCacheDate, dateToday);
							settings.callbackSuccess(jsonResponse, intTransactionId);
						},
						errorHandler: function(){
							// TODO: Better error handling (passing error codes?)
							settings.callbackError();
						}
					});
					
				} else {
					// Cache is ok, so let's use that
					settings.callbackSuccess(JSON.parse(strCache), -1);
				}
			} else {
				// This browser does not support localStorage, so we need to hit the service
				$().mobiQueryApi(settings.strQueryType, {
					strUrl: settings.strQueryUrl,
					successHandler: function(jsonResponse, intTransactionId){
						settings.callbackSuccess(jsonResponse, intTransactionId);
					},
					errorHandler: function(){
						settings.callbackError();
					}
				});
			}

		}
	}
	
	$.fn.mobyCacheData = function(method) {
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