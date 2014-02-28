function ThemeManager(){
    var link = $.Element("link").attribute("rel","stylesheet").attribute("type","text/css").appendTo(document.body);
    var _this = this;
    _this.currentTheme = null;

    _this.setTheme = function(id,noTransition){
        if(!id)id = "blue";
        var theme = _this.themes[id];
        if(_this.currentTheme && _this.currentTheme.id == id)return;
        changeTheme(theme,function(){
            _this.currentTheme = theme;
        },noTransition);
    };

    function changeTheme(theme,success,noTransition){
        var body = document.body;
        var duration = 350;
        if(noTransition === true){
            link.href = theme.src;
            if(success)success();
            return;
        }
        body.css({"-webkit-transition":"opacity "+duration+"ms linear","background-color":"#ffffff","opacity":0});
        setTimeout(function(){
            link.href = theme.src;
            setTimeout(function(){
                body.css({"opacity":""});
                setTimeout(function(){
                    body.css({"-webkit-transition":"","background-color":""});
                    if(success)success();
                },duration);
            },100);
        },duration);
    }

    _this.themes = {
        "blue":new Theme("blue","纯净蓝","#4bc0d1",""),
        "green":new Theme("green","清新绿","#3fe78a","view/res/green.css"),
        "yellow":new Theme("yellow","幸福橙","#fdb643","view/res/yellow.css"),
        "red":new Theme("red","吉祥红","#f0597f","view/res/red.css")
    };
    function Theme(id,name,color,src){
        this.id = id;
        this.src = src;
        this.name = name;
        this.color = color;
    }

    _this.setTheme(xmesh.model["Setting"].theme,true);
}