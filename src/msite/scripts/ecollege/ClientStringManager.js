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
	<p>The ClientStringManager class is a singleton that manages storing a client string.</p>
	
	@requires	utils.js
				VariableValidator.js
*/
var ClientStringManager = (function()
{
	/**
		The singleton instance of the ClientStringManager class.
		@private
	*/
	var _instance = null;
	
	/**
		The constructor function for the ClientStringManager instance.
		@private
	*/
	function PrivateConstructor()
	{
		/************************************
			Private Properties
		************************************/
		var _clientStringName = "eCClientString";
		
		/************************************
			Private Methods
		************************************/
		
		/************************************
			Public Methods
		************************************/
		/**
			Retrieves the client string for this user.
			@return		{String}	The client string value
		*/
		this.getClientString = function()
		{
			return readCookie(_clientStringName);
		};
		
		/**
			Stores the client string for this user on the client.
			@param		{String}	p_clientString	The client string value to store
		*/
		this.setClientString = function(p_clientString)
		{
			// persist this info for 180 days
			createCookie(_clientStringName, p_clientString, 259200);
		};
		
	}	
	
	/************************************
		Public Prototype Methods
	************************************/
	/**
		Returns information about the specific ClientStringManager instance.
		@name		ClientStringManager#toString
		@function
		@return		{String}	The class name
		
	*/
	PrivateConstructor.prototype.toString = function()
	{
		return	"[ClientStringManager]";
	}
	
	
	return new function()
	{
		/**
			Retrieves the instance of the ClientStringManager singleton.
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


