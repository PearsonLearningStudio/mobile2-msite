/*
 * mobyActivityManager: Plugin for managing activities.
 * 
 * Methods:
 * 	toHtml:  Get a feed and return the HTML for displaying it in the UI.  The feed will be fetched from the cache, or if the cache is empty
 *  out of date, from the service.
 *  	objFeed: an Activity Feed JSON object to use, otherwise the plugin will query the cache or the service as appropriate
 *  	intStartIndex: the starting point in the zero-indexed items array
 *  	intEndIndex: The ending point in the array; -1 for the end of array
 *  	boolForceRefresh: Force a refresh of the cached feed.
 *  	callbackSuccess:  The callback to execute upon successful generation of the HTML.
 *  	callbackError:  The callback to execute if an error occurs.
 */
 
(function($) {
	var methods = {
		init : function(options) {
			var settings = {
				callbackSuccess: function(userObj) {
					return userObj
				},
				callbackError: function() {
					alert('Unable to access user account');
				}
			};
			if ( options ) {
				$.extend( settings, options );
			}
			function getUserData() {
				var strUser;
				$().mobiQueryApi('get', {
					strUrl: configSettings.apiproxy + '/me',
					successHandler: function(jsonResponse){
		  				if (dataStorage.isSupported()) {
							strUser = JSON.stringify(jsonResponse.me);
							dataStorage.add("user", strUser);
						}
						settings.callbackSuccess(jsonResponse.me);
					}
				} );
			}
			if(dataStorage.isSupported() && dataStorage.get('user')) {
				settings.callbackSuccess(JSON.parse(dataStorage.get("user")));
			} else { 
				getUserData();
			}
		}
	}
	
	$.extend( { 
		mobyProfileManager: function(method) {
			// Method calling logic
			if ( methods[method] ) {
				return methods[ method ].apply( this, Array.prototype.slice.call( arguments, 1 ));
			} else if ( typeof method === 'object' || ! method ) {
				return methods.init.apply( this, arguments );
			} else {
				$.error( 'Method ' +  method + ' does not exist' );
			} 
		}
	} );
})(jQuery);