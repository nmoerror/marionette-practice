'use strict';

WMAPP.module('Extension.Application', function(Application) {
	Application.AbstractApplication = Backbone.Marionette.Module.extend({
        startWithParent: false,
        alertMessage: null,
        successMessage: null,
        notificationMessage: null,
		initialize: function() {
			var tileName = this.moduleName.replace(/_[0-9]+/, '');
			this._channel = Backbone.Wreqr.radio.channel('WMAPP.' + this.moduleName);
			this.listenTo(this, 'start', function() {
				WMAPP.vent.trigger('trigger:' + tileName + ':start', this.options.model, this.options, this);
			});
		},
		
		stopListening: function(other, event, callback) {
			if (!other) {
				var that = this;
				var properties = Object.getOwnPropertyNames(this);
				for (var i in properties) {
					var obj = this[properties[i]];
					if (
						(obj instanceof WMAPP.Extension.View.LayoutView) ||
						(obj instanceof WMAPP.Extension.View.ItemView) ||
						(obj instanceof WMAPP.Extension.View.CollectionView) ||
						(obj instanceof WMAPP.Extension.View.CompositeView)
					) {
						obj.destroy();
					} else if (
						(obj instanceof WMAPP.Extension.Model.Collection) ||
						(obj instanceof WMAPP.Extension.Model.PageableCollection)
					) {
						var otherListeners = [];
						_.each(obj._events, function(listeners, event) {
							_.each(listeners, function(listener) {
								if (listener.ctx != that && listener.ctx != obj && otherListeners.indexOf(listener.ctx) < 0) {
									otherListeners.push(listener.ctx);
								}
							});
						});
						if (!otherListeners.length) {
							obj.destroy();
						}
					}
				}
			}
			Backbone.Marionette.Module.prototype.stopListening.apply(this, arguments);
		}
	});
});
