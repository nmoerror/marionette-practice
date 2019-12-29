WMAPP.module('Extension.Workflow', Backbone.Marionette.Module.extend({
    startWithParent: false,
    getChannel: function () {
        if (this._channel) {
            return this._channel;
        } else {
            this._channel = Backbone.Wreqr.radio.channel('WMAPP.' + this.moduleName + '.channel');
            return this._channel;
        }
    },
    onStart: function (options) {
        WMAPP.Log.getLogger("WMAPP." + this.moduleName).trace("Workflow Module onStart begin");
        WMAPP.Log.getLogger("WMAPP." + this.moduleName).trace("Workflow Module onStart end");
    },
    onStop: function () {
        WMAPP.Log.getLogger("WMAPP." + this.moduleName).trace("Workflow Module onStop begin");
        WMAPP.Log.getLogger("WMAPP." + this.moduleName).trace("Workflow Module onStop end");
    },
}));

WMAPP.module('Extension.Workflow.Router', function(Router) {
	Router.ExtensionWorkflowRouter = WMAPP.Extension.Router.AppRouter.extend({
		/*appRoutes : {
            "workflow/progress/:id" : "showProgressWorkflow"
		},*/
	});
});

WMAPP.module('Extension.Workflow.Application', Backbone.Marionette.Module.extend({
	startWithParent: true,
    vent: WMAPP.Extension.Workflow.getChannel().vent,
	
    onStop: function() {
        this.stopListening();
    },

	onStart: function(options) {
        this.options = options;
        // initialize tile region and router
        this.workflowOptions = options;
        this.tileRegion = this.workflowOptions.region;

        // initialize models
        this.workflowScheme = new WMAPP.Core.Model.WorkflowScheme();
        this.workflowInstance = new WMAPP.Core.Model.WorkflowInstance();
        this.entity = this.options.entityInstance;
        this.availableTransitions = new WMAPP.Core.Model.WorkflowTransitionSchemeCollection();
        this.currentStepInstance = new WMAPP.Core.Model.WorkflowStepInstance();
        this.stepSchemes = new WMAPP.Core.Model.WorkflowStepSchemeCollection();

        // listening to the back button event
        this.listenTo(this.vent, 'trigger:backWorkflowEvent', function() {
            this.workflowRouter.navigate('', {trigger: true});
            WMAPP.Extension.Workflow.stop();
        }, this);

        // Init router
		var appRoutes = {
			"workflow/progress/:id" : "showProgressWorkflow",
		};
		if (WMAPP.isApp) {
			var tile = WMAPP.slug;
			for (var i in appRoutes) {
				var key = i == "" ? tile : (tile+'/'+i);
				appRoutes[key] = appRoutes[i];
				delete appRoutes[i];
			}
		}

        this.workflowRouter = new WMAPP.Extension.Workflow.Router.ExtensionWorkflowRouter({
            controller: this,
            appRoutes : appRoutes,
        });
    },

    /**
     * go back to the entity view
     */
    cancelAndGoBack: function() {
        this.vent.trigger('trigger:backWorkflowEvent');
    },

    // PROGRESS

    /**
     * gets entity by id
     * @param id
     * @returns promise
     */
    getEntityById: function(id) {
        var deferred = $.Deferred();
        this.entity.clear();
        //this.entity.url = this.entity.getUrl() + '/' + id + '?expand=workflow';
        this.entity.fetch().done(function(){
            deferred.resolve();
        });
        return deferred.promise();
    },

    /**
     * gets workflow scheme by id
     * @param id
     * @returns promise
     */
    getWorkflowSchemeById: function(id) {
        var deferred = $.Deferred();
        this.workflowScheme = new WMAPP.Core.Model.WorkflowScheme();
        this.workflowScheme.url = this.workflowScheme.getUrl() + '/' + id + '?expand=step_schemes';
        this.workflowScheme.fetch().done(function(){
            deferred.resolve();
        });
        return deferred.promise();
    },

    /**
     * gets workflow instance by id
     * @param id
     * @returns promise
     */
    getWorkflowInstanceById: function(id) {
        var deferred = $.Deferred();
        this.workflowInstance = new WMAPP.Core.Model.WorkflowInstance();
        this.workflowInstance.url = this.workflowInstance.getUrl() + '/' + id + '?expand=workflow|workflow_scheme';
        this.workflowInstance.fetch().done(function(){
            deferred.resolve();
        });
        return deferred.promise();
    },

    /**
     *  show progress workflow views
     * @param entityInstanceId
     */
    showProgressWorkflow: function (entityInstanceId) {

        var that = this;
        if (!this.options.layout) {
            this.options.layout = 'WorkflowLayout'
        }

        // initialize and display layout
        this.workflowProgress = new WMAPP.Extension.Workflow.View.WorkflowProgress({
            model: this.entity,
            layoutId: this.options.layout,
        });


        this.listenTo(this.workflowProgress, 'trigger:editZeroWorkflowCancel', this.cancelAndGoBack);

        this.tileRegion.show(this.workflowProgress);

        if (!this.entity || !this.entity.id) {
        this.getEntityById(entityInstanceId).done(function () {
                that.showWorkflowViews(that.entity);
                // fetch data
                that.fetchWorkflowData(that.entity);
                // reflow foundation
                $(document).foundation('reflow');
            });
        } else {
            that.showWorkflowViews(that.entity);
            // fetch data
            that.fetchWorkflowData(that.entity);
            // reflow foundation
            $(document).foundation('reflow');
        }
    },

    showWorkflowViews: function(entity) {
        if (entity.id) {

                // initialize views
                // association
                var workflowProgressAssociate = new WMAPP.Extension.Workflow.View.WorkflowProgressAssociate({
                model: entity
                });

                // status
                var workflowProgressStatus = new WMAPP.Extension.Workflow.View.WorkflowProgressStatus({
                model: this.currentStepInstance,
                });

                // buttons
                var workflowProgressButtons = new WMAPP.Extension.Workflow.View.WorkflowProgressButtons({
                collection: this.availableTransitions,
                });

                // tabs
                var workflowProgressTabs = new WMAPP.Extension.Workflow.View.WorkflowProgressTabs({
                model: entity
                });

                // start
                var workflowProgressStart = new WMAPP.Extension.Workflow.View.WorkflowProgressStart({
                model: entity
                });

                var workflowProgressText = new WMAPP.Extension.Workflow.View.WorkflowProgressTextCollection({
                model: this.workflowScheme,
                currentStep: this.currentStepInstance,
                collection: this.stepSchemes,
                entity: this.entity
                });

                var workflowProgressDiagram = new WMAPP.Extension.Workflow.View.WorkflowProgressDiagram({
                model: this.workflowInstance
                });

                // bind events
            this.listenTo(workflowProgressButtons, 'childview:trigger:onChangeStatusClick', this.changeWorkflowStatus);
            this.listenTo(workflowProgressStart, 'trigger:onWorkflowStart', this.startWorkflow);

                // show views
            this.workflowProgress.statusField.show(workflowProgressStatus);
            this.workflowProgress.buttonsField.show(workflowProgressButtons);
            this.workflowProgress.tabsField.show(workflowProgressText);
            this.workflowProgress.startField.show(workflowProgressStart);
            this.workflowProgress.associateField.show(workflowProgressAssociate);
                //workflowProgressTabs.textField.show(workflowProgressText);
                //workflowProgressTabs.diagramField.show(workflowProgressDiagram);
            }

    },

    /**
     * fetch all the necessary models
     * @param entity
     */
    fetchWorkflowData: function(entity) {
        var that = this;
        // the workflow is started
        if (entity.get('workflow_instance_id')) {
            // fetch the running instance and other goodies
            that.getWorkflowInstanceById(entity.get('workflow_instance_id')).done(function () {
                that.workflowScheme.clear().set(that.workflowInstance.get('_workflow_scheme_id').attributes);

                that.entity.set({
                    '_workflow_instance_id': that.workflowInstance,
                    'workflow_instance_id': that.workflowInstance.id,
                    '_workflow_scheme_id': that.workflowScheme,
                    'workflow_scheme_id': that.workflowScheme.id

                });

                that.stepSchemes.reset(that.workflowScheme.get('_step_schemes').models);
                if (that.workflowInstance.get('_available_transitions')) {
                that.availableTransitions.reset(that.workflowInstance.get('_available_transitions').models);
                } else {
                    that.availableTransitions.reset();
                }

                that.currentStepInstance.clear().set(that.workflowInstance.get('_current_step_instance').attributes);
            })
          // the workflow's not started but there's a scheme associated with it
        } else if (that.entity.get('workflow_scheme_id')) {
            that.getWorkflowSchemeById(that.entity.get('workflow_scheme_id')).done(function () {
                that.entity.set('_workflow_scheme_id', that.workflowScheme);
                that.entity.set('workflow_scheme_id', that.workflowScheme.id);
                that.stepSchemes.reset(that.workflowScheme.get('_step_schemes').models);
                that.availableTransitions.reset();
                that.currentStepInstance.clear();
            })
        } else {
            // show an error message saying that you have to associate a workflow with that entity first
        }
    },

    /**
     * save the workflow
     * @param model
     */
    saveWorkflow: function(model) {
        // validate the model
        model.validate();

        if (model.isValid()) {
            var that = this;

            model.save({}, {
                success: function(model, response) {

                    // display flash message
                    WMAPP.Helper.showMessage('success', 'The workflow has been saved.');

                    // redirect to the list if successful
                    WMAPP.vent.trigger('edit:workflow:success', model);

                    // if it's a new instance, save the entity
                    if (!that.entity.get('workflow_instance_id')) {
                        that.entity.set({
                            'workflow_instance_id': model.id
                        });

                        that.entity.save().done(function() {
                            that.fetchWorkflowData(that.entity);
                        });
                    } else {
                        that.fetchWorkflowData(that.entity);
                    }

                    WMAPP.Helper.wmAjaxEnd();
                },
                error: function(model, response) {
                    WMAPP.Helper.showMessage('alert', response.responseJSON.message);

                    WMAPP.Helper.wmAjaxEnd();
                },
            });
        } else {
            WMAPP.Helper.wmAjaxEnd();
        }
    },

    /**
     * start a new workflow
     * @param model
     */
    startWorkflow: function(model) {
        // set attributes indicating that we're starting a new one
        this.workflowInstance.clear().set({
            'name': model.get('_workflow_scheme_id').get('name'),
            'workflow_scheme_id': model.get('workflow_scheme_id'),
            '_workflow_scheme_id': model.get('_workflow_scheme_id'),
            'command': 'start_workflow'
        });

        // save the workflow
        this.saveWorkflow(this.workflowInstance);
    },

    /**
     * progress the workflow
     * @param view
     * @param model
     */
    changeWorkflowStatus: function(view, model) {
        // set attributes indicating that we're progressing the workflow to the next step
        this.workflowInstance.set({
            'command': 'update_workflow_status',
            'new_transition': model
        });

        // save the workflow
        this.saveWorkflow(this.workflowInstance);
    },
}));

WMAPP.module('Extension.Workflow.View', function(View) {

    // Workflow scheme views

    View.CoreWorkflowSchemeCreate = WMAPP.Extension.View.LayoutView.extend({
        initialize: function() {
            if (WMAPP.isApp) {
                WMAPP.setTitle("Create WorkflowScheme");
            }
            WMAPP.Extension.View.LayoutView.prototype.initialize.call(this);
        },
        template: function(data) {
            var model = data.model;
            var options = data.options;
            var tmplStr = '';
            tmplStr += '<fieldset>';
            tmplStr += '<legend>' + options.label + '</legend>';
            tmplStr += '<div><div id="CoreWorkflowSchemeException"></div></div>';
            tmplStr += '<input type="hidden" name="locale" id="wmappSetLocale" value="en" class="input-text medium input-text">';
            tmplStr += '	<div class="wmapp-form">';
            tmplStr += '		<div class="wmapp-core-workflow_scheme-create-name"></div>';
            tmplStr += '		<div class="wmapp-core-workflow_scheme-create-description"></div>';
            tmplStr += '		<div class="wmapp-core-workflow_scheme-create-step_schemes"></div>';
            tmplStr += '	</div>';
            tmplStr += '	<ul class="button-group"><li><button type="button" class="wmapp-submit-button wymupdate js-trigger-pepperbox small">Save Workflow Scheme</button></li>';
            tmplStr += '	<li><button type="button" class="wmapp-cancel-button alert small">Cancel</button></li></ul>';
            tmplStr += '</fieldset>';
            return tmplStr;
        },
        regions: {
            nameField: '.wmapp-core-workflow_scheme-create-name',
            descriptionField: '.wmapp-core-workflow_scheme-create-description',
            stepSchemesField: '.wmapp-core-workflow_scheme-create-step_schemes',
        },
        className: 'wmapp-core-workflow_scheme-create',
        events: {
            "click .wmapp-submit-button": "onSubmit",
            "click .wmapp-cancel-button": "onCancel",
        },
        ui: {
            form : '#CoreWorkflowScheme'
        },
        templateHelpers:function(){
            return {
                model: this.model,
                options: {
                    label: this.options.label,
                }
            }
        },
        onSubmit: function(e) {
            WMAPP.Helper.wmAjaxStart($(e.target));
            // trigger the create workflow_scheme event in the application
            this.triggerDelayed('trigger:createWorkflowSchemeEventSubmit', this.model);
        },
        onCancel: function() {
            // trigger the cancel workflow_scheme event in the application
            this.triggerDelayed('trigger:createWorkflowSchemeEventCancel', this.model);
        },
    });

    // Step scheme views

    View.CoreWorkflowStepSchemeTableLayoutCustom = WMAPP.Extension.View.LayoutView.extend({
        template: function(options) {
            var _tmplStr = '<fieldset>' +
                '<legend>' + options.options.label + '</legend>' +
                '<div class="wmapp-core-workflow_step_scheme-table-create wmapp-table-create"></div>' +
                '<div class="wmapp-core-workflow_step_scheme-table-list"></div>' +
                '</fieldset>';
            return _tmplStr;
        },
        templateHelpers:function(){
            return {
                options: {
                    label: this.options.label,
                }
            }
        },
        regions: {
            listField: '.wmapp-core-workflow_step_scheme-table-list',
            createField: '.wmapp-core-workflow_step_scheme-table-create',
        },
    });

    View.CoreWorkflowStepSchemeTableItemCustom = WMAPP.Extension.View.LayoutView.extend({
        tagName: 'div',
        className: 'wmapp-core-workflow-step-scheme-table-item',
        template: function(data) {
            var options = data.options;
            var model = data.model;

            var _tmplStr = '<div class="row small-block-grid-1">' +
                '<div class="large-4 columns wmapp-core-workflow_step_scheme-table-name"></div>' +
                '<div class="large-5 columns wmapp-core-workflow_step_scheme-table-description"></div>' +
                '<div class="large-1 columns wmapp-core-workflow_step_scheme-table-isstart"></div>' +
                '<div class="large-2 columns text-center"><ul class="button-group">' +
                '<li><a class="wmapp-edit-transitions-button button small edit" data-id="' + model.id + '" title="Edit Transitions">&zwj;<i class="fa fa-arrow-down"></i></a></li>' +
                '<li><a class="wmapp-delete-button button small alert" data-id="' + model.id + '" title="Are you sure you want to delete this Workflow Step Scheme?">&zwj;<i class="fa fa-times"></i></a></li>' +
                '</ul></div>' +
                '</div>';

            _tmplStr +=  '</ul>';
            _tmplStr += '<div class="wmapp-core-workflow_step_scheme-table-transitions_preview"></div>';
            _tmplStr += '<div class="wmapp-core-workflow_step_scheme-table-transitions"></div>';
            return _tmplStr;
        },
        events: {
            "click .wmapp-edit-transitions-button": "onEditTransitionsClick"
        },

        onEditTransitionsClick: function() {
            this.trigger('trigger:showEditTransitions', this.model, this.options);
        },

        templateHelpers: function(){
            return {
                model: this.model,
                options: this.options
            }
        },
        regions: {
            nameField: '.wmapp-core-workflow_step_scheme-table-name',
            descriptionField: '.wmapp-core-workflow_step_scheme-table-description',
            isStartField: '.wmapp-core-workflow_step_scheme-table-isstart',
            transitionsPreviewField: '.wmapp-core-workflow_step_scheme-table-transitions_preview',
            transitionsField: '.wmapp-core-workflow_step_scheme-table-transitions'
        },
        initialize: function(options) {
            this.options = _.extend(this.options, options.options);
            this.options.layoutId = 'CoreWorkflowStepScheme';
            if (this.model) {
                Backbone.Validation.bind(this);
            }
        },
        onRender: function() {

            // Name TextField for workflow_step_scheme create
            var coreWorkflowStepSchemeName = new WMAPP.Extension.View.TextField({
                model: this.model,
                fieldId: 'CoreWorkflowStepSchemeName' + this.model.cid,
                fieldClass: '',
                fieldType: 'text',
                placeholder: 'Name',
                label: 'Name',
                name: 'name',
                tooltip: 'The Name for your workflow step scheme',
                readonly: this.options.readonly,
                required: true
            });


            // Description TextArea for workflow_step_scheme create
            var coreWorkflowStepSchemeDescription = new WMAPP.Extension.View.TextField({
                model: this.model,
                fieldId: 'CoreWorkflowStepSchemeDescription' + this.model.cid,
                fieldClass: '',
                fieldType: 'text',
                placeholder: 'Description',
                label: 'Description',
                name: 'description',
                tooltip: 'The Description for your workflow step scheme',
                readonly: this.options.readonly,
            });

            // IsStart CheckBox for workflow_step_scheme create
            var coreWorkflowStepSchemeIsStart = new WMAPP.Extension.View.CheckBox({
                model: this.model,
                fieldId: 'CoreWorkflowStepSchemeIsStart' + this.model.cid,
                fieldClass: '',
                label: 'Start',
                name: 'is_start',
                tooltip: 'This Step is the entry point of the workflow',
                readonly: this.options.readonly,
            });

            // the count of fields plus the commands
            var cols = 4;


            this.coreWorkflowTransitionSchemeTableLayoutCustom = new WMAPP.Extension.Workflow.View.CoreWorkflowTransitionSchemeTableLayoutCustom({
                label: 'Transition from schemes',
            });

            if (!this.model.get('_transition_from_schemes')) {
                this.model.set('_transition_from_schemes', new WMAPP.Core.Model.WorkflowTransitionSchemeCollection());
            }

            // create a new model
            var newTransitionScheme = new WMAPP.Core.Model.WorkflowTransitionScheme({}, {validate:true});
            // remove the reverse validation
            delete newTransitionScheme.validation._step_from_scheme_id;
            delete newTransitionScheme.validation.step_from_scheme_id;

            this.coreWorkflowTransitionSchemeTableCustom = new WMAPP.Extension.Workflow.View.CoreWorkflowTransitionSchemeTableCustom({
                layoutId: 'CoreWorkflowTransitionScheme',
                parentLayoutId: 'CoreWorkflowStepScheme',
                fieldId: 'WorkflowTransitionSchemes' + this.model.cid,
                create: true,
                collection: this.model.get('_transition_from_schemes'),
                stepSchemeCollection: this.options.collection
            });
            this.coreWorkflowTransitionSchemeTableCreateCustom = new WMAPP.Extension.Workflow.View.CoreWorkflowTransitionSchemeTableCreateCustom({
                layoutId: 'CoreWorkflowTransitionScheme',
                parentLayoutId: 'CoreWorkflowStepScheme',
                fieldId: 'WorkflowTransitionSchemes' + this.model.cid,
                collection: this.model.get('_transition_from_schemes'),
                model: newTransitionScheme,
                stepSchemeCollection: this.options.collection,
                stepScheme: this.model
            });

            this.nameField.show(coreWorkflowStepSchemeName);
            this.descriptionField.show(coreWorkflowStepSchemeDescription);
            this.isStartField.show(coreWorkflowStepSchemeIsStart);

            // reflow foundation
            $(document).foundation('reflow');

            // add the medium grid class to the block grid ul
            if (!this.options.create && this.options.readonly) {
                --cols;
            }
            this.$el.find('ul.small-block-grid-1').addClass('medium-block-grid-' + cols);
        },
        triggers: {
            "click .wmapp-delete-button": 'trigger:coreWorkflowStepSchemeDeleteTableRow'
        }
    });

    View.CoreWorkflowStepSchemeTableCustom = WMAPP.Extension.View.CollectionView.extend({
        tagName: "div",
        childView: View.CoreWorkflowStepSchemeTableItemCustom,
        initialize: function() {
            if (this.model) {
                Backbone.Validation.bind(this);
            }
            this.on('childview:trigger:coreWorkflowStepSchemeDeleteTableRow', this.removeRow);
            this.on('childview:trigger:showEditTransitions', this.catchShowEditTransitions);
        },

        catchShowEditTransitions: function(view, model, options) {
            if (this.children) {
                if (this.children._views) {
                    _.each(this.children._views, function(_view){
                        if (!!_view.transitionsField.currentView) {
                            _view.transitionsField.currentView.destroy();
                        }
                    });
                }
                this.trigger('trigger:showEditTransitions', view, model, options);
            }
        },

        removeRow: function(childView, args){
            this.collection.remove(args.model);
        },
        options: {
            showSystemFields: true,
            readonly: false
        },
        childViewOptions: function() {
            return {
                options: this.options,
                workflow: this.model
            }
        },
    });

    View.CoreWorkflowStepSchemeTableCreateCustom = WMAPP.Extension.View.LayoutView.extend({
        initialize: function() {
            this.options.layoutId = 'CoreWorkflowStepScheme';
            if (this.model) {
                Backbone.Validation.bind(this);
            }
        },
        template: function(data) {
            var options = data.options;
            var model = data.model;

            var _tmplStr = '<div class="row small-block-grid-1">' +
                '<div class="large-4 columns wmapp-core-workflow_step_scheme-table-name"></div>' +
                '<div class="large-5 columns wmapp-core-workflow_step_scheme-table-description"></div>' +
                '<div class="large-1 columns wmapp-core-workflow_step_scheme-table-isstart"></div>' +
                '<div class="large-2 columns text-center">' +
                '<label>Commands<span data-tooltip="" class="has-tip tip-right" title="Commands"></span></label>'+
                '<a class="wmapp-add-button wmapp-core-workflow-step-add-button button small edit">&zwj;<i class="fa fa-plus"></i></a>' +
                '<a class="wmapp-clear-button wmapp-core-workflow-step-clear-button button small secondary">&zwj;<i class="fa fa-minus"></i></a>';
            '</div>' +
            '</div>';
            return _tmplStr;
        },
        regions: {
            nameField: '.wmapp-core-workflow_step_scheme-table-name',
            descriptionField: '.wmapp-core-workflow_step_scheme-table-description',
            isStartField: '.wmapp-core-workflow_step_scheme-table-isstart'
        },
        events: {
            "click .wmapp-add-button": "onAdd",
            "click .wmapp-clear-button": "onClear",
            "click .wmapp-delete-button": "onRemove",
        },
        options: {
            singleReference: false,
            showSystemFields: true,
            readonly: false,
        },
        onAdd: function() {
            this.model.validate();

            if (this.model.isValid()) {
                if (this.collection !== undefined) {
                    this.collection.add(this.model.clone());
                    this.model.clear().set(this.model.defaults);
                    var temp_id = 'c' + moment().format('X');
                    this.model.set('temp_id', temp_id);
                    this.model.set('id', temp_id);
                } else {
                    this.model.set('id', 0);
                    this.$el.find('.wmapp-add-button').toggleClass('hide');
                    this.$el.find('.wmapp-clear-button').toggleClass('hide');
                    this.$el.find('.wmapp-delete-button').toggleClass('hide');
                }

                WMAPP.Helper.clearErrors('CoreWorkflowStepScheme');
            }
        },
        onClear: function() {
            // reset the model back to the defaults, but keep the id
            var id = this.model.id;
            this.model.clear().set(this.model.defaults);
            this.model.id = id;
            this.model.set('id', id);
            WMAPP.Helper.clearErrors('CoreWorkflowStepScheme');
        },
        onRemove: function() {
            this.model.clear().set(this.model.defaults);
            this.$el.find('.wmapp-add-button').toggleClass('hide');
            this.$el.find('.wmapp-clear-button').toggleClass('hide');
            this.$el.find('.wmapp-delete-button').toggleClass('hide');
        },
        onRender: function() {

            // Name TextField for workflow_step_scheme create
            var coreWorkflowStepSchemeName = new WMAPP.Extension.View.TextField({
                model: this.model,
                fieldId: 'CoreWorkflowStepSchemeName' + this.model.cid,
                fieldClass: '',
                fieldType: 'text',
                placeholder: 'Name',
                label: 'Name',
                name: 'name',
                tooltip: 'The Name for your workflow step scheme',
                required: true
            });

            // Description TextArea for workflow_step_scheme create
            var coreWorkflowStepSchemeDescription = new WMAPP.Extension.View.TextField({
                model: this.model,
                fieldId: 'CoreWorkflowStepSchemeDescription' + this.model.cid,
                fieldClass: '',
                fieldType: 'text',
                placeholder: 'Description',
                label: 'Description',
                name: 'description',
                tooltip: 'The Description for your workflow step scheme',
            });

            // IsStart CheckBox for workflow_step_scheme create
            var coreWorkflowStepSchemeIsStart = new WMAPP.Extension.View.CheckBox({
                model: this.model,
                fieldId: 'CoreWorkflowStepSchemeIsStart' + this.model.cid,
                fieldClass: '',
                label: 'Start',
                name: 'is_start',
                tooltip: 'This Step is the entry point of the workflow',
                readonly: this.options.readonly,
            });


            // the count of fields plus the commands
            var cols = 4;

            this.nameField.show(coreWorkflowStepSchemeName);
            this.descriptionField.show(coreWorkflowStepSchemeDescription);
            this.isStartField.show(coreWorkflowStepSchemeIsStart);

            // reflow foundation
            $(document).foundation('reflow');

            // add the medium grid class to the block grid ul
            this.$el.find('ul.small-block-grid-1').addClass('medium-block-grid-' + cols);
        },
        templateHelpers:function(){
            return {
                model: this.model,
                options: this.options
            }
        },
    });

    // Transition scheme views

    View.CoreWorkflowTransitionSchemeTableItemCustom = WMAPP.Extension.View.LayoutView.extend({
        tagName: 'div',
        template: function(data) {
            var options = data.options;
            var model = data.model;
            var _tmplStr = '<div class="row" id="' + options.parentLayoutId + options.fieldId + '">';
            _tmplStr += '<div class="large-3 columns wmapp-core-workflow_transition_scheme-table-name"></div>';
            _tmplStr += '<div class="large-4 columns wmapp-core-workflow_transition_scheme-table-description"></div>';
            _tmplStr += '<div class="large-3 columns wmapp-core-workflow_transition_scheme-step-to"></div>';

            if (options.create || !options.readonly) {
                _tmplStr += '<div class="large-2 columns text-center">' +
                    '<a class="wmapp-delete-button button small alert" data-id="' + model.id + '" title="Are you sure you want to delete this Workflow Transition Scheme?"><i class="fa fa-times"></i></a>';
                _tmplStr += '</div>';
            }
            _tmplStr +=  '</div>';
            return _tmplStr;
        },
        templateHelpers: function(){
            return {
                model: this.model,
                options: this.options
            }
        },
        regions: {
            nameField: '.wmapp-core-workflow_transition_scheme-table-name',
            descriptionField: '.wmapp-core-workflow_transition_scheme-table-description',
            stepToField: '.wmapp-core-workflow_transition_scheme-step-to'
        },
        initialize: function(options) {
            this.options = _.extend(this.options, options.options);
            this.options.layoutId = 'CoreWorkflowTransitionScheme';
            if (this.model) {
                Backbone.Validation.bind(this);
            }
        },
        onRender: function() {

            // Name TextField for workflow_transition_scheme create
            var coreWorkflowTransitionSchemeName = new WMAPP.Extension.View.TextField({
                model: this.model,
                fieldId: 'CoreWorkflowTransitionSchemeName' + this.model.cid,
                fieldClass: '',
                fieldType: 'text',
                placeholder: 'Name',
                label: 'Name',
                name: 'name',
                tooltip: 'The Name for your workflow transition scheme',
                readonly: this.options.readonly,
                required: true
            });


            // Description TextArea for workflow_transition_scheme create
            var coreWorkflowTransitionSchemeDescription = new WMAPP.Extension.View.TextField({
                model: this.model,
                fieldId: 'CoreWorkflowTransitionSchemeDescription' + this.model.cid,
                fieldClass: '',
                fieldType: 'text',
                placeholder: 'Description',
                label: 'Description',
                name: 'description',
                tooltip: 'The Description for your workflow transition scheme',
                readonly: this.options.readonly,
            });

            this.coreWorkflowTransitionSchemeCreateFormStepToSchemeId = new WMAPP.Extension.View.ComboBox({
                model: this.model,
                fieldId: 'CoreWorkflowTransitionSchemeStepToSchemeId',
                label: 'Step to scheme',
                name: 'step_to_scheme_id',
                tooltip: 'The Step to scheme for your workflow transition scheme',
                options: this.options.stepSchemeCollection,
                optionField: 'name',
                empty: {"value": "", "option": "Select a Step to scheme"},
            });

            // the count of fields plus the commands
            var cols = 4;

            this.nameField.show(coreWorkflowTransitionSchemeName);
            this.descriptionField.show(coreWorkflowTransitionSchemeDescription);
            this.stepToField.show(this.coreWorkflowTransitionSchemeCreateFormStepToSchemeId);

            // reflow foundation
            $(document).foundation('reflow');

            // add the medium grid class to the block grid ul
            if (!this.options.create && this.options.readonly) {
                --cols;
            }
            this.$el.find('ul.small-block-grid-1').addClass('medium-block-grid-' + cols);
        },
        triggers: {
            "click .wmapp-delete-button": 'trigger:coreWorkflowTransitionSchemeDeleteTableRow'
        }
    });

    View.CoreWorkflowTransitionSchemeTableCustom = WMAPP.Extension.View.CollectionView.extend({
        tagName: "div",
        childView: View.CoreWorkflowTransitionSchemeTableItemCustom,
        initialize: function() {
            if (this.model) {
                Backbone.Validation.bind(this);
            }
            this.on('childview:trigger:coreWorkflowTransitionSchemeDeleteTableRow', this.removeRow);
        },
        removeRow: function(childView, args){
            this.collection.remove(args.model);
        },
        options: {
            showSystemFields: true,
            readonly: false
        },
        childViewOptions: function() {
            return {
                options: this.options
            }
        },
    });

    View.CoreWorkflowTransitionSchemeTableCreateCustom = WMAPP.Extension.View.LayoutView.extend({
        initialize: function() {
            this.options.layoutId = 'CoreWorkflowTransitionScheme';
            if (this.model) {
                Backbone.Validation.bind(this);
            }
        },
        template: function(data) {
            var options = data.options;
            var model = data.model;

            var _tmplStr = '<div class="row" id="' + options.parentLayoutId + options.fieldId + '">';
            _tmplStr += '<div class="large-3 columns wmapp-core-workflow_transition_scheme-table-name"></div>';
            _tmplStr += '<div class="large-4 columns wmapp-core-workflow_transition_scheme-table-description"></div>';
            _tmplStr += '<div class="large-3 columns wmapp-core-workflow_transition_scheme-step-to"></div>';
            _tmplStr += '<div class="large-2 columns text-center">' +
                '<label>Commands<span data-tooltip="" class="has-tip tip-right" title="Commands"></span></label>' +
                '<a class="wmapp-add-button wmapp-core-workflow-transition-add-button button small edit">&zwj;<i class="fa fa-plus"></i></a>' +
                '<a class="wmapp-clear-button wmapp-core-workflow-transition-clear-button button small secondary">&zwj;<i class="fa fa-minus"></i></a>';
            if (options.singleReference) {
                _tmplStr += '<a class="wmapp-delete-button wmapp-core-workflow-transition-delete-button button small alert" title="Are you sure you want to remove this Workflow Transition Scheme?"><i class="fa fa-times"></i></a>';
            }
            _tmplStr += '</div>' +
                '</div>';

            return _tmplStr;
        },
        regions: {
            nameField: '.wmapp-core-workflow_transition_scheme-table-name',
            descriptionField: '.wmapp-core-workflow_transition_scheme-table-description',
            stepToField: '.wmapp-core-workflow_transition_scheme-step-to'
        },
        events: {
            "click .wmapp-add-button": "onAdd",
            "click .wmapp-clear-button": "onClear",
            "click .wmapp-delete-button": "onRemove",
        },
        options: {
            singleReference: false,
            showSystemFields: true,
            readonly: false,
        },
        onAdd: function() {
            this.model.validate();

            if (this.model.isValid()) {
                if (this.collection !== undefined) {
                    this.collection.add(this.model.clone());
                    this.model.clear().set(this.model.defaults);
                } else {
                    this.model.set('id', 0);
                    this.$el.find('.wmapp-add-button').toggleClass('hide');
                    this.$el.find('.wmapp-clear-button').toggleClass('hide');
                    this.$el.find('.wmapp-delete-button').toggleClass('hide');
                }

                WMAPP.Helper.clearErrors('CoreWorkflowTransitionScheme');
            }
        },
        onClear: function() {
            // reset the model back to the defaults, but keep the id
            var id = this.model.id;
            this.model.clear().set(this.model.defaults);
            this.model.id = id;
            this.model.set('id', id);
            WMAPP.Helper.clearErrors('CoreWorkflowTransitionScheme');
        },
        onRemove: function() {
            this.model.clear().set(this.model.defaults);
            this.$el.find('.wmapp-add-button').toggleClass('hide');
            this.$el.find('.wmapp-clear-button').toggleClass('hide');
            this.$el.find('.wmapp-delete-button').toggleClass('hide');
        },
        onRender: function() {

            // Name TextField for workflow_transition_scheme create
            var coreWorkflowTransitionSchemeName = new WMAPP.Extension.View.TextField({
                model: this.model,
                fieldId: 'CoreWorkflowTransitionSchemeName',
                fieldClass: '',
                fieldType: 'text',
                placeholder: 'Name',
                label: 'Name',
                name: 'name',
                tooltip: 'The Name for your workflow transition scheme',
                required: true
            });

            // Description TextArea for workflow_transition_scheme create
            var coreWorkflowTransitionSchemeDescription = new WMAPP.Extension.View.TextField({
                model: this.model,
                fieldId: 'CoreWorkflowTransitionSchemeDescription',
                fieldClass: '',
                fieldType: 'text',
                placeholder: 'Description',
                label: 'Description',
                name: 'description',
                tooltip: 'The Description for your workflow transition scheme',
            });

            var coreWorkflowTransitionSchemeCreateFormStepToSchemeId = new WMAPP.Extension.View.ComboBox({
                model: this.model,
                fieldId: 'CoreWorkflowTransitionSchemeStepToSchemeId' + this.model.cid,
                label: 'Step to scheme',
                name: 'step_to_scheme_id',
                tooltip: 'The Step to scheme for your workflow transition scheme',
                options: this.options.stepSchemeCollection,
                optionField: 'name',
                empty: {"value": "", "option": "Select a Step to scheme"},
            });

            // the count of fields plus the commands
            var cols = 4;

            this.nameField.show(coreWorkflowTransitionSchemeName);
            this.descriptionField.show(coreWorkflowTransitionSchemeDescription);
            this.stepToField.show(coreWorkflowTransitionSchemeCreateFormStepToSchemeId);

            // reflow foundation
            $(document).foundation('reflow');

            // add the medium grid class to the block grid ul
            this.$el.find('ul.small-block-grid-1').addClass('medium-block-grid-' + cols);
        },
        templateHelpers:function(){
            return {
                model: this.model,
                options: this.options
            }
        },
    });

    View.CoreWorkflowTransitionSchemeTableLayoutCustom = WMAPP.Extension.View.LayoutView.extend({
        template: function(options) {
            var _tmplStr = '<fieldset>' +
                '<legend>' + options.options.label + '</legend>' +
                '<div class="wmapp-core-workflow_transition_scheme-table-create wmapp-table-create"></div>' +
                '<div class="wmapp-core-workflow_transition_scheme-table-list"></div>' +
                '</fieldset>';
            return _tmplStr;
        },
        templateHelpers:function(){
            return {
                options: {
                    label: this.options.label,
                }
            }
        },
        regions: {
            listField: '.wmapp-core-workflow_transition_scheme-table-list',
            createField: '.wmapp-core-workflow_transition_scheme-table-create',
        },
    });

    // Workflow progress views

    View.WorkflowProgress = WMAPP.Extension.View.LayoutView.extend({
        className: 'wmapp-workflow-progress',
        template: function(data) {
            var model = data.model;
            var options = data.options;
            var tmplStr = '';
            tmplStr += '<fieldset>';
            tmplStr += '    <legend>Workflow Progress</legend>';
            tmplStr += '    <div class="wmapp-form">';
            tmplStr += '        <div class="wmapp-workflow-progress-start"></div>';
            tmplStr += '        <div class="wmapp-workflow-progress-associate"></div>';
            tmplStr += '        <div class="wmapp-workflow-progress-status"></div>';
            tmplStr += '        <div class="wmapp-workflow-progress-buttons"></div>';
            tmplStr += '        <div class="wmapp-workflow-progress-tabs"></div>';
            tmplStr += '        <div class="wmapp-workflow-progress-display"></div>';
            tmplStr += '    </div>';
            tmplStr += '    <ul class="button-group">';
            tmplStr += '    <li><button type="button" class="wmapp-cancel-button alert small">Cancel</button></li></ul>';
            tmplStr += '</fieldset>';
            return tmplStr;
        },
        regions: {
            statusField: '.wmapp-workflow-progress-status',
            buttonsField: '.wmapp-workflow-progress-buttons',
            tabsField: '.wmapp-workflow-progress-tabs',
            displayField: '.wmapp-workflow-progress-display',
            associateField: '.wmapp-workflow-progress-associate',
            startField: '.wmapp-workflow-progress-start'
        },

        events: {
            "click .wmapp-cancel-button": "onCancel",
        },

        templateHelpers:function(){
            return {
                model: this.model,
                options: {
                    label: this.options.label,
                }
            }
        },

        onCancel: function() {
            // trigger the cancel event in the application
            this.triggerDelayed('trigger:editZeroWorkflowCancel', this.model);
        },
    });

    View.WorkflowProgressStatus = WMAPP.Extension.View.ItemView.extend({
        className: 'wmapp-workflow-status',
        template: function(data) {
            var name = 'No workflow';
            var tmplStr = '';
            if (data && data.name) {
                name = data.name;
                tmplStr = '<h3>Status: <span class="wmapp-workflow-status-name">' + name + '</span></h3>';
            }
            return tmplStr;
        },

        modelEvents: {
            'change': 'render'
        },
    });

    View.WorkflowProgressButtonsItem = WMAPP.Extension.View.ItemView.extend({
        className: 'wmapp-workflow-status-button',
        tagName: 'li',

        template: function(data) {
            var step_to = data._step_to_scheme_id;
            var tmplStr = '';
            if (step_to && step_to.name) {
                tmplStr += '<button class="wmapp-workflow-status-change-button button">' +
                    step_to.name + '</button>';
            }
            return tmplStr;
        },

        events: {
            "click .wmapp-workflow-status-change-button": 'onChangeStatusClick'
        },

        modelEvents: {
            'change': 'render'
        },

        onChangeStatusClick: function(e) {
            e.preventDefault();
            e.stopPropagation();
            this.trigger("trigger:onChangeStatusClick", this.model);
        }
    });

    View.WorkflowProgressButtons = WMAPP.Extension.View.CollectionView.extend({
        childView: View.WorkflowProgressButtonsItem,
        tagName: 'ul',
        className: 'button-group wmapp-workflow-buttons',

        collectionEvents: {
            'reset': 'render',
        },
    });

    View.WorkflowProgressTabs = WMAPP.Extension.View.LayoutView.extend({
        className: 'wmapp-workflow-tabs',
        template: function(data) {
            var tmplStr = '';
            if (data._workflow_instance_id) {
                tmplStr += '<dl class="tabs" data-tab>' +
                    '<dd class="tab-title active"><a href="#text-view">Text View</a></dd>' +
                        // diagram to be added soon
                        //'<dd class="tab-title"><a href="#diagram-view">Diagram View</a></dd>' +
                    '</dl>';
            }
            tmplStr += '<div class="tabs-content">' +
                '<div class="wmapp-workflow-text-tab content active" id="text-view">' +
                '</div>' +
                '<div class="wmapp-workflow-diagram-tab content" id="diagram-view">' +
                '</div>' +
                '</div>';
            return tmplStr;
        },

        regions: {
            textField: '.wmapp-workflow-text-tab',
            diagramField: '.wmapp-workflow-diagram-tab'
        },

        modelEvents: {
            'sync': 'render'
        },
    });

    View.WorkflowProgressDiagram = WMAPP.Extension.View.ItemView.extend({
        className: 'wmapp-workflow-diagram',
        template: _.template('diagram view goes here')
    });

    View.WorkflowProgressTextItemTransition = WMAPP.Extension.View.ItemView.extend({
        tagName: 'dl',
        template: function(data) {
            var tmplStr = data.name + '&nbsp;<i class="fa fa-long-arrow-right wmapp-workflow-transition-mark"></i>&nbsp;' + data.step_name;
            return tmplStr;
        }
    });

    View.WorkflowProgressTextItem = WMAPP.Extension.View.CompositeView.extend({
        className: 'wmapp-workflow-text-item',
        tagName: 'tr',
        childView: View.WorkflowProgressTextItemTransition,
        childViewContainer: '.wmapp-workflow-text-item-transitions',

        initialize: function() {
            this.collection = this.model.get('_transition_from_schemes');
        },

        template: function(data) {
            var tmplStr = '';
            if (data.id) {
                tmplStr += '<td class="wmapp-workflow-text-item-current text-center">';
                if (data.is_start) {
                    tmplStr += '<i class="fa fa-circle wmapp-workflow-current-mark"></i>';
                }
                tmplStr += '</td>';
                tmplStr += '<td class="wmapp-workflow-text-item-from">' + data.name + '</td>' +
                    '<td><dl class="wmapp-workflow-text-item-transitions no-bullet"></dl></td>';
            }

            return tmplStr;
        },

        templateHelpers:function(){
            return {
                options: this.options
            }
        },

        onRender: function() {
            if (this.options && this.options.currentStep && this.options.currentStep.get('workflow_step_scheme_id') === this.model.id) {
                this.$el.addClass('wmapp-workflow-current-step');
            } else {
                this.$el.removeClass('wmapp-workflow-current-step');
            }
        }
    });

    View.WorkflowProgressTextCollection = WMAPP.Extension.View.CompositeView.extend({
        className: 'wmapp-workflow-text-collection wmapp-workflow-text-view',
        childView: View.WorkflowProgressTextItem,
        childViewContainer: 'tbody',
        tagName: 'table',

        template: function(data) {
            var tmplStr = '';
            if (data && data.options && data.options.entity && data.options.entity.get('workflow_instance_id')) {
            tmplStr += '<thead>' +
                '<th>Start</th>' +
                '<th>From</th>' +
                '<th>Transition&nbsp;<i class="fa fa-long-arrow-right wmapp-workflow-transition-mark-heading"></i>&nbsp;To</th>' +
                '</thead>';
            }

            tmplStr += '<tbody></tbody>';
            return tmplStr;
        },

        templateHelpers: function() {
            return {
                model: this.model,
                options: this.options
            }
        },

        initialize: function(options) {
            this.listenTo(this.options.currentStep, 'change:id', this.render);
        },

        collectionEvents: {
            'reset': 'render'
        },

        childViewOptions: function() {
            return {
                currentStep: this.options.currentStep
            }
        },
    });

    View.WorkflowProgressStart = WMAPP.Extension.View.ItemView.extend({
        className: 'wmapp-workflow-start',
        template: function(data) {
            var tmplStr = '';
            if (data._workflow_scheme_id && !data._workflow_instance_id) {
                var name = data._workflow_scheme_id.name;
                var tmplStr = '<div class="wmapp-workflow-start-text">Workflow \"' + name + '\" is not started. Would you like to start it?</div>' +
                    '<div><button class="wmapp-workflow-start-button button">Start the Workflow</button></div>';
            }
            return tmplStr;
        },

        events: {
            "click .wmapp-workflow-start-button": 'onWorkflowStart'
        },

        onWorkflowStart: function(e) {
            e.preventDefault();
            e.stopPropagation();
            this.trigger('trigger:onWorkflowStart', this.model);
        },

        modelEvents: {
            'change': 'render'
        }
    });

    View.WorkflowProgressAssociate = WMAPP.Extension.View.ItemView.extend({
        className: 'wmapp-workflow-associate',
        template: function(data) {
            var tmplStr = '';
            if (!data.workflow_scheme_id && !data.workflow_instance_id) {
                var tmplStr = '<div class="wmapp-workflow-associate-text">The entity needs to be associated with a workflow.</div>';
            }
            return tmplStr;
        }
    });

});
