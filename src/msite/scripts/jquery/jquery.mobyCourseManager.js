(function($) {
	var methods = {
		init : function(options) {
			var settings = {
				boolForceRefresh: false,
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
				// At this point, arrCourses is full, and can be stored.
				if (dataStorage.isSupported()) {
					var strCourses = JSON.stringify(arrCourses);
					var dateToday = new Date();
					dataStorage.add("courses", strCourses);
					dataStorage.add("courses-timestamp", dateToday);
				}
				// Now call the success callback.
				settings.callbackSuccess(arrCourses);
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