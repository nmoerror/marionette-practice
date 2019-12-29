'use strict';
/**
 * In-App Purchases Library
 * @author Leo Mylonas
 *
 * Requires Cordova plugin https://github.com/j3k0/cordova-plugin-purchase
 */
WMAPP.module('Extension.InAppPurchases', function(InAppPurchases) {

	/**
	 * See https://github.com/j3k0/cordova-plugin-purchase/blob/master/doc/api.md#register
	 *
	 * 'products' is an array of objects comprising of 'id' and 'type'
	 * where 'id' is the product id, and 'type' is one of:
	 *					"free subscription"
	 *					"paid subscription"
	 *					"non renewing subscription"
	 *					"consumable"
	 *					"non consumable"
	 */
	InAppPurchases.SetupProducts = function(products) {
		var setup = function() {
			store.verbosity = store.DEBUG;
			_.each(products, function(product) {
				store.register(product);
			});
			InAppPurchases.Refresh();
		};
		if (window.cordova && window.cordova.version) {
			setup();
		} else {
			document.addEventListener('deviceready', setup);
		}
	};

	/**
	 * See https://github.com/j3k0/cordova-plugin-purchase/blob/master/doc/api.md#refresh
	 */
	InAppPurchases.Refresh = function() {
		store.refresh();
	};

	/**
	 * See https://github.com/j3k0/cordova-plugin-purchase/blob/master/doc/api.md#get
	 */
	InAppPurchases.Product = function(productId) {
		return store.get(productId);
	}

	/**
	 * See https://github.com/j3k0/cordova-plugin-purchase/blob/master/doc/api.md#order
	 * and https://github.com/j3k0/cordova-plugin-purchase/blob/master/doc/api.md#purchasing
	 * and https://github.com/j3k0/cordova-plugin-purchase/blob/master/doc/api.md#finish-a-purchase
	 */
	InAppPurchases.Buy = function(productId, successCallback, errorCallback) {
		if (typeof store == "undefined") {
			console.error("Tried to make an in-app purchase, but the Cordova Plugin is not available!");
			return;
		}
		var buy = function() {
			store.order(productId);
			store.when(productId).approved(function(product) {
				if (typeof successCallback == "function") {
					if (successCallback(product)) {
						product.finish();
					}
				} else {
					product.finish();
				}
			});
			store.when(productId).error(errorCallback);
			store.when(productId).cancelled(errorCallback);
		}
		if (store.ready()) {
			buy();
		} else {
			store.ready(buy);
		}
	};
});
