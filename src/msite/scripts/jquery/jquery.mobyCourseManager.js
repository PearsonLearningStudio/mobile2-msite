/*
 * mobyCourseManager: plugin for managing courses.
 * 
 * Methods:
 * 	init:  Return an array of course information from either the cache or, if the cache is out of date or empty, from the 
 * 	appropriate services.  This is the default method of the plugin.
 * 	arrCourses[{
 * 		int id,
 * 		string number,
 * 		string title
 * 	}]
 * 		boolForceRefresh: Force a refresh of the information and store the results in the cache
 *      strSort: Sort the course list.  Valid values are none, id, number, title. Default is title.
 * 		callbackSuccess:  The callback to execute upon successful fetching of the course information array
 * 		callbackError:  The callback to execute if an error occurs.
 */

(function($) {
	var methods = {
		init : function(options) {
			var settings = {
				boolForceRefresh: false,
				strSort: "title",
				callbackSuccess: function(arrCourses) {
					return arrCourses;
				},
				callbackError: function() {
					alert("Unable to fetch course information.");
				}
			};
			if ( options ) {
				$.extend( settings, options );
			}
			if (dataStorage.isSupported()) {
				// localStorage supported, so get the info
				var strCacheDate = dataStorage.get("courses-timestamp");
				var strCache = dataStorage.get("courses");
				var dateToday = new Date();
				var dateCache = new Date(strCacheDate);
				dateCache.add({days: 5});
				
				// Do we need to refresh info?
				var boolRefresh = false;
				if ((strCacheDate == null) || (strCache == null)) {
					boolRefresh = true;
				} else {
					if (strCache.length < 1) {
						boolRefresh = true;
					}
					if (dateCache < dateToday) {
						boolRefresh = true;
					}
				}
				
				var arrCourses = [];
				
				if (boolRefresh || settings.boolForceRefresh) {
					$().mobiQueryApi("get", {
						strUrl: configSettings.apiproxy + "/me/courses",
						successHandler: function(jsonResponse, intTransactionId){ 
							// Go through the course list and get the course info for each
							for (var i = 0; i < jsonResponse.courses.length; i ++) {
								$().mobiQueryApi("get", {
									strUrl: jsonResponse.courses[i].links[0].href,
									successHandler: function(courseInfo, courseTransId) {
										callMe(courseInfo, jsonResponse.courses.length);
									},
									errorHandler: function() {
										alert('Unable to fetch individual course information.');
									}
								});
							}
						},
						errorHandler: function(){
							alert('Unable to fetch course list: data was stale or not present, server does not respond.');
						}
					});
				} else {
					// We do not need to refresh, so just use the cache
					arrCourses = JSON.parse(strCache);
					settings.callbackSuccess(arrCourses);
				}
			} else {
				// localStorage not supported, so go fetch the data directly
				$().mobiQueryApi("get", {
					strUrl: configSettings.apiproxy + "/me/courses",
					successHandler: function(jsonResponse, intTransactionId){
						// Go through the course list and get the course info for each
						for (var i = 0; i < jsonResponse.courses.length; i ++) {
							$().mobiQueryApi("get", {
								strUrl: jsonResponse.courses[i].links[0].href,
								successHandler: function(courseInfo, courseTransId) {
									callMe(courseInfo, jsonResponse.courses.length);
								},
								errorHandler: function() {
									alert('Unable to fetch individual course information.');
								}
							});
						}
					},
					errorHandler: function(){
						alert('Unable to fetch course list.');
					}
				});
			} // end-if: dataStorage.isSupported()
			
			// helper function:  This is the callback function for
			// each asynchronous service call to get full course info.
			var callMe = function(courseInfo, arrLength) {
				var objCourse = {
					"id" : courseInfo.courses[0].id,
					"number" : courseInfo.courses[0].displayCourseCode,
					"title" : courseInfo.courses[0].title
				}
				arrCourses.push(objCourse);
				// Here's the tricky bit: Presumably there are multiple callMe()'s running.
				// Each one will check to see if all are done (i.e. the array is full), and then and only then will they call the
				// breakOut function.
				if (arrCourses.length === arrLength) {
					breakOut();
				}
			}
			
			
			// helper function: break out of async calls
			var breakOut = function() {
				// At this point, arrCourses is full, and can be sorted and stored.
				
				
				// First, sort the array as requested
				var arrSortedCourses = [];
				if (settings.strSort != "none") {
					// Sorting was requested.
					var arrSort = [];
					var strDelimiter = "[-=-%)]";
					for (var i = 0; i < arrCourses.length; i++) {
						var strJSON = JSON.stringify(arrCourses[i]);
						var strSort = "";
						if (settings.strSort === "title") {
							strSort = arrCourses[i].title + strDelimiter + strJSON;
						} else if (settings.strSort === "id") {
							strSort = arrCourses[i].id + strDelimiter + strJSON;
						} else if (settings.strSort === "number") {
							strSort = arrCourses[i].number + strDelimiter + strJSON;
						}
						arrSort.push(strSort);
					}
					
					// sort the array
					arrSort.sort();
					
					// Recreate the original array of objects
					for (var i = 0; i < arrSort.length; i++) {
						var objJSON = JSON.parse(arrSort[i].split(strDelimiter)[1]);
						arrSortedCourses.push(objJSON);
					}
				} else {
					// Sorting was not requested.
					arrSortedCourses = arrCourses;
				}
				
				// Store the information
				if (dataStorage.isSupported()) {
					var strCourses = JSON.stringify(arrSortedCourses);
					var dateToday = new Date();
					dataStorage.add("courses", strCourses);
					dataStorage.add("courses-timestamp", dateToday);
				}
				
				// Now call the success callback.
				settings.callbackSuccess(arrSortedCourses);
			}
		}
	}
	
	$.fn.mobyCourseManager = function(method) {
		// Method calling logic
		if ( methods[method] ) {
			return methods[ method ].apply( this, Array.prototype.slice.call( arguments, 1 ));
	    } else if ( typeof method === 'object' || ! method ) {
			return methods.init.apply( this, arguments );
	    } else {
			$.error( 'Method ' +  method + ' does not exist' );
	    } 
	}
})(jQuery);