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
		
			sessionManager.getAuthorizationHeader(function(authorizationHeader, errorCode) {
				ajaxManager.get(settings.strUrl, [authorizationHeader], function(jsonResponse, intTransactionId) {options.successHandler(jsonResponse, intTransactionId)}, function() {options.errorHandler()});
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
	
	$.fn.QueryApi = function(method) {
		// Method calling logic
		if ( methods[method] ) {
			return methods[ method ].apply( this, Array.prototype.slice.call( arguments, 1 ));
	    } else if ( typeof method === 'object' || ! method ) {
			return methods.init.apply( this, arguments );
	    } else {
			$.error( 'Method ' +  method + ' does not exist' );
	    } 
	};
})(jQuery);