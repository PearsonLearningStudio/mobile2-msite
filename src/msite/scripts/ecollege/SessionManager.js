/*
 * This software is licensed under the Apache 2 license, quoted below.
 * 
 * Copyright 2010 eCollege.com
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License. You may obtain
 * a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
*/
/**
	@class
	@author		MacA
	
	@description
	<p>The SessionManager class is a singleton that manages acces tokens for other eCollege services.</p>
	
	@requires	VariableValidator.js
				AjaxManager.js
				utils.js
*/
var SessionManager = (function()
{
	/**
		The singleton instance of the SessionManager class.
		@private
	*/
	var _instance = null;
	
	/**
		The constructor function for the SessionManager instance.
		@private
	*/
	function PrivateConstructor()
	{
		/************************************
			Private Properties
		************************************/
		/**
			An object that contains a nav value pair with an encrypted set of information that provides short-term access to a service.
			@type		AjaxRequestHeader
			@private
		*/
		var _accessTokenAuthHeader = null;
		
		/**
			The date at which the last retrieved token expires on.
			@type		Date
			@default	12:00 AM, Jan 1, 1970 GMT
		*/
		var _accessTokenExpiresOn = new Date(0);
		
		/**
			Flag used to prevent multiple calls to get a token at once.
			@type		Boolean
			@default	false
		*/
		var _locked = false;
		
		/**
			A collection of callback functions to call when a new token is retrieved.
			@type		Array
			@default	[]
		*/
		var _callbacks = [];
		
		/**
			A callback function to call when a response to authorize a user with their 
			log in credentials is received.
			@type		Fucntion
			@default	null
		*/
		var _logInCallback = null;
		
		/**
			A callback function to call when a response to authorize a user with their 
			last name and email address.
			@type		Fucntion
			@default	null
		*/
		var _logInWithEmailGrantCallback = null;
		
		/**
			A callback function to call when a response to authorize a user with their 
			last name and email address.
			@type		Fucntion
			@default	null
		*/
		var _registerCallback = null;	
		
		/**
			A reference to the AjaxManager singleton.
			@private
		*/
		var _ajaxManager = AjaxManager.getInstance();
		
		/**
		    Name for storing and retrieving the access grant string from cookie store
		*/
		var _authGrantName = "access_grant";
		
		/**
		    Boolean for whether to remember the user's authorization grant for its specified lifetime
		*/
		var _rememberMe = true;
		
		var _mobyClientId = "30bb1d4f-2677-45d1-be13-339174404402";
		
		
		/************************************
			Public Properties
			Note: In order for these to be parsed by the documenter, they must be assigned a default value.
		************************************/
		
		/**
			The domain to use when making requests for access tokens
			@type		String
			@default	""
		*/
		this.serviceLocation = "";
		
		
		/************************************
			Private Methods
		************************************/
		
		
		var _initAccessTokenAuthHeader = function(p_value)
		{
		    _accessTokenAuthHeader = new AjaxRequestHeader();
		    _accessTokenAuthHeader.name = "X-Authorization";
		    _accessTokenAuthHeader.value = p_value;
		};
		
		
		var _clearAccessTokenAuthHeader = function()
		{
		    _accessTokenAuthHeader = null;
		    _accessTokenExpiresOn = new Date(0);
		};
		
		
		/**
			Handler for when the request for the token has succeeded.
			@param		{Object}	p_data				The JSON object that was returned by the server
			@param		{String}	p_transactionId		The ID of the transaction for this request
			@private
		*/
		var _getAccessTokenSuccessHandler = function(p_data, p_transactionId)
		{
		    _saveAccessTokenAuthHeader(p_data);
			_locked = false;			
			
			// call any callbacks
			for (var i = 0; i < _callbacks.length; i++)
			{
				_callbacks[i](_accessTokenAuthHeader);
			}
			_callbacks = [];
		};
				
		
		/**
			Handler for when the request for the token failed.
			@param		{String}	p_transactionId		The ID of the transaction for this request
			@param		{String}	p_errorStatus		The status message of the error
			@param		{String}	p_errorCode			The HTTP status code
			@param		{String}	p_statusText		The data returned by the server
			@private
		*/
		var _getAccessTokenErrorHandler = function(p_transactionId, p_errorStatus, p_errorCode, p_statusText)
		{
			_locked = false;
						
			// call any callbacks
			for (var i = 0; i < _callbacks.length; i++)
			{
				_callbacks[i](null, p_errorCode);
			}
			_callbacks = [];
			
		};
		
		
		/**
			Handler for when the request to authorize a user has succeeded.
			@param		{Object}	p_data				The JSON object that was returned by the server
			@param		{String}	p_transactionId		The ID of the transaction for this request
			@private
		*/
		var _logInSuccessHandler = function(p_data, p_transactionId)
		{
			if (_logInCallback != null && _logInCallback != undefined)
			{
			    _saveAccessGrant(p_data);
			    _logInCallback(true);
			    _logInCallback = null;
				
			}
		};
		
		
		/**
			Handler for when the request to authorize a user has failed.
			@param		{String}	p_transactionId		The ID of the transaction for this request
			@param		{String}	p_errorStatus		The status message of the error
			@param		{String}	p_errorCode			The HTTP status code
			@param		{String}	p_statusText		The data returned by the server
			@private
		*/
		var _logInErrorHandler = function(p_transactionId, p_errorStatus, p_errorCode, p_statusText)
		{
			if (_logInCallback != null && _logInCallback != undefined)
			{
			    _logInCallback(false, p_errorCode);
			    _logInCallback = null;
			}
		};
				
		
		/**
		    Save an authorization token information.
		    @private
		*/
		var _saveAccessTokenAuthHeader = function(p_accessToken)
		{
		    // set the expires time
			_accessTokenExpiresOn = new Date();
			// take a minute off the expires time to give us a buffer
			_accessTokenExpiresOn.setSeconds(_accessTokenExpiresOn.getSeconds() + p_accessToken.expires_in - 120);
			// set the token
            _initAccessTokenAuthHeader("Access_Token access_token=" + p_accessToken.access_token);
            

        };
        		
		
		/**
		    Save an authorization grant information to a cookie.
		    @private
		*/
		var _saveAccessGrant = function(p_AccessGrant)
		{
		    //TODO: Check to see that these cookie properties are set correctly:
		    //cookie.Secure
		    //cookie.Domain
		    //cookie.HttpOnly
		    if (p_AccessGrant == null)
		        return;
		    var expiration = null;
		    if (_rememberMe)
		        expiration = (p_AccessGrant.expires_in / 60) - 1;
		    createCookie(_authGrantName, p_AccessGrant.access_token, expiration);
		};
		
		
		/**
		    Clear an authorization grant cookie and reset class variables for authorization token/header.
		    @private
		*/
		var _clearAccessGrant = function()
		{
   			eraseCookie(_authGrantName);
   			_clearAccessTokenAuthHeader();
		};
		
		
		/**
		    Retrieve an authorization grant cookie.
		    @private
		*/
		var _getAccessGrant = function()
		{
		    return readCookie(_authGrantName);
		};
		
		
		/**
			Handler for when the request to register a user has succeeded.
			@param		{Object}	p_data				The JSON object that was returned by the server
			@param		{String}	p_transactionId		The ID of the transaction for this request
			@private
		*/
		var _registerSuccessHandler = function(p_data, p_transactionId)
		{
			if (_registerCallback != null && _registerCallback != undefined)
			{
			    _registerCallback(true);
			    _registerCallback = null;
			}
		};
		
		/**
			Handler for when the request to register a user has failed.
			@param		{String}	p_transactionId		The ID of the transaction for this request
			@param		{String}	p_errorStatus		The status message of the error
			@param		{String}	p_errorCode			The HTTP status code
			@param		{String}	p_statusText		The data returned by the server
			@private
		*/
		var _registerErrorHandler = function(p_transactionId, p_errorStatus, p_errorCode, p_statusText)
		{
			if (_registerCallback != null && _registerCallback != undefined)
			{
			    _registerCallback(false, p_errorCode);
			    _registerCallback = null;
			}
		};

		/**
			Handler for when the request to register a user has succeeded.
			@param		{Object}	p_data				The JSON object that was returned by the server
			@param		{String}	p_transactionId		The ID of the transaction for this request
			@private
		*/
		var _loginWithEmailGrantSuccessHandler = function(p_data, p_transactionId)
		{
			_saveAccessGrant(p_data);
			if (_logInWithEmailGrantCallback != null && _logInWithEmailGrantCallback != undefined)
			{
			    _logInWithEmailGrantCallback(true);
			    _logInWithEmailGrantCallback = null;
			}
		};
		
		/**
			Handler for when the request to register a user has failed.
			@param		{String}	p_transactionId		The ID of the transaction for this request
			@param		{String}	p_errorStatus		The status message of the error
			@param		{String}	p_errorCode			The HTTP status code
			@param		{String}	p_statusText		The data returned by the server
			@private
		*/
		var _loginWithEmailGrantErrorHandler = function(p_transactionId, p_errorStatus, p_errorCode, p_statusText)
		{
			if (_logInWithEmailGrantCallback != null && _logInWithEmailGrantCallback != undefined)
			{
			    _logInWithEmailGrantCallback(false, p_errorCode);
			    _logInWithEmailGrantCallback = null;
			}
		};

		/************************************
			Public Methods
		************************************/
		
		
		/**
			Retrieves the access token used to access other ecollege services. If the token isn't expired yet, 
			then just use the one that was retrieved last time, otherwise get a new one.
			@param		{Function}		p_callback		The callback function to call when the response has been received. 
														The callback will receive one parameter which is the AjaxRequestHeader 
														with the access token information, or null if authorization failed.
		*/
		this.getAuthorizationHeader = function(p_callback)
		{
			VariableValidator.require(this, p_callback, "function");
			
			if (!_locked)
			{
				var now = new Date();
				// if the access token has expired
				if (_accessTokenAuthHeader == null || _accessTokenExpiresOn.getTime() <= now.getTime())
				{
					_locked = true;
					// get new token
					var serviceUrl = this.serviceLocation + "/authorize/token";
					serviceUrl = serviceUrl + "?access_grant=" + _getAccessGrant();
					_ajaxManager.get(serviceUrl, [], _getAccessTokenSuccessHandler, _getAccessTokenErrorHandler);
					_callbacks.push(p_callback);
				}
				else
				{
					p_callback(_accessTokenAuthHeader);
				}
			}
			else
			{
				_callbacks.push(p_callback);
			}
		};
		
		
		/**
			Attempts to authenticate a user with the given client string, username, and password.
			@param		{String}		p_clientString	The client string associated to the user
			@param		{String}		p_userName		The user's user name
			@param		{String}		p_password		The user's password
			@param		{Function}		p_callback		The callback function to call when the response has been received. 
														The callback will receive up to two parameters. The first will be a boolean
														which will tell if the authorization was sucessful or not, and if it wasn't, 
														a second parameter will be passed to the callback with an HTTP error code.
		*/
		this.logIn = function(p_clientString, p_userName, p_password, p_rememberUser, p_callback)
		{
			VariableValidator.require(this, p_clientString, "string");
			VariableValidator.require(this, p_userName, "string");
			VariableValidator.require(this, p_password, "string");
			VariableValidator.require(this, p_rememberUser, "boolean");
			VariableValidator.require(this, p_callback, "function");
			_rememberMe = p_rememberUser;
			_logInCallback = p_callback;
			var postData = "clientString=" + p_clientString + "&userLogin=" + p_userName + "&password=" + p_password + "&client_id=" + _mobyClientId;
			_ajaxManager.post(this.serviceLocation + "/authorize/grant", postData, [], _logInSuccessHandler, _logInErrorHandler);
		};
		
		
		/**
			Attempts to authenticate a user with the given client string, username, and password.
			@param		{Function}		p_callback		The callback function to call when the response has been received. 
														The callback will receive up to two parameters. The first will be a boolean
														which will tell if the logout was sucessful or not, and if it wasn't, 
														a second parameter will be passed to the callback with an HTTP error code.
		*/
		this.logOut = function()
		{
			//log out
			_clearAccessGrant();
		};
		
		
		/**
			Attempts to authenticate a user with the given client string, username, and password.
			@param		{Function}		p_callback		The callback function to call when the response has been received. 
														The callback will receive up to two parameters. The first will be a boolean
														which will tell if the logout was sucessful or not, and if it wasn't, 
														a second parameter will be passed to the callback with an HTTP error code.
		*/
		this.register = function(p_clientString, p_lastName, p_email, p_callback)
		{
			VariableValidator.require(this, p_clientString, "string");
			VariableValidator.require(this, p_lastName, "string");
			VariableValidator.require(this, p_email, "string");
			VariableValidator.require(this, p_callback, "function");
			_registerCallback = p_callback;
			var postData = "clientString=" + p_clientString + "&email=" + escape(p_email) + "&lastname=" + p_lastName + "&client_id=" + _mobyClientId;
			_ajaxManager.post(this.serviceLocation + "/authorize/grant/email", postData, [], _registerSuccessHandler, _registerErrorHandler);
		};
		
		
		/**
			Attempts to authenticate a user with the given email auth grant.
			@param		{String}		p_emailGrant	The auth grant parsed from the query string on the URL emailed to the user
			@param		{Function}		p_callback		The callback function to call when the response has been received. 
														The callback will receive up to two parameters. The first will be a boolean
														which will tell if the logout was sucessful or not, and if it wasn't, 
														a second parameter will be passed to the callback with an HTTP error code.
		*/
		this.loginWithEmailGrant = function(p_emailGrant, p_callback)
		{
			VariableValidator.require(this, p_emailGrant, "string");
			VariableValidator.require(this, p_callback, "function");
			_logInWithEmailGrantCallback = p_callback
			var postData = "access_grant=" + p_emailGrant;
			_ajaxManager.post(this.serviceLocation + "/authorize/grant", postData, [], _loginWithEmailGrantSuccessHandler, _loginWithEmailGrantErrorHandler);
		};
		
		
		/**
			Checks to see if the user has an existing access grant, expired or otherwise
			@return	{Boolean}	true if the grant exists, false otherwise
		*/
		this.hasExistingAccessGrant = function()
		{
			return (_getAccessGrant() == null) ? false : true;
		};
		
	};
	
	/************************************
		Public Prototype Methods
	************************************/
	/**
		Returns information about the specific SessionManager instance.
		@name		SessionManager#toString
		@function
		@return		{String}	The class name
		
	*/
	PrivateConstructor.prototype.toString = function()
	{
		return	"[SessionManager]";
	};
	
	
	return new function()
	{
		/**
			Retrieves the instance of the SessionManager singleton.
		*/
        this.getInstance = function()
		{
            if (_instance == null)
			{
                _instance = new PrivateConstructor();
                _instance.constructor = null;
            }
            return _instance;
        };
    };
	
})();
