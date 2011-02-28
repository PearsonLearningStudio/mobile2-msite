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
	<p>The CrossDomainInitializer class is a singleton that provides functionality for posting messages
	between iFrames that live in different domains. An iFrame that exists on the page can be initialized
	to communicate with another domain. The EventDispatcher object can be used to register DomainStatusEvent
	listeners which will be dispatched when either the domain loads successfully or fails to load. The ID
	of the iFrame associated with the event will be on the event object in the "eventData" property.</p>
	
	@requires	VariableValidator.js
				CrossFrameMessage.js
				EventDispatcher.js
				DomainStatusEvent.js
				CustomEvent.js
*/
var CrossDomainInitializer = (function()
{
	/**
		The singleton instance of the CrossDomainInitializer class.
		@private
	*/
	var _instance = null;
	
	/**
		The constructor function for the CrossDomainInitializer instance.
		@private
	*/
	function PrivateConstructor()
	{
		/************************************
			Private Properties
		************************************/
		
		/**
			An object used as a dictionary that maps a domain to a boolean value which flags whether or not
			a domain has loaded successfully or not.
			@type	Object
			@default	{}
			@private
		*/
		var _initializedFlagsFromDomains = {};
		
		/**
			An object used as a dictionary that maps a domain to the ID of the iFrame the domain is loaded in.
			@type	Object
			@default	{}
			@private
		*/
		var _iframeIdsFromDomains = {};
		
		/************************************
			Public Properties
			Note: In order for these to be parsed by the documenter, they must be assigned a default value.
		************************************/
		
		/**
			The URL that all cross domain communication will be originating from. Ex. "http://mydomain.ecollege.com"
			
			@type		String
			@default	""
		*/
		this.originUrl = "";
		
		/**
			The number of milliseconds to wait before a domain being initialized is considered unresponsive and dead.
			
			@type		Integer
			@default	10000
		*/
		this.timeout = 20000;
		
		/*
			The EventDispatcher used to listen for and dispatch events.
			
			@type	EventDispatcher
			@default	A new instance of EventDispatcher
		*/
        this.eventDispatcher = new EventDispatcher(this);

		/************************************
			Private Methods
		************************************/
		/**
			Handler used when receiving of new messages from other iframes. This handler specifically
			looks for a "loaded" message and if it receives one, it counts another iFrame as loaded.
			
			@param		{Event}		p_event		The message event that was received
			@private
		*/
		var _crossFrameMessageHandler = function(p_event)
		{
			// verify that the message came from a domain that was set to be initialized
			// since we only expect messages from those domains
			if (_iframeIdsFromDomains[p_event.origin] != undefined)
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
				
				if (message.messageType == CrossFrameMessage.MESSAGE_TYPE_LOADED)
				{
					// create a new CrossFrameMessage to send to each of the iFrames to register a domain origin
					// for which all requests should come from. Any messages from other domains will be ignored by the iFrames.
					var newMessage = new CrossFrameMessage();
					newMessage.messageType = CrossFrameMessage.MESSAGE_TYPE_REGISTER_DOMAIN;
					newMessage.domainOrigin = _instance.originUrl;
					// send the register domain message back to the window that we received the "loaded" message from
					p_event.source.postMessage(JSON.stringify(newMessage), p_event.origin);
				}
				else if (message.messageType == CrossFrameMessage.MESSAGE_TYPE_READY)
				{
					// set the initialized flag for this domain to true
					_initializedFlagsFromDomains[p_event.origin] = true;
					// dispatch a domain ready event
					_instance.eventDispatcher.dispatchEvent(new DomainStatusEvent(DomainStatusEvent.DOMAIN_READY), _iframeIdsFromDomains[p_event.origin]);
				}
			}
			else
			{
				if (console) console.warn("A message was received from either a domain that timed out or an invalid domain: " + p_event.origin);
			}
		};
		
		
		/**
			Handler used to check if a domain has loaded within the time defined by the timeout.
			@param		{String}	p_domainUrl		The URL of the domain that was to be loaded.	
			@private
		*/
		var _checkDomainForTimeout = function(p_domainUrl)
		{
			// if the domain hasn't been loaded, assume it's never going to
			if (!_initializedFlagsFromDomains[p_domainUrl])
			{
				// dispatch a domain error event
				_instance.eventDispatcher.dispatchEvent(new DomainStatusEvent(DomainStatusEvent.DOMAIN_ERROR), _iframeIdsFromDomains[p_domainUrl]);
				delete _iframeIdsFromDomains[p_domainUrl];
				if (console) console.debug("the following domain timed out: " + p_domainUrl);
			}
			
		};
		
		
		/************************************
			Public Methods
		************************************/
		/**
			Takes an existing iFrame on the page, and assigns the source to point to the "CrossDomainCommunicator" file 
			that lives on the specified domain. Once the domain is initialized and ready to be communicated with, the 
			EventDispatcher will dispatch a DomainStatusEvent of type "domainReady". If it was determined that the domain
			failed to load, the EventDispatcher will dispatch a DomainStatusEvent of type "domainError". The iFrame ID will
			be sent along with the event in the eventData property of the DomainStatusEvent object.
			
			@param	{String}	p_iframeId					The ID of the iFrame element that will be hosting the cross domain communicator file.
			@param	{String}	p_domainUrl					A URL to the domain that needs to be initialized for cross domain communication. Ex. "http://mydomain.ecollege.com"
		*/
		this.initializeDomain = function(p_iframeId, p_domainUrl)
		{
			// parameter validation
			VariableValidator.optional(this, p_iframeId, "string");
			VariableValidator.require(this, p_domainUrl, "string");
			
			if (p_domainUrl == "" || p_domainUrl == "*" || p_domainUrl.indexOf(".") < 0)
			{
				throw new Error("CrossDomainInitializer.initializeDomain() - '" + p_domainUrl + "' is not a valid domain URL.");
			}
			
			// other variable validation
			if (this.originUrl == null || this.originUrl == undefined || this.originUrl == "")
			{
				throw new Error("CrossDomainInitializer.initializeDomain() - Please set the originUrl property before initializing a domain.");
			}
			
			// set the initialized flag for this domain to false
			_initializedFlagsFromDomains[p_domainUrl] = false;
			
			_iframeIdsFromDomains[p_domainUrl] = p_iframeId;
			
			document.getElementById(p_iframeId).src = p_domainUrl + "/CrossDomainCommunicator.aspx";
			
			// check to make sure the domain loaded successfully after the timeout time has been reached
			setTimeout(function(){_checkDomainForTimeout(p_domainUrl)}, this.timeout);
		};
		
		/************************************
			Constructor Initialization
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
			throw new Error("CrossDomainInitializer.constructor() - Oops! Your browser doesn't support event listeners.");
		}
	}
	
	/************************************
		Public Prototype Methods
	************************************/
	/**
		Returns information about the specific CrossDomainInitializer instance.
		@name		CrossDomainInitializer#toString
		@function
		@return		{String}	The class name
		
	*/
	PrivateConstructor.prototype.toString = function()
	{
		return	"[CrossDomainInitializer]";
	}
	
	
	return new function()
	{
		/**
			Retrieves the instance of the CrossDomainInitializer singleton.
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