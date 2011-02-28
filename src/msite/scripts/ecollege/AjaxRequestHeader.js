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
	<p>The AjaxRequestHeader class defines a set of properties that are specific custom headers on AJAX requests</p>
*/
function AjaxRequestHeader()
{
	/************************************
		Public Properties
		Note: In order for these to be parsed by the documenter, they must be assigned a default value.
	************************************/
	/**
		The name of the custom header.
		@type String
	*/
	this.name = "";
	
	/**
		The value of the custom header.
		@type String
	*/
	this.value = "";

}


/************************************
	Public Prototype Methods
************************************/
/**
	Returns information about the specific AjaxRequestHeader instance.
	@name		AjaxRequestHeader#toString
	@function
	@return		{String}	The class name
	
*/
AjaxRequestHeader.prototype.toString = function()
{
	return	"[AjaxRequestHeader]";
}