var SERVICE_DOMAIN_PROXY = "apiproxy";

var configSettings = {};

configSettings.clientstring = "sandbox";
configSettings.apiproxy =  "https://m-api.ecollege.com";
configSettings.wmm = {};
configSettings.wmm.enabled = "true";
// Default number of activities to show at a time on the Activity view
configSettings.intNumberOfActivities = 10;
configSettings.intCurrentNumberOfActivities = configSettings.intNumberOfActivities;
// Default number of upcoming events to show in the first view of the Upcoming view.
configSettings.intNumberOfUpcomingEvents = 10;
configSettings.intCurrentNumberOfUpcomingEvents = configSettings.intNumberOfUpcomingEvents;
configSettings.boolScrollUpdate = true;
configSettings.boolScrollUpcoming = true;

// Single Sign-On
configSettings.boolEnableSSO = false;
configSettings.strRedirectUrl = "http://localhost/";
configSettings.strSSOUrl = "http://ecollegessodemo.cloudfoundry.com/"

// Log out redirect
configSettings.boolEnableLogoutRedirect = false;
configSettings.strLogoutRedirectUrl = "http://www.google.com";

