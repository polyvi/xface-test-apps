
function GetPlatformParam(param){ 
    var request = { 
        QueryString : function(val) { 
            var uri = window.location.search; 
            var re = new RegExp("" +val+ "=([^&?]*)", "ig"); 
            return ((uri.match(re))?(decodeURI(uri.match(re)[0].substr(val.length+1))):''); 
        } 
    } 
    return request.QueryString(param); 
} 

var platform = GetPlatformParam("platform");

if (platform.toLowerCase() == 'android') {
    document.write("<script src='xface_android.js'><\/script>");
} else if (platform.toLowerCase() == 'ios') {
    document.write("<script src='xface_ios.js'><\/script>");
}