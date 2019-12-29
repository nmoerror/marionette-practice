WMAPP.module('Extension.Workflow.Admin', Backbone.Marionette.Module.extend({
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
        WMAPP.Log.getLogger("WMAPP." + this.moduleName).trace("Workflow Admin Module onStart begin");
        WMAPP.Log.getLogger("WMAPP." + this.moduleName).trace("Workflow Admin Module onStart end");
    },
    onStop: function () {
        WMAPP.Log.getLogger("WMAPP." + this.moduleName).trace("Workflow Admin Module onStop begin");
        WMAPP.Log.getLogger("WMAPP." + this.moduleName).trace("Workflow Admin Module onStop end");
    },
}));

WMAPP.module('Extension.Workflow.Admin.Router', function(Router) {
	Router.ExtensionWorkflowAdminRouter = WMAPP.Extension.Router.AppRouter.extend({
		appRoutes : {
			"workflow/editscheme" : "showWorkflowScheme",
            "workflow/progress/:id" : "showProgressWorkflow"
		},
	});
});

WMAPP.module('Extension.Workflow.Admin.Application', Backbone.Marionette.Module.extend({
	startWithParent: true,
    vent: WMAPP.Extension.Workflow.Admin.getChannel().vent,
	onStart: function(options) {

        this.options = options;
        // initialize tile region and router
        this.workflowOptions = options;
        this.tileRegion = this.workflowOptions.region;
        this.router = new WMAPP.Extension.Workflow.Admin.Router.ExtensionWorkflowAdminRouter({controller: this});

        // initialize models
        this.workflowScheme = new WMAPP.Core.Model.WorkflowScheme();
        this.workflowInstance = new WMAPP.Core.Model.WorkflowInstance();
        this.entity = this.options.entityInstance;
        this.entityId = this.options.entityId;
        this.availableTransitions = new WMAPP.Core.Model.WorkflowTransitionSchemeCollection();
        this.currentStepInstance = new WMAPP.Core.Model.WorkflowStepInstance();
        this.stepSchemes = new WMAPP.Core.Model.WorkflowStepSchemeCollection();

        var that = this;
        // listening to the back button event
        this.listenTo(this.vent, 'trigger:backWorkflowEvent', function() {
            WMAPP.Extension.Workflow.Admin.stop();
            that.router.navigate('', {trigger: true});
        });
    },

    /**
     * go back to the entity view
     */
    cancelAndGoBack: function() {
        this.vent.trigger('trigger:backWorkflowEvent');
    },

    // SCHEME

    /**
     * get workflow association by entity name
     * @param entity
     * @returns {*|{then}}
     */
    getWorkflowAssociation: function(entity) {
        var deferred = $.Deferred();
        this.workflowAssociation = new WMAPP.Core.Model.WorkflowAssociation();
        this.workflowAssociation.url = this.workflowAssociation.getUrl() +
            '/0?CoreWorkflowAssociation_feature_entity_name=' + entity +
            '&expand=workflow_scheme';
        this.workflowAssociation.fetch().done(function(){
            deferred.resolve();
        });
        return deferred.promise();
    },

    /**
     * show create workflow scheme views
     */
    showCreateWorkflowScheme: function() {
        // clear any messages
        WMAPP.Helper.hideMessage();

        // workflowScheme Model
        this.workflowScheme = new WMAPP.Core.Model.WorkflowScheme();

        // initialize the model we will be using to collect this data
        this.workflowScheme.clear().set(this.workflowScheme.defaults);
        this.workflowScheme.set('_step_schemes', new WMAPP.Core.Model.WorkflowStepSchemeCollection());
        this.workflowScheme.set('step_schemes', new Array());
        if (this.options && this.options.entity) {
            var workflowAssociation = new WMAPP.Core.Model.WorkflowAssociation({
                feature_entity_name: this.options.entity
            });
            this.workflowScheme.set('_workflow_association_id', workflowAssociation);
            this.workflowScheme.set('_step_schemes', new WMAPP.Core.Model.WorkflowStepSchemeCollection);
        }

        this.showEditWorkflowScheme(this.workflowScheme, 'Create Workflow Scheme');
    },

    /**
     * save workflow scheme model
     * @param workflowScheme
     */
    saveWorkflowScheme: function(workflowScheme) {

        // clear any errors
        WMAPP.Helper.clearErrors('CoreWorkflowScheme');

        this.workflowScheme = workflowScheme;

        // validate the model
        this.workflowScheme.validate();

        if (this.workflowScheme.isValid()) {
            var that = this;

            // save the model
            this.workflowScheme.save({}, {
                success: function(model, response, options) {
                    // display flash message
                    WMAPP.Helper.showMessage('success', 'The workflow scheme has been saved.');

                    // go back
                    that.vent.trigger('trigger:backWorkflowEvent');

                    WMAPP.Helper.wmAjaxEnd();
                },
                error: function(model, response, options) {
                    if (response.responseJSON) {
                        if (response.responseJSON.message) {
                            WMAPP.Helper.showMessage('alert', response.responseJSON.message);
                        }
                    }
                    WMAPP.Helper.wmAjaxEnd();
                },
            });
        } else {
            WMAPP.Helper.wmAjaxEnd();
        }
    },

    /**
     * get association by entity name and show the appropriate workflow scheme view
     */
    showWorkflowScheme: function() {
        var that = this;
        this.getWorkflowAssociation(this.options.entity).done(function(){
            if (that.workflowAssociation.id &&
                that.workflowAssociation.get('_workflow_scheme_id') &&
                that.workflowAssociation.get('_workflow_scheme_id').id) {
                that.workflowScheme = that.workflowAssociation.get('_workflow_scheme_id');

                that.coreWorkflowSchemeCreateForm = new WMAPP.Extension.Workflow.Admin.View.CoreWorkflowSchemeCreate({
                    model: that.workflowScheme,
                    layoutId: 'CoreWorkflowScheme',
                    label: 'Edit Workflow Scheme',
                });
                console.log('existing... ', that.workflowScheme);
                // navigate to an existing one
                that.showEditWorkflowScheme(that.workflowScheme, 'Edit Workflow Scheme');
            } else {
                console.log('new... ')
                // create a new one
                that.showCreateWorkflowScheme();
            }
        })
    },

    /**
     * show the form for create/edit workflow scheme
     * @param workflowScheme
     * @param formLabel
     */
    showEditWorkflowScheme: function(workflowScheme, formLabel) {

        if (!workflowScheme.get('step_schemes')) {
            this.workflowScheme.set('step_schemes', new Array());
        }

        if (!workflowScheme.get('_step_schemes')) {
            this.workflowScheme.set('_step_schemes', new WMAPP.Core.Model.WorkflowStepSchemeCollection());
        }

        console.log('editing scheme... ', workflowScheme);

        // Custom code for workflowScheme now that we have set our model
        // initialize views
        var coreWorkflowSchemeCreateForm = new WMAPP.Extension.Workflow.Admin.View.CoreWorkflowSchemeCreate({
            model: workflowScheme,
            layoutId: 'CoreWorkflowScheme',
            label: formLabel + ' for ' + this.options.entity.replace('.', ' '),
        });

        // Name TextField for workflow_scheme create
        var coreWorkflowSchemeCreateFormName = new WMAPP.Extension.View.TextField({
            model: workflowScheme,
            fieldId: 'CoreWorkflowSchemeName',
            fieldClass: '',
            fieldType: 'text',
            label: 'Name',
            name: 'name',
            tooltip: '',
            required: true
        });

        // Description TextArea for workflow_scheme create
        var coreWorkflowSchemeCreateFormDescription = new WMAPP.Extension.View.TextArea({
            model: workflowScheme,
            fieldId: 'CoreWorkflowSchemeDescription',
            fieldClass: '',
            fieldType: 'text',
            label: 'Description',
            name: 'description',
            tooltip: '',
        });

        var coreWorkflowSchemeEditFormStepSchemes = new WMAPP.Extension.Workflow.Admin.View.CoreWorkflowStepSchemeTableLayoutCustom({
            label: 'Step schemes',
        });

        // create a new model
        var newStepScheme = new WMAPP.Core.Model.WorkflowStepScheme({}, {validate:true});
        // remove the reverse validation && assign a temporary id
        var temp_id = 'c' + moment().format('X');
        newStepScheme.set('temp_id', temp_id);
        newStepScheme.set('id', temp_id);

        var changedValidation = _.clone(newStepScheme.validation);
        changedValidation.workflow_scheme_id = null;
        changedValidation._workflow_scheme_id = null;
        newStepScheme.validation = changedValidation;

        var coreWorkflowSchemeEditFormStepSchemesTable = new WMAPP.Extension.Workflow.Admin.View.CoreWorkflowStepSchemeTableCustom({
            layoutId: 'CoreWorkflowStepScheme',
            parentLayoutId: 'CoreWorkflowScheme',
            fieldId: 'WorkflowStepSchemes',
            collection: workflowScheme.get('_step_schemes'),
            model: workflowScheme
        });

        var coreWorkflowSchemeEditFormStepSchemesCreate = new WMAPP.Extension.Workflow.Admin.View.CoreWorkflowStepSchemeTableCreateCustom({
            layoutId: 'CoreWorkflowStepScheme',
            parentLayoutId: 'CoreWorkflowScheme',
            fieldId: 'WorkflowStepSchemes',
            collection: workflowScheme.get('_step_schemes'),
            model: newStepScheme,
        });

        this.listenTo(coreWorkflowSchemeEditFormStepSchemesTable, 'trigger:showEditTransitions', this.showEditTransitionsView);
        this.listenTo(coreWorkflowSchemeCreateForm, 'trigger:createWorkflowSchemeEventSubmit', this.saveWorkflowScheme);
        this.listenTo(coreWorkflowSchemeCreateForm, 'trigger:createWorkflowSchemeEventCancel', this.cancelAndGoBack);

        // render the view
        this.tileRegion.show(coreWorkflowSchemeCreateForm);

        coreWorkflowSchemeCreateForm.nameField.show(coreWorkflowSchemeCreateFormName);
        coreWorkflowSchemeCreateForm.descriptionField.show(coreWorkflowSchemeCreateFormDescription);
        coreWorkflowSchemeCreateForm.stepSchemesField.show(coreWorkflowSchemeEditFormStepSchemes);
        coreWorkflowSchemeEditFormStepSchemes.listField.show(coreWorkflowSchemeEditFormStepSchemesTable);
        coreWorkflowSchemeEditFormStepSchemes.createField.show(coreWorkflowSchemeEditFormStepSchemesCreate);

        // reflow foundation
        $(document).foundation('reflow');
    },

    /**
     * show the form for editing transitions
     * @param view
     * @param model
     * @param options
     */
    showEditTransitionsView: function(view, model, options) {
        var stepScheme = model;

        if (!stepScheme.get('_transition_from_schemes')) {
            stepScheme.set('_transition_from_schemes', new WMAPP.Core.Model.WorkflowTransitionSchemeCollection());
        }

        var stepSchemeCollection = options.collection;
        var workflowScheme = options.workflow;

        this.coreWorkflowTransitionSchemeTableLayoutCustom = new WMAPP.Extension.Workflow.Admin.View.CoreWorkflowTransitionSchemeTableLayoutCustom({
            label: 'Transition from schemes',
        });

        // create a new model
        var newTransitionScheme = new WMAPP.Core.Model.WorkflowTransitionScheme({}, {validate:true});
        // remove the reverse validation
        var changedValidation = _.clone(newTransitionScheme.validation);
        changedValidation.step_from_scheme_id = null;
        changedValidation._step_from_scheme_id = null;
        changedValidation.step_to_scheme_id = null;
        changedValidation._step_to_scheme_id = null;
        newTransitionScheme.validation = changedValidation;

        this.coreWorkflowTransitionSchemeTableCustom = new WMAPP.Extension.Workflow.Admin.View.CoreWorkflowTransitionSchemeTableCustom({
            layoutId: 'CoreWorkflowTransitionScheme',
            parentLayoutId: 'CoreWorkflowStepScheme',
            fieldId: 'WorkflowTransitionSchemes' + stepScheme.cid,
            create: true,
            collection: stepScheme.get('_transition_from_schemes'),
            stepSchemeCollection: stepSchemeCollection
        });
        this.coreWorkflowTransitionSchemeTableCreateCustom = new WMAPP.Extension.Workflow.Admin.View.CoreWorkflowTransitionSchemeTableCreateCustom({
            layoutId: 'CoreWorkflowTransitionScheme',
            parentLayoutId: 'CoreWorkflowStepScheme',
            fieldId: 'WorkflowTransitionSchemes' + stepScheme.cid,
            collection: stepScheme.get('_transition_from_schemes'),
            model: newTransitionScheme,
            stepSchemeCollection: stepSchemeCollection,
            stepScheme: stepScheme
        });

        // render the view
        view.transitionsField.show(this.coreWorkflowTransitionSchemeTableLayoutCustom);
        this.coreWorkflowTransitionSchemeTableLayoutCustom.createField.show(this.coreWorkflowTransitionSchemeTableCreateCustom);
        this.coreWorkflowTransitionSchemeTableLayoutCustom.listField.show(this.coreWorkflowTransitionSchemeTableCustom);
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
        this.entity.url = this.entity.getUrl() + '/' + id + '?expand=workflow';
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
    showProgressWorkflow: function (entityId) {
        this.entityId = entityId;
        var that = this;
        if (!this.options.layout) {
            this.options.layout = 'WorkflowLayout'
        }

        // initialize and display layout
        this.workflowProgress = new WMAPP.Extension.Workflow.Admin.View.WorkflowProgress({
            model: this.entity,
            layoutId: this.options.layout,
        });

        this.listenTo(this.workflowProgress, 'trigger:editZeroWorkflowCancel', this.cancelAndGoBack);

        this.tileRegion.show(this.workflowProgress);

        this.getEntityById(this.entityId).done(function () {
            that.showWorkflowViews(that.entity);
            // fetch data
            that.fetchWorkflowData(that.entity);
            // reflow foundation
            $(document).foundation('reflow');
        });
    },

    showWorkflowViews: function(entity) {
        if (entity.id) {

            // initialize views
            // association
            var workflowProgressAssociate = new WMAPP.Extension.Workflow.Admin.View.WorkflowProgressAssociate({
                model: entity
            });

            // status
            var workflowProgressStatus = new WMAPP.Extension.Workflow.Admin.View.WorkflowProgressStatus({
                model: this.currentStepInstance,
            });
            // buttons
            var workflowProgressButtons = new WMAPP.Extension.Workflow.Admin.View.WorkflowProgressButtons({
                collection: this.availableTransitions,
            });

            // tabs
            var workflowProgressTabs = new WMAPP.Extension.Workflow.Admin.View.WorkflowProgressTabs({
                model: entity
            });

            // start
            var workflowProgressStart = new WMAPP.Extension.Workflow.Admin.View.WorkflowProgressStart({
                model: entity
            });

            var workflowProgressText = new WMAPP.Extension.Workflow.Admin.View.WorkflowProgressTextCollection({
                model: this.workflowScheme,
                currentStep: this.currentStepInstance,
                collection: this.stepSchemes,
                entity: this.entity
            });

            var workflowProgressDiagram = new WMAPP.Extension.Workflow.Admin.View.WorkflowProgressDiagram({
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

                if (that.workflowScheme.get('_step_schemes')) {
                    that.stepSchemes.reset(that.workflowScheme.get('_step_schemes').models);
                } else {
                    that.stepSchemes.reset();
                }

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

                that.stepSchemes.reset();

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

WMAPP.module('Extension.Workflow.Admin.View', function(View) {

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
            tmplStr += '	<ul class="button-group wmapp-button-group-spaced"><li><button type="button" class="wmapp-submit-button wymupdate js-trigger-pepperbox small">Save Workflow Scheme</button></li>';
            tmplStr += '	<li><button type="button" class="wmapp-cancel-button">Cancel</button></li></ul>';
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
                '<div class="large-4 columns wmapp-core-workflow_step_scheme-table-description"></div>' +
                '<div class="large-1 columns text-center wmapp-core-workflow_step_scheme-table-isstart"></div>' +
                '<div class="large-1 columns text-center wmapp-core-workflow_step_scheme-table-automatic"></div>' +
                '<div class="large-2 columns">' +
                '<a class="wmapp-edit-transitions-button wmapp-core-workflow-edit-transitions-button button small" data-id="' + model.id + '" title="Edit Transitions"></a>' +
                '<a class="wmapp-delete-step-button wmapp-core-workflow-delete-button button small" data-id="' + model.id + '" title="Are you sure you want to delete this Workflow Step Scheme?"></a>' +
                '</div>' +
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
            automaticField: '.wmapp-core-workflow_step_scheme-table-automatic',
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
            
            // IsStart CheckBox for workflow_step_scheme create
            var coreWorkflowStepSchemeAutomatic = new WMAPP.Extension.View.CheckBox({
                model: this.model,
                fieldId: 'CoreWorkflowStepSchemeAutomatic' + this.model.cid,
                fieldClass: '',
                label: 'Auto',
                name: 'automatic',
                tooltip: 'If the rules are fullfilled, the transition is automatic',
                readonly: this.options.readonly,
            });            

            // the count of fields plus the commands
            var cols = 4;


            this.coreWorkflowTransitionSchemeTableLayoutCustom = new WMAPP.Extension.Workflow.Admin.View.CoreWorkflowTransitionSchemeTableLayoutCustom({
                label: 'Transition from schemes',
            });

            if (!this.model.get('_transition_from_schemes')) {
                this.model.set('_transition_from_schemes', new WMAPP.Core.Model.WorkflowTransitionSchemeCollection());
            }

            // create a new model
            var newTransitionScheme = new WMAPP.Core.Model.WorkflowTransitionScheme({}, {validate:true});
            // remove the reverse validation
            var changedValidation = _.clone(newTransitionScheme.validation);
            changedValidation.step_from_scheme_id = null;
            changedValidation._step_from_scheme_id = null;
            newTransitionScheme.validation = changedValidation;

            this.coreWorkflowTransitionSchemeTableCustom = new WMAPP.Extension.Workflow.Admin.View.CoreWorkflowTransitionSchemeTableCustom({
                layoutId: 'CoreWorkflowTransitionScheme',
                parentLayoutId: 'CoreWorkflowStepScheme',
                fieldId: 'WorkflowTransitionSchemes' + this.model.cid,
                create: true,
                collection: this.model.get('_transition_from_schemes'),
                stepSchemeCollection: this.options.collection
            });
            this.coreWorkflowTransitionSchemeTableCreateCustom = new WMAPP.Extension.Workflow.Admin.View.CoreWorkflowTransitionSchemeTableCreateCustom({
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
            this.automaticField.show(coreWorkflowStepSchemeAutomatic);

            // reflow foundation
            $(document).foundation('reflow');

            // add the medium grid class to the block grid ul
            if (!this.options.create && this.options.readonly) {
                --cols;
            }
            this.$el.find('ul.small-block-grid-1').addClass('medium-block-grid-' + cols);
        },
        triggers: {
            "click .wmapp-delete-step-button": 'trigger:coreWorkflowStepSchemeDeleteTableRow'
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
            // destroy any existing views
            if (this.children) {
                if (this.children._views) {
                    _.each(this.children._views, function(_view){
                        _view.$el.removeClass('wmapp-workflow-selected-step');
                        if (!!_view.transitionsField.currentView) {
                            _view.transitionsField.currentView.destroy();
                        }
                    });
                }
            }

            view.$el.addClass('wmapp-workflow-selected-step');
            this.trigger('trigger:showEditTransitions', view, model, options);


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
                '<div class="large-4 columns wmapp-core-workflow_step_scheme-table-description"></div>' +
                '<div class="large-1 columns text-center wmapp-core-workflow_step_scheme-table-isstart"></div>' +
                '<div class="large-1 columns text-center wmapp-core-workflow_step_scheme-table-automatic"></div>' +
                '<div class="large-2 columns">' +
                '<label>Commands<span data-tooltip="" class="has-tip tip-right" title="Commands"></span></label>'+
                '<div>' +
                '<a class="wmapp-add-step-button wmapp-core-workflow-add-step-button button small"></a>' +
                '<a class="wmapp-clear-step-button wmapp-core-workflow-clear-step-button button small"></a>' +
                '</div>';
            '</div>' +
            '</div>';
            return _tmplStr;
        },
        regions: {
            nameField: '.wmapp-core-workflow_step_scheme-table-name',
            descriptionField: '.wmapp-core-workflow_step_scheme-table-description',
            isStartField: '.wmapp-core-workflow_step_scheme-table-isstart',
            automaticField: '.wmapp-core-workflow_step_scheme-table-automatic'
        },
        events: {
            "click .wmapp-add-step-button": "onAdd",
            "click .wmapp-clear-step-button": "onClear",
            "click .wmapp-delete-step-button": "onRemove",
        },
        options: {
            singleReference: false,
            showSystemFields: true,
            readonly: false,
        },
        onAdd: function() {
            WMAPP.Helper.clearErrors('CoreWorkflowStepScheme');

            this.model.validate();

            if (this.model.isValid()) {
                //if (!this.collection) {
                //
                //}

                if (this.collection !== undefined) {
                    this.collection.add(this.model.clone());
                    this.model.clear().set(this.model.defaults);
                    var temp_id = 'c' + moment().format('X');
                    this.model.set('temp_id', temp_id);
                    this.model.set('id', temp_id);
                } else {
                    console.log('model is invalid ', this.model);
                    //this.model.set('id', 0);
                    //this.$el.find('.wmapp-add-step-button').toggleClass('hide');
                    //this.$el.find('.wmapp-clear-button').toggleClass('hide');
                    //this.$el.find('.wmapp-delete-step-button').toggleClass('hide');
                }


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
            this.$el.find('.wmapp-add-step-button').toggleClass('hide');
            this.$el.find('.wmapp-clear-button').toggleClass('hide');
            this.$el.find('.wmapp-delete-step-button').toggleClass('hide');
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
            
            // Automatic CheckBox for workflow_step_scheme create
            var coreWorkflowStepSchemeAutomatic = new WMAPP.Extension.View.CheckBox({
                model: this.model,
                fieldId: 'CoreWorkflowStepSchemeAutomatic' + this.model.cid,
                fieldClass: '',
                label: 'Auto',
                name: 'automatic',
                tooltip: 'If the rules are fullfilled, the transition is automatic',
                readonly: this.options.readonly,
            });            


            // the count of fields plus the commands
            var cols = 4;

            this.nameField.show(coreWorkflowStepSchemeName);
            this.descriptionField.show(coreWorkflowStepSchemeDescription);
            this.isStartField.show(coreWorkflowStepSchemeIsStart);
            this.automaticField.show(coreWorkflowStepSchemeAutomatic);

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
            _tmplStr += '<div class="large-3 columns wmapp-core-workflow_transition_scheme-table-description"></div>';
            _tmplStr += '<div class="large-3 columns wmapp-core-workflow_transition_scheme-step-to"></div>';

            if (options.create || !options.readonly) {
                _tmplStr += '<div class="large-3 columns">' +
                    '<a class="wmapp-delete-step-button wmapp-core-workflow-delete-button button small" data-id="' + model.id + '" title="Are you sure you want to delete this Workflow Transition Scheme?"></a>' +
                	'<a class="wmapp-edit-step-button wmapp-core-workflow-edit-button button small" data-id="' + model.id + '" title="Edit transition rules"></a>';
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
            "click .wmapp-delete-step-button": 'trigger:coreWorkflowTransitionSchemeDeleteTableRow',
            "click .wmapp-edit-step-button": 'trigger:coreWorkflowTransitionSchemeEditTableRow'
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
            this.on('childview:trigger:coreWorkflowTransitionSchemeEditTableRow', this.editRow);
        },
        removeRow: function(childView, args){
            this.collection.remove(args.model);
        },
        editRow: function(childView, args){
        	// display a view in a lightbox
        	var view = new WMAPP.Extension.Workflow.Admin.View.WorkflowTransitionRules({
        		model: args.model,
        	});
        	
        	var injectBlockly = function() {
        		WMAPP.Extension.Workflow.Admin.workspace = Blockly.inject('blocklyDiv', {
        			toolbox: document.getElementById('toolbox'),
        			scrollbars: true,
        			trashcan: true,
        		});	
        	}
        	
        	WMAPP.LightboxRegion.show(view, {width:'90%',maxWidth: 750, transition:'none', fadeOut:0, onCompleteCustom: injectBlockly});
        	
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
            _tmplStr += '<div class="large-3 columns wmapp-core-workflow_transition_scheme-table-description"></div>';
            _tmplStr += '<div class="large-3 columns wmapp-core-workflow_transition_scheme-step-to"></div>';
            _tmplStr += '<div class="large-3 columns">' +
                '<label>Commands<span data-tooltip="" class="has-tip tip-right" title="Commands"></span></label>' +
                '<div>' +
                '<a class="wmapp-add-step-button wmapp-core-workflow-add-step-button button small"></a>' +
                '<a class="wmapp-clear-step-button wmapp-core-workflow-clear-step-button button small"></a>' +
                '</div>';
            if (options.singleReference) {
                _tmplStr += '<a class="wmapp-delete-step-button wmapp-core-workflow-delete-button button small" title="Are you sure you want to remove this Workflow Transition Scheme?"></a>';
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
            "click .wmapp-add-step-button": "onAdd",
            "click .wmapp-clear-step-button": "onClear",
            "click .wmapp-delete-step-button": "onRemove",
        },
        options: {
            singleReference: false,
            showSystemFields: true,
            readonly: false,
        },
        onAdd: function() {
            WMAPP.Helper.clearErrors('CoreWorkflowTransitionScheme');

            this.model.validate();

            if (this.model.isValid()) {
                if (this.collection !== undefined) {
                    this.collection.add(this.model.clone());
                    this.model.clear().set(this.model.defaults);
                } else {
                    this.model.set('id', 0);
                    //this.$el.find('.wmapp-add-step-button').toggleClass('hide');
                    //this.$el.find('.wmapp-clear-step-button').toggleClass('hide');
                    //this.$el.find('.wmapp-delete-step-button').toggleClass('hide');
                }


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
            this.$el.find('.wmapp-add-step-button').toggleClass('hide');
            this.$el.find('.wmapp-clear-step-button').toggleClass('hide');
            this.$el.find('.wmapp-delete-step-button').toggleClass('hide');
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

    // transition rules
    View.WorkflowTransitionRules = WMAPP.Extension.View.LayoutView.extend({
        template: function(options) {
            var _tmplStr = '<fieldset>' +
                '<legend>New Transition Rule</legend>' +
                '<div class="clearfix">' +
                '<a class="wmapp-cancel-button wmapp-core-workflow-cancel-rule-button button right">Cancel</a>' +
                '<a class="wmapp-save-button wmapp-core-workflow-save-rule-button button right">Save Rule</a>' +
                '</div>' +
                '<div class="wmapp-core-workflow_transition_rule-name"></div>' +
                '<div>' +
                	'<div class="wmapp-core-workflow_transition_rule"></div>' +
                '</div>' +
                '</fieldset>';
            return _tmplStr;
        },
        regions: {
            nameField: '.wmapp-core-workflow_transition_rule-name',
            ruleField: '.wmapp-core-workflow_transition_rule',
        }, 
        events: {
            "click .wmapp-save-button": "onSave",
        },        
        templateHelpers:function(){
            return {
                model: this.model,
                options: this.options
            }
        },
        onRender: function() {
        	
            // Name TextField for workflow_transition_rule create
            var coreWorkflowTransitionRuleName = new WMAPP.Extension.View.TextField({
                model: this.model,
                fieldId: 'CoreWorkflowTransitionRuleName',
                fieldClass: '',
                fieldType: 'text',
                placeholder: 'Name',
                label: 'Name',
                name: 'name',
                tooltip: 'The Name for your workflow transition rule',
                required: true
            }); 
            
            // rule field
            var coreWorkflowTransitionRule = new WMAPP.Extension.Workflow.Admin.View.WorkflowTransitionRule({
                model: this.model,
                fieldId: 'CoreWorkflowTransitionRuleName',
                fieldClass: '',
                fieldType: 'text',
                placeholder: 'Name',
                label: 'Name',
                name: 'name',
                tooltip: 'The Name for your workflow transition rule',
                required: true
            });              

            this.nameField.show(coreWorkflowTransitionRuleName);
            this.ruleField.show(coreWorkflowTransitionRule);
            
        },
        onSave: function(e) {
        	// generate the xml
        	var xml = Blockly.Xml.workspaceToDom(WMAPP.Extension.Workflow.Admin.workspace);
        	var xml_text = Blockly.Xml.domToText(xml);
        	this.model.get('_rule_id').set('xml', xml_text);
        	
        	// generate the php code
        	var code = Blockly.PHP.workspaceToCode(WMAPP.Extension.Workflow.Admin.workspace);
        	this.model.get('_rule_id').set('code', code);
        	
        	console.log(this.model);
        }
    });
    
    // transition rule
    View.WorkflowTransitionRule = WMAPP.Extension.View.LayoutView.extend({
        template: function(data) {
            var model = data.model;
            var options = data.options;
            var tmplStr = '';
            tmplStr += '<xml id="toolbox" style="display: none">';
            tmplStr += '	<block type="workflow_controls_if"></block>';
            tmplStr += '	<block type="logic_compare"></block>';
            tmplStr += '	<block type="logic_operation"></block>';
            tmplStr += '	<block type="math_number"></block>';
            tmplStr += '	<block type="workflow_attribute"></block>';
            tmplStr += '</xml>';
            tmplStr += '<div id="blocklyDiv" style="height: 480px; width: 600px;" dir="LTR"></div>';
            return tmplStr;
        }, 
        onRender: function() {

        }
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
            tmplStr += '    <ul class="button-group wmapp-button-group-spaced">';
            tmplStr += '    <li><button class="wmapp-cancel-button">Cancel</button></li></ul>';
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
        className: 'button-group wmapp-button-group-spaced',

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