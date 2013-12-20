var STYLE = {
	PANEL: 'panel',
	TITLE: 'panelTitle',
	BOX: 'iconBox',
	ICON: 'icon',
	PANEL_A: 'panelA',
	PANEL_B: 'panelB',
	PAGE_FOOTER: 'pageFoot',
	TOGGLE_BUTTON: 'toggleButton',
	ICON_CLOSE_MARK:'iconCloseBT',
    APP_BOX:'appBox',
    APP_LABEL:'appLabel'
};

var PANEL_HEIGHT = 1000;
var GRID_ANIMATED_ICON_COUNT = 6;
var GRID_ICON_COLUME = 4;

var ICON_MARGIN = 10;
var ICON_MARGIN_X = 20;

var TOOLTIP_AUTO_HIDEEN = 3000;

var HEADER_HEIGHT = 120;
var FOOTER_HEIGHT = 62;
var ICON_SIZE = 80;

var SCROLL_TO_HOME_DURATION = 300;

var UPDATE_INTERVAL = 60000;
var updateTimer;
var remoteAppListData;
var scroller4Applist;


/*
============================================
	PanelGroup
============================================
*/

function PanelGroup(){

	var _this = create('div');
	var _panels = [];
	var _currentPanel;
	var _tabWidth;

	Object.defineProperty(_this, 'index', {set:_setIndex,get:_getIndex});
	function _setIndex(i){
		var target = _panels[i];
		if(!target || (_currentPanel&&i==_currentPanel.index)) return;
		_expand(target);
	}
	function _getIndex(){return _currentPanel?_currentPanel.index:undefined;}


	Object.defineProperty(_this, 'length', {get:_getLength});
	function _getLength(){return _panels.length;}


	_this.createPanel = function(name, data){
		var panelStyle = (_this.length%2?STYLE.PANEL_B:STYLE.PANEL_A);
		_createPanel(name, data, panelStyle);
	}

	_this.closeAll = function(){
		if(_currentPanel) _close(_currentPanel);
		get('PANEL_GROUP').style.left = '0px';
	}

	_this.clear = function(){
		while(_panels.length>0)
			_this.removeChild(_panels.pop());
	}

	function _createPanel(name, data, panelStyle){
		var panel = new Panel(name, data, panelStyle, _this);
		panel.index = _panels.length;
		_this.appendChild(panel);
		_panels.push(panel);
		_updatePanel();
	}

	function _updatePanel(){
		_tabWidth = PanelGroup.width/Math.min(_panels.length, GRID_ICON_COLUME);
		for(var i=0; i<_panels.length; i++)
			_panels[i].style.width = _tabWidth+'px';
		_this.style['width'] = _tabWidth*_panels.length+'px';
	}

	function _expand(who){
		_this.closeAll();
		who.style.width = PanelGroup.width+'px';
		who.expand();
		_this.style.width = _panels.length*PanelGroup.width+'px';
		_currentPanel = who;
		_adjustGroupPosition();
		showHomeButton(true);
		nav.push(_scrollToHome);

        function _scrollToHome(){
            var scroller = who.scrollPage;
            if(isFirstScrollPage(scroller)){
                _this.closeAll();
            }else{
                scroller.scrollToFirstPage(SCROLL_TO_HOME_DURATION);
                setTimeout(function(){
                    _this.closeAll();
                },SCROLL_TO_HOME_DURATION);
            }
        }

	}

    function isFirstScrollPage(scroller){
        if(!(scroller instanceof ScrollPage)) return true;
        if(scroller.getCurrentPageIndex() > 0)return false;
        return true;
    }

	function _close(who){
		who.style.width = _tabWidth+'px';
		who.close();
		if(_currentPanel==who) _currentPanel=undefined;
		showHomeButton(false);
	}

	function _adjustGroupPosition(){
		get('PANEL_GROUP').style.left = (-_currentPanel.index*_tabWidth)+'px';
	}

	return _this;
}

Object.defineProperty(PanelGroup, 'width', {get:_getBodyWidth});
function _getBodyWidth(){return document.body.clientWidth;}

Object.defineProperty(PanelGroup, 'height', {get:_getBodyHeight});
function _getBodyHeight(){return document.body.clientHeight;}


/*
============================================
	Panel
============================================
*/
function Panel(name, data, style, group){

	var height = PANEL_HEIGHT;
	var _this = create('div');
	_this.className = STYLE.PANEL;
	_this.style['height'] = height + 'px';

	var h1 = create('h1');
	h1.addEventListener('click', _handleOnClickTitle, true);

	var _title = create('div');
	_title.className = STYLE.TITLE;
	_title.innerHTML = name;
	h1.appendChild(_title);
	var _iconBox = create('div');
	_iconBox.className = style ? style + ' ' + STYLE.BOX : STYLE.BOX;
    _this.appendChild(h1);
    _this.appendChild(_iconBox);
    var scrollPage = _createScrollPage(data,_iconBox);
    var _grid = scrollPage instanceof ScrollPage?scrollPage.getPage(0):scrollPage;

    _this.scrollPage = scrollPage;

	_this.expand = function(){
		_grid.expand();
		showFooter(false);
        _setScrollEnable(true);
	}

	_this.close = function(){
		_grid.close();
		showFooter(true);
        _setScrollEnable(false);
	}

	function _handleOnClickTitle(event){
		group.index = _this.index;
	}


    function _setScrollEnable(bool){
        if(_this.scrollPage && _this.scrollPage instanceof ScrollPage){
            _this.scrollPage.setEnable(bool);
            _this.scrollPage.Nav.setVisible(bool);
            _this.scrollPage.Nav.active(0);
        }
    }

	return _this;
}

function _createScrollPage(data,el){
    var pageCount = GRID_ANIMATED_ICON_COUNT * GRID_ICON_COLUME;
    var pageSize = Math.ceil(data.length/pageCount);
    var _size = pageSize<=0 ? 1 : pageSize;
    el.style['width'] = (PanelGroup.width * _size)+'px';
    var windowWidth = window.innerWidth;
    if(pageSize <= 1){
        var grid = new Grid(data,true);
        el.appendChild(grid);
        return grid;
    }

    var scrollPage = new ScrollPage(el);

    scrollPage.setEnable(false);
    scrollPage.Nav.setVisible(false);
    for(var i=0;i<pageSize;i++){
        var start = pageCount * i;
        var end=start==0?pageCount:start*2;
        var _data = data.slice(start,end);
        var _grid  = new Grid(_data,i==0);
        scrollPage.add(_grid,windowWidth);
    }
    return scrollPage;
}

/*
============================================
	Grid
============================================
*/
function Grid(data,hasEffect){

	var _this = create('div');
	var _icons = [];

	for(var i=0; i<data.length; i++){
		var icon = _createIcon(data[i], i);
		_updateIconStatus(i, icon, false,hasEffect);
		_this.appendChild(icon);
		_icons.push(icon);
	}

	_this.expand = function(){
		for(var i=0; i<_icons.length; i++)
			_updateIconStatus(i, _icons[i], true,hasEffect);
	}

	_this.close = function(){
		for(var i=0; i<_icons.length; i++)
			_updateIconStatus(i, _icons[i], false,hasEffect);
	}

	function _updateIconStatus(index, icon, bShow,hasEffect){
        if(!hasEffect)return;
		if(index<GRID_ANIMATED_ICON_COUNT){
			var margin = ICON_MARGIN_X*2;
			var rowNum = index>=GRID_ICON_COLUME ? Math.round(index/GRID_ICON_COLUME) : 0;
			var x = (index%GRID_ICON_COLUME)*(ICON_SIZE+margin);
			var y = (index-rowNum)*(ICON_SIZE+ICON_MARGIN*2);
            icon.style['-webkit-transform'] = !bShow ? 'translate(-'+x+'px,'+y+'px)' : 'translate(0px, 0px)';
		}else{
            icon.style['-webkit-transform'] = bShow ? 'scale(1,1)' : 'scale(0,0)';
		}
	}

	function _createIcon(data, index){
		var div = createIcon(XP_RES.host+'/'+XP_RES.OS+'/'+data.img);
		div.data = data;
		div.className = STYLE.ICON;
		if(typeof data.callback == 'function')
			div.addEventListener('click', data.callback, true);
		else
			div.addEventListener('click', _handleOnClickIcon, true);
		return div;
	}

	function _handleOnClickIcon(event){
		var data = event.target.data;
		var installedApp = hasInstalled(data.id);
		if(installedApp) return xPortal.run(data.id);
		var source = XP_RES.host+'/'+XP_RES.OS+'/'+data.src;
		taskQueue.addTask(source);
	}

	return _this;
}



/*
============================================
	Toggle Button
============================================
*/

function ToggleButton(imgElement, defaultValue, onChangeCallback){
	if(!imgElement || imgElement.tagName!='IMG')
		throw new Error(arguments.callee.name+': Constructor needs an IMG tag.');
	var _this = imgElement;
	var _state;
	_this.className = STYLE.TOGGLE_BUTTON;
	_this.state = false;
	_this.addEventListener('click', _handleOnClickSelf);

	Object.defineProperty(_this, 'state', {set:_setState,get:_getState});
	function _setState(value){
		if(_state == value) return;
		_state = !!value;
		_this.style['background-position'] = _state?'0px 0px':'-70px 0px';
		if(onChangeCallback) onChangeCallback(_state);
	}

	function _getState(){return _state};

	function _handleOnClickSelf(event){
		_this.state = !_this.state;
	}

	_this.state = !!defaultValue;

	return _this;
}


/*
============================================
	Installed View
============================================
*/


function updateAppView(){
	_updateLocalAppList(success);
	function success(){
		var container = get('APP_BOX');
		container.innerHTML = '';
		for(var i=0; i<LOCAL_APP_LIST.length; i++){
			var app = createIconWithLabel(LOCAL_APP_LIST[i]);
			container.appendChild(app);
		}
		toggleSwitchBox(true);
		updateIScroll4AppView();
	}
}

function createIconWithLabel(app){
    var box = create("div");
    box.className =  STYLE.APP_BOX;
    box.style['width'] = Math.floor(window.innerWidth / GRID_ICON_COLUME) + "px";
    var label = create("div");
    label.className = STYLE.APP_LABEL;
    var appName = app.instance.name;
    label.innerHTML = appName;
    box.appendChild(app);
    box.appendChild(label);
    return box;
}

function updateIScroll4AppView(){
	if(scroller4Applist) scroller4Applist.destroy();
	setTimeout(function(){scroller4Applist = new iScroll('WRAPPER_4_APPLIST');},100);
}

function lockApps(){
	for(var i=0; i<LOCAL_APP_LIST.length; i++)
		LOCAL_APP_LIST[i].deleteMode = false;
}

function unlockApps(){
	for(var i=0; i<LOCAL_APP_LIST.length; i++)
		LOCAL_APP_LIST[i].deleteMode = true;
}





/*
============================================
	Utils
============================================
*/

function create(tagName){
	return document.createElement(tagName);
}

function get(id){
	return document.getElementById(id);
}

function showToolTip(what){
	var target = get('TOOLTIP');
	var footerPos = get('FOOTER').style['bottom'];
	var FOOTER_HEIGHT = 50;
	target.innerHTML = what?what:'';
	target.style['bottom'] = ((footerPos?parseInt(footerPos):0)+FOOTER_HEIGHT)+'px';
	clearTimeout(target.timer);
	if(preference.get('autoHideToolTip'))
		target.timer = setTimeout(hideToolTip, TOOLTIP_AUTO_HIDEEN);
}

function hideToolTip(){
	var target = get('TOOLTIP');
	target.style['bottom'] = -target.clientHeight+'px';
	clearTimeout(target.timer);
}

function showHomeButton(bShow){
	showNavButton(get('BT_HOME'), bShow);
}

function showSmallHomeButton(bShow){
	var target = get('BT_HOME_SMALL');
	showNavButton(target, bShow);
}

function showNavButton(who, bShow){
	who.style['-webkit-transform'] = 'translateX('+(bShow?'0':who.clientWidth)+'px)';
	hideToolTip();
}

function showFooter(bShow){
	var footer = get('FOOTER');
	footer.style['bottom'] = bShow?'0px':-footer.clientHeight+'px';
}

function showAppSwitch(bShow){
	var target = get('SWITCH_BOX');
	toggleSwitchBox(bShow);
	target.style['bottom'] = (bShow?0:-target.clientHeight)+'px';
}

function toggleSwitchBox(b){
	get('SWITCH_BOX').state = b;
}

function popup(element){
	var pop = get('POPUP');
	clearPopup();
	pop.content = element;
	pop.appendChild(element);
	pop.style['opacity'] = 1;
	pop.style['visibility'] = 'visible';
	showFooter(false);
	showSmallHomeButton(true);
	nav.push(closePopup);
}

function closePopup(){
	var pop = get('POPUP');
	pop.style['opacity'] = 0;
	setTimeout(function(){pop.style['visibility'] = 'hidden';clearPopup();}, 500);
	showSmallHomeButton(false);
	showFooter(true);
	showAppSwitch(false);
}

function clearPopup(){
	var pop = get('POPUP');
	if(pop.content){
		pop.removeChild(pop.content);
		get('LIB').appendChild(pop.content);
	}
	pop.content = null;
}

function hasInstalled(id){
	for(var i=0; i<LOCAL_APP_LIST.length; i++)
		if(LOCAL_APP_LIST[i].id==id) return LOCAL_APP_LIST[i];
}

function getAppElements(success, failure){
	xPortal.getAppList(_success, failure);
	function _success(list){
		var result = [];
		for(var i=0; i<list.length; i++){
			var data = list[i];
			var app = createIcon(data.icon);
			app.id = data.appid;
			initAppIcon(app, data);
			result.push(app);
		}
		success(result);
	}
}

function initAppIcon(app, data){
	app._deleteMode = false;
	app.instance = new Application(data, true);
	app.addEventListener('click', function(){
		if(this._deleteMode){
			if(confirm('确定要删除'+this.instance.name+'？'))
				this.instance.uninstall(updateAppView, function(){alert('删除失败！')});
		}else{
			this.instance.run();
		}
	});

	Object.defineProperty(app, 'deleteMode', {set:function(b){
		this._deleteMode = !!b;
		this.deleteIcon.style['-webkit-transform'] = b?'scale(1,1)':'scale(0,0)';
	}});

	createCloseMarkForAppIcon(app);
	app.deleteMode = false;
}

function createCloseMarkForAppIcon(app){
	var closeBT = create('div');
	closeBT.className = STYLE.ICON_CLOSE_MARK;
	app.deleteIcon = closeBT;
	app.appendChild(closeBT);
}

function createIcon(imgSrc){
	var icon = create('div');
	icon.className = STYLE.ICON;
	icon.style['width'] =
	icon.style['height'] = ICON_SIZE+'px';
	icon.style['margin'] = ICON_MARGIN+'px';
	icon.style['margin-left'] =
	icon.style['margin-right'] = ICON_MARGIN_X + 'px';
	if(imgSrc) icon.style['background-image'] = 'url('+imgSrc+')';
	return icon;
}


function uninstallAll(){
	if(!confirm('确定删除所有已安装的应用？')) return;
	var failureCount = 0;
	var total = LOCAL_APP_LIST.length;
	for(var i=0; i<LOCAL_APP_LIST.length; i++)
		xPortal.uninstall(LOCAL_APP_LIST[i].id, _success, _failure);
	function _success(){}
	function _failure(){failureCount++;}
	alert('删除完毕！'+(failureCount>1?'失败'+failureCount+'个':''));
}

function updateRemoteList(){
	var listURL = XP_RES.host+'/'+XP_RES.OS+'/'+XP_RES.remoteList;console.log(listURL);
	var ajax = new XMLHttpRequest();
	ajax.onreadystatechange = function(){
		if(ajax.readyState==4){
			if(ajax.status==200){
				var data = ajax.responseText;
				if(hasDataChanged(data)) fillGroup(data);
			}else{console.log(ajax.responseText);
				showToolTip('获取应用列表失败<br/>'+listURL);
			}
			checkIfUpdateLater();
		}
	};
	ajax.open('GET', listURL, true);
	ajax.send(null);
}

function hasDataChanged(objString){
	return remoteAppListData != objString;
}

function checkIfUpdateLater(){
	clearTimeout(updateTimer);
	if(preference.get('autoUpdateRemoteAppList'))
		updateTimer = setTimeout(updateRemoteList, UPDATE_INTERVAL);
}

function fillGroup(data){
	var json = parseJson(data);
	remoteAppListData = data;
	group.clear();
	for(var i in json)
		group.createPanel(i, json[i]);
}



/*
============================================
	Initialize
============================================
*/

function _initToolTip(){
	get('TOOLTIP').addEventListener('click', function(event){
		hideToolTip();
	}, true);
}

function _initNavButton(){
	get('BT_DOWNLOAD').addEventListener('click', function(event){
		popup(get('DOWNLOAD'));
	}, true);

	get('BT_APP').addEventListener('click', function(event){
		updateAppView();
		popup(get('APP'));
		showAppSwitch(true);
	}, true);

	get('BT_MANAGE').addEventListener('click', function(event){
		popup(get('SETTINGS'));
	}, true);
}

function _initHomeButton(){
	get('BT_HOME').addEventListener('click', _handleOnClickBackBtn, false);
	get('BT_HOME_SMALL').addEventListener('click', _handleOnClickBackBtn, false);
	function _handleOnClickBackBtn(event){nav.back();}
}

function _initTaskQueue(){
	get('DOWNLOAD').appendChild(taskQueue);
}

function _initPanelGroup(){
	group = new PanelGroup();
	get('PANEL_GROUP').appendChild(group);
}

function _initAppListModeSwitcher(){
	var switcher = get('SWITCH_BOX');
	switcher._state = true;

	Object.defineProperty(switcher, 'state', {
			set:function(s){
				if(this._state==s) return;
				this._state=s;
				get('SWITCH_LOCK').style['-webkit-transform'] = this.state?'rotate(0deg)':'rotate(-90deg)';
				this.state?lockApps():unlockApps();
			},
			get:function(){return this._state;}});

	switcher.addEventListener('click', function(event){
		this.state = !this.state;
	});
}

function _initNavigation(){
	nav = new XNavigator();
}

function _initPreferencePanel(){
	new ToggleButton(get('BT_AUTO_UPDATE'), preference.get('autoUpdateRemoteAppList'), _handleOnChangeIfAutoUpdateAppList);
	new ToggleButton(get('BT_AUTO_HIDE_INFO'), preference.get('autoHideToolTip'), _handleOnChangeIfAutoHideInfo);
}

function _handleOnChangeIfAutoUpdateAppList(bValue){
	preference.set('autoUpdateRemoteAppList', bValue);
	checkIfUpdateLater();
}

function _handleOnChangeIfAutoHideInfo(bValue){
	preference.set('autoHideToolTip', bValue);
}

function _initSettings(){

    preference = new Preference(DEFAULT_SETTINGS);
}

function _updateLocalAppList(callback){
    getAppElements(success, failure);
	function success(appList){LOCAL_APP_LIST = appList;if(callback)callback();}
	function failure(info){LOCAL_APP_LIST = [];}
}

xPortal.addEventListener(xPortal.ON_INSTALL, function(event){_updateLocalAppList();});
xPortal.addEventListener(xPortal.ON_UNINSTALL, function(event){_updateLocalAppList();});
