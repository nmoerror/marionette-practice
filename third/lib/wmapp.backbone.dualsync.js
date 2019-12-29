var backboneSync, dualsync, syncLocal, saveLocal, syncRemote, syncRemoteQueue;

dualsync = function (method, model, options) {
	if (!options) {
		options = {}
	}
	var promise = new $.Deferred();
	if (model.remote && WMAPP.isApp && !WMAPP.isOnline) {
		// assume that we're online if we're in the app and we've asked for a remote model
		WMAPP.isOnline = true;
	}
	// We are online
	if (!WMAPP.isApp || (WMAPP.isOnline && model.remote === true)) {
		options.headers = options.headers ? _.clone(options.headers) : {};
		
		options.beforeSend = _.wrap(WMAPP.ajaxBeforeSendHandler, function(ajaxBeforeSendHandler, jqXhr, xhr) {
			model.jqXhr = jqXhr;
			xhr.xhr = function() {
				var xhr = new window.XMLHttpRequest();
				xhr.upload.addEventListener("progress", WMAPP.xhrUploadProgressHandler, false);
				xhr.addEventListener("progress", WMAPP.xhrDownloadProgressHandler, false);
				return xhr;
			}
			_.each(options.headers, function(value, header) {
				jqXhr.setRequestHeader(header, value);
			});
			return ajaxBeforeSendHandler(jqXhr, xhr);
		});

		var response = backboneSync(method, model, options).then(function (data) {
			if (WMAPP.isApp && model.local !== false) {
				syncLocal(method, model, options, data, function () {
					promise.resolveWith(promise, [model.attributes, response, options, model]);
				});
			} else {
				promise.resolveWith(promise, [model.attributes, response, options, model]);
			}
		}, function () {
			promise.rejectWith(promise, arguments);
		});
	} else if (!WMAPP.isOnline && model.remote) {
		if (model.dao.prototype.availableOffline) {
			saveLocal(method, model, options, function (data) {
				if (options.success && typeof options.success == "function") {
					options.success(data);
				}
				promise.resolveWith(promise, [model.attributes, promise, options, model]);
			});
		} else {
			console.error("ERROR: Tried to sync remote while offline!");
			if (options.error && typeof options.error == "function") {
				options.error();
			}
			promise.rejectWith(promise, [model.attributes, promise, options]);
		}
	} else {
		saveLocal(method, model, options, function (data) {
			if (options.success && typeof options.success == "function") {
				options.success(data);
			}
			promise.resolveWith(promise, [(model.attributes ? model.attributes : data), promise, options, model]);
			// promise.resolve((model.attributes ? model.attributes : data), promise, options, model);
		});
	}
	return promise;
};

syncLocal = function (method, model, options, data, callback) {
	if (!model.dao || model.forceRemote) {
		if (typeof callback == "function") {
			callback();
		}
		return false;
	}
	
	// Make sure there is no dual-sync progress bar showing
	delete WMAPP.Helper.progressBars['dualsync'];
	WMAPP.Helper.refreshProgressBars();
	
	var dao = new model.dao();
	dao.setDb(window.db, model, function (tableCreated) {
		if (model.models) { // this is a collection
			dao.setConditions(model, function (conditions) {
				if (model.models.length === 0 && typeof callback == "function") {
					callback();
				} else {
					if (method != "destroy") {
						var updated = 0;
						if (method == "read") {
							model.forceClean = true;
						}
						dao.updateAll(model, callback, options);
					}
				}
			}, options);
		} else { // single entity
			// check to see if we have recieved any notifications
			if ((method == "create" || method == "update") && options.xhr.getResponseHeader('WMAPP-Update') == 1) {
				if (!localStorage.getItem('upgrade_notified')) {
					WMAPP.Helper.showMessage('error', 'Please upgrade your app as soon as possible!');
					localStorage.setItem('upgrade_notified', 1);
				}
			}

			// this is a model
			if (method == "read" || method == "update") {
				dao.update(model, callback, options);
			} else if (method == "create") {
				dao.create(model, callback, options);
			} else if (method == "delete") {
				dao.destroy(model, callback, options);
			}
		}
	});
};

saveLocal = function (method, model, options, callback) {
	if (!model.dao) {
		console.log("DAO does not exist.", method, model, options);
		if (typeof callback == "function") {
			callback();
		}
		return;
	}
	var dao = new model.dao();
	dao.setDb(window.db, model, function (tableCreated) {

		// defines how should the model/collection be sorted
		var sortBy = model.defaultOrder ? model.defaultOrder : null;
		var sortDirection = options && options.sortDirection ? options.sortDirection : model.defaultOrderDirection ? model.defaultOrderDirection : 1;

		if (model.models) {
			// this is a collection

			// get the sort order from the collection's model.
			var m = new model.model();
			if ((!options || !options.sortDirection) && sortBy && (sortBy.toLowerCase() == "created" || sortBy.toLowerCase() == "modified")) {
				sortDirection = -1;
			}

			if (method == "read") {
				dao.setConditions(model, function (conditions) {
					dao.findAll(sortBy, sortDirection, callback);
				});
			} else if (method = "update") {
				dao.updateAll(model, callback);
			}
		} else {
			// this is a model
			if (method == "read") {
				if (model.queryParams.sort) {
					sortBy = model.queryParams.sort;
					delete model.queryParams.sort;
				}

				if (model.queryParams.direction) {
					sortDirection = parseInt(model.queryParams.direction);
					delete model.queryParams.direction;
				}

				if (sortBy && (sortBy.toLowerCase() == "created" || sortBy.toLowerCase() == "modified")) {
					sortDirection = -1;
				}

				if (typeof model.id != "undefined" && model.id !== null) {
					// searching by something other than ID
					dao.setConditions(model, function (conditions) {
						if (model.id === 0) {
							model.unset('id');
						}
						dao.find(model, sortBy, sortDirection, callback);
					});
				} else {
					dao.findAll(sortBy, sortDirection, callback);
				}
			} else if (method == "create") {
				dao.create(model, callback);
			} else if (method == "update") {
				dao.update(model, callback);
			} else if (method == "destroy" || method == "delete") {
				dao.destroy(model, callback);
			}
		}
	});
};

/**
 * Pushes dirty data to remote
 */
syncRemote = function (collections, callback, progressChanged, errorCallback) {
	// first, make sure the user is online.
	WMAPP.isOnline = true;

	window.db.transaction(function (tx) {
		// get a list of all mappable (see DAO for more info) tables in the correct order for syncing
		// we need to go top-down so we can update any foreign id's of child entities before we submit to the server
		var sql = "SELECT * FROM plugin_core_app_mappings WHERE model_name IS NOT NULL AND sequence != ''";
		if (collections.length) {
			sql += " AND table_name IN ('" + _.map(collections, function(collection) {
				return collection.dao.prototype.tableName;
			}).join("', '") + "')";
		}
		sql += " ORDER BY sequence ASC";
		tx.executeSql(sql, [], function (tx, result) {
			var sqls = [];
			var params = [];
			
			// loop over all of the tables
			for (var i = 0; i < result.rows.length; i++) {
				// get the mapping (maps table names to model names)
				var mapping = result.rows.item(i);

				// find the dirty data in this table
				// (we're passing the mapping through to the SQL query because it will be inaccessable by the time the async task goes to use it)
				sqls.push("SELECT id, '" + mapping.table_name + "' AS _table, '" + mapping.model_name + "' AS _model FROM " + mapping.table_name + " WHERE dirty=?");
				params.push(1);
			}
			
			// Join all the of the queries together for performance
			var sql = sqls.join("\nUNION\n");
			
			// Fetch all the dirty data
			tx.executeSql(sql, params, function (tx, results) {
				
				var modelsToSync = [];
				var promises = [];

				var modelCounts = {};
				
				for (var i = 0; i < results.rows.length; i++) {
					// create a model of this data
					var oldModel = eval(' new WMAPP.' + results.rows.item(i)['_model'] + '({id: "' + results.rows.item(i)['id'] + '"});');
					// the model should only sync to the server
					oldModel.local = false;

					// Keep track of how many model of this type there is
					if (!modelCounts['WMAPP.' + results.rows.item(i)['_model']]) {
						modelCounts['WMAPP.' + results.rows.item(i)['_model']] = {
							current: 1,
							total: 1,
						};
					} else {
						modelCounts['WMAPP.' + results.rows.item(i)['_model']].total += 1;
					}
					
					// Add this model to the list of models to sync
					modelsToSync.push(oldModel);
					
					// Fetch the model from the local database, and add a copy of the promise to the promises array
					// (to make it easier to track when _all_ models have finished fetching)
					promises.push(oldModel.fetch({suppressStatus: true, suppressSpinner: true}).then(function() {
						var model = arguments[3];
						// Remove the local attributes
						model.unset('dirty');
						model.unset('destroyed');
						// But still store the dirty state (it's not clean yet!)
						model._isDirty = true;
						
						// some of the attributes may actually be a JSON string, so let's check them
						_.each(model.dao.prototype.attributes, function(type, attribute) {
							if (type.toLowerCase() == "blob" && _.isString(model.get(attribute))) {
								model.set(attribute, JSON.parse(model.get(attribute)));
							}
						});
						
						// id is dirty, remove it from the model so the server can give us a real one, but keep a copy of the original dirty ID
						// (we need to do delete the dirty record later on)
						if (!isFinite(model.id)) {
							model._dirtyId = model.id
							model.set('id', null);
						}
					}));
				}
				
				// Wait for all promises to resolve (ie, all data has been fetched) then push it all up to the server
				$.when.apply(null, promises).then(function() {
					// seems all dirty data has been loaded from the database, so let's starts processing the sync queue!
					syncRemoteQueue(modelsToSync, callback, progressChanged, errorCallback, modelCounts);
				});
			}, function (tx, error) {
				console.error(error);
			});
			
		}, function (tx, error) {
			console.error(error);
		});
	});
}

syncRemoteQueue = function (syncQueue, callback, progressChanged, errorCallback, modelCounts) {
	// if a progressChanged callback/event isnt defined, let's make one.
	if (typeof progressChanged != "function") {
		progressChanged = function (processed, total) {
			// carefull, we don't want to divide by zero!
			if (total > 0) {
				WMAPP.syncProgressProcessed = processed;
				WMAPP.syncProgressTotal = total;
				WMAPP.vent.trigger('trigger:app:sync:push:progress', processed, total, (100 * processed / total).toFixed(2));
				console.log("Sync Progress (push): " + (100 * processed / total).toFixed(2) + '% (' + processed + '/' + total + ')');
			}
		};
	}
	
	// Ensure the sync queue is in the best possible order (as determined by DAO sequence)
	syncQueue.sort(function(modelA, modelB) {
		return modelA.dao.prototype.sequence - modelB.dao.prototype.sequence;
	});
	
	console.log("Sync Queue", syncQueue);
	
	// This variable will store how many passes of the sync queue we do.
	// We will use this to essentially "timeout" the sync if it's going around in circles forever
	var totalSyncQueuePasses = 0;
	// This varialbe will store how many models were successfully synced in the current pass of the queue
	var syncedThisPass = 0;
	
	// This will start syncing all dirty models starting from the given index.
	// The function is smart enough to automatically detect changes to IDs of models referenced by other models.
	// It will mark the models as dirty or not, and toggle this flag as required until all items are clean
	// That means it could loop up to O(n^2) times through the array/queue before everything is finally synced.
	var processQueue = function(i) {

		// Throw the progressChanged event.
		// Rather than basing the progress on the index, the progress is evaluated on the number of clean (!_isDirty) models over the total models
		var syncQueueCompleted = _.filter(syncQueue, function(model) {
			return !model._isDirty;
		});
		progressChanged(syncQueueCompleted.length, syncQueue.length);

		// If we're starting from the beginning of the queue, reset the count of models synced in this pass.
		if (i === 0) {
			syncedThisPass = 0;
		}
		
		// Have we reached the end of the que?
		if (syncQueue.length === i) {
			// End of queue. But maybe stuf is still dirty? Let's check
			var remainingDirty = _.filter(syncQueue, function(model) { return model._isDirty; });
			if (remainingDirty.length) {
				// If there's stuff in the queue, but nothing was synced in this pass, there's probably a validator error or cyclical reference, so let's abort the sync
				if (syncQueue.length && syncedThisPass == 0) {
					console.error("Aborting sync because nothing was synced, even though there was supposed to be things synced. Possibly caused by a cylclic reference?");
					if (typeof errorCallback == "function") {
						errorCallback(false);
					}
					return;
				} else {
					console.log('Sync queue finished, but data still dirty. Starting the queue again.');
					// Start the queue again at the first dirty item
					syncedThisPass = 0;
					processQueue(syncQueue.indexOf(remainingDirty[0]));
					return;
				}
			} else {
				// No remaining dirty data in the queue, so we're all done!
				console.log('Sync complete');
				if (typeof callback == "function") {
					callback();
				}
				return;
			}
		} else {
			// There's dirty data in the queue that needs processing.
			var model = syncQueue[i];
			// Check if the model is already clean (will happen if there are multiple passes of the sync queue reauired)
			if (typeof model._isDirty != "undefined" && !model._isDirty) {
				// This model has already been synced, so skip ahead to the next one.
				processQueue(i+1);
				return;
			}
			
			// Model should persist to remote.
			model.remote = true;

			// We want to send the count of models being sent up to the server
			model.queryParams.total_models = modelCounts[model.storeName].total;
			model.queryParams.current_model = modelCounts[model.storeName].current;
			modelCounts[model.storeName].current += 1;
			// Save the model to the server
			var validationErrors = model.validate();
			if (model.isValid()) {
                //testing remove debugger;
				model.save({suppressStatus: true, suppressSpinner: WMAPP.syncInBackground}).then(function (response) {
					// Assume the model is clean at this point
					model._isDirty = false;
					// grab the DAO for this model and loop over its references
					var dao = new model.dao();
					for (var j = 0; j<dao.associations.length; j++) {
						var association = dao.associations[j];
                        
						// If there is an incoming reference, check that the foreign key wasn't removed by the server.
						// This will happen if we push up a reference to a CID that doesn't exist (yet) on the server.
						// (ie, we are referencing something later on in the sync queue that hasn't got a real ID yet)
						if (association.type == "ManyToOne" && !model.get(association.foreignId) && model._previousAttributes[association.foreignId]) {
							// Yep, ID was stripped, so let's set it back and set this model as dirty. It will get re-synced on another pass of the sync queue
							// However, if we are already multiple passes through 
							model.set(association.foreignId, model._previousAttributes[association.foreignId]);
							model._isDirty = true;
							console.log('Model references another model that is not yet synced. Will try syncing again on a sunsequent pass of the sync queue.', association, model);
						}
						// If there are any outgoing 1...* or n...n (w/ reference entity) references in the sync queue, make sure we update the foreign key with our new ID
						else if (association.type == "OneToMany" || association.type == "OneToOne" || (association.type == "ManyToMany" && association.isReferenceEntity)) {
							for (var k=0; k<syncQueue.length; k++) {
								var queuedModel = syncQueue[k];
								// Compare the IDS. Assume we're referencing by CID rather than ID (so it is universally unique)
								if (queuedModel.dao.prototype.tableName == (association.isReferenceEntity ? association.joinTable : association.table) && queuedModel.get(association.foreignId) == model.get('cid')) {
									// Found a referenced model. Update the foreign key and set it to dirty.  It will get (re)synced on another pass of the sync queue
									queuedModel.set(association.foreignId, model.id);
									queuedModel._isDirty = true;
									console.log('Model referenced by another model that is not yet synced. Will try syncing again on a sunsequent pass of the sync queue.', association, queuedModel);
								}
							}
						}
						// else if (association.type == "ManyToMany") {
						// 	var error = "Sorry, but dualsync does not support Many to Many references unless it contains a reference entity.";
						// 	console.error(error, model, association);
						// 	throw new Error(error);
						// }
					} 

					// If the model is dirty now, something in the above loop triggered it, so let's leave it for now.
					// We'll attack it again on another pass of the sync queue later.
					if (model._isDirty) {
						// For now, just go on to the next item.
						processQueue(i+1);
					} else {
						// Otherwise, this model is now clean and fully synced with the server.
						// If the ID was changed, it means the model is a new record
						var modelIsNew = model.changed['id'] ? true : false;
						// save the model locally now that it has updated id(s)
						model.remote = false;
						model.forceClean = true;
						model.save({suppressStatus: true, suppressSpinner: WMAPP.syncInBackground}).then(function() {
							// Instanciate the DAO (including a copy of the current database)
							var dao = new model.dao();
							dao.db = window.db;
							// Add to the count of models synced in this pass of the queue
							syncedThisPass++;
							
							// If the record is new, we will now have two coppies in the local database.
							// One with the old negative dirty ID, and one with the new one.
							// We should destroy the old dirty record, as we no longer need it (otherwise we'll get duplicates!)
							if (modelIsNew) {
								// Fire off the "complete cleaned" sync event for this model
								var triggerName = 'trigger:app:sync:complete:' + dao.modelName + ':cleaned'
								WMAPP.vent.trigger(triggerName, model);
								
								// Soft delete the old dirty entry, then clean out any old soft-destroyed data
								dao.softDestroy(model._dirtyId, function() {
									dao.cleanOldSoftDestroyed(function() {
										// Fire off the "complete" sync event for this model
										var triggerName = 'trigger:app:sync:complete:' + dao.modelName;
										WMAPP.vent.trigger(triggerName, model);
										
										// Move on to the next model in the sync queue
										processQueue(i+1);
									});
								});
							} else {
								// If the model was simply updated, there's no duplicate data that we need to clean like above.
								// Fire off the "complete" sync event for this model
								var triggerName = 'trigger:app:sync:complete:' + dao.modelName;
								WMAPP.vent.trigger(triggerName, model);
								
								// Move on to the next model in the sync queue
								processQueue(i+1);
							}
						}, errorCallback);
					}
				}, errorCallback);
			} else {
				console.error('Validation problems occured in item in the sync queue. Skipping this one.', validationErrors, model);
				syncQueue.splice(i, 1);
				// Move on to the next model in the sync queue (will now be the same index as `i` since we just removed this one)
				processQueue(i);
			}
		}
	}
	
	// start processing the first thing in the queue
	processQueue(0);
}

backboneSync = Backbone.sync;
Backbone.sync = dualsync;
