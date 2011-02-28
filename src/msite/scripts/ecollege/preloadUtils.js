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
	Searches the query string parameters on the current page's URL and returns the 
	value of the one with the name that was passed in.
	@param	{String}	p_paramName		The name of the query string value to get
	@return	{String}	The value of the query string parameter with the given name
*/
function getQueryStringValue(p_paramName)
{
	var valuesFromName = {};
	var queryString = window.location.search;
	if (queryString.length > 1)
	{
		queryString = queryString.substring(1, queryString.length);
		for(var i=0; i < queryString.split("&").length; i++)
		{
			var nameValuePair = queryString.split("&")[i];
			valuesFromName[nameValuePair.split("=")[0]] = nameValuePair.split("=")[1];
		}
		if (valuesFromName[p_paramName] != undefined)
		{
			return valuesFromName[p_paramName];
		}
		else
		{
			return "";
		}
	}
	else
	{
		return "";
	}
}

/**
	Applies branding for the current client to the page
	@param	{String}	p_clientString		The client string of the current user
	@return	{String}	The value of the cookie
*/
var applyBrandingToPage = function(p_clientString)
{
	var headElement = document.getElementsByTagName("head")[0];         
	var cssNode = document.createElement('link');
	cssNode.type = 'text/css';
	cssNode.rel = 'stylesheet';
	cssNode.href = 'styles/epcustom/' + p_clientString + '/style.css';
	cssNode.media = 'screen';
	headElement.appendChild(cssNode);
};

/**
	Creates a cookie with the given name, value, and days from today in which it should expire.
	@param	{String}	p_name		The name of the cookie
	@param	{String}	p_value		The value of the cookie
	@param	{Integer}	p_minutes	The number of minutes from now to set the expiration to
*/
function createCookie(p_name, p_value, p_minutes)
{
	if (p_minutes > 0)
	{
		var date = new Date();
		date.setMinutes(date.getMinutes() + p_minutes);
		var expires = "; expires="+date.toGMTString();
	}
	else var expires = "";
	document.cookie = p_name + "=" + p_value + expires + "; path=/";
}

/**
	Reads the value of a cookie with the given name, if it exists.
	@param	{String}	p_name		The name of the cookie
	@return	{String}	The value of the cookie
*/
function readCookie(p_name)
{
	var nameEQ = p_name + "=";
	var ca = document.cookie.split(';');
	for(var i=0;i < ca.length;i++)
	{
		var c = ca[i];
		while (c.charAt(0)==' ') c = c.substring(1,c.length);
		if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
	}
	return null;
}

/**
	Deletes a cookie with the given name.
	@param	{String}	p_name		The name of the cookie
*/
function eraseCookie(p_name)
{
	createCookie(p_name,"",-1);
}