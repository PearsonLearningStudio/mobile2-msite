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
	<p>The AjaxManager class is a singleton that wraps jQuery's ajax calls to provide centralized error handling, 
	automatic retrying of a request, and transaction ID's for each request.</p>
	
	<p>This class works directly with CrossDomainCommunicator.html if necessary. If this determines that the AJAX request
	is to a different domain, it will attempt to find an iFrame on the page that is hosting the CrossDomainCommunicator.html
	from that domain. If one isn't found, an error will be thrown. Otherwise, a message will be posted to that iFrame, and
	the CrossDomainCommunicator.html will handle making the AJAX request on behalf of the main window. This class will then 
	listen for messages back from the iFrame for when an AJAX request completes. The response data can be parsed out out
	of the message, and will be passed back to the success/error handler.</p>
	
	<p>In order to make setting up these cross-domain iFrames easier, it's recommended that you use the CrossDomainInitializer.js 
	for initializing any domains that you'll be making AJAX calls to.</p>
	
	@requires	VariableValidator.js
				CrossFrameMessage.js
				jquery-1.4.2.js
*/
var AjaxManager = (function()
{
	/**
		The singleton instance of the AjaxManager class.
		@private
	*/
	var _instance = null;
	
	/**
		The constructor function for the AjaxManager instance.
		@private
	*/
	function PrivateConstructor()
	{
		/************************************
			Private Properties
		************************************/
		/**
			An integer that represents a new transaction ID. When one gets used, 
			this gets incremented so that the transaction ID's are always unique.
			@type		Integer
			@default	0
			@private
		*/
		var _transactionIdCounter = 0;
		
		/**
			An object used as a dictionary to keep track of the number of tries 
			left for a specific transaction. The object maps ID's to the number 
			of tries left.
			@type	Object
			@private
		*/
		var _transactionDictionary = {};
		
		/**
			An object used as a dictionary to keep track of each iFrame that is created
			for cross domain requests. The object maps source URL's to the jQuery object
			that represents the specific iFrame DOM element.
			@type	Object
			@private
		*/
		var _iFrameDictionary = {};
		
		/**
			An object used as a dictionary to keep track of request-specific success handlers.
			@type	Object
			@private
		*/
		var _successHandlerDictionary = {};
		
		/**
			An object used as a dictionary to keep track of request-specific error handlers. 
			@type	Object
			@private
		*/
		var _errorHandlerDictionary = {};
		
		/**
			An object used as a dictionary to keep track of request-specific headers. 
			@type	Object
			@private
		*/
		var _requestHeaderDictionary = {};
		
		/**
			A private reference to this instance of the AjaxManager object.
			@type	AjaxManager
			@private
		*/
		var _ajaxManager = this;
		
		
		/************************************
			Public Properties
			Note: In order for these to be parsed by the documenter, they must be assigned a default value.
		************************************/
		/**
			The onSuccess handler contains a reference to a function that will handle a successful ajax request.
			The function associated with this property should expect to recieve two parameters when called. The first
			parameter is the data returned with the response. The second parameter is the transaction ID that was
			assigned to the request when it was made.
			
			@type		Function
			@default	null
		*/
		this.onSuccess = null;
		
		/**
			The onError handler contains a reference to a function that will handle a response from a failed ajax request.
			The function associated with this property should expect to recieve four parameters when called. The first
			parameter is the transaction ID that was assigned to the request when it was made. The second parameter is
			the status message of the error. Possible values (besides null) are:  "timeout", "error", "notmodified" and "parsererror".
			The third parameter is the HTTP status code of the request. The fourth parameter is the data returned by the server in
			string format.
			
			@type		Function
			@default	null
		*/
		this.onError = null;
		
		/**
			The number of milliseconds to wait before aborting a request that hasn't yet recieved a response.
			For performance reasons, it's recommended that this value be no less than 100;
			
			@type		Integer
			@default	10000
		*/
		this.timeout = 30000;
		
		/**
			Specifies whether an ajax request should be retried only when it times out, or any time the response
			fails (including timeouts).
			
			@type		Boolean
			@default	true
		*/
		this.retryOnTimeoutOnly = true;
		
		/**
			The number of times to attempt the ajax request if the request fails or times out.
			
			@type		Integer
			@default	3
		*/
		this.numberOfTries = 3;
		
		/**
			A collection of AjaxRequestHeaders that define any custom headers to be applied to each request.
			
			@type		Array
			@default	[]
		*/
		this.ajaxRequestHeaders = [];
		
		
		/************************************
			Private Methods
		************************************/
		/**
			Function that handles all successful responses. If the 'onSuccess'
			method exists, the data and transaction ID will be forwarded to that method.
			@param	{Object}	p_data				The response data returned by the server
			@param	{Integer}	p_transactionId		The transaction Id assigned to the original request
			@private
		*/
		var _successHandler = function(p_data, p_transactionId)
		{
			// if a request-specific error handler exists, call it
			if (_successHandlerDictionary[p_transactionId] != undefined && _successHandlerDictionary[p_transactionId] != null)
			{
				_successHandlerDictionary[p_transactionId](p_data, p_transactionId);
				delete _successHandlerDictionary[p_transactionId];
				delete _errorHandlerDictionary[p_transactionId];
			}
			else if (_ajaxManager.onSuccess != null && _ajaxManager.onSuccess != undefined)
			{
				_ajaxManager.onSuccess(p_data, p_transactionId);
			}
			// dictionary memory management
			delete _transactionDictionary[p_transactionId];
			delete _requestHeaderDictionary[p_transactionId];
		};
		
		/**
			Function that handles all failed responses and retrying of requests. If the 'onError'
			method exists, the error status and transaction ID will be forwarded to that method.
			@param	{String}	p_url				The URL that the request was made to
			@param	{String}	p_type				The type of request that was made, "GET" or "POST"
			@param	{Integer}	p_transactionId		The transaction Id assigned to the original request
			@param	{Integer}	p_numberOfTries		The number of tries to attempt the request
			@param	{String}	p_errorStatus		The error status message of the request.
			@param	{String}	p_statusCode		The HTTP status code of the request.
			@param	{String}	p_statusText		The data returned by the server.
			@private
		*/
		var _errorHandler = function(p_url, p_type, p_transactionId, p_numberOfTries, p_errorStatus, p_statusCode, p_statusText)
		{
			// reduce the number of tries for this particular request
			var numOfTriesLeft = p_numberOfTries - 1;
			// if there are no more tries left - OR - if we can only retry on timeout and this wasn't a timeout
			// then don't retry and call the onError function.
			if (numOfTriesLeft < 1  || (_ajaxManager.retryOnTimeoutOnly && p_errorStatus != 'timeout'))
			{
				// if a request-specific error handler exists, call it
				if (_errorHandlerDictionary[p_transactionId] != undefined && _errorHandlerDictionary[p_transactionId] != null)
				{
					_errorHandlerDictionary[p_transactionId](p_transactionId, p_errorStatus, p_statusCode.toString(), p_statusText);
					delete _successHandlerDictionary[p_transactionId];
					delete _errorHandlerDictionary[p_transactionId];
				}
				// if the 'onError' method exists, call it
				else if (_ajaxManager.onError != null && _ajaxManager.onError != undefined)
				{
					_ajaxManager.onError(p_transactionId, p_errorStatus, p_statusCode.toString(), p_statusText);
				}
				// remove the dictionary entry for this tranasction from memory
				delete _transactionDictionary[p_transactionId];
				delete _requestHeaderDictionary[p_transactionId];
			}
			// otherwise retry the request
			else
			{
				_makeRequest(p_url, p_type, numOfTriesLeft, p_transactionId);
			}
		};
		
		
		/**
			Function that handles making all the ajax requests. 
			@param	{String}	p_url				The URL to make the request to
			@param	{String}	p_type				The type of request to make, "GET" or "POST"
			@param	{Integer}	p_numberOfTries		The number of times to attempt the request
			@param	{Integer}	p_transactionId		The transaction Id assigned to this request
			@param	{String}	[p_data]			The post data to send along with the request
			@private
		*/
		var _makeRequest = function(p_url, p_type, p_numberOfTries, p_transactionId, p_data)
		{
			// store the number of times to attempt the request on a per transaction basis
			_transactionDictionary[p_transactionId] = p_numberOfTries;
			
			var requestProtocol = p_url.replace(/(https?):\/\/.*?\/.*/, "$1");
			var requestDomain = p_url.replace(/https?:\/\/(.*?)\/.*/, "$1");
			// if the call is made to the same domain, or is relative to the same domain
			if (requestDomain.indexOf(document.domain) > -1 || (requestProtocol != "http" && requestProtocol != "https"))
			{
				// make the ajax request
				$.ajax({
					type: p_type,
					timeout: _ajaxManager.timeout,
					url: p_url,
					data: p_data,
					beforeSend:	function(p_xmlHttpRequest)
								{
									_setCustomHeaders(p_xmlHttpRequest, p_transactionId);
								},
					success: 	function(p_data, p_textStatus, p_xmlHttpRequest)
								{
									_successHandler(p_data, p_transactionId);
								},
					error: 		function(p_xmlHttpRequest, p_textStatus, p_errorThrown)
								{
									var statusCode;
									var statusText;
									try
									{
										statusCode = p_xmlHttpRequest.status;
										statusText = p_xmlHttpRequest.responseText;
									}
									catch (e)
									{
										statusCode = "404";
										statusText = "";
									}
									_errorHandler(p_url, p_type, p_transactionId, p_numberOfTries, p_textStatus, statusCode, statusText);
								}
				});
			}
			// otherwise this is a cross domain call
			else
			{
				// create a CrossFrameMessage with properties for the iframe to use when making the ajax request
				var message = new CrossFrameMessage();
				message.messageType = CrossFrameMessage.MESSAGE_TYPE_AJAX;
				message.ajaxRequestType = p_type;
				message.ajaxRequestTimeout = _ajaxManager.timeout;
				message.ajaxRequestUrl = p_url;
				message.ajaxRequestPostData = p_data;
				message.ajaxRequestTransactionId = p_transactionId;
				message.ajaxRequestNumberOfTries = p_numberOfTries;
				
				if (_requestHeaderDictionary[p_transactionId] != undefined && 
					_requestHeaderDictionary[p_transactionId] != null && 
					_requestHeaderDictionary[p_transactionId].length > 0)
				{
					message.ajaxRequestHeaders = _requestHeaderDictionary[p_transactionId];
				}
				else if (_ajaxManager.ajaxRequestHeaders != undefined && 
						_ajaxManager.ajaxRequestHeaders != null &&
						_ajaxManager.ajaxRequestHeaders.length > 0)
				{
					message.ajaxRequestHeaders = _ajaxManager.ajaxRequestHeaders;
				}
				
				var iFrame = $("[src*='" + requestDomain + "']");
				if (iFrame.length < 1)
				{
					throw new Error("AjaxManager._makeRequest() - There is no iFrame on the page that is associated with the domain of this request: " + requestDomain);
				}
				// post a message to the iFrame that is in the same domain as the request
				iFrame.get(0).contentWindow.postMessage(JSON.stringify(message), requestProtocol + "://" + requestDomain);
			}
		};
		
		
		/**
			Applies custom headers to the XMLHTTPRequest object if there are any.
			@param		p_xhr				The XMLHTTPRequest object to add headers to
			@param		p_transactionId		The transaction Id assigned to this request
			@private
		*/
		var _setCustomHeaders = function(p_xhr, p_transactionId)
		{
			var headers = _requestHeaderDictionary[p_transactionId];
			if (headers != undefined && 
				headers != null && 
				headers.length > 0)
			{
				for (var i = 0; i < headers.length; i++)
				{
					p_xhr.setRequestHeader(headers[i].name, headers[i].value)
				}
			}
			else if (_ajaxManager.ajaxRequestHeaders != undefined && 
					_ajaxManager.ajaxRequestHeaders != null && 
					_ajaxManager.ajaxRequestHeaders.length > 0)
			{
				for (var i = 0; i < _ajaxManager.ajaxRequestHeaders.length; i++)
				{
					p_xhr.setRequestHeader(_ajaxManager.ajaxRequestHeaders[i].name, _ajaxManager.ajaxRequestHeaders[i].value)
				}
			}
		};
		
		/**
			Handles message events for when other iFrames post messages back to their parent.
			The data they send back will be information about response after it makes the ajax request.
			@param	p_event		The message event that is fired off by a different frame
			@private
		*/
		var _crossFrameMessageHandler = function(p_event)
		{
			var message;
			try
			{
				// parse the data of the message into an object
				message = JSON.parse(p_event.data);
			}
			catch (p_error)
			{
				// if the parsing into JSON object failed, then we don't care about the message
				message = {messageType: "none"};
			}
			if (message.messageType == CrossFrameMessage.MESSAGE_TYPE_AJAX)
			{
				// if the ajax request from the iframe failed
				if (message.ajaxReponseType == CrossFrameMessage.AJAX_RESPONSE_TYPE_ERROR)
				{
					_errorHandler(message.ajaxRequestUrl, 
									message.ajaxRequestType, 
									message.ajaxRequestTransactionId, 
									message.ajaxRequestNumberOfTries, 
									message.ajaxReponseStatus, 
									message.ajaxReponseCode, 
									message.ajaxReponseText);
				}
				// if the ajax request from the iframe was requested successfully
				else if (message.ajaxReponseType == CrossFrameMessage.AJAX_RESPONSE_TYPE_SUCCESS)
				{
					_successHandler(message.ajaxReponseData, message.ajaxRequestTransactionId);
				}
			}
		};
		
		/************************************
			Public Methods
		************************************/
		/**
			Makes a GET request to the specified URL and returns an ID for that transaction.
			@param	{String}	p_url				The URL to make the request to
			@param	{Array}		[p_requestHeaders]	An array of AjaxRequestHeader objects to attach to the request.
			@param	{String}	[p_successHandler]	An optional function that will get called when this specific request 
													comes back with a successful response. If specified, this function 
													will be invoked INSTEAD of the global success handler for this request.
			@param	{String}	[p_errorHandler]	An optional function that will get called when this specific request 
													comes back with a error response. If specified, this function 
													will be invoked INSTEAD of the global error handler for this request.
			@return	{Integer} 	The ID of the transaction
		*/
		this.get = function(p_url, p_requestHeaders, p_successHandler, p_errorHandler)
		{
			VariableValidator.require(this, p_url, "string");
			VariableValidator.optional(this, p_requestHeaders, "Array");
			VariableValidator.optional(this, p_successHandler, "function");
			VariableValidator.optional(this, p_errorHandler, "function");
			
			_successHandlerDictionary[_transactionIdCounter] = p_successHandler;
			_errorHandlerDictionary[_transactionIdCounter] = p_errorHandler;
			_requestHeaderDictionary[_transactionIdCounter] = p_requestHeaders;
			
			_makeRequest(p_url, 'GET', this.numberOfTries, _transactionIdCounter);
			
			return _transactionIdCounter++;
		};
		
		
		/**
			Makes a POST request to the specified URL and returns an ID for that transaction.
			@param	{String}	p_url	The URL to make the request to
			@param	{String}	p_data	The data to send to the server
			@param	{Array}		[p_requestHeaders]	An array of AjaxRequestHeader objects to attach to the request.
			@param	{String}	[p_successHandler]	An optional function that will get called when this specific request 
													comes back with a successful response. If specified, this function 
													will be invoked INSTEAD of the global success handler for this request.
			@param	{String}	[p_errorHandler]	An optional function that will get called when this specific request 
													comes back with a error response. If specified, this function 
													will be invoked INSTEAD of the global error handler for this request.
			@return	{Integer} 	The ID of the transaction
		*/
		this.post = function(p_url, p_data, p_requestHeaders, p_successHandler, p_errorHandler)
		{
			VariableValidator.require(this, p_url, "string");
			VariableValidator.require(this, p_data, "string");
			VariableValidator.optional(this, p_requestHeaders, "Array");
			VariableValidator.optional(this, p_successHandler, "function");
			VariableValidator.optional(this, p_errorHandler, "function");
			
			_successHandlerDictionary[_transactionIdCounter] = p_successHandler;
			_errorHandlerDictionary[_transactionIdCounter] = p_errorHandler;
			_requestHeaderDictionary[_transactionIdCounter] = p_requestHeaders;
			
			_makeRequest(p_url, 'POST', this.numberOfTries, _transactionIdCounter, p_data);
			
			return _transactionIdCounter++;
		};
		
		
		
		/************************************
			Initialization
		************************************/
		
		// attach message listeners to listen for new messages
		if (typeof window.addEventListener != 'undefined')
		{
			window.addEventListener('message', _crossFrameMessageHandler, false);
		}
		else if (typeof window.attachEvent != 'undefined')
		{
			window.attachEvent('onmessage', _crossFrameMessageHandler);
		}
		else
		{
			throw new Error("AjaxManager.constructor() - Oops! Your browser doesn't support event listeners.");
		}
		
		
	}	
	
	/************************************
		Public Prototype Methods
	************************************/
	/**
		Returns information about the specific AjaxManager instance.
		@name		AjaxManager#toString
		@function
		@return		{String}	The class name
		
	*/
	PrivateConstructor.prototype.toString = function()
	{
		return	"[AjaxManager]";
	}
	
	
	return new function()
	{
		/**
			Retrieves the instance of the AjaxManager singleton.
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
    }
	
})();