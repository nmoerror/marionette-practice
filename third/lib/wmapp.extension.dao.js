'use strict';
/**
 * @namespace WMAPP.Extension.DAO
 * @ignore
 * @memberof WMAPP.Extension
 * @see WMAPP.module
 */
WMAPP.module('Extension.DAO', function (DAO) {

    DAO.createTables = function(db) {
        var promise = new $.Deferred();

        var promises = [];

        _.each(WMAPP.availableFeatures, function (feature) {
            _.each(WMAPP[feature].DAO, function (dao, key) {
                if (dao.prototype instanceof WMAPP.Extension.DAO.AbstractDAO) {
                    var p = new $.Deferred();
                    promises.push(p);
                    var d = new dao();
                    if (d.availableOffline === true) {
                        d.setDb(db, null, p.resolve);
                    } else {
                        p.resolve();
                    }
                }
            });
        });

        $.when.apply(null, promises).then(promise.resolve, promise.reject);

        return promise;
    }

    /**
     * Extend the DAO
     */
    DAO.AbstractDAO = Backbone.DAO.extend({
        tableName: null,
        modelName: null,
        version: '1.0.0',
        availableOffline: false,
        initialLoadRequired: false,
        sequence: null,
        references: {},
        foreignKeys: [],
        updatePath: [],
        conditions: {},
        expandsConditions: {},
        expands: [],
        associations: [],
        customFilters: {},
        customExpands: {},
        customSorting: {},
        defaultExpands: [],
        queryColumns: ['*'],
        omitQueryParams: ['expand', 'last_sync', 'currentPage', 'pageSize', 'totalPages', 'totalRecords', 'sortKey', 'order', 'directions', 'date_flag'],
        customOmitQueryParams: [],
        conditionParams: {},
        expandsConditionParams: {},
        uniqueConstraints: [], // An array of columns that should have a unique constraint on them

        constructor: function (options) {
            options = options || {};
        },

        setDb: function (db, model, callback) {

            var that = this;
            var timeout = 100;
            var setDbTimer = null;
            var setDbMethod = function() {
                // for some reason when app is started when offline window.db is being passed in as undefined.
				if(db === undefined && window.db) {
					db = window.db;
				}
                if (db) {
                    clearInterval(setDbTimer);
                    that.db = db;
                    that.createTable.call(that, model, callback);
                } else {
                    console.error('Can\'t set database because it\'s not yet ready.');
                    if (--timeout === 0) {
                        clearInterval(setDbTimer);
                        WMAPP.Helper.showMessage("The local database could not be initialized. Please contact support.");
                    }
                }
            };
            if (db) {
                setDbMethod();
            } else {
                setDbTimer = setInterval(setDbMethod, 100);
            }
        },

        setColumns: function(columns) {
            columns = columns || [];
            var that = this;
            this.queryColumns = [];

            _.each(columns, function(column) {
                if (that.attributes[column] && that.queryColumns.indexOf(column) < 0) {
                    that.queryColumns.push(column);
                }
            });
            if (!this.queryColumns.length) {
                this.queryColumns = ['*'];
            }
        },

        setConditions: function (model, callback, options) {
            options = options || {};
            this.setColumns(model.queryColumns);

            if (model.state) {
                this.state = model.state;
            }
            this.conditions = this.prepareConditions(model.queryParams, model.conditionParams);
            this.expandsConditions = this.prepareExpandsConditions(model.expandsConditionParams);
            
            if (typeof callback == "function") {
                callback(true);
            }
        },

        prepareConditions: function (queryParams, conditionParams) {
            var that = this;

            if (queryParams.expand) {
                this.expands = queryParams.expand.split('|');
            }
            queryParams = _.omit(queryParams, this.omitQueryParams);
            queryParams = _.omit(queryParams, this.customOmitQueryParams);

            if (that.modelName) {
                
                var paramPrefix = that.modelName.split(".");
                paramPrefix = paramPrefix[0] + paramPrefix[2] + "_";

                _.each(queryParams, function(value, key) {
                    if (key.indexOf(paramPrefix) === 0) {
                        delete queryParams[key];
                        if (value != null) {
                            queryParams[key.replace(paramPrefix, "")] = value;
                        }
                    }
                    if (value === null && typeof queryParams[key] != "undefined") {
                        delete queryParams[key];
                    }
                });
                
                //testing remove console.log('prepareConditions conditionParams', conditionParams);
                //debugger;
                _.each(conditionParams, function(value, key) {                    
                    if (value === null && typeof conditionParams[key] != "undefined") {
                        delete conditionParams[key];
                        return;
                    }
                    
                    if (key.indexOf(paramPrefix) === 0) {                        
                        if (value != null) {
                            queryParams[key.replace(paramPrefix, "")] = value;
                        }
                    }else{
                        queryParams[key.replace(paramPrefix, "")] = value;
                    }     
                    delete conditionParams[key];
                });
                
                _.each(queryParams, function(value, key) {
                    if (typeof that.customFilters[key] == "function") {
                        queryParams[key] = function(sql, params) {
                            return that.customFilters[key].call(that, value, sql, params);
                        };
                    }
                });
            }

            // Include the 'destroyed IS NULL' filter on everything except some specific tables
            if (['plugin_core_app_mappings', 'plugin_core_plugins'].indexOf(this.tableName) < 0) {
                queryParams[this.tableName + '.destroyed'] = null;
            }

            return queryParams;
        },
        
        prepareExpandsConditions: function (expandsConditionParams) {
            if (this.modelName) {              
                //debugger;
                _.each(this.associations, function(association) {
                    //match model expandsConditionParams and replace it with association table name for use in findByIds
                    if(expandsConditionParams && expandsConditionParams[association.name] != undefined){
                        //debugger;
                        expandsConditionParams[association.table] = expandsConditionParams[association.name];
                        delete expandsConditionParams[association.name];
                    }

                });          
                //TODO: customFilters???
            }

            return expandsConditionParams;
        },
        
        validateJSONString: function (jsonString){
            try {
                var o = JSON.parse(jsonString);

                // Handle non-exception-throwing cases:
                // Neither JSON.parse(false) or JSON.parse(1234) throw errors, hence the type-checking,
                // but... JSON.parse(null) returns null, and typeof null === "object", 
                // so we must check for that, too. Thankfully, null is falsey, so this suffices:
                if (o && typeof o === "object") {
                    return o;
                }
            }
            catch (e) { }

            return false;
        },

        createTable: function (model, callback) {
            var that = this;
            var sql = "SELECT name FROM sqlite_master WHERE type='table' AND name=?";
            var params = [this.tableName];

            this.getTransaction(null, function (tx) {
                tx.executeSql(sql, params, function(tx, results) {
                    if (results.rows.length === 0) {
                        // we need to create the table
                        sql = "CREATE TABLE " + that.tableName + " (id NONE PRIMARY KEY, cid NONE, ";
                        params = [];
                        for (var attribute in that.attributes) {
                            sql += "[" + attribute + "] " + that.attributes[attribute] + ", ";
                        }
                        sql += "created TEXT, modified TEXT, dirty INTEGER, destroyed TEXT";

                        // that.uniqueConstraints is a list of columns that should have a unique constraint on it
                        for (var i = 0; i < that.uniqueConstraints.length; i++) {
                            var uniqueConstraint = that.uniqueConstraints[i];
                            // We replace the spaces with underscores to make a valid name
                            // Replace the invalid chars to make a valid constraint name
                            sql += ", CONSTRAINT un_" + uniqueConstraint.replace(/ /g, '_').replace(/,/g, '') + " UNIQUE (" + uniqueConstraint + ")";
                        }

                        sql += ")";
                        that.executeSql(tx, sql, params, function() {
                            sql = "INSERT OR REPLACE INTO plugin_core_app_mappings VALUES (?, ?, ?, ?)";
                            params = [that.tableName, that.modelName, that.sequence, that.version];
                            //debugger;
                            that.executeSql(tx, sql, params, function(tx) {
                                if (typeof that.afterCreateTable == "function") {
                                    console.log("Performing 'afterCreateTable' event");
                                    that.afterCreateTable(function() {
                                        if (typeof callback == "function") {
                                            callback(true);
                                        }
                                    });
                                } else if (typeof callback == "function") {
                                    if (typeof callback == "function") {
                                        callback(true);
                                    }
                                }
                            }, function (tx, error) {
                                return that.statementError(error, sql, params, function() {
                                    callback(true);
                                });
                            });
                        }, function (tx, error) {
                            return that.statementError(error, sql, params, function() {
                                callback(false);
                            });
                        });
                    } else {
                        // table exists
                        if (typeof callback == "function") {
                            callback(false);
                        }
                    }
                }, function (tx, error) {
                    return that.statementError(error, sql, params, function() {
                        callback(false);
                    });
                });
            }, function (error) {
                return that.transactionError(error, sql, params, callback);
            });
        },

        addDestroyedColumn: function(callback) {
            var that = this;
            var sql = "ALTER TABLE " + this.tableName + ' ADD COLUMN destroyed TEXT';
            var params = null;

            this.getTransaction(null, function (tx) {
                that.executeSql(tx, sql, params, function (tx, results) {
                    if (typeof callback == "function") {
                        callback(true);
                    }
                });
            }, function (error) {
                if (typeof callback == "function") {
                    callback(false);
                }
            });
        },

        setAllExpands: function(collection, callback) {
            var that = this;
            var queuedCollections = {};
            //debugger;
            collection.each(function(model) {
                if (collection.remote) {
                    model.remote = true;
                }
                if (collection.forceClean) {
                    model.forceClean = true;
                }

                _.each(that.associations, function(association) {
                    var expanded = model.get('_' + association.name + (association.type == "OneToOne" || association.type == "ManyToOne" ? '_id' : ''));
                    if (expanded) {
                        if (association.type == "OneToOne" || association.type == "ManyToOne") {
                            if (!queuedCollections[expanded.storeName]) {
                                queuedCollections[expanded.storeName] = [];
                            }
                            if (model.remote) {
                                expanded.remote = true;
                            }
                            if (model.forceClean) {
                                expanded.forceClean = true;
                            }

                            if (association.type == "ManyToOne" && !model.get(association.name + '_id')) {
                                // ignore this one
                            } else {
                                queuedCollections[expanded.storeName].push(expanded);
                            }
                        }
                        else if (association.type == "ManyToMany" || association.type == "OneToMany") {
                            expanded.each(function(m) {
                                if (!queuedCollections[expanded.storeName]) {
                                    queuedCollections[expanded.storeName] = [];
                                }
                                if (model.remote) {
                                    m.remote = true;
                                }
                                if (model.forceClean) {
                                    m.forceClean = true;
                                }

                                if (association.type == "OneToMany") {
                                    m.set(association.foreignId, model.get('id'));
                                }
                                else if (association.type == "ManyToMany") {
                                    console.error('TODO!!!!');
                                }
                                queuedCollections[expanded.storeName].push(m);
                            });
                        }
                    }
                });
            });

            var promises = [];

            _.each(queuedCollections, function(models, modelName) {
                var collectionName = modelName + 'Collection';
                var collect = eval('new ' + collectionName + '()');
                collect.reset(_.map(models, function(m) {
                    return m.toJSON();
                }), {silent: true});

                if (collection.local) {
                    collect.local = true;
                }

                if (collection.forceClean) {
                    collect.forceClean = true;
                }
                if (collect.dao) {
                    var collectDao = new collect.dao();
                    if (collectDao.availableOffline) {
                        promises.push(collect.save({
                            validate: false,
                            suppressStatus: true,
                            suppressSpinner: true
                        }).then(function () {
                            collect.destruct();
                        }));
                    }
                }
            });

            $.when.apply(null, promises).then(callback);
        },

        setExpands: function(model, callback, options) {
            options = options || {};
            var that = this;
            var queue = [];
            _.each(this.associations, function(association) {
                var expandAttr = '_'+association.name;
                if (association.type == 'OneToOne') {
                    expandAttr += '_id';
                }
                var expanded = model.get(expandAttr);
                if (expanded) {
                    if (association.type == "ManyToMany" || association.type == "OneToMany") {
                        expanded.each(function(m) {
                            if (model.remote) {
                                m.remote = typeof model.remoteExpands === 'undefined' ? true : model.remoteExpands;
                            }
                            if (model.forceClean) {
                                m.forceClean = true;
                            }
                            queue.push({model: m, association: association, associated: expanded});
                        });
                    } else if (association.type == "OneToOne" /*&& model.get(expandAttr.substr(1)) !== null*/) {
                        if (model.remote) {
                            expanded.remote = true;
                        }
                        if (model.forceClean) {
                            expanded.forceClean = true;
                        }
                        queue.push({model: expanded, association: association, associated: expanded});
                    }
                }
            });

            var processQueue = function() {
                if (queue.length === 0) {
                    if (typeof callback == "function") {
                        callback();
                    }
                } else {
                    var expanded = queue.pop();
                    var association = expanded.association;
                    if (association.type == "OneToMany" || association.type == "OneToOne") {
                        expanded.model.set(association.foreignId, model.get('id'));
                        var promise = expanded.model.save({ validate: false, suppressStatus: true, suppressSpinner: true });
                        if (promise) {
                            promise.then(processQueue);
                        } else {
                            console.error('Could not save association, but continuing anyway.', expanded);
                            processQueue();
                        }
                    } else if (association.type == "ManyToMany") {

                        var performJoin = function() {
                            var sql = "CREATE TABLE IF NOT EXISTS " + association.joinTable + ' (id NONE PRIMARY KEY, cid NONE, [' + association.foreignId + '] NONE, [' + association.joinId + '] NONE, created TEXT, modified TEXT, dirty INTEGER, destroyed TEXT)';
                            var params = [];
                            that.getTransaction(options.tx, function (tx) {
                                that.executeSql(tx, sql, params, function (tx, results) {
                                    if (association.isReferenceEntity) {
                                        if (!expanded.model.get('cid')) {
                                            expanded.model.set('cid', WMAPP.Helper.generateUuid());
                                        }
                                        if (!expanded.model.id) {
                                            expanded.model.set('id', expanded.model.get('cid'));
                                        }
                                    }
                                    var foreignId = model.id;
                                    var joinId = association.isReferenceEntity ? expanded.model.get(association.joinId) : expanded.model.id;

                                    var joinRowId = association.isReferenceEntity ? expanded.model.id : WMAPP.Helper.generateUuid();
                                    var joinRowCid = association.isReferenceEntity ? expanded.model.get('cid') : WMAPP.Helper.generateUuid();

                                    sql = "DELETE FROM " + association.joinTable + " WHERE [" + association.foreignId + "]=? AND [" + association.joinId + "]=?";
                                    params = [foreignId, joinId];
                                    that.executeSql(tx, sql, params, function (tx, results) {
                                        sql = "INSERT OR REPLACE INTO " + association.joinTable + " (id, cid, [" + association.foreignId + "], [" + association.joinId + "], created, modified, dirty) VALUES (?,?,?,?,?,?,?)";
                                        params = [joinRowId, joinRowCid, foreignId, joinId];
                                        //testing remove console.log('setExpands replace table', association.joinTable);
                                        //debugger;
                                        var now = moment().format('YYYY-MM-DD HH:mm:ss');

                                        // created date
                                        if (!expanded.model.get('created')) {
                                            expanded.model.set('created', now);
                                            params.push(now);
                                        } else {
                                            params.push(expanded.model.get('created'));
                                        }
                                        // modified date
                                        if (!expanded.model.get('modified')) {
                                            expanded.model.set('modified', now);
                                            params.push(now);
                                        } else {
                                            params.push(model.get('modified'));
                                        }
                                        // updated models will always be dirty unless we've specifically said it's not (eg syncing with server)
                                        if (model.forceClean) {
                                            params.push(0);
                                        } else {
                                            WMAPP.outOfSync();
                                            params.push(1);
                                        }
                                        //testing remove console.log('setExpands()execyteSql sql', sql);
                                        that.executeSql(tx, sql, params, function (tx, results) {
                                            processQueue();
                                        }, function (tx, error) {
                                            return that.statementError(error, sql, params, processQueue);
                                        });
                                    }, function (tx, error) {
                                        return that.statementError(error, sql, params, processQueue);
                                    });

                                }, function (tx, error) {
                                    return that.statementError(error, sql, params, processQueue);
                                });
                            }, function (error) {
                                return that.transactionError(error, sql, params, processQueue);
                            });
                        }

                        if (expanded.model.id) {
                            performJoin();
                        } else {
                            var validationErrors = expanded.model.validate();
                            if (expanded.model.isValid()) {
                                expanded.model.save().then(performJoin, processQueue);
                            } else {
                                console.error('Could not save expand model as it is not valid. Continuing anyway.', validationErrors, expanded.model, model);
                                processQueue();
                            }
                        }
                    }
                }
            }

            processQueue();
        },

        getExpands: function(row, callback) {
            var that = this;
            var queue = this.expands.concat(this.defaultExpands);
            var processQueue = function() {
                if (queue.length === 0) {
                    if (typeof callback == "function") {
                        callback();
                    }
                } else {
                    var expand = queue.pop();

                    if (!expand) {
                        processQueue();
                        return;
                    }

                    var association = _.findWhere(that.associations, {
                        name: expand
                    });

                    if (!association && (that.attributes[expand] || that.attributes['_'+expand])) {
                        // is the expand saved as a custom column but not an association?
                        processQueue();
                        return;
                    } else if (association) {
                        console.log('Getting expand ' + association.name, association);
                        var sql = "";
                        var params = [row.id];
                        if (typeof that.customExpands[expand] == "function") {
                            sql = that.customExpands[expand].call(that, params, row);
                            // } else if ( association.type == "OneToOne") {
                            // 	sql = "SELECT * FROM " + association.table + " WHERE id=?";
                            // 	params = [row[association.foreignId]];
                        } else if (association.type == "OneToMany" || association.type == "OneToOne") {
                            sql = "SELECT * FROM " + association.table + " WHERE (destroyed IS NULL OR destroyed = '') AND " + association.foreignId + "=?";
                        } else if (association.type == "ManyToMany") {
                            sql = "SELECT " + association.table + ".* FROM " + association.table + " INNER JOIN " + association.joinTable + ' ON ' +
                                association.joinTable + '.' + association.joinId + '=' + association.table + ".id WHERE  (" + association.table + ".destroyed IS NULL OR " + association.table + ".destroyed = '') AND " + association.joinTable + "." + association.foreignId + "=?";
                        } else if (association.type == "ManyToOne") {
                            sql = "SELECT * FROM " + association.table + " WHERE (destroyed IS NULL OR destroyed = '') AND id=?";
                            params = [row[association.foreignId]];
                        } else {
                            console.error('An association was defined, however it doesn\'t have an association type (or a defined custom expand)');
                        }
                        
                        that.getTransaction(null, function (tx) {
                            that.executeSql(tx, sql, params, function (tx, results) {                                
                                if (association.type == "ManyToOne" || association.type == "OneToOne") {
                                    row['_'+association.name+'_id'] = null;

                                    if (results.rows.length === 1) {
                                        row['_'+association.name+'_id'] = results.rows.item(0);
                                        row[association.name+'_id'] = results.rows.item(0).id;
                                    }
                                } else {
                                    row[association.name] = [];
                                    row['_'+association.name] = [];

                                    for (var i=0; i<results.rows.length; i++) {
                                        var expandedRow = results.rows.item(i);

                                        var expandedMapping = WMAPP._mappings.findWhere({table_name: association.table});
                                        var expandedDao = null;

                                        if (expandedMapping) {
                                            var modelName = expandedMapping.get('model_name').split(".");
                                            expandedDao = WMAPP[modelName[0]]['DAO'][modelName[2]];
                                        }

                                        if (expandedDao) {
                                            //testing remove console.log('getExpands association.name', association.name, 'modelName', modelName);
                                            for (var attribute in expandedDao.prototype.attributes) {
                                                if (expandedDao.prototype.attributes[attribute].toLowerCase() == "blob") {
                                                    try {
                                                        expandedRow[attribute] = JSON.parse(expandedRow[attribute]);
                                                    } catch (err) {
                                                        // ignore
                                                    }
                                                }
                                            }
                                        }
                                        row[association.name].push(expandedRow['id']);
                                        row['_'+association.name].push(expandedRow);
                                    }
                                }

                                processQueue();
                            }, function (tx, error) {
                                return that.statementError(error, sql, params, processQueue);
                            });
                        }, function (error) {
                            return that.transactionError(error, sql, params, processQueue);
                        });
                    } else {
                        // console.error('No association, expand, or custom attribute defined for expand "' + expand + '" from ' + that.modelName, that);
                        processQueue();
                    }
                }
            }
            processQueue();
        },

        getCollectionExpands: function(rows, callback) {
            var that = this;
            var queue = _.clone(rows);
            var processQueue = function() {
                if (queue.length === 0) {
                    if (typeof callback == "function") {
                        callback(rows);
                    }
                } else {
                    that.getExpands.call(that, queue.pop(), processQueue);
                }
            };
            processQueue();
        },

        /**
         * Checks if tables exist in the local database
         * @param tx {db.transaction} A database transaction
         * @param tableNames {string|string[]} A table name or list of table names
         * @returns {PromiseLike<bool>} A promise resolved to true if the tables exist, otherwise resolves to false
         */
        doesTableExist: function(tx, tableNames){
            // No table can't ever exist
            if (!tableNames) {
                return (new $.Deferred()).resolve(false);
            }

            // We want an array of table names
            if (!_.isArray(tableNames)) {
                tableNames = [tableNames];
            } else if (tableNames.length === 0) {
                // No tables still never exist
                return (new $.Deferred()).resolve(false);
            }

            // Map out the query params and run the statement
            var params = _.map(tableNames, function(){return '?'}).join(', ');
            return this.runSql(tx, "SELECT count(*) c FROM SQLITE_MASTER WHERE type = 'table' AND name IN (" + params + ")", tableNames)
                .then(function(rows){
                    // If we have the count being the size of the original query then we are good
                    return rows[0].c === tableNames.length;
                })
        },

        runSqlWithoutTransaction: function(sql, params) {
            var promise = $.Deferred();
            if (!this.db) {
                this.setDb(window.db, null, (function() {
                    this.getTransaction(null, (function(tx) {
                        this.runSql(tx, sql, params).then(promise.resolve, promise.reject);
                    }).bind(this));
                }).bind(this), promise.reject);
            } else {
                this.getTransaction(null, (function(tx) {
                    this.runSql(tx, sql, params).then(promise.resolve, promise.reject);
                }).bind(this), promise.reject);
            }
            return promise;
        },

        /**
         * A promisified version of executeSql. Converts the sql response into a regular array
         * @param tx {db.transaction} The transaction
         * @param sql {string} The sql statement to run
         * @param params {[]} Any query params
         * @returns {*|Deferred} A promise that will resolve with an array of rows or reject on error
         */
        runSql: function(tx, sql, params){
            var that = this;
            var p = new $.Deferred();

            //testing remove console.log('runSql sql', sql, 'params', params);
            that.executeSql(tx, sql, params, function(tx, result){
                var rows = [];
                var len = result.rows.length;

                for (var i = 0; i < len; i++) {
                    rows.push(result.rows.item(i));
                }

                p.resolve.call(that, rows);
            }, function(){
                console.error('There was an error in an SQL statement', sql, params, arguments);
                p.reject.apply(that, arguments);
            });

            return p;
        },

        /**
         * Gets an array of rows based off the ids that are supplied
         * @param tx {db.transaction} The database transaction
         * @param tableName {string} The name of the table to get the rows from
         * @param column {string} The column to match the rows against
         * @param ids {number[]} The ids to match against
         * @returns {PromiseLike<{}[]>}
         */
        findByIds: function(tx, tableName, column, ids){
            var that = this;

            if (ids.length === 0) {
                return (new $.Deferred()).resolve([]);
            }

            // We will batch into groups of 500
            var idGroups = _.groupBy(ids, function(r, i){
                return Math.floor(i / 500);
            });
              
            //testing remove console.log('this.expandsConditions', this.expandsConditions, 'idGroups', idGroups);
            //debugger;
            //bugfix GEVITY-26 health plans screen loading slow for a user with lots of completed_plans data eg. dhale
            var subSqlCondition = '';
            if(this.expandsConditions && this.expandsConditions[tableName] != undefined){
                _.each(this.expandsConditions, function (conditionParams, associationTableName) {
                    _.each(conditionParams, function(value, key){
                        if(value && typeof value === 'object'){ //eg. {timestamp: { from_date: { operator: '>=', value: 'YYYY-MM-DD HH:mm:ss' }, to_date: { condition: 'AND', operator: '>=', value: 'YYYY-MM-DD HH:mm:ss' } } }
                            //TODO: IS NOT NULL
                            //debugger;                    
                            var count = 0;
                            _.each(value, function(value2, key2){
                                if(value2.operator != undefined){
                                    if(value2.condition != undefined && count > 0){
                                        subSqlCondition += " " + value2.condition + " "; //eg. "AND"
                                    }
                                    subSqlCondition += associationTableName + '.' + key + " " + value2.operator + " " + value2.value + "";                                    
                                }
                                count++;
                            });
                            if(subSqlCondition !== ''){
                                subSqlCondition = "AND (" + subSqlCondition + ")";
                            }
                        }
                    });
                });
            }
            
            var sql = "SELECT * FROM " + tableName + " WHERE " + column + " IN ({ids}) " + subSqlCondition + " AND (destroyed IS NULL OR destroyed = '')";            
            var promises = [];
            _.each(idGroups, function(r){
                // r is a list of ids

                // Add in question marks to the sql string
                var paramSql = sql.replace('{ids}', _.map(r, function(){return '?'}).join(','));
                promises.push(that.runSql(tx, paramSql, r));
            });
            //testing remove console.log('findByIds() tableName', tableName, column, ids, 'subSqlCondition', subSqlCondition, 'sql', sql);
            // Return when all of the statements are done
            return $.when.apply(this, promises)
                .then(function(){
                    // We need to concat all of the args into a new array since other
                    var r = [];
                    for (var i = 0; i < arguments.length; i++) {
                        var e = arguments[i];
                        if (e === undefined) {
                            continue;
                        }
                        if (!_.isArray(e)) {
                            e = [e];
                        }
                        r = r.concat(arguments[i]);
                    }
                    return r;
                });
        },

        /**
         * Given an association and the associated model, will loop through the model's attributes
         * and parse any JSON strings (stored in blob sqlite columns)
         *
         * @param  association  The assoiciation
         * @param  datum        The foreign model
         */
        parseJsonBlobs: function(association, datum) {
            // Get the name of the model from the table name
            var expandedMapping = WMAPP._mappings.findWhere({table_name: association.table});
            if (expandedMapping) {
                var modelName = expandedMapping.get('model_name').split(".");
                var expandedDao = WMAPP[modelName[0]]['DAO'][modelName[2]];
                // Loop over the attributes and find any "blobs"
                for (var attribute in expandedDao.prototype.attributes) {
                    if (expandedDao.prototype.attributes[attribute].toLowerCase() == "blob") {
                        // Attempt to parse the blob, but just ignore it and continue if it fails.
                        try {
                            datum[attribute] = JSON.parse(datum[attribute]);
                        } catch (err) {}
                    }
                }
            }
        },

        /**
         * Get the expands for this collection and set them to the models
         * If a single model is passed through it will be treated as a single row array
         *
         * @param tx {db.transaction} The database transaction object
         * @param rows {T | T[]} A model or array of models of the SAME type
         * @param callback {function} A callback function
         * @template T
         */
        getAllExpands: function(tx, rows, callback){
            var that = this;

            // If we get a single model make it an array
            if (!_.isArray(rows)) {
                rows = [rows];
            }

            // If there are no rows in the array we get (empty fetch) then return the callback and we are done
            if (rows.length === 0) {
                return callback(rows);
            }

            /* We convert the array of rows to a json object of rows. We can get a faster lookup time for joining this way (effectively it is a hash join)
             * This will make an object of the following structure
             * {
             *     1: {id: 1, otherField: ...}
             *     4: {id: 4, otherField: ...}
             * }
             */
            var models = _.reduce(rows, function(a, r){
                a[r['id']] = r;
                return a;
            }, {});

            // What expands tdo we actually need
            var expands = this.expands.concat(this.defaultExpands);

            var promises = [], 
                nestedPromises = [],
                j, 
                expandsLen = expands.length;
            //testing remove console.log('getAllExpands expands', expands);
            //debugger;
            // Now we need to fetch the data for all of our expands
            for (var i = 0; i < expands.length; i++) {
                // If we have an association
                var expandRow = function(association, _rows, promise) {
                    if (association) {
                        //testing remove console.log('expandRow table', association.table, 'association.type', association.type);
                        switch (association.type) {
                            case 'OneToMany':
                                // I am a record has multiple other records referencing me. I do not have a foreign key

                                _.each(models, function(model){
                                    // If we are missing the expanded array
                                    if (!model['_' + association.name]) {
                                        model['_' + association.name] = [];
                                    }
                                    // Or the expanded id array
                                    if (!model[association.name]) {
                                        model[association.name] = [];
                                    }
                                });

                                // Get all records in the opposing table that have our id in their foreign id
                                that.doesTableExist(tx, association.table)
                                    .then(function(tableExists) {
                                        if (tableExists) {
                                            that.findByIds(tx, association.table, association.foreignId, _.map(_rows, function (r) {
                                                return r.id
                                            })).then(function (data) {
                                                //testing remove console.log('OneToMany table', association.table, 'data', data);
                                                for (var i = 0; i < data.length; i++) {
                                                    var datum = data[i];

                                                    // If we have the foreign key of the model in our table
                                                    if (models[datum[association.foreignId]]) {
                                                        var model = models[datum[association.foreignId]];

                                                        that.parseJsonBlobs.call(that, association, datum);

                                                        // Push the data!
                                                        model['_' + association.name].push(datum);
                                                        model[association.name].push(datum.id);
                                                    }
                                                }
                                                promise.resolve();
                                            });
                                        } else {
                                            console.error('Many to one table ' + association.table + ' does not exist. Skipping! You may want to use a remote fetch for this');
                                            promise.resolve();
                                        }
                                    });
                                break;
                            case 'ManyToOne':
                                // I am a record that references a single other record and I do have the foreign key, I can also be the end of a one to one that has a foreign key
                                // Get all records from the other table whose id is the same as the foreign ids we have
                                that.doesTableExist(tx, association.table)
                                    .then(function(tableExists) {
                                        if (tableExists) {
                                            that.findByIds(tx, association.table, 'id', _.map(_rows, function (r) {
                                                return r[association.foreignId]
                                            })).then(function (data) {
                                                // Reduce the foreign references to a json object so we can hash join
                                                var foreignModels = _.reduce(data, function (a, r) {
                                                    a[r['id']] = r;
                                                    return a;
                                                }, {});

                                                var modelKeys = Object.keys(models);
                                                //testing remove console.log('ManyToOne table', association.table, 'foreignModels', foreignModels, 'modelKeys', modelKeys);
                                                //debugger;
                                                if(association.joinId){ //eg. plan_medication.medication, where joinId=plan_medication_id and foreignId=medication_id
                                                    for (var i = 0; i < data.length; i++) {
                                                        var datum = data[i];
                                                        _.each(rows, function(item, index){
                                                            if(item['_' + association.joinId] != undefined && item['_' + association.joinId][association.foreignId] == datum.id){
                                                                //testing remove console.log('association joinId', association.joinId);
                                                                that.parseJsonBlobs.call(that, association, datum);
                                                                rows[index]['_' + association.joinId]['_' + association.foreignId] = datum;
                                                                //testing remove console.log('model joined', rows[index]);
                                                            }
                                                        });
                                                    }
                                                }else{
                                                    for (var i = 0; i < modelKeys.length; i++) {
                                                        var model = models[modelKeys[i]];
                                                        //testing remove console.log('model', model);
                                                        if (model[association.foreignId] && foreignModels[model[association.foreignId]]) {


                                                            that.parseJsonBlobs.call(that, association, foreignModels[model[association.foreignId]]);

                                                            model['_' + association.foreignId] = foreignModels[model[association.foreignId]];
                                                        }
                                                    }
                                                }
                                                promise.resolve();
                                            });
                                        } else {
                                            console.error('Many to one table ' + association.table + ' does not exist. Skipping! You may want to use a remote fetch for this');
                                            promise.resolve();
                                        }
                                    });
                                break;
                            case 'ManyToMany':
                                // I am a record that references many other records through a reference entity

                                _.each(models, function(model){
                                    // If we are missing the expanded array
                                    if (!model['_' + association.name]) {
                                        model['_' + association.name] = [];
                                    }
                                    // Or the expanded id array
                                    if (!model[association.name]) {
                                        model[association.name] = [];
                                    }
                                });

                                // The join table might not exist so skip
                                that.doesTableExist(tx, [association.joinTable, association.table])
                                    .then(function(tableExists){
                                        if (tableExists) {
                                            that.findByIds(tx, association.joinTable, association.foreignId, _.map(_rows, function(r){return r.id})).then(function(joinData){
                                                // We have the records in the join table
                                                return that.findByIds(tx, association.table, 'id', _.map(joinData, function(r){return r[association.joinId]})).then(function(data){
                                                    return {data: data, joinData: joinData};
                                                });
                                            }).then(function(records){
                                                // We know that if we have a record in the joinData entry then we have the record ourselves, but we don't know if we have something on the other end
                                                // So we transform the data on the other end into an object so we can do a hash join and then we if we find that on that end we hash join back to the original models
                                                var foreignModels = _.reduce(records.data, function(a, r){
                                                    a[r['id']] = r;
                                                    return a;
                                                }, {});

                                                for (var i = 0; i < records.joinData.length; i++) {
                                                    var joinModel = records.joinData[i];

                                                    if (foreignModels[joinModel[association.joinId]]) {
                                                        var modelToJoin = models[joinModel[association.foreignId]];
                                                        var foreignModel = foreignModels[joinModel[association.joinId]];

                                                        that.parseJsonBlobs.call(that, association, foreignModel);

                                                        if (association.isReferenceEntity !== true) {
                                                            // We are not a reference entity
                                                            modelToJoin['_' + association.name].push(foreignModel);
                                                            modelToJoin[association.name].push(foreignModel.id);
                                                        } else {
                                                            // We are a reference entity
                                                            joinModel['_' + association.joinId] = foreignModel;

                                                            modelToJoin['_' + association.name].push(joinModel);
                                                            modelToJoin[association.name].push(foreignModel.id);
                                                        }
                                                    }
                                                }

                                                promise.resolve();
                                            });
                                        } else {
                                            console.error('Many to many join table ' + association.joinTable + ' or data table ' + association.table + ' does not exist. Skipping! You may want to use a remote fetch for this');
                                            promise.resolve();
                                        }
                                    });
                                break;
                            case 'OneToOne':
                                // I am a record that references one other record and I do NOT have the foreign key
                                // Get all records in the opposing table that have our id in their foreign id
                                that.doesTableExist(tx, association.table)
                                    .then(function(tableExists){
                                        if (tableExists) {
                                            that.findByIds(tx, association.table, association.foreignId, _.map(_rows, function (r) {return r.id})).then(function (data) {
                                                //testing remove console.log('OneToOne table', association.table, 'data', data, 'models', models);
                                                for (var i = 0; i < data.length; i++) {
                                                    var datum = data[i];
                                                                                                        
                                                    // If we have the foreign key of the model in our table
                                                    if (models[datum[association.foreignId]]) {
                                                        //testing remove console.log('association foreignId', association.foreignId);
                                                        var model = models[datum[association.foreignId]];
                                                        that.parseJsonBlobs.call(that, association, datum);
                                                        // Push the data!
                                                        model['_' + association.name + '_id'] = datum;
                                                        model[association.name + '_id'] = datum.id;
                                                    }
                                                    
                                                    //bugfix 20190503 initially first time install app, expand _plan_exercise_id.exercise was stored as a json string causing health plan to show undefined or item disappear from tile, thus we check and convert to JSON object.
                                                    _.each(data[i], function(val, index){
                                                        var jsonString = that.validateJSONString(val);
                                                        //console.log('index', index, 'val', val);
                                                        if(jsonString){
                                                            data[i][index] = jsonString;
                                                        }
                                                    });
                                                }
                                                
                                                if(association.associations){
                                                    //debugger;
                                                    _.find(association.associations, function(item, index){     
                                                        //testing remove console.log('nestedAssociation', item, 'associations', association.associations);
                                                        for(j=0; j < expandsLen; j++){
                                                            if(expands[j] === item.name){
                                                                var nestedPromise = $.Deferred();
                                                                nestedPromises.push(nestedPromise);
                                                                expandRow(item, data, nestedPromise);
                                                                
                                                                j = expandsLen;
                                                                return item;
                                                            }
                                                        }
                                                    });
                                                }
                                                promise.resolve();
                                            });
                                        } else {
                                            console.error('One to one table reference ' + association.table + ' does not exist. Skipping! You may want to use a remote fetch for this');
                                            promise.resolve();
                                        }
                                    });
                                break;
                            default:
                                promise.resolve();
                        }
                    } else {
                        promise.resolve();
                    }
                };

                // Find the association in the expand and make a promise then expand on it
                var association = _.findWhere(that.associations, {name: expands[i]});
                //testing remove console.log('association', association);
                var promise = $.Deferred();
                promises.push(promise);
                expandRow(association, rows, promise);
                //debugger;
            }

            $.when.apply(this, promises).then(function(){
                $.when.apply(this, nestedPromises).then(function(){
                    // For each custom expand map out a promise to that they can return, once done evaluate the callback
                    var customExpandPromises = _.map(that.customExpands, function(v, k){
                        //debugger;
                        if (expands.indexOf(k) >= 0) {
                            return v.bind(that)(tx, models);
                        }
                    });

                    // When all our custom expands are done then we can carry on
                    $.when.apply(this, customExpandPromises).then(function(){
                        //testing remove console.log('rows', rows);
                        //debugger;
                        callback(rows);
                    });
                });
            })
        },

        findAll: function (sortBy, sortDirection, callback) {
            var that = this;
            var sql = ["SELECT " + this.queryColumns.join(', ') + " FROM " + this.tableName];
            var params = [];
            if (!_.isEmpty(this.conditions)) {
                sql[0] += ' WHERE';
                //debugger;
                _.each(this.conditions, function (value, key) {
                    if(value && typeof value === 'object'){ //eg. {timestamp: { from_date: { operator: '>=', value: 'YYYY-MM-DD HH:mm:ss' }, to_date: { condition: 'AND', operator: '>=', value: 'YYYY-MM-DD HH:mm:ss' } } }
                        //TODO: IS NOT NULL
                        //debugger;
                        var subSqlCondition = '';
                        var count = 0;
                        _.each(value, function(value2, key2){
                            if(value2.operator != undefined){
                                if(value2.condition != undefined && count > 0){
                                    subSqlCondition += " " + value2.condition + " ";
                                }
                                subSqlCondition += that.tableName + '.' + key + " " + value2.operator + " '" + value2.value + "'";
                            }
                            count++;
                        });
                        if(subSqlCondition !== ''){
                            sql.push("(" + subSqlCondition + ")");
                        }
                    }else if (typeof value == "function") {
                        var tmp = value(sql, params);
                        if (tmp) {
                            sql.push(tmp);
                        }
                    } else if (value === null) {
                        sql.push("(" + key + " IS NULL OR " + key + " = '')");
                    } else if (value.toString().indexOf('|') >= 0) {
                        sql.push(that.tableName + '.' + key + ' IN (\'' + value.replace(/\|/g, '\',\'') + '\')');
                    } else {
                        var tmp = that.tableName + '.' + key;
                        if (typeof value == "number" || (that.attributes[key] && that.attributes[key] == "NUMERIC")) {
                            tmp += '=?'
                            params.push(value);
                        } else {
                            tmp += ' LIKE ?';
                            params.push('%' + value + '%');
                        }
                        sql.push(tmp);
                    }
                });
            }
            sql = sql.join(' AND ');
            sql = sql.replace (' WHERE AND ', ' WHERE ');

            if (sortBy) {
                var sortByValue = this.attributes[sortBy] ? sortBy : this.customSorting[sortBy] ? this.customSorting[sortBy] : null
                if (sortByValue) {
                    if (typeof sortByValue == "function") {
                        sortByValue = sortByValue.call(this);
                    }
                    sql += " ORDER BY " + sortByValue + " COLLATE NOCASE " + (sortDirection > 0 ? "ASC" : "DESC");
                } else {
                    console.error('Cannot sort by "' + sortBy + '" as it is not an attribute, or there were no custom sorts defined for ' + that.modelName);
                }
            }

            sql = sql.replace(' WHERE ORDER BY ', ' ORDER BY ').trim();

            if (sql.substr(sql.length-5) == 'WHERE') {
                sql = sql.substr(0, sql.length-5).trim();
            }

            if (this.state) {
                sql += ' LIMIT ' + ((this.state.currentPage-1) * this.state.pageSize) + ', ' + this.state.pageSize;
            }
            //testing remove console.log('findAll sql', sql);
            this.getTransaction(null, function (tx) {
                that.executeSql(tx, sql, params, function (tx, results) {
                    var len = results.rows.length;
                    var rows = [];
                    for (var i = 0; i < len; i++) {
                        rows[i] = results.rows.item(i);
                        for (var attribute in that.attributes) {
                            if (that.attributes[attribute].toLowerCase() == "blob") {
                                try {
                                    rows[i][attribute] = JSON.parse(rows[i][attribute]);
                                } catch (err) {
                                    // ignore
                                }
                            }
                            //convert DB timestamp format to default timestamp
                            else if(moment(rows[i][attribute], 'YYYY-MM-DD HH:mm:ss', true).isValid()){                                    
                                rows[i][attribute] = moment(rows[i][attribute], 'YYYY-MM-DD HH:mm:ss').format('DD-MM-YYYY HH:mm:ss');
                                //console.log('findAll table', that.tableName, 'attribute', attribute, rows[i][attribute], rows[i][attribute]);
                            }
                        }
                    }
                    //testing remove console.log('results sql', sql, 'rows', rows);
                    //debugger;
                    var afterFetch = function() {
                        if (that.expands.length > 0 || that.defaultExpands.length > 0) {
                            // that.getCollectionExpands.call(that, rows, callback);
                            that.getAllExpands.call(that, tx, rows, callback);
                        } else if (typeof callback == "function") {
                            callback(rows);
                        }
                    }

                    if (that.state) {
                        that.findCount.call(that, function(count) {
                            that.state.totalRecords = count;
                            that.state.totalPages = Math.ceil(count/that.state.pageSize);
                            that.state.lastPage = that.state.totalPages;
                            afterFetch();
                        });
                    } else {
                        afterFetch();
                    }

                }, function (tx, error) {
                    return that.statementError(error, sql, params, callback);
                });
            }, function (error) {
                return that.transactionError(error, sql, params, callback);
            });
        },

        findPaginated: function (currentPage, perPage, lastIdentifier, sortBy, sortDirection, callback) {
            var that = this;
            var sql = "SELECT " + this.queryColumns.join(', ') + " FROM " + this.tableName;
            var params = [];

            if (lastIdentifier) {
                sql += " WHERE " + sortBy + " " + (sortDirection > 0 ? ">" : "<") + " " + lastIdentifier;
            }

            if (!_.isEmpty(this.conditions)) {
                if (sql.indexOf('WHERE') >= 0) {
                    sql += " AND ";
                } else {
                    sql += ' WHERE ';
                }
                _.each(this.conditions, function (value, key) {
                    if (value === null) {
                        // sql += "(" + key + " = null OR " + key + " = '') AND ";
                    } else if (value.toString().indexOf('|') >= 0) {
                        sql += key + ' IN (\'' + value.replace(/\|/g, '\/,\/') + '\/) AND ';
                    } else {
                        sql += key + ' = ' + value + ' AND ';
                    }
                });
                sql = sql.substring(0, sql.length - 5);
            }
            if (sortBy) {
                sql += " ORDER BY " + sortBy + " COLLATE NOCASE " + (sortDirection > 0 ? "ASC" : "DESC");
            }
            sql += " LIMIT 0," + perPage;

            this.getTransaction(null, function (tx) {
                that.executeSql(tx, sql, params, function (tx, results) {
                    var len = results.rows.length;
                    var rows = [];
                    for (var i = 0; i < len; i++) {
                        rows[i] = results.rows.item(i);
                        for (var attribute in that.attributes) {
                            if (that.attributes[attribute].toLowerCase() == "blob") {
                                try {
                                    rows[i][attribute] = JSON.parse(rows[i][attribute]);
                                } catch (err) {
                                    // ignore
                                }
                            }
                        }
                    }
                    if (typeof callback == "function") {
                        callback(rows);
                    }
                }, function (tx, error) {
                    return that.statementError(error, sql, params, callback);
                });
            }, function (error) {
                return that.transactionError(error, sql, params, callback);
            });
        },

        findCount: function (callback) {
            var that = this;
            var sql = "SELECT COUNT(*) as count FROM " + this.tableName;
            var params = [];
            if (!_.isEmpty(this.conditions)) {
                sql += ' WHERE ';
                _.each(this.conditions, function (value, key) {
                    if (value === null) {
                        // sql += "(" + key + " = null OR " + key + " = '') AND ";
                    } else if (value.toString().indexOf('|') >= 0) {
                        sql += key + ' IN (\'' + value.replace(/\|/g, '\',\'') + '\') AND ';
                    } else {
                        sql += key + ' = ' + value + ' AND ';
                    }
                });
                sql = sql.substring(0, sql.length - 5);
            }
            this.getTransaction(null, function (tx) {
                that.executeSql(tx, sql, params, function (tx, results) {
                    if (typeof callback == "function") {
                        if (results.rows.length > 0 && typeof results.rows.item(0)['count'] != "undefined") {
                            callback(results.rows.item(0)['count']);
                        } else {
                            callback(0);
                        }
                    }
                }, function (tx, error) {
                    return that.statementError(error, sql, params, callback);
                });
            }, function (error) {
                return that.transactionError(error, sql, params, callback);
            });
        },

        find: function (model, sortBy, sortDirection, callback) {
            var that = this;
            var sql = ["SELECT " + this.queryColumns.join(', ') + " FROM " + this.tableName + ' WHERE'];
            var params = [];
            if (model.id) {
                sql[0] += ' id=? ';
                params.push(model.id);
            } else if (this.conditions && _.size(this.conditions) > 0) {
                _.each(this.conditions, function (value, key) {
                    if (typeof value == "function") {
                        var tmp = value(sql, params);
                        if (tmp) {
                            sql.push(tmp);
                        }
                    } else if (value === null) {
                        sql.push("(" + key + " IS NULL OR " + key + " = '')");
                    } else if (value.toString().indexOf('|') >= 0) {
                        sql.push(that.tableName + '.' + key + ' IN (\'' + value.replace(/\|/g, '\',\'') + '\')');
                    } else {
                        var tmp = that.tableName + '.' + key;
                        if (typeof value == "number") {
                            tmp += '=?'
                            params.push(value);
                        } else {
                            tmp += ' LIKE ?';
                            params.push('%' + value + '%');
                        }
                        sql.push(tmp);
                    }
                });
            } else {
                console.error("Cannot find a model without an ID or query parameters.", model, this);
                if (typeof callback == "function") {
                    callback(false);
                }
            }

            sql = sql.join(' AND ');
            sql = sql.replace (' WHERE AND ', ' WHERE ');

            if (sortBy) {
                var sortByValue = this.attributes[sortBy] ? sortBy : this.customSorting[sortBy] ? this.customSorting[sortBy] : null
                if (sortByValue) {
                    if (typeof sortByValue == "function") {
                        sortByValue = sortByValue.call(this);
                    }
                    sql += " ORDER BY " + sortByValue + " COLLATE NOCASE " + (sortDirection > 0 ? "ASC" : "DESC");
                } else {
                    console.error('Cannot sort by "' + sortBy + '" as it is not an attribute, or there were no custom sorts defined for ' + that.modelName);
                }
            }

            sql = sql.replace(' WHERE ORDER BY ', ' ORDER BY ').trim();

            if (sql.substr(sql.length-5) == 'WHERE') {
                sql = sql.substr(0, sql.length-5).trim();
            }
            //testing remove console.log('find sql', sql);
            this.getTransaction(null, function (tx) {
                that.executeSql(tx, sql, params, function (tx, results) {
                    if (typeof callback == "function") {
                        if (results.rows.length > 0) {
                            var result = results.rows.item(0);
                            for (var attribute in that.attributes) {
                                if (that.attributes[attribute].toLowerCase() == "blob") {
                                    try {
                                        result[attribute] = JSON.parse(result[attribute]);
                                    } catch (err) {
                                        // ignore
                                    }
                                }
                            }
                            that.getAllExpands(tx, result, function(){
                                callback(result);
                            });
                            /*that.getExpands(result, function() {
                                callback(result);
                            });*/
                        } else {
                            callback(false);
                        }
                    }
                }, function (tx, error) {
                    return that.statementError(error, sql, params, callback);
                });
            }, function (error) {
                return that.transactionError(error, sql, params, callback);
            });
        },

        create: function (model, callback, options) {
            options = options || {};
            var that = this;

            if (!model.get('cid')) {
                model.set('cid', WMAPP.Helper.generateUuid());
            }
            //debugger;
            if (!model.get('id')) {
                model.set('id', model.get('cid'));
            }
            var sql = "INSERT INTO " + that.tableName + " (id, cid, ";
            var paramStr = '?,?, ';
            var params = [model.id, model.get('cid')];
            for (var attribute in that.attributes) {
                sql += '[' + attribute + '],';
                paramStr += "?,";
                if (that.attributes[attribute].toLowerCase() == "blob") {
                    if (model.get(attribute) instanceof Backbone.Model || model.get(attribute) instanceof Backbone.Collection) {
                        params.push(JSON.stringify(model.get(attribute).toJSON()));
                        //console.log('create blog JSON.stringify attribute', attribute, JSON.stringify(model.get(attribute).toJSON()));
                    } else {
                        //console.log('create JSON.stringify attribute', attribute, JSON.stringify(model.get(attribute)));
                        params.push(JSON.stringify(model.get(attribute)));
                    }
                } else {
                    //bugfix 20190426 convert timestamp/plan_timestamp or other datetimestamp from DD-MM-YYYY HH:mm:ss to YYYY-MM-DD HH:mm:ss for sqlite timestamp search between two dates on first time install app
                    if(model.get(attribute) && moment(model.get(attribute), 'DD-MM-YYYY HH:mm:ss', true).isValid()){
                        model.set(attribute, moment(model.get(attribute), 'DD-MM-YYYY HH:mm:ss').format('YYYY-MM-DD HH:mm:ss'));
                    }
                    params.push(model.get(attribute));
                }
            }
            sql += "created, modified, dirty";
            paramStr += '?, ?, ?';
            var now = moment().format('YYYY-MM-DD HH:mm:ss');
            // created date
            if (!model.get('created')) {
                model.set('created', now);
                params.push(now);
            } else {
                params.push(model.get('created'));
            }

            // modified date
            if (!model.get('modified')) {
                model.set('modified', now);
                params.push(now);
            } else {
                params.push(model.get('modified'));
            }

            if (isFinite(model.id)) {
                params.push(0);
            } else {
                // model is dirty
                WMAPP.outOfSync();
                params.push(1);
            }

            sql += ') VALUES (' + paramStr + ')';
            this.getTransaction(options.tx, function (tx) {
                that.executeSql(tx, sql, params, function () {
                    if (options.disableSetExpands === true) {
                        if (typeof callback == "function") {
                            callback(true);
                        }
                    } else {
                        that.setExpands.call(that, model, function() {
                            if (typeof callback == "function") {
                                callback(true);
                            }
                        }, options);
                    }
                }, function (tx, error) {
                    // ignore duplicate IDs
                    if (error.message.indexOf('UNIQUE constraint failed') === -1) {
                        that.statementError(error, sql, params);
                    } else if (typeof callback == "function") {
                        callback(true);
                    }
                }, function (error) {
                    that.transactionError(error, sql, params);
                });
            });
        },

        updateAll: function(collection, callback, options) {
            options = options || {};
            var that = this;
            var initialSql = "INSERT OR REPLACE INTO " + this.tableName + " (id, cid, [";
            initialSql += _.keys(this.attributes).join('], [');
            initialSql += "], created, modified, dirty) VALUES ";
            //testing remove console.log('updateAll tableName', this.tableName);
            //if(this.tableName === 'plugin_gevity_completed_plans') debugger; //testing remove
            var paramsPerInsert = 0;
            var lastSync = moment('1970-01-01 00:00:00', 'YYYY-MM-DD HH:mm:ss').toDate().getTime();

            var valueParams = [];
            var valueSqls = []
            collection.each(function(model) {
                if (collection.forceClean) {
                    model.forceClean = true;
                }

                if (!model.get('cid')) {
                    model.set('cid', WMAPP.Helper.generateUuid());
                }

                if (!model.get('id')) {
                    model.set('id', model.get('cid'));
                }
                
                var valueSql = '(?, ?, '; // id, cid
                var valueParam = [model.get('id'), model.get('cid')];

                for (var attribute in that.attributes) {
                    valueSql += "?, ";
                    if (that.attributes[attribute].toLowerCase() == "blob") {
                        //console.log('updateAll blog JSON.stringify attribute', attribute, JSON.stringify(model.get(attribute)));
                        valueParam.push(JSON.stringify(model.get(attribute)));
                    } else {
                        //bugfix 20190426 convert timestamp/plan_timestamp or other datetimestamp from DD-MM-YYYY HH:mm:ss to YYYY-MM-DD HH:mm:ss for sqlite timestamp search between two dates on first time install app
                        if(model.get(attribute) && moment(model.get(attribute), 'DD-MM-YYYY HH:mm:ss', true).isValid()){
                            model.set(attribute, moment(model.get(attribute), 'DD-MM-YYYY HH:mm:ss').format('YYYY-MM-DD HH:mm:ss'));
                        }
                        valueParam.push(model.get(attribute));
                    }
                }

                valueSql += '?, ?, ?'; // created, modified, dirty

                var now = moment().format('YYYY-MM-DD HH:mm:ss');

                // created date
                if (!model.get('created')) {
                    model.set('created', now);
                    valueParam.push(now);
                } else {
                    valueParam.push(model.get('created'));
                }
                // modified date
                if (!model.get('modified')) {
                    model.set('modified', now);
                    valueParam.push(now);
                } else {
                    valueParam.push(model.get('modified'));
                }                             
                // updated models will always be dirty unless we've specifically said it's not (eg syncing with server)
                if (collection.forceClean || model.forceClean) {
                    valueParam.push(0);
                } else {
                    WMAPP.outOfSync();
                    valueParam.push(1);
                }
                valueSql += ')';

                valueSqls.push(valueSql);
                valueParams.push(valueParam);
                paramsPerInsert = valueParam.length;
                
                //20190510 GEVITY-28 Mobile app: fetch new available readings and health plans data from server and sync to multiple devices.
                if(model.get('synced') && moment(model.get('synced'), 'YYYY-MM-DD HH:mm:ss').toDate().getTime() > lastSync){
                    lastSync = moment(model.get('synced'), 'YYYY-MM-DD HH:mm:ss').toDate().getTime();
                    WMAPP.hasNewSyncData = true;                    
                    if(that.modelName === 'Gevity.Model.Profile'){
                        WMAPP.hasNewProfileData = true;
                    }
//                    if(that.modelName === 'Gevity.Model.DetailPlan'){ //TODO: update gevity.module.js to alert user of new health plan added
//                        WMAPP.hasNewHealthPlanData = true;
//                    }                    
                }
            });
            //testing remove debug console.log('lastSync ', new Date(lastSync), 'modelName', that.modelName );
            WMAPP.setLastSync(localStorage.getItem('WMAPP.site'), 'WMAPP.' + that.modelName, lastSync);

            // SQLite seems to have a max limit of 999 params per query, so we're going to have to slice the queries up into pieces.
            var maxParams = 999;

            this.getTransaction(options.tx, function (tx) {
                var promises = [];
                var sqls = [];
                var maxInserts = Math.floor(maxParams/paramsPerInsert);

                while((sqls = valueSqls.splice(0, maxInserts)).length > 0) {
                    var params = _.flatten(valueParams.splice(0, maxInserts));
                    var sql = initialSql + sqls.join(', ');

                    // need to wrap ina  function so that the `promise` var is scoped correctly in the async callback
                    (function() {
                        var promise = new $.Deferred();

                        that.executeSql.call(promise, tx, sql, params, promise.resolve, function (tx, error) {
                            return that.statementError(error, sql, params, callback);
                        });

                        promises.push(promise);
                    }());

                }

                $.when.apply(null, promises).then(function() {
                    if (options.disableSetExpands === true) {
                        if (typeof callback == "function") {
                            callback(true);
                        }
                    } else {
                        that.setAllExpands.call(that, collection, function() {
                            if (typeof callback == "function") {
                                callback(true);
                            }
                        });
                    }
                });
            }, function (error) {
                return that.transactionError(error, null, null, callback);
            });
        },

        update: function (model, callback, options) {
            options = options || {};
            var that = this;
            var sql = "INSERT OR REPLACE INTO " + this.tableName + " (id, cid, ";
            var paramStr = '?,?,';
            //testing remove console.log('update tableName', this.tableName);
            //debugger;
            if (!model.get('cid')) {
                model.set('cid', WMAPP.Helper.generateUuid());
            }

            if (!model.get('id')) {
                model.set('id', model.get('cid'));
            }

            var params = [model.get('id'), model.get('cid')];

            for (var attribute in this.attributes) {
                sql += '[' + attribute + '],';
                paramStr += "?,";
                if (this.attributes[attribute].toLowerCase() == "blob") {
                    //testing remove console.log('update blog JSON.stringify attribute', attribute, JSON.stringify(model.get(attribute)));
                    params.push(JSON.stringify(model.get(attribute)));
                } else {
					if(model.get(attribute) && moment(model.get(attribute), 'DD-MM-YYYY HH:mm:ss', true).isValid()) {
                        params.push(moment(model.get(attribute), 'DD-MM-YYYY HH:mm:ss').format('YYYY-MM-DD HH:mm:ss'));
					} else {
						params.push(model.get(attribute));
                    }
                }
            }
            sql += "created, modified, dirty";
            paramStr += '?, ?, ?';
            var now = moment().format('YYYY-MM-DD HH:mm:ss');

            // created date
            if (!model.get('created')) {
                model.set('created', now);
                params.push(now);
            } else {
                params.push(model.get('created'));
            }

            // modified date
            if (!model.get('modified')) {
                model.set('modified', now);
                params.push(now);
            } else {
                params.push(model.get('modified'));
            }

            // updated models will always be dirty unless we've specifically said it's not (eg syncing with server)
            if (model.forceClean) {
                params.push(0);
            } else {
                WMAPP.outOfSync();
                params.push(1);
            }


            sql += ') VALUES (' + paramStr + ')';
            this.getTransaction(options.tx, function (tx) {
                that.executeSql(tx, sql, params, function () {
                    if (options.disableSetExpands === true) {
                        if (typeof callback == "function") {
                            callback(true);
                        }
                    } else {
                        that.setExpands.call(that, model, function() {
                            if (typeof callback == "function") {
                                callback(true);
                            }
                        }, options);
                    }
                }, function (tx, error) {
                    return that.statementError(error, sql, params, callback);
                });
            }, function (error) {
                return that.transactionError(error, sql, params, callback);
            });
        },

        softDestroy: function(id, callback) {
            var that = this;
            if (id instanceof Backbone.Model) {
                id = id.id;
            }
            //debugger;
            if (!id) {
                if (typeof callback == "function") {
                    callback(true);
                }
                return false;
            }

            this.addDestroyedColumn(function() {
                var sql = "UPDATE " + that.tableName + " SET dirty =0, destroyed = ? WHERE id=?";
                var params = [moment().format('YYYY-MM-DD HH:mm:ss'), id];
                that.getTransaction(null, function (tx) {
                    that.executeSql(tx, sql, params, function () {
                        if (typeof callback == "function") {
                            callback(true);
                        }
                    }, function (tx, error) {
                        return that.statementError(error, sql, params, callback);
                    });
                }, function (error) {
                    return that.transactionError(error, sql, params, callback);
                });
            });
        },

        destroy: function (id, callback, options) {
            options = options || {};
            var that = this;
            if (id instanceof Backbone.Model) {
                id = id.id;
            }
            var sql = "DELETE FROM " + this.tableName + " WHERE id=?";
            var params = [id];
            this.getTransaction(options.tx, function (tx) {
                that.executeSql(tx, sql, params, function () {
                    if (typeof callback == "function") {
                        callback(true);
                    }
                }, function (tx, error) {
                    return that.statementError(error, sql, params, callback);
                });
            }, function (error) {
                return that.transactionError(error, sql, params, callback);
            });
        },

        cleanOldSoftDestroyed: function(callback) {
            var that = this;
            var sql = "DELETE FROM " + this.tableName + " WHERE destroyed IS NOT NULL AND destroyed <> '' AND destroyed < ?";
            var params = [moment().add(-7, 'day').format('YYYY-MM-DD HH:mm:ss')];
            this.getTransaction(null, function (tx) {
                that.executeSql(tx, sql, params, function () {
                    if (typeof callback == "function") {
                        callback(true);
                    }
                }, function (tx, error) {
                    callback(false);
                    return that.statementError(error, sql, params, callback);
                });
            }, function (error) {
                callback(false);
                return that.transactionError(error, sql, params, callback);
            });
        },

        destroyAllClean: function (callback) {
            var that = this;
            var sql = "DELETE FROM " + this.tableName + " WHERE dirty = 0";
            var params = null;
            this.getTransaction(null, function (tx) {
                that.executeSql(tx, sql, params, function () {
                    if (typeof callback == "function") {
                        callback(true);
                    }
                }, function (tx, error) {
                    return that.statementError(error, sql, params, callback);
                });
            }, function (error) {
                return that.transactionError(error, sql, params, callback);
            });
        },

        destroyAllDirty: function (callback) {
            var that = this;
            var sql = "DELETE FROM " + this.tableName + " WHERE dirty = 1";
            var params = null;
            this.getTransaction(null, function (tx) {
                that.executeSql(tx, sql, params, function () {
                    if (typeof callback == "function") {
                        callback(true);
                    }
                }, function (tx, error) {
                    return that.statementError(error, sql, params, callback);
                });
            }, function (error) {
                return that.transactionError(error, sql, params, callback);
            });
        },

        query: function(sql, params) {
            window.getTransaction(null, function (tx) {
                tx.executeSql(sql, params, function(tx, results) {
                    console.error(results);
                }, function (tx, error) {
                    return that.statementError(error, sql, params);
                });
            }, function (error) {
                return that.transactionError(error, sql, params);
            });
        },

        executeSql: function(tx, sql, params, successCallback, errorCallback) {
            tx.executeSql(sql, params, function(tx, result) {
                //console.trace('%c ' + sql, 'color: green', params, result.rows);
                //console.trace(sql, params, result);
                var consoleFunc = window._console ? window._console.info : console.info;
                consoleFunc('%c ' + sql, 'color: green', params, result);

                if (typeof successCallback == "function") {
                    successCallback(tx, result);
                }
            }, errorCallback);
        },

        getTransaction: function(tx, callback, errorCallback) {
            if (tx) {
                callback(tx);
            } else {
                this.db.transaction(function(tx) {
                    callback(tx);
                }, errorCallback);
            }
        },

        transactionError: function (error, sql, params, callback) {
            console.error("Transaction Error", error.message, error, this);
            console.error('Error Stack', error.stack);
            console.error(sql);
            console.error("Query Params: ", params);
            if (typeof callback == "function") {
                callback(false);
            }
            return false;
        },

        statementError: function (error, sql, params, callback) {
            console.error("Statement Error", error.message, error, this);
            console.error('Error Stack', error.stack);
            console.error(sql);
            console.error("Query Params: ", params);
            if (typeof callback == "function") {
                callback(false);
            }
            return false;
        }
    });
});
