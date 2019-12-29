'use strict';

WMAPP.module('Extension.Module', function(Module) {
	Module.AbstractModule = Backbone.Marionette.Module.extend({
		startWithParent: true,
		tileTypes: {},
		getChannel: function() {
			if(this._channel) {
				return this._channel;
			} else {
				this._channel = Backbone.Wreqr.radio.channel('WMAPP.' + this.moduleName + '.channel' + WMAPP.Helper.random(100000, 999999));
				return this._channel;
			}
		},
		onStart: function() {
			WMAPP.Log.getLogger("WMAPP." + this.moduleName).trace("Module onStart begin");
			var _allTileDivs = $('.wmapp-tile');
			for (var i = 0; i < _allTileDivs.length; i++) {
				var _tileDiv = _allTileDivs[i];
				this.startTileApp(_tileDiv);
			}
			WMAPP.Log.getLogger("WMAPP." + this.moduleName).trace("Module onStart end");
		},
		onStop: function() {
			WMAPP.Log.getLogger("WMAPP." + this.moduleName).trace("Module onStop begin");
			for (var _tileAppName in WMAPP.tileApplications) {
				WMAPP.tileApplications[_tileAppName].stop();
				WMAPP.tileApplications[_tileAppName]=null;
			}
			WMAPP.Log.getLogger("WMAPP." + this.moduleName).trace("Module onStop end");
		},
		startTileApp: function(_tileDiv, options) {
			var _tileType = $(_tileDiv).data('tile-type');
			if (!_.has(this.tileTypes, _tileType)) { // if tile type is not found in this module, return immediately
				return;
			}
			var _featurePluginId = $(_tileDiv).data('feature-plugin-id');
			var _featuretileId = $(_tileDiv).data('feature-tile-id');
			var _pageTileId = $(_tileDiv).data('page-tile-id');
			var _tileAppName = _tileType + '_' + _pageTileId;
			var _tileDivInner = $(_tileDiv).find('#wmappTileInner' + _pageTileId);

			//GENERAL TILE OPTIONS
			var _tileOptions = {
				tileAppId: _pageTileId,
				featureTileId: _featuretileId,
				tileAppName: _tileAppName,
				regionId: _tileDivInner.length ? _tileDivInner[0] : ('#wmappTileInner' + _pageTileId),
				pluginId: _featurePluginId,
			};
			_tileOptions = _.extend(_tileOptions, options);


			//TILE SETTING OPTIONS FROM A JSON OBJECT EMBEDDED IN THE TILE DIV
			var _optionScript = $(_tileDiv).find('script');
			if(_optionScript.length > 0) {
				try {
					var _settingOptions;
					_settingOptions = eval('('+_optionScript.first().html().trim()+')');
					if(!_.isObject(_settingOptions)){
						throw {message: "Tile setting options must be a valid json object"};
					}
					_.defaults(_tileOptions, _settingOptions);
				} catch(_err) {
					WMAPP.Log.getLogger("WMAPP." + this.moduleName).warn(_err.message);
				}
			}

			var optionsString = '';
			try {
				optionsString = JSON.stringify(_tileOptions);
			} catch (err) {
				optionsString = err.toString();
			}
			
			WMAPP.Log.getLogger("WMAPP." + this.moduleName).trace("startTileApp : Tile Type - " + _tileType + ", Tile ID - " + _pageTileId + ", Options - " + optionsString);
			var _tileAppClass = WMAPP.Helper.getPropertyByPath(window, this.tileTypes[_tileType]); // Get a reference to the constructor function
			if(_.isFunction(_tileAppClass) && _tileAppClass.prototype instanceof WMAPP.Extension.Application.AbstractApplication) { // if constructor has been found
				WMAPP.Log.getLogger("WMAPP." + this.moduleName).trace("startTileApp start");
				var _tileApp = WMAPP.module(_tileAppName, _tileAppClass);
				WMAPP.tileApplications[_tileAppName] = _tileApp;
				_tileApp.start(_tileOptions);
				WMAPP.Log.getLogger("WMAPP." + this.moduleName).trace("startTileApp end");
			} else {
				WMAPP.Log.getLogger("WMAPP." + this.moduleName).error("startTileApp failed - Tile App Class not found. ",this.tileTypes[_tileType]);
			}
		},
		stopTileApp: function(_tileDiv) {
			var _tileType = $(_tileDiv).data('tile-type');
			var _pageTileId = $(_tileDiv).data('page-tile-id');
			var _tileAppName = _tileType + '_' + _pageTileId;
			if (WMAPP.tileApplications[_tileAppName] !== undefined) {
				WMAPP.Log.getLogger("WMAPP." + this.moduleName).trace("stopTileApp : Tile Type - " + _tileType + ", Tile ID - " + _pageTileId);
				WMAPP.tileApplications[_tileAppName].stop();
				WMAPP.tileApplications[_tileAppName].stopListening();
				delete WMAPP[_tileAppName];
				delete WMAPP.tileApplications[_tileAppName];
				WMAPP.Log.getLogger("WMAPP." + this.moduleName).trace("stopTileApp end");
			}
		}
	});

});
