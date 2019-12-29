'use strict';

/**
 * Geolocation, Geofencing, and Beacon scanning
 * Created by Leo Mylonas with portions by Bo Gao
 */
WMAPP.module('Geolocation', function(Geolocation) {

	// loops/watches for gps and beacons
	Geolocation.positionWatch = null;
	Geolocation.beaconWatch = null;

	// event handlers will be bound here
	Geolocation.onEnterGeofenceHandler = null;
	Geolocation.onExitGeofenceHandler = null;
	Geolocation.onPositionUpdatedHandler = null;
	Geolocation.onBeaconChangedHandler = null;

	// initialise the geofence
	Geolocation.initGeofencing = function () {
		console.log("initialising geofencing");
		if (window.device.isAndroid) {
			// no need toi call a specific initialise function - it happens automatically when the plugin loads
			window.geofence.initialize();

			// what should happen when a geofence is crossed
			window.geofence.receiveTransition = function (geofences) {
				// android provides an array of current geofences - usually one, but could be multiple
				for (var i = 0; i < geofences.length; i++) {
					if (geofences[i].transitionDetected == 1) {
						WMAPP.Geolocation.onEnterGeofence(geofences[i]);
					} else if (geofences[i].transitionDetected == 2) {
						WMAPP.Geolocation.onExitGeofence(geofences[i]);
					}
				}
			}
		} else if (window.device.isIos) {
			// create a delegate for ios to come back to when a geofence is triggered
			var delegate = new cordova.plugins.locationManager.Delegate();

			// this (appears to be) called only when geolocation is initialised
			delegate.didDetermineStateForRegion = function (pluginResult) {
				// this plugin also scans for ibeacons, so let's only use CircularReagions (geofence)
				if (pluginResult.region.typeName == "CircularRegion") {
					// check our state within the geofence
					if (pluginResult.state == "CLRegionStateInside") {
						WMAPP.Geolocation.onEnterGeofence(pluginResult.region);
					} else {
						WMAPP.Geolocation.onExitGeofence(pluginResult.region);
					}
				}
			}

			// what to do when a geofence is exited
			delegate.didExitRegion = function (pluginResult) {
				// this plugin also scans for ibeacons, so let's only use CircularReagions (geofence)
				if (pluginResult.region.typeName == "CircularRegion") {
					WMAPP.Geolocation.onEnterGeofence(pluginResult.region);
				}
			};

			//do stuff when the app enters a beacon region
			delegate.didEnterRegion = function (pluginResult) {
				// this plugin also scans for ibeacons, so let's only use CircularReagions (geofence)
				if (pluginResult.region.typeName == "CircularRegion") {
					WMAPP.Geolocation.onExitGeofence(pluginResult.region);
				}
			};

			// create the delegate and get authentication from the user
			cordova.plugins.locationManager.setDelegate(delegate);
			cordova.plugins.locationManager.requestAlwaysAuthorization()

		}
	};

	// stops monitoring all geofences
	Geolocation.removeAllGeofences = function (callback) {
		console.log("removing existing geofences");
		window.geofence.removeAll(callback, function () {
			console.log("failed to remove geofences");
		})
	};

	// this is called whenver a geofence is entered
	Geolocation.onEnterGeofence = function (geofence) {
		console.log("geofence entered");
		if (typeof WMAPP.Geolocation.onEnterGeofenceHandler == "function") {
			WMAPP.Geolocation.onEnterGeofenceHandler(WMAPP.Geolocation.geofenceToGeneric(geofence));
		}
	};

	// this is called whenever a geofence is exited
	Geolocation.onExitGeofence = function (geofence) {
		console.log("geofence exited");
		if (typeof WMAPP.Geolocation.onExitGeofenceHandler == "function") {
			WMAPP.Geolocation.onExitGeofenceHandler(WMAPP.Geolocation.geofenceToGeneric(geofence));
		}
	};

	// since we're using different plugins for the different platforms,
	// we should have a method to get a generic version of the geofence
	Geolocation.geofenceToGeneric = function (geofence) {
		var transitionTypes = {
			1: "enter",
			2: "exit",
			"CLRegionStateInside": "enter",
			"CLRegionStateOutside": "exit",
		}
		return {
			id: geofence.id,
			latitude: geofence.latitude,
			longitude: geofence.longitude,
			radius: geofence.radius,
			transition: (window.device.isAndroid ? transitionTypes[geofence.transitionDetected] : transitionTypes[geofence.state])
				//transition: transitionTypes[geofence.transitionDetected]
		}
	};

	// adds a geofence to be monitored by the os
	// addGeofence (string id, float latitude, float longitude, int radius)
	Geolocation.addGeofence = function (id, latitude, longitude, radius) {
		console.log("adding geofence");
		if (window.device.isAndroid) {
			window.geofence.addOrUpdate({
				id: id,
				latitude: latitude,
				longitude: longitude,
				radius: radius,
				transitionType: 3, //Type of transition 1 - Enter, 2 - Exit, 3 - Both
				notification: {
					title: "hey",
					text: "how are you"
				}
			}, function () {
				console.log('geofence successfully added');
			}, function (error) {
				console.log('adding geofence failed: ' + JSON.stringify(error));
			});
		} else if (window.device.isIos) {
			var newCircRegion = new cordova.plugins.locationManager.CircularRegion(id, latitude, longitude, radius);
			cordova.plugins.locationManager.startMonitoringForRegion(newCircRegion).fail(function (error) {
				console.log('Adding geofence failed: ' + JSON.stringify(error));
			}).done(function () {
				console.log('Geofence successfully added');
			});
		}
	};

	// gets the current gps position (and sends it back via a callback)
	Geolocation.getCurrentPosition = function (callback) {
		console.log("getting gps position");
		navigator.geolocation.getCurrentPosition(function (position) {
			if (typeof callback == "function") {
				callback({
					latitude: position.coords.latitude,
					longitude: position.coords.longitude,
					altitude: position.coords.altitude,
					accuracy: position.coords.accuracy
				});
			}
		}, function (error) {
			console.log("Could not get GPS position: " + JSON.stringify(error));
		});
	};

	// starts a loop to watch the user's position
	// (will get their gps location every [interval] seconds)
	// set callback to whatever needs to happen when a position is updated.
	Geolocation.startWatchingPosition = function (interval) {
		console.log("starting to watch gps position");
		WMAPP.Geolocation.positionWatch = setInterval(function () {
			WMAPP.Geolocation.getCurrentPosition(WMAPP.Geolocation.onPositionUpdated);
		}, interval * 1000);
	};

	// stops the loop watching th user's position
	Geolocation.stopWatchingPosition = function () {
		console.log("stopping watching gps position");
		clearInterval(WMAPP.Geolocation.positionWatch);
	};

	// this is called when the gps position is updated (from within the loop/watch)
	Geolocation.onPositionUpdated = function (position) {
		console.log("gps position updated");
		if (typeof WMAPP.Geolocation.onPositionUpdatedHandler == "function") {
			WMAPP.Geolocation.onPositionUpdatedHandler(position);
		}
	};

	// start scanning for bluecats beacons
	Geolocation.startWatchingBeacons = function (token, callback) {
		console.log("stawrting to watch for beacons");
		console.log("initialising beacon scanning");
		// initialise the scan
		if (typeof com == "undefined") {
			console.log("Bluecats plugin failed");
		} else {
			com.bluecats.beacons.startPurringWithAppToken(token, function () {
				// start watching
				WMAPP.Geolocation.beaconWatch = com.bluecats.beacons.watchClosestBeaconChange(function (watchData) {
					WMAPP.Geolocation.onBeaconChanged(watchData.filteredMicroLocation.beacons);
				}, function (error) {
					console.log("failed to watch beacon changes");
				}, {
					secondsBeforeExitBeacon: 1,
					filter: {}
				});
			}, function (error) {
				console.log("failed to initialise beacon scanning");
			}, {});
		}
	};

	// stop scanning for bluecats beacons
	Geolocation.stopWatchingBeacons = function () {
		console.log("stopping watching beacons");
		if (typeof com == "undefined") {
			console.log("Bluecats plugin failed");
		} else {
			com.bluecats.beacons.clearWatch(WMAPP.Geolocation.beaconWatch);
		}
	};

	// this is called whenever a beacon is detected or when a new beacon is
	// detected with a stronger signal (ie physically closer)
	Geolocation.onBeaconChanged = function (beacon) {
		console.log("closest beacon changed");
		if (typeof WMAPP.Geolocation.onBeaconChangedHandler == "function") {
			WMAPP.Geolocation.onBeaconChangedHandler(beacon);
		}
	};

	// determins the radius of a circle to cover a polygon [[x,y],[x,y]...]
	// getRadiusOfPolygon([[float x1, float y1],[float x2, float y2]...])
	// NOTE: the polygon coordinates myst be sequential
	Geolocation.getRadiusOfPolygon = function (pollygon) {
		var centre = [0, 0];
		var radius = 0;
		for (var i = 0; i < pollygon.length; i++) {
			centre[0] = centre[0] + pollygon[i][0];
			centre[1] = centre[1] + pollygon[i][1];
		}
		centre[0] = centre[0] / pollygon.length;
		centre[1] = centre[1] / pollygon.length;
		for (var i = 0; i < pollygon.length; i++) {
			var distance = Math.sqrt((centre[0] - pollygon[i][0]) * (centre[0] - pollygon[i][0]) + (centre[1] - pollygon[i][1]) * (centre[1] - pollygon[i][1]));
			if (distance > radius) radius = distance;
		}
		return radius;
	};

	// checks if a given point [x,y] is within a polygon [[x,y],[x,y]...]
	// checkPointInPolygon([x,y],[[float x1, float y1],[float x2, float y2]...])
	// NOTE: the polygon coordinates myst be sequential
	Geolocation.checkPointInPolygon = function (point, polygon) {
		var i = 0;
		var j = 0;
		var pointInPolygon = false;
		for (i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
			if ((((polygon[i][1] <= Point[1]) && (Point[1] < polygon[j][1])) ||
					((polygon[j][1] <= Point[1]) && (Point[1] < polygon[i][1]))) &&
				(Point[0] < (polygon[j][0] - polygon[i][0]) * (Point[1] - polygon[i][1]) / (polygon[j][1] - polygon[i][1]) + polygon[i][0]))

				pointInPolygon = !pointInPolygon;
		}
		return pointInPolygon;
	};
});
