/*
 * mobyQueryApi:  Plugin for using the cross-domain AJAX libraries supplied by eCollege.
 * 
 * Methods:
 * 	get:  Execute a cross-domain http GET request.  This is the default method of the plugin.
 * 		strUrl:  The url to query
 * 		successHandler:  The callback to execute upon successful return of information from the service
 * 		errorHandler:  The callback to execute if an error occurs.
 * 
 * 	post:  Execute a cross-domain http POST.
 * 		strUrl:  The url to post to
 * 		strData:  The data to pass along to the service
 * 		successHandler:  The callback to execute upon the successful return of information from the service
 * 		errorHandler:  The callback to execute if an error occurs.
 */

(function($) {
	var methods = {
		get : function(options) {
			var settings = {
				strUrl : "",
				successHandler : function() {},
				errorHandler : function() {}
			}
			if (options) {
				$.extend(settings, options);
			}
			
			// Do a cross-domain ajax GET to the specified URL
			ajaxManager = AjaxManager.getInstance();
			//alert('he')
		
			sessionManager.getAuthorizationHeader(function(authorizationHeader, errorCode) {
				ajaxManager.get(settings.strUrl, 
							    [authorizationHeader], 
								function(jsonResponse, intTransactionId) {
									options.successHandler(jsonResponse, intTransactionId)
									
								}, 
								function() {
									options.errorHandler()
								});
			});
		},
		
		post : function(options) {
			var settings = {
				strUrl : "",
				strData: "",
				successHandler : function() {},
				errorHandler : function() {}
			}
			if (options) {
				$.extend(settings, options);
			}
			
			// Do a cross-domain ajax GET to the specified URL
			ajaxManager = AjaxManager.getInstance();
		
			sessionManager.getAuthorizationHeader(function(authorizationHeader, errorCode) {
				ajaxManager.post(settings.strUrl, 
								 settings.strData, 
								 [authorizationHeader], 
								 function() {
								 	options.successHandler();
								 }, 
								 function() {
								 	options.errorHandler();
								 });
			});
		}
	};
	
	$.fn.mobiQueryApi = function(method) {
		// Method calling logic
		if ( methods[method] ) {
			return methods[ method ].apply( this, Array.prototype.slice.call( arguments, 1 ));
	    } else if ( typeof method === 'object' || ! method ) {
			return methods.get.apply( this, arguments );
	    } else {
			$.error( 'Method ' +  method + ' does not exist' );
	    } 
	};
})(jQuery);