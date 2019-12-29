'use strict';

// Depends on:
//		phonegap-plugin-push (https://github.com/phonegap/phonegap-plugin-push)
//		de.appplant.cordova.plugin.local-notification (https://github.com/katzer/cordova-plugin-local-notifications)
WMAPP.module('Extension.SNS', function(SNS) {

	SNS.registrationId = null;

	SNS.register = function(afterRegisterCallback, onErrorCallback) {

		if (SNS.registrationId) {
			console.error('Already registered for push notifications');
			return;
		}
		
		console.log('Registering SNS...')

		if (typeof PushNotification == "undefined") {
			console.error("Could not find PushNotification plugin. Please install it from https://github.com/phonegap/phonegap-plugin-push");
			return;
		}

		// If we havnt received the "onRegistration" callback within 3 seconds, assume it's failed
		SNS._registrationTimeout = setInterval(SNS.onRegistrationTimeout, 3000);

		SNS.Push = PushNotification.init({
			android: {
				forceShow: true,
			},
			ios: {
				alert: "true",
				sound: "true"
			},
			windows: {}
		});

		if (typeof afterRegisterCallback == "function") {
			SNS.afterRegistered = afterRegisterCallback;
		}
		
		if (typeof onErrorCallback == "function") {
			SNS.onError = onErrorCallback;
		}

		SNS.Push.on('registration', SNS.onRegistered);
		SNS.Push.on('notification', SNS.onNotification);
		SNS.Push.on('error', SNS.onError);
		
		// cordova.plugins.notification.local.on("click", function (notification, state) {
		// 	var data = null;
		// 	if (notification.data) {
		// 		data = JSON.parse(notification.data);
		// 	} else if (notification.aps) {
		// 		data = notification.aps;
		// 	}
		// 	if (data.url) {
		// 		setTimeout(function() {
		// 			window.open(data.url, "_system");
		// 		}, 10);
		// 	}
		// }, this);
	};
	
	SNS.unregister = function() {
		if (SNS.Push) {
			SNS.Push.unregister(function() {
				SNS.registrationId = null;
				console.log("Unregistered from Push Notifications");
			});
		}
	};

	SNS.onRegistered = function(data) {
		console.log("SNS Registered", data);
		// Cancel the registrationTimeout interval if we've successfully registered
		if (SNS._registrationTimeout) {
			clearInterval(SNS._registrationTimeout);
		}
		SNS.registrationId = data.registrationId;
		
		if (WMAPP.member && WMAPP.member.id) {
			SNS.registerEndpoint(WMAPP.member.id, WMAPP.Helper.slugify((localStorage.getItem('WMAPP.site') ? localStorage.getItem('WMAPP.site') : WMAPP.site).replace(/\s/g, '')));
		}
		
		SNS.afterRegistered(data.registrationId);
	};

	SNS.afterRegistered = function(registrationId) {
		// override this directly, or via SNS.register(afterRegisterCallback, onErrorCallback)
		
		if (WMAPP.member && WMAPP.member.id) {
			SNS.registerEndpoint(WMAPP.member.id, WMAPP.Helper.slugify((localStorage.getItem('WMAPP.site') ? localStorage.getItem('WMAPP.site') : WMAPP.site).replace(/\s/g, '')));
		}
		
	};
	
	
	SNS.onError = function(e) {
		// override this directly, or via SNS.register(afterRegisterCallback, onErrorCallback)
		console.error("SNS Error", e);
	};

	SNS.onRegistrationTimeout = function() {
		clearInterval(SNS._registrationTimeout);
		console.error("SNS Registration Timeout");
		// Trigger the error callback
		SNS.onError();
	};

	SNS.onNotification = function(data) {
		console.log("SNS Notification Received", data);

		if (data.additionalData.trigger) {
			if (data.additionalData.trigger == "test") {
				console.log("*** TRIGGER TEST ***");
				WMAPP.alert("*** TRIGGER TEST ***");
			}
			WMAPP.vent.trigger(data.additionalData.trigger);
			SNS.Push.finish();
			return;
		}

		var notification = null;

		if (data.message) {
			notification = {
				title: data.title,
				message: data.message,
				icon: data.icon,
				url: data.additionalData.url,
			}
		} else if (data['default'] && device.platform == "Android") {
			notification = JSON.parse(data['default.GCM']).data
		}

		if (notification) {
			if (notification.url) {
				if (data.additionalData.foreground || (data.additionalData.foreground === false && data.additionalData.coldstart === false && device.platform == "iOS")) {
					WMAPP.confirm(notification.message + "\n\nWould you like to view it now?", function(yes) {
						if (yes) {
							window.open(notification.url, "_system");
						}
					}, notification.title);
				} else {
					window.open(notification.url, "_system");
				}	
			}
			else if (notification.message) {
				if (data.additionalData.foreground && device.platform == "iOS") {
					try {
						cordova.plugins.notification.local.schedule({
							title: notification.title,
							text: notification.message,
							foreground: true,
							data: notification,
							sound: null,
							// icon: "res://icon",
							// /* NOTE
							//  * Ensure platforms/android/res contains an appropriatly sized icon.png in:
							//  *	drawable-hdpi
							//  *	drawable-ldpi
							//  *	drawable-mdpi
							//  *	drawable-xhdpi
							//  *	drawable-xxhdpi
							//  *	drawable-xxxhdpi
							//  */
						});
					} catch (err) {
						console.error(err);
					}
				}
			}
		}
		
		SNS.Push.finish();
	};
	
	SNS.registerEndpoint = function(memberId, site) {
		site = site || localStorage.getItem('WMAPP.site') || WMAPP.site;
		var promise = $.Deferred();
		if (memberId) {
			var callback = function() {
				WMAPP.Helper.showSpinner();
				$.ajax({
					url: 'https://' + site + WMAPP.server_tld + '/feature/core/core/registerPushEndpoint/' + memberId + '?token=' + SNS.registrationId,
					dataType: 'json',
					global: false,
				}).then(function() {
					WMAPP.Helper.hideSpinner();
					promise.resolveWith(arguments);
				}, function() {
					WMAPP.Helper.hideSpinner();
					promise.rejectWith(arguments);
				});
			}
			if (SNS.registrationId) {
				callback();
			} else {
				// Show a spinner while we're registering for notifications (remember to hide it on success or error handlers!)
				WMAPP.Helper.showSpinner();
				SNS.register(function() {
					WMAPP.Helper.hideSpinner();
					callback();
				}, function() {
					clearInterval(SNS._registrationTimeout);
					WMAPP.Helper.hideSpinner();
					WMAPP.alert("Your device (or operating system version) does not support push notifications issued by " + WMAPP.appName + ". This will NOT affect any other functionality of " + WMAPP.appName + ".", null, "Notice");
					promise.reject();
				});
			}
		} else {
			console.error('SNS: Could not register enpoint without memberId and token');
			promise.reject();
		}
		return promise;
	};
});
