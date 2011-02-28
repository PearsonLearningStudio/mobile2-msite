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
	<p>The CustomEvent class is used as the base class for the creation of CustomEvent objects, which are passed as parameters to event listeners when an event occurs. </p>
*/
function CustomEvent(p_type)
{
	VariableValidator.optional(this, p_type, "string");
	/************************************
		Public Properties
		Note: In order for these to be parsed by the documenter, they must be assigned a default value.
	************************************/
	
	/**
		<p>The object that dispatched the event.</p>
		<p><strong>Note:</strong> This gets set by the EventDispatcher object. Don't set this manually and 
		don't override this in any classes that extend this one. This should be a read-only public property, but 
		unfortunately this cannot be enforced in JS.</p>
		@type String
	*/
	this.target = null;
	
	/**
		The type of this event.
		@type String
	*/
	this.type = (p_type != undefined) ? p_type : CustomEvent.CUSTOM;
	
	/**
		An object used to pass data along with the event. This gets set when a second parameter is specified
		when calling "dispatchEvent" on the EventDispatcher object.
		@type String
	*/
	this.eventData = null;
}

/**
	Defines the value of the property of a custom event object.
	@static
	@type	String
	@default	"custom"
*/
CustomEvent.CUSTOM = "custom";

/************************************
	Public Prototype Methods
************************************/
/**
	Returns the type of the instance.
	@name		CustomEvent#toString
	@function
	@return		{String}	The class name.
	
*/
CustomEvent.prototype.toString = function()
{
	return	"[CustomEvent]";
}