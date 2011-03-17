/*
 * mobyConnect:  Plugin wrapper for the eCollege authentication manager and cross-domain AJAX system
 * 
 * Methods:
 * 	init:  initialize a cross domain communication pathway and the session manager.  This is the default method of the plugin.
 * 		crossDomainReadyhandler:  The callback to execute when the cross domain communication pathway has been successfully initialized.
 * 		crossDomainErrorHandler:  The callback to execute if the cross domain communication pathway cannot be initialized.
 * 	checkAuth:  Check if an existing authorization grant exists for the client.
 * 		redirectUrl:  The url to redirect to if the client does not have a valid authorization grant.
 * 		
 * Global variables for connection manager:
 * crossDomainIntializer: the instance of the CrossDomainInitializer class
 * sessionManager: the instance of the SessionManager class
 * clientStringManager: the instance of the ClientStringManager class
 * cs: the client string
 * userId: the current authenticated user's ID
 */

var crossDomainInitializer;
var sessionManager;
var clientStringManager;
var cs;
var userId;

(function($) {

	var methods = {
		init : function(options) {
			// Initialize the cross domain communicator and session manager.
			var settings = {
				crossDomainReadyHandler : function() {},
				crossDomainErrorHandler : function() {}
			};
			if ( options ) {
				$.extend( settings, options );
			}
			crossDomainInitializer = CrossDomainInitializer.getInstance();
		
			sessionManager = SessionManager.getInstance();
			sessionManager.serviceLocation = configSettings[SERVICE_DOMAIN_PROXY];
			
			clientStringManager = ClientStringManager.getInstance();
			cs = getQueryStringValue("cs");
			if (cs == null || cs == undefined || cs == "") {
			    cs = configSettings.clientstring;
			}
			
			if (cs == null || cs == undefined || cs == "") {
				$("#dialogError div.errorMessage").html(msite.localization.msiteConnect["page-not-found"]);
				$("#show-error-message").click();
			} else {
				crossDomainInitializer.originUrl = window.location.protocol + "//" + document.domain;
				crossDomainInitializer.eventDispatcher.addEventListener(DomainStatusEvent.DOMAIN_READY, settings.crossDomainReadyHandler, true);
				crossDomainInitializer.eventDispatcher.addEventListener(DomainStatusEvent.DOMAIN_ERROR, settings.crossDomainErrorHandler, true);
				crossDomainInitializer.initializeDomain("crossDomainCommunicationFrame", configSettings[SERVICE_DOMAIN_PROXY]);
			}

		},
		checkAuth : function(options) {
			// checkAuth checks for an existing authorization cookie.
			// This method does not require that the init method be called first, 
			// because it is just checking a cookie.
			var settings = {
				redirectUrl : "login.html"
			}
			if (options) {
				$.extend(settings, options);
			}
			var accessCookie = readCookie("access_grant");
			if (accessCookie === null) {
				$(location).attr("href", settings.redirectUrl);
			}
			if (accessCookie.length < 5 ) {
				$(location).attr("href", settings.redirectUrl);
			}
		}
	}
	
	$.fn.mobyConnect = function(method) {
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