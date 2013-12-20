(function(expr){
    var NEXT_PAGE = "next",
        PREVIOUS_PAGE = "prev";
    var STYLE = {
        SCROLL_WRAPPER : "scroll_page_wrapper",
        SCROLLER : "scroll_page_scroller",
        SCROLL_PAGE : "scroll_page",
        SCROLL_NAV_DIV : "scroll_nav_div",
        SCROLL_NAV_LIST : "scroll_nav_list",
        SCROLL_NAV_ACTIVE : "scroll_nav_active"
    };
    var Scroller = {
        instance : null,
        container : null,
        scrollDiv : null,
        pages : []
    }
    ,DEFAULT_OPTIONS = {
            snap: true,
            momentum: false,
            hScrollbar: false,
            checkDOMChanges: true,
            hasNavbar:true,
            onScrollEnd:function(){}
    }
    ,navDom = {
        POSITION:"fixed",
        navDiv : null,
        ul : null
    };

    function _ScrollPage(el,options){
        _applyOptions();
        el = createElement(el);
        var container = Scroller.container = createElement("div");
        container.className = STYLE.SCROLL_WRAPPER;
        container.style['width'] = window.innerWidth + "px";
        el.appendChild(container);
        var scroll_page = Scroller.scrollDiv = createElement("div");
        scroll_page.className = STYLE.SCROLLER;
        container.appendChild(scroll_page);
        Scroller.instance = new iScroll(container,options);
        if(options.hasNavbar){
            this.Nav = Scroller.instance.Nav = new Nav();
        }

        function _applyOptions(){
            if(!options) options = {};
            for(var property in DEFAULT_OPTIONS){
                  options[property] = DEFAULT_OPTIONS[property];
            }
            if(typeof options.onScrollEnd == 'function'){
                DEFAULT_OPTIONS.onScrollEnd = options.onScrollEnd;
                options.onScrollEnd = _onScrollEnd;
            }
           return options;
        }

        this.refresh = function(){
            Scroller.instance = new iScroll(container,options);
        };
    }

    _ScrollPage.prototype.getScroll = function(){
        return Scroller.instance;
    };

    _ScrollPage.prototype.setScroll = function(scroller){
        if(arguments.length == 2){
            Scroller.instance = new iScroll(arguments[0],arguments[1]);
        }
        Scroller.instance = scroller;
    };

    _ScrollPage.prototype.setEnable = function(bool){
          if(bool){
             Scroller.instance.enable();
          }else{
             Scroller.instance.disable();
          }
    };

    function _onScrollEnd(){
        if(typeof DEFAULT_OPTIONS.onScrollEnd == 'function'){
            DEFAULT_OPTIONS.onScrollEnd();
        }
        var index = Scroller.instance.currPageX;
        this.Nav.active(index);
    }

    _ScrollPage.prototype.add = function(page,width){
        if(page instanceof Array){
            for(var i=0;i<page.length;i++){
                this.add(page[i],width);
            }
        }
        var pages = Scroller.pages;
        pages.push(page);
        page.className = STYLE.SCROLL_PAGE;
        var pageWidth = width?width : page.offsetWidth;
        _setScrollWidth(pageWidth * pages.length);
        Scroller.scrollDiv.appendChild(page);
        if(this.Nav){
            this.Nav.increase();
        }
        return page;

        function _setScrollWidth(_width){
            _width = parseInt(_width);
            page.style['width'] = width + "px";
            Scroller.scrollDiv.style.setProperty('width',_width + "px");
        }
    };

    _ScrollPage.prototype.remove = function(page){
        if(typeof page == 'number'){
            page = this.getPage(page);
        }
        Scroller.container.removeChild(page);
        var pages = Scroller.pages;
        var pageNum = this.indexOf(page);
        if(pageNum < 0)return;
        Scroller.pages = pages.slice(0,pageNum).concat(pages.slice(pageNum+1,pages.length));
    };

    _ScrollPage.prototype.clear = function(){
        Scroller.container.innerHTML = "";
        Scroller.pages = [];
    };

    _ScrollPage.prototype.scrollTo = function(targetPage,time){
        if(targetPage != PREVIOUS_PAGE && targetPage != NEXT_PAGE
                && isNaN(targetPage)){
            throw new Error("Target the page number must be number type");
        }
        var _this = Scroller.instance;
        targetPage = parseInt(targetPage);
        _this.scrollToPage(targetPage,_this.currPageX,time);
    };

    _ScrollPage.prototype.scrollToNext = function(time){
        this.scrollTo(NEXT_PAGE,time);
    };

    _ScrollPage.prototype.scrollToPrevious = function(time){
        this.scrollTo(PREVIOUS_PAGE,time);
    };

    _ScrollPage.prototype.scrollToFirstPage = function(time){
        this.scrollTo(0,time);
    };

    _ScrollPage.prototype.scrollToLastPage = function(time){
        this.scrollTo(Scroller.pages.length-1,time);
    };

    _ScrollPage.prototype.getCurrentPage = function(){
        if(Scroller.pages.length <= 0) {
            return null;
        }
        return Scroller.pages[Scroller.instance.currPageX];
    };

    _ScrollPage.prototype.getCurrentPageIndex = function(){
        if(null == Scroller.instance){
            return -1;
        }
        return Scroller.instance.currPageX;
    };

    _ScrollPage.prototype.getPage = function(index){
        if(isNaN(index)){
            return null;
        }
        index = parseInt(index);
        if (index >= Scroller.pages.length){
            return null;
        }
        return Scroller.pages[index];
    };

    _ScrollPage.prototype.indexOf = function(page){
        var pages = Scroller.pages;
        for(var i=0;i<pages.length;i++){
            if(pages[i] == page){
                return i;
            }
        }
    };

    _ScrollPage.prototype.getLength = function(){
        return Scroller.pages.length;
    };

    _ScrollPage.prototype.getContainer = function(){
        return Scroller.container;
    };

    _ScrollPage.prototype.setContainer = function(el){
        if(typeof el == 'string'){
            el = getElement(el);
        }
        var container = Scroller.container;
        el.innerHTML = Scroller.container.innerHTML;
        container.innerHTML = "";
        container.parentNode.removeChild(container);
        Scroller.container = el;
    };

    function Nav(){
        navDom.navDiv = createElement("div");
        navDom.navDiv.className = STYLE.SCROLL_NAV_DIV;
        navDom.ul = createElement("div");
        navDom.ul.className = STYLE.SCROLL_NAV_LIST;
        navDom.navDiv.appendChild(navDom.ul);
        this.list = [];
        Scroller.container.appendChild(navDom.navDiv);
    }

    Nav.prototype.increase = function(length){
        if(typeof length != 'number') length = 1;
        for(var i=0;i<length;i++){
            var li = createElement("div");
            li.index  = this.list.length;
            this.list.push(li);
            navDom.ul.appendChild(li);
        }
        this.list[0].className = STYLE.SCROLL_NAV_ACTIVE;
    };

    Nav.prototype.active = function(index){
        var li = typeof index == 'number'?this.list[index]:index;
        var currentActive = getElement('.'+ STYLE.SCROLL_NAV_LIST +' > div.'+STYLE.SCROLL_NAV_ACTIVE);
        if(null != currentActive)currentActive.className = '';
        li.className = STYLE.SCROLL_NAV_ACTIVE;
    };

    Nav.prototype.remove = function(target){
        var list = this.list;
        if(typeof target != 'number'){
            for(var i=0;i<list.length;i++){
                if(list[i] == target){
                    target =  list[i];
                }
            }
        }
        var li = list[index];
        navDom.ul.removeChild(li);
        this.list = list.slice(0,target).concat(list.slice(target+1,list.length));
    };

    Nav.prototype.setVisible = function(isVisible){
        var display = 'block';
        if(!isVisible) display = 'none';
        navDom.navDiv.style['display'] = display;
    };

    Nav.prototype.setBounds = function(x,y,w,h){
        var pixelType = "px";
        w = parseInt(w) + pixelType;
        h = parseInt(h) + pixelType;
        var style = {
            width :w,
            height : h
        };
        this.setStyle(style);
        this.setPosition(x,y);
    };

    Nav.prototype.getBounds = function(){
        var w = navDom.navDiv.offsetWidth;
        var h = navDom.navDiv.offsetHeight;
        var pos = this.getPosition();
        pos.width = w;
        pos.height = h;
        return pos;
    };

    Nav.prototype.setPosition = function(x,y){
        var pixelType = "px";
        x = parseInt(x) + pixelType;
        y = parseInt(y) + pixelType;
        var style = {
           left : x,
           top : y
        };
        this.setStyle(style);
    };

    Nav.prototype.getPosition = function(){
        var x = navDom.navDiv.offsetLeft;
        var y = navDom.navDiv.offsetTop;
        return {
            x : x,
            pageX : x,
            y : y,
            pageY : y
        };
    };

    Nav.prototype.setSpacing = function(val){
        val = parseInt(val);
        this.setStyle({"margin-right" : val + "px"});
    };

    Nav.prototype.setStyle = function(cssStyleObject){
        if("position" in cssStyleObject){
            cssStyleObject['position'] = navDom.POSITION;
        }
        for(var key in cssStyleObject){
            navDom.navDiv.style[key] = cssStyleObject[key];
        }
    };

    Nav.prototype.getLength = function(){
        return this.list.length;
    };

    Nav.prototype.clear = function(){
        navDom.ul.innerHTML = "";
        this.list = [];
    };

    function createElement(tagName){
        if(typeof tagName == 'object'){
            return tagName;
        }
        return document.createElement(tagName);
    }

    function getElement(el){
        if(typeof el == 'string'){
            return document.querySelector(el);
        }
        return el;
    }

    expr?expr.ScrollPage = _ScrollPage : window.ScrollPage = _ScrollPage;
})(this);