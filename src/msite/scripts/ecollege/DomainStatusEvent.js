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
	<p>The DomainStatusEvent class is used as the base class for the creation of CustomEvent objects, which are passed as parameters to event listeners when an event occurs. </p>
*/
function DomainStatusEvent(p_type)
{
	
	/************************************
		Public Properties
		Note: In order for these to be parsed by the documenter, they must be assigned a default value.
	**************************
	
	/**
		The type of this event.
		@type String
	*/
	this.type = (p_type != undefined) ? p_type : CustomEvent.CUSTOM;
}


/**
	Defines the value of the property of a domain ready event object.
	@static
	@type	String
	@default	"domainReady"
*/
DomainStatusEvent.DOMAIN_READY = "domainReady";

/**
	Defines the value of the property of a domain error event object.
	@static
	@type	String
	@default	"domainError"
*/
DomainStatusEvent.DOMAIN_ERROR = "domainError";


/************************************
	Inheritance Declaration
	This must be declared before any other prototyped methods/properties
************************************/
DomainStatusEvent.prototype = new CustomEvent();
DomainStatusEvent.prototype.constructor = DomainStatusEvent;

/************************************
	Public Prototype Methods
************************************/
/**
	Returns the type of the instance.
	@name		DomainStatusEvent#toString
	@function
	@return		{String}	The class name.
	
*/
DomainStatusEvent.prototype.toString = function()
{
	return	"[DomainStatusEvent]";
}