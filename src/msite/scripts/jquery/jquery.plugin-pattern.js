(function($) {
	var methods = {
		init : function(options) {
			var settings = {
				callback: function() {}
			};
			if ( options ) {
				$.extend( settings, options );
			}

		}
	}
	
	$.fn.pluginName = function(method) {
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