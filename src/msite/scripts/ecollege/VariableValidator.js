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
	The VariableValidator contains static methods for validating that variables exist and/or have
	a specific type.
*/
function VariableValidator(){}

/**
	This method verifies that the variable is not null/undefined and is (optionally) of a specified type.
	If the variable is valid, nothing is returned. Otherwise an error will be thrown.
	@param		{Object}	p_scope			The scope that the variable belongs to. This is used only for debugging purposes.
	@param					p_variable		The variable to test.
	@param		{String}	[p_type]		The type of object that p_variable should be. If this is not specified,
											then the method will only check if p_variable is null/undefined.
*/
VariableValidator.require = function(p_scope, p_variable, p_type)
{
	if (p_scope == undefined || p_scope == null)
	{
		if (console) console.trace();
		throw new Error("VariableValidator.require() - Please provide a valid scope.");
	}
	if (p_variable == undefined || p_variable == null)
	{
		if (console) console.trace();
		throw new Error(p_scope + " VariableValidator.require() - Please provide a valid variable.");
	}
	if (p_type != undefined)
	{
		if (typeof(p_type) != "string")
		{
			if (console) console.trace();
			throw new TypeError(p_scope + " VariableValidator.require() - " + p_variable + " should be of type: string.");
		}
	
		if (typeof(p_variable) != p_type.toLowerCase() && !(p_variable instanceof eval(p_type)))
		{
			if (console) console.trace();
			throw new TypeError(p_scope + " VariableValidator.require() - " + p_variable + " should be of type: " + p_type + ".");
		}
	}
	return;
};

/**
	This method verifies that the variable is of a specified type (if it's not null/undefined).
	If the variable type matches the specified type, nothing is returned. Otherwise an error will be thrown.
	@param		{Object}	p_scope			The scope that the variable belongs to. This is used only for debugging purposes.
	@param					p_variable		The variable to test.
	@param		{String}	p_type			The type of object that p_variable should be. If this is not specified,
											then the method will only check if p_variable is null/undefined.
*/
VariableValidator.optional = function(p_scope, p_variable, p_type)
{
	if (p_scope == undefined || p_scope == null)
	{
		if (console) console.trace();
		throw new Error("VariableValidator.optional() - Please provide a valid scope.");
	}
	if (p_variable != undefined || p_variable != null)
	{
		if (p_type != undefined)
		{
			if (typeof(p_type) != "string")
			{
				if (console) console.trace();
				throw new TypeError(p_scope + " VariableValidator.optional() - The variable type should be of type: string.");
			}
		
			if (typeof(p_variable) != p_type.toLowerCase() && !(p_variable instanceof eval(p_type)))
			{
				if (console) console.trace();
				throw new TypeError(p_scope + " VariableValidator.optional() - " + p_variable + " should be of type: " + p_type + ".");
			}
		}
	}
};