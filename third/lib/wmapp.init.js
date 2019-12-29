'use strict';

if (window.__agent) {
	window.__agent.start(Backbone, Marionette);
}

window.WMAPP = new Backbone.Marionette.Application();
window.WMAPP.validPlugins = new Backbone.Collection();
window.WMAPP.tileApplications = {};
window.WMAPP.availableFeatures = [];
window.WMAPP.menu = [];
window.WMAPP.xhrErrors = [];
window.WMAPP.xhrHeaders = {};
window.WMAPP._timeline_other_id = null;
window.WMAPP._timeline_other_entity = null;
window.WMAPP.maxImageHeight = 10000;
window.WMAPP.maxImageWidth = 10000;

window.WMAPP.getAppRoot = function() {
	var appRoot = (WMAPP.isApp ? window.location.href.replace(window.location.hash, '').split('/').slice(0, -1).join('/') : '') +'/';
	console.log('App Root:', appRoot);
	return appRoot;
}

window.WMAPP.appRoot = WMAPP.getAppRoot();

window.WMAPP.on("start", function(options){
	// display any flash messages
	if (typeof flashMessage != "undefined" && flashMessage) {
		WMAPP.Helper.showMessage("message", flashMessage);
	}
	
	$.ajaxSetup({
		beforeSend: window.WMAPP.ajaxBeforeSendHandler,
	});
});

window.WMAPP.ajaxBeforeSendHandler = function(jqXhr, xhr) {
	if (WMAPP.member && WMAPP.member.id) {
		jqXhr.setRequestHeader('X-Member', WMAPP.member.id);
	}
	if (WMAPP.isApp && localStorage.getItem('WMAPP.user')) {
		try {
			var user = JSON.parse(localStorage.getItem('WMAPP.user'));
			if (user.email && user.password) {
				jqXhr.setRequestHeader('Authorization', 'Basic ' + btoa(user.email + ':' + user.password));
			}
		} catch (err) {
			console.error('Could not parse WMAPP.user as JSON', err);
		}
	}
	if (WMAPP.xhrHeaders && _.size(WMAPP.xhrHeaders) > 0) {
		_.each(WMAPP.xhrHeaders, function(value, header) {
			jqXhr.setRequestHeader(header, value);
		});
	}
}

window.WMAPP.gotoPage = function(url) {
	if (WMAPP.isApp) {
		if (WMAPP._coreAppPage && url != WMAPP.loginTile) {
			url = 'core_app_page_tile/' + url.replace(/^\//, '');
		}
		WMAPP.vent.trigger('trigger:menu:gotoRoute', url.replace('#', ''));
	} else {
		window.location = '/' + url.replace(/^\//, '');
	}
};

window.WMAPP.renderContentArea = function (contentArea, options) {
	WMAPP.Log.getLogger("WMAPP").trace("renderContentArea begin");
	var _allTileDivs = $(contentArea).find('.wmapp-tile');
	for (var i = 0; i < _allTileDivs.length; i++) {
		var _tileDiv = _allTileDivs[i];
		var _tileType = $(_tileDiv).data('tile-type');
		for (var module in WMAPP.submodules) {
			if ((WMAPP.submodules[module] instanceof WMAPP.Extension.Module.AbstractModule) && (_.has(WMAPP.submodules[module].tileTypes, _tileType))) {
				WMAPP.submodules[module].startTileApp(_tileDiv, options);
			}
		}
	}
	WMAPP.Log.getLogger("WMAPP").trace("renderContentArea end");
};

window.WMAPP.destroyContentArea = function (contentArea) {
	WMAPP.Log.getLogger("WMAPP").trace("destroyContentArea begin");
	var _allTileDivs = $(contentArea).find('.wmapp-tile');
	for (var i = 0; i < _allTileDivs.length; i++) {
		var _tileDiv = _allTileDivs[i];
		var _tileType = $(_tileDiv).data('tile-type');
		for (var module in WMAPP.submodules) {
			if ((WMAPP.submodules[module] instanceof WMAPP.Extension.Module.AbstractModule) && (_.has(WMAPP.submodules[module].tileTypes, _tileType))) {
				WMAPP.submodules[module].stopTileApp(_tileDiv);
			}
		}
	}
	WMAPP.Log.getLogger("WMAPP").trace("destroyContentArea end");
};

window.WMAPP._acceptedFileTypes = {
	'svg': 'image_svg+xml',
	'jpg': 'image_jpeg',
	'jpeg': 'image_jpeg',
	'tiff': 'image_tiff',
	'png': 'image_png',
	'gif': 'image_gif',
	'bmp': 'image_bmp',
	'psd': 'application_photoshop',
	'ai': 'application_illustrator',
	'doc': 'application_msword',
	'rtf': 'text_rtf',
	'pdf': 'application_pdf',
	'docx': 'application_vnd.openxmlformats-officedocument.wordprocessingml.document',
	'csv': 'text_csv',
	'xls': 'application_vnd.ms-excel',
	'xlsx': 'application_vnd.openxmlformats-officedocument.spreadsheetml.sheet',
	'ico': 'image_x-icon',
	'rar': 'application_x-rar-compressed',
	'zip': 'application_zip',
	'eps': 'application_eps',
	'txt': 'text_plain',
	'ppt': 'application_vnd.ms-powerpoint',
};
window.WMAPP.acceptedFileTypes = window.WMAPP._acceptedFileTypes;
window.WMAPP.resetAcceptedFileTypes = function () {
	window.WMAPP.acceptedFileTypes = window.WMAPP._acceptedFileTypes;
};

window.WMAPP._acceptedImageTypes = {
	'svg': 'image_svg+xml',
	'jpg': 'image_jpeg',
	'jpeg': 'image_jpeg',
	'tiff': 'image_tiff',
	'png': 'image_png',
	'gif': 'image_gif',
	'bmp': 'image_bmp',
	'ico': 'image_x-icon',
};
window.WMAPP.acceptedImageTypes = window.WMAPP._acceptedImageTypes;
window.WMAPP.resetAcceptedImageTypes = function () {
	window.WMAPP.acceptedImageTypes = window.WMAPP._acceptedImageTypes;
};

window.WMAPP.chartColours = ['#3366CC','#DC3912', '#FF9900', '#109618','#990099', '#3B3EAC','#0099C6','#DD4477','#66AA00','#B82E2E','#316395','#994499','#22AA99','#AAAA11','#6633CC','#E67300','#8B0707','#329262','#5574A6','#3B3EAC'];

window.WMAPP._appSettings = {
	//max upload size
	maxUpload: 5000000,
};

window.WMAPP._lightboxSetting = {
	//custom css class
	className: false,
	//looking
	scrolling: true,
	closeButton: true,
	opacity: 0.8,
	//animation
	transition: 'elastic',
	fadeOut: 100,
	//dimension
	width: false,
	height: false,
	innerWidth: false,
	innerHeight: false,
	initialWidth: 300,
	initialHeight: 100,
	maxWidth: false,
	maxHeight: false,
	fixedSize: false,
	canRotate: false,
	//position
	fixed: true,
	top: false,
	bottom: false,
	left: false,
	right: false,
	reposition: true,
	//content
	iframe: false,
	inline: false,
	onCompleteCustom: false,
	// modal
	modal: false,
	title: '',
	extraClass: false,
	closeImage: 'img/cross.svg',
	saveImage: 'img/tick.svg',
	overlayClose: true,
	escKey: true,
};

/**
 * Light box utility
 *
 * @method WMAPP.lightbox
 * @param {String / Element / jQuery Object} target Target to be displayed in the lightbox. Could be a URL, a CSS selector, a document element or a jQuery object.
 * @param {Object} setting The lightbox setting options
 */
window.WMAPP.lightbox = {
	show: function (target, setting) {
		WMAPP.Log.getLogger("WMAPP").trace('lightbox - start');
		var _setting = _.pick((setting || {}), _.keys(WMAPP._lightboxSetting));
		_setting = _.defaults(_setting, WMAPP._lightboxSetting);
		_setting.onCleanup = WMAPP.lightbox._destroy;
		if (_.isString(target)) {
			_setting.href = target;
		} else {
			_setting.html = $(target)[0].outerHTML;
		}
		if (typeof ($.colorbox) === 'function') {
			if ($('#cboxOverlay').length > 0 && $('#cboxOverlay').css('display') === 'none') { // IF colorbox is already displayed, return
				$.colorbox(_setting);
			} else {
				WMAPP.Log.getLogger("WMAPP").warn('lightbox - lightbox already displayed');
			}
		} else {
			WMAPP.Log.getLogger("WMAPP").error('lightbox - No light box implementation');
		}
		WMAPP.Log.getLogger("WMAPP").trace('lightbox - end');
	},
	update: function (target, setting) {
		var _setting = _.pick((setting || {}), _.keys(WMAPP._lightboxSetting));
		_setting = _.defaults(_setting, WMAPP._lightboxSetting);
		_setting.onCleanup = WMAPP.lightbox._destroy;
		if (_.isString(target)) {
			_setting.href = target;
		} else {
			_setting.html = $(target)[0].outerHTML;
		}

		$.colorbox(_setting);
	},
	close: function () {
		$.colorbox.close();
	},
	_destroy: function () {
		WMAPP.vent.trigger('trigger:coreLightboxClose');
	}
};

/**
 * Light box slide
 *
 * @method WMAPP.lightboxSlide
 * @param {String Array / jQuery Object} slides Slides to be displayed in the lightbox. Could be an array of JSON objects {href,title} or a jQuery object including anchor elements.
 * @param {Object} setting The lightbox setting options
 */
window.WMAPP.lightboxSlide = function (slides, setting) {
	WMAPP.Log.getLogger("WMAPP").trace('lightboxSlide - start');
	var startSlide = setting.start || 0;
	var _setting = _.pick((setting || {}), _.keys(WMAPP._lightboxSetting));
	_setting = _.defaults(_setting, WMAPP._lightboxSetting);
	_setting.rel = 'wmappLightboxSlideGroup';
	_setting.photo = setting.photo || false;
	var _jqObj = null;
	if (_.isArray(slides)) {
		var _htmlStr = '<div id="WMAPP-Global-Unique-Lightbox-Slides" style="display:none;">';
		_.each(slides, function (slide) {
			if (slide.href) {
				_htmlStr += '<a href="' + slide.href + '" title="' + slide.title + '">' + slide.title + '</a>';
			} else {
				WMAPP.Log.getLogger("WMAPP").error('lightboxSlide - A slide must have a href property', JSON.stringify(slide));
				throw "A slide must have a href property";
			}
		});
		_htmlStr += '</div>';
		_jqObj = $(_htmlStr);
	} else if (slides instanceof jQuery) {
		_jqObj = $('<div id="WMAPP-Global-Unique-Lightbox-Slides" style="display:none;"></div>');
		_jqObj.append(slides.clone());
	} else {
		WMAPP.Log.getLogger("WMAPP").error('Invalid slides');
		throw 'Invalid slides';
	}
	$(document.body).append(_jqObj);
	_setting.onCleanup = function () {
		WMAPP.Log.getLogger("WMAPP").trace('lightboxSlide.cleanup - start');
		_jqObj.remove();
		WMAPP.Log.getLogger("WMAPP").trace('lightboxSlide.cleanup - end');
	};
	if (typeof ($.colorbox) === 'function') {
		if ($('#cboxOverlay').length > 0 && $('#cboxOverlay').css('display') === 'none') {
			var linkArr = _jqObj.find('a');
			linkArr.colorbox(_setting);
			_jqObj.find('a').get(startSlide % linkArr.length).click();
		} else { // IF colorbox is already displayed, return
			WMAPP.Log.getLogger("WMAPP").warn('lightboxSlide - lightbox already displayed');
		}
	} else {
		WMAPP.Log.getLogger("WMAPP").error('lightboxSlide - No light box implementation');
	}
	WMAPP.Log.getLogger("WMAPP").trace('lightboxSlide - end');
};

window.WMAPP.LightboxRegion = {
	show: function (view, setting) {
		WMAPP.Log.getLogger("WMAPP").trace('LightboxRegion.show - start');
		var _setting = _.pick((setting || {}), _.keys(WMAPP._lightboxSetting));
		_setting = _.defaults(_setting, WMAPP._lightboxSetting);

		var regionEl = '<div id="WMAPP-Global-Unique-Lightbox-Region"></div>';
		_setting.html = regionEl;
		if (_setting.modal) {
			_setting.innerWidth = '100%';
			_setting.innerHeight = window.innerHeight + 'px';
			_setting.transition = 'none';
			_setting.fixedSize = true;
			_setting.closeButton = false;
			_setting.html = '<div class="titlebar">'
			if (_setting.closeImage) {
				_setting.html += '<img src="' + _setting.closeImage + '" data-trigger="onModalClosed" />';
			}
			_setting.html += '<div class="title">' + (_setting.title ? _setting.title : '') + '</div>';
			if (_setting.saveImage) {
				_setting.html += '<img src="' + _setting.saveImage + '" data-trigger="onModalSaved" />';
			}
			_setting.html += '</div>' + regionEl;
			$('#colorbox').addClass('modal');
			if (_setting.extraClass) {
				$('#colorbox').addClass(_setting.extraClass);
				this.extraBoxClass = _setting.extraClass;
			}
		}

		_setting.onCleanup = WMAPP.LightboxRegion._destroy;
		_setting.onComplete = function () {

			WMAPP.LightboxRegion._region = new Backbone.Marionette.Region({
				el: '#WMAPP-Global-Unique-Lightbox-Region'
			});

			WMAPP.LightboxRegion._region.$el.parent().find('.titlebar img').on('click', function(e) {
				view.trigger('trigger:' + $(e.target).attr('data-trigger'));
			});

			WMAPP.LightboxRegion._region.show(view);

			if (!_setting.fixedSize) {
				$.colorbox.resize();
			}

			$('#colorbox').addClass('transition');
			setTimeout(function() {
				$('#colorbox').addClass('visible');
			}, 10);

			if (typeof (_setting.onCompleteCustom) == 'function') {
				_setting.onCompleteCustom.call(this);
			}
		};
		if (_setting.canRotate) {
			$(window).resize(function(){
				WMAPP.LightboxRegion._region.currentView.render();
	        	if (window.innerHeight > window.innerWidth){
	        		$.colorbox.resize({width:'90%'});
	    		} else {
	    			if (!WMAPP.MediaQuery.matchSmallWidth()){
	    				$.colorbox.resize({width:'90%'});
        			} else {
        				$.colorbox.resize({height:'85%', width:'85%'});
        			}
	    		}
	        });
		}
		if (typeof ($.colorbox) === 'function') {
			if ($('#cboxOverlay').length > 0 && $('#cboxOverlay').css('display') === 'none') { // IF colorbox is already displayed, return
				$.colorbox(_setting);
			} else {
				WMAPP.Log.getLogger("WMAPP").warn('LightboxRegion.show - lightbox already displayed');
			}
		} else {
			WMAPP.Log.getLogger("WMAPP").error('LightboxRegion.show - No light box implementation');
		}
		WMAPP.Log.getLogger("WMAPP").trace('LightboxRegion.show - end');
	},
	update: function(view) {
		WMAPP.Log.getLogger("WMAPP").trace('LightboxRegion.show - update');
		WMAPP.LightboxRegion._region.show(view);
	},
	close: function () {
		$.colorbox.close();
	},
	_destroy: function () {
		WMAPP.Log.getLogger("WMAPP").trace('LightboxRegion.destroy - start');
		$(window).off("resize");
		$('#colorbox').removeClass('visible');
		if (this.extraBoxClass) {
			$('#colorbox').removeClass(this.extraBoxClass);
			delete this.extraBoxClass;
		}
		$(window).off("resize");
		setTimeout(function() {
			if (WMAPP.LightboxRegion._region) {
				WMAPP.LightboxRegion._region.reset();
				WMAPP.LightboxRegion._region = false;
			}
			setTimeout(function() {
				$('#colorbox').removeClass('modal visible transition');
				WMAPP.Log.getLogger("WMAPP").trace('LightboxRegion.destroy - end');
			}, 50);
		}, 300);
	}
};

window.WMAPP.resizeLightbox = function () {
	
	$.colorbox.resize();
};

window.WMAPP.MediaQuery = {
	matchSmallWidth: function () {
		return !window.matchMedia("(min-width: 60em)").matches;
	}
};

window.WMAPP.pageTile = {};

window.WMAPP.xhrPromiseErrorHandler = function(xhr, context) {
	WMAPP.xhrErrors.push('Error (' + xhr.statusText + ' ' + xhr.status + '): ' + context.type + ' ' + context.url + '\n' + (xhr.responseText ? xhr.responseText : '(no response)') + '\n');
};

window.WMAPP.dialog = function(customOptions) {
	var self = {
		promise: $.Deferred(),
		options: _.defaults(customOptions || {}, {
			message: null,
			title: null,
			buttons: ['OK'],
			showClose: false,
			width: null,
			height: null,
			warning: false,
			view: null,
			className: null,
		}),
	}
	
	self.close = function(resolvePromise) {
		if (typeof resolvePromise == "undefined" || resolvePromise) {
			self.promise.resolve();
		} else {
			self.promise.reject();
		}

		if (self.region) {
			self.region.reset();
		}
		self.el.remove();
	};
	
	self.el = $(
		'<div class="wmapp-dialog ' + (self.options.className ? self.options.className : '') + '">' +
		'	<div' +
		'		class="wmapp-dialog-content' + (self.options.warning ? ' warning' : '') + '"' +
		'		style="' + (self.options.width ? ('width:' + self.options.width + '; ') : '') + (self.options.height ? ('height: ' + self.options.height + '; ') : '') + '"' +
		'	></div>' +
		'</div>'
	);
	self.elContent = self.el.find('.wmapp-dialog-content');
	
	if (self.options.view instanceof Backbone.View) {
		self.region = new Marionette.Region({
			el: self.elContent,
		});
		self.options.view.options._dialog = self;
		self.region.show(self.options.view)
	}
	
	if (self.options.title) {
		self.elContent.prepend('<div class="wmapp-dialog-content-title">' + self.options.title + '</div>');
	}
	
	if (self.options.showClose) {
		self.elContent.prepend('<div class="wmapp-dialog-content-close">X</div>');
		self.elContent.on('click', '.wmapp-dialog-content-close', function() {
			self.promise.reject(self.el);
			if (self.region) {
				self.region.reset();
			}
			self.el.remove();
		});
	}
	
	if (self.options.message) {
		self.elContent.append('<div class="wmapp-dialog-content-message">' + (typeof self.options.message == 'string' ? WMAPP.Helper.nl2br(self.options.message) : '') + '</div>');
		if (typeof self.options.message != 'string') {
			self.elContent.find('.wmapp-dialog-content-message').append(self.options.message);
		}
	}
	
	if (self.options.buttons && self.options.buttons.length) {
		self.elButtons = $('<div class="wmapp-dialog-content-buttons"></div>');
		_.each(self.options.buttons, function(button, i) {
			self.elButtons.append('<button data-index="' + (i+1) + '">' + button + '</button>');
		});
		
		self.elButtons.on('click', 'button', function() {
			self.promise.resolve(parseInt($(this).attr('data-index')), self.el);
			if (self.region) {
				self.region.reset();
			}
			self.el.remove();
		});
	}
	
	self.elContent.append(self.elButtons);
	
	$('body').append(self.el);
	
	return self;
};


window.WMAPP.confirm = function (message, callback, title, warning) {
	if (navigator && navigator.notification && navigator.notification.confirm) {
		navigator.notification.confirm(message, function (buttonIndex) {
			if (typeof callback == "function") {
				callback(buttonIndex === 1);
			}
		}, title ? title : (WMAPP.appName ? WMAPP.appName : 'Confirm'), ["Yes", "No"]);
	} else {
		WMAPP.dialog({
			title: title ? title : (WMAPP.appName ? WMAPP.appName : 'Confirm'),
			message: message,
			buttons: ["Yes", "No"],
			warning: warning,
		}).promise.then(function(buttonIndex) {
			if (typeof callback == "function") {
				callback(buttonIndex === 1);
			}
		}, function() {
			if (typeof callback == "function") {
				callback(false);
			}
		});
	}
};

window.WMAPP.alert = function (message, callback, title, warning) {
	if (navigator && navigator.notification && navigator.notification.alert) {
		navigator.notification.alert(message, function (i) {
			if (typeof callback == "function") {
				callback();
			}
		}, title ? title : (WMAPP.appName ? WMAPP.appName : 'Notice'));
	} else {
		WMAPP.dialog({
			title: title ? title : (WMAPP.appName ? WMAPP.appName : 'Notice'),
			message: message,
			warning: warning
		}).promise.then(callback);
	}
};

window.onerror = function (errorMsg, url, lineNumber, column, errorObj) {
	if (errorMsg == 'Uncaught TypeError: a.getAttribute is not a function') {
		return true
	}
	return false;
};

if (typeof cordova == "undefined") {
	$(function () {
		WMAPP.start();
		$(document).foundation();

		if (WMAPP.isAdmin) {
			bindTileAnimations();
		}
	});
}
