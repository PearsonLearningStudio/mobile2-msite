var SERVICE_DOMAIN_PROXY = "apiproxy";

var configSettings = {};

configSettings.clientstring = "sandbox";
configSettings.apiproxy =  "https://m-api.ecollege.com";
configSettings.wmm = {};
configSettings.wmm.enabled = "true";
configSettings.intNumberOfActivities = 10;
configSettings.intCurrentNumberOfActivities = configSettings.intNumberOfActivities;
configSettings.boolScrollUpdate = true;

// Single Sign-On
configSettings.boolEnableSSO = false;
configSettings.strRedirectUrl = "http://localhost/";
configSettings.strSSOUrl = "http://ecollegessodemo.cloudfoundry.com/"

