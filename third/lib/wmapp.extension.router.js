'use strict';

WMAPP.module('Extension.Router', function (Router) {
	/**
	 * Extend the Router
	 */
	Router.AppRouter = Backbone.Marionette.AppRouter.extend({
		initialize: function () {
			var that = this;
			if (WMAPP.isApp && this.appTile) {
				this.appRoutes = {};
				for (var i in this.constructor.prototype.appRoutes) {
					var key = (i == '' || i == this.appTile ? this.appTile : (this.appTile+'/'+i));
					this.appRoutes[key] = this.constructor.prototype.appRoutes[i];
					if (i != key) {
						delete this.appRoutes[i];
					}
				}
			}

			if (Backbone.History.started) {
				_.defer(function () {
					WMAPP.Log.getLogger("WMAPP.Extension.Router.AppRouter").trace("Backbone history reload...");
					if (WMAPP.isApp) {
						var currentUri = window.location.hash.substring(1);
						if (_.filter(that.appRoutes, function(methodName, route) {
							var routeRegex = that._routeToRegExp(route);
							return currentUri.match(routeRegex) != null;
						}).length > 0) {
							Backbone.history.loadUrl(currentUri);
						}
					} else {
						Backbone.history.loadUrl();
					}
				});
			}

		},
		parseQuery: function (queryString) {
			if (!_.isString(queryString)) { // if queryString is not passed in, get queryString from window.location
				var locationStr = window.location.toString();
				if (locationStr.indexOf('?') < 0) {
					queryString = '';
				} else {
					queryString = locationStr.substring(locationStr.indexOf('?') + 1);
				}
			}
			var parameters = {};
			var queryPairs = queryString.split('&');
			for (var i = 0; i < queryPairs.length; i++) {
				var queryPairArr = queryPairs[i].split('=');
				if (queryPairArr.length === 2) {
					parameters[queryPairArr[0]] = decodeURIComponent(queryPairArr[1]);
				}
			}

			// make it global
			WMAPP.parameters = parameters;

			return parameters;
		},
		updateQuery: function (parameters, options) {
			var currentQueryParameters = this.parseQuery();
			_.defaults(parameters, currentQueryParameters);
			var fragment = Backbone.history.getFragment().split('?')[0];
			this.navigate(fragment + '?' + this.stringifyQuery(parameters), options);
		},
		stringifyQuery: function (parameters) {
			var queryPairs = [];
			_.each(parameters, function (value, key) {
				queryPairs.push(key + '=' + encodeURIComponent(value));
			});
			return queryPairs.join('&');
		},
		navigate: function (uri, options) {
			if (!Backbone.History.savedStates) {
				Backbone.History.savedStates = [];
			}
			if (uri != "" && Backbone.History.savedStates[Backbone.History.savedStates.length - 1] != uri) {
				Backbone.History.savedStates.push(uri);
				//console.log("History Stack", Backbone.History.savedStates);
				if (Backbone.History.savedStates.length > 1) {
					$(".wmapp-mobile-back-button").css('opacity', 1);
				} else {
					$(".wmapp-mobile-back-button").css('opacity', 0);
				}
			}
			Backbone.Marionette.AppRouter.prototype.navigate.call(this, uri, options);
		}
	});
});
