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
	<p>The EventDispatcher class is a class that handles dispatching custom events.</p>
	
	@param	{Object}	p_target	The object that is hosting this instance of the EventDispatcher class.
*/
function EventDispatcher(p_target)
{
	VariableValidator.require(this, p_target, "object");
	/************************************
		Private Properties
	************************************/
	/**
		A Dictionary of listeners (a.k.a. callback functions) that will get called when
		their corresponding event type is dispatched.
		@type Object
		@private
	*/
	var _listenersFromEventType = {};
	
	/**
		The object that is composing this EventDispatcher object
		@type Object
		@private
	*/
	var _target = p_target;
	
	/************************************
		Public Methods
	************************************/
	/**
		Adds an listener function that is to be called when an custom event of a specified type gets dispatched.
		Multiple listeners can be added for each event type. When the event is dispatched, the listeners will be
		called in the order in which they were added.
		@param	{String}	p_type					The type of event to listen for
		@param	{Function}	p_listener				The function to be called when the event is dispatched. This function will receive the CustomEvent object as a parameter.
		@param	{Boolean}	p_removeOnDispatch		Flag used to determine if the event listener should be removed when the event is dispatched. This is helpful if you
													don't want to manage removing each event listener manually.
	*/
	this.addEventListener = function(p_type, p_listener, p_removeOnDispatch)
	{
		VariableValidator.require(this, p_type, "string");
		VariableValidator.require(this, p_listener, "function");
		VariableValidator.optional(this, p_removeOnDispatch, "boolean");
		
		if (_listenersFromEventType[p_type] == undefined || _listenersFromEventType[p_type] == null)
		{
			_listenersFromEventType[p_type] = [];
		}
		var removeOnDispatch = (p_removeOnDispatch != undefined && p_removeOnDispatch != null) ? p_removeOnDispatch : false;
		var listenerObj = {
			"listener":				p_listener,
			"removeOnDispatch":		removeOnDispatch
		};
		_listenersFromEventType[p_type].push(listenerObj);
		
	};
	
	/**
		Dispatches an event to the listener of that event type, if it exists.
		@param	{String}	p_event			The CustomEvent to dispatch
		@param	{Object}	p_eventData		Any additional data that is to be passed to the event listener via the CustomEvent.
	*/
	this.dispatchEvent = function(p_event, p_eventData)
	{
		VariableValidator.require(this, p_event, "CustomEvent");
		
		if(!this.hasEventListener(p_event.type))
			return;
		
		p_event.target = _target;
		if (p_eventData != undefined)
		{
			p_event.eventData = p_eventData;
		}
		
		// copy the array of listeners in case listeners are removed in the middle of dispatching
		var listenersToCall = _listenersFromEventType[p_event.type].slice(0);
		
		for(var i = 0; i < listenersToCall.length; i++)
		{
			var listener = listenersToCall[i].listener;
			if (listenersToCall[i].removeOnDispatch)
			{
				_listenersFromEventType[p_event.type].splice(i, 1);
				listenersToCall.splice(i, 1);
				i--;
			}
			listener(p_event);
        }

	};
	
	/**
		Verfies that this has an event listener assigned for a specified event type.
		@param	{String}	p_type		The type of event
		@return	Boolean		true if the listener exists for the specified event type, false otherwise
	*/
	this.hasEventListener = function(p_type)
	{
		VariableValidator.require(this, p_type, "string");
		
		return (_listenersFromEventType[p_type] != undefined && _listenersFromEventType[p_type].length > 0);
	};
	
	/**
		Removes an event listener of the specified type. If the listener is specified in the second parameter,
		then only that listener will be removed. If no second parameter is specified, then all listeners for 
		the specified event type will be removed.
		@param	{String}	p_type			The type of event
		@param	{Function}	[p_listener]	The listener to remove for the type of event
		@return	Boolean		true if the listener was removed for the specified event type, false if the listener didn't exist
	*/
	this.removeEventListener = function(p_type, p_listener)
	{
		VariableValidator.require(this, p_type, "string");
		VariableValidator.optional(this, p_listener, "function");
		
		if(!this.hasEventListener(p_type))
			return false;
		
		var foundListener = false;
		if (p_listener == undefined || p_listener == null)
		{
			_listenersFromEventType[p_type] = [];
			foundListener = true;
		}
		else
		{
			for(var i = 0; i < _listenersFromEventType[p_type].length; i++)
			{
				if(_listenersFromEventType[p_type][i].listener == p_listener)
				{
					 _listenersFromEventType[p_type].splice(i, 1);
					 foundListener = true;
					 break;
				}
			}
		}
		
		return foundListener;
	};
	
	/**
		Removes all event listeners assigned to this object.
	*/
	this.removeAllEventListeners = function()
	{
		_listenersFromEventType = {};
	};
	
	
	/**
		Prints out each listener that is currenlty stored in memory for this EventDispatcher object to the FireBug debug console.
		This will only work correctly with Firefox + Firebug.
	*/
	this.debugEventListeners = function()
	{
		if (console)
		{
			console.group("EventDispatcher living on: " + _target);
			var prop;
			for (prop in _listenersFromEventType)
			{
				if (_listenersFromEventType[prop].length > 0)
				{
					console.groupCollapsed("Event Type: " + prop);
					for (var i = 0; i < _listenersFromEventType[prop].length; i++)
					{
						console.log("Listener #" + i);
						console.dir(_listenersFromEventType[prop][i]);
					}
					console.groupEnd();
				}
			}
			
			console.groupEnd();
		}
		else
		{
			throw new Error("EventDispatcher.debugEventListeners - There is no console available to log to for your browser! Try Firefox + Firebug.");
		}
	};
}


/************************************
	Public Prototype Methods
************************************/
/**
	Returns the type of the instance.
	@name		EventDispatcher#toString
	@function
	@return		{String}	The class name.
	
*/
EventDispatcher.prototype.toString = function()
{
	return	"[EventDispatcher]";
}