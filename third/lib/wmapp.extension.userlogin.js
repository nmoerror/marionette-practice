'use strict';

WMAPP.module('Extension.UserLogin', Backbone.Marionette.Module.extend({
	//Module.LoginModule = Backbone.Marionette.Module.extend({
	startWithParent: true,
	getChannel: function () {
		if (this._channel) {
			return this._channel;
		} else {
			this._channel = Backbone.Wreqr.radio.channel('WMAPP.' + this.moduleName + '.channel');
			return this._channel;
		}
	},
	onStart: function (options) {
		WMAPP.Log.getLogger("WMAPP." + this.moduleName).trace("UserLogin Module onStart begin");
		WMAPP.Log.getLogger("WMAPP." + this.moduleName).trace("UserLogin Module onStart end");
	},
	onStop: function () {
		WMAPP.Log.getLogger("WMAPP." + this.moduleName).trace("UserLogin Module onStop begin");
		WMAPP.Log.getLogger("WMAPP." + this.moduleName).trace("UserLogin Module onStop end");
	},
	//    })
	//});
}));

WMAPP.module('Extension.UserLogin.Application', Backbone.Marionette.Module.extend({
	//Application.LoginApplication = Backbone.Marionette.Module.extend({
	startWithParent: true,
	alertMessage: null,
	successMessage: null,
	notificationMessage: null,
	vent: WMAPP.Extension.UserLogin.getChannel().vent,

	//---------------------------------GENERAL-----------------------------------------

	/**
	 * Creates general login and registration views
	 * @param options
	 */
	
	createView: function (options) {
		WMAPP.Log.getLogger("WMAPP.UserLogin").trace("UserLogin Module createView begin");
		if (options) {
			 // Event listener for LinkedIn Login
			var that = this;
			
			this.viewOptions = options;
			if(typeof(that.viewOptions.linkedIn) == "undefined"){
				this.viewOptions.linkedIn = true;
			}
			if (typeof(IN) != "undefined") {
	            IN.Event.on(IN, "auth", function() {
	            	IN.API.Raw("/people/~:(first-name,last-name,id,email-address)").result(function(data) {
	            		if(that.viewOptions.linkedIn){
	            			WMAPP.Extension.UserLogin.Application.onLinkedInLogin.call(that, data.emailAddress, data.id);
	            		}
	            	}).error(function(error){console.log(error);});
            		IN.User.logout();
	            });
	            IN.Event.on(IN, "logout", function() {
	            	WMAPP.Helper.hideSpinner();
	            });				
			}
			
			
			if (this.viewOptions.region) {
				this.region = this.viewOptions.region;

				if (WMAPP.user && WMAPP.user.id && ((!(WMAPP.user instanceof WMAPP.Core.Model.User) && !WMAPP.user.isAdmin && !WMAPP.user.isGod) || ((WMAPP.user instanceof WMAPP.Core.Model.User) && !WMAPP.user.get('isAdmin') && !WMAPP.user.get('isGod')))) {
					// the user is logged in and they arent an admin or super user
					this.onUserLoggedIn();
				} else {
					// there's no user, create login and registration views
					var userLogin = new WMAPP.Core.Model.UserLogin();
					if (this.viewOptions.site)
						userLogin.set('site', this.viewOptions.site);
					if (this.viewOptions.email)
						userLogin.set('email', this.viewOptions.email);
					if (this.viewOptions.password)
						userLogin.set('password', this.viewOptions.password);

					var user = new WMAPP.Core.Model.User();

					var member = new WMAPP.Core.Model.Member();
					member.validation = _.clone(member.validation);
					member.validation.email = '';

					user.set('_member_id', member);

					if (WMAPP.settings && parseInt(WMAPP.settings.register_enable, 10) == 1) {

						// check if terms and conditions are required
						var siteTCs = WMAPP.settings.site_privacy_policy;

						if (siteTCs) {
							user.set('tc_checked', 0);
						}

						// create general login/registration view
						var userLoginRegistrationView = new WMAPP.Extension.UserLogin.View.AppUserLoginRegistrationLayout({
							modelLogin: userLogin,
							modelRegistration: user,
                            autoLogin: this.viewOptions.autoLogin,
                            textBefore: this.viewOptions.textBefore,
                            textAfter: this.viewOptions.textAfter,
                            loginLabel: this.viewOptions.loginLabel,
                            passwordLabel: this.viewOptions.passwordLabel,
                            showCustomForgotten: this.viewOptions.showCustomForgotten,
                            showCustomRegister: this.viewOptions.showCustomRegister,
						});

						// set up event listeners
						this.listenTo(userLoginRegistrationView, 'trigger:onLoginButtonClick', this.onLoginButtonClick);
						this.listenTo(userLoginRegistrationView, 'trigger:onRegisterButtonClick', this.onRegisterButtonClick);
						this.listenTo(userLoginRegistrationView, 'trigger:onForgottenButtonClick', this.onForgottenButtonClick);

						if (this.viewOptions.showCustomForgotten) {
							this.listenTo(userLoginRegistrationView, 'trigger:onCustomForgottenButtonClick', this.onCustomForgottenButtonClick);
						}						

						if (this.viewOptions.showCustomRegister) {
							this.listenTo(userLoginRegistrationView, 'trigger:onCustomRegisterButtonClick', this.onCustomRegisterButtonClick);
						}						

						// render the view
						this.region.show(userLoginRegistrationView);
					} else if (WMAPP.isApp) {
						if (WMAPP.isSaas) {
							userLogin.validation['site'] = {
									required: true,
							};
						}

						// trigger the auto login if we have all the info
						if (this.viewOptions.autoLogin) {
							// set the site domain for the global user
							WMAPP.user.set('subdomain', WMAPP.Helper.toSubDomain(userLogin.get('site')));
							WMAPP.domain = WMAPP.Helper.toSubDomain(userLogin.get('site')) + WMAPP.server_tld;

							this.onLoginButtonClick(userLogin);
						} else {
							var loginOptions = { model: userLogin };
							for (var optKey in this.viewOptions) {
								if (this.viewOptions.hasOwnProperty(optKey)) {
									loginOptions[optKey] = this.viewOptions[optKey];
								}
							}

							this.loginView = new WMAPP.Extension.UserLogin.View.AppLoginView(loginOptions);

							this.listenTo(this.loginView, 'trigger:onLoginButtonClick', this.onLoginButtonClick);
							this.listenTo(this.loginView, 'trigger:onForgottenButtonClick', this.onForgottenButtonClick);
							this.listenTo(this.loginView, 'trigger:onTryItNowButtonClick', this.onTryItNowButtonClick);
							if (this.viewOptions.showCustomForgotten) {
								this.listenTo(this.loginView, 'trigger:onCustomForgottenButtonClick', this.onCustomForgottenButtonClick);
							}
							if (this.viewOptions.showCustomRegister) {
								this.listenTo(this.loginView, 'trigger:onCustomRegisterButtonClick', this.onCustomRegisterButtonClick);
							}	
							
							this.region.show(this.loginView);
						}
					} else {
						var loginOptions = { model: userLogin };
						for (var optKey in this.viewOptions) {
							if (this.viewOptions.hasOwnProperty(optKey)) {
								loginOptions[optKey] = this.viewOptions[optKey];
							}
						}
						
						this.loginView = new WMAPP.Extension.UserLogin.View.LoginView(loginOptions);

						this.listenTo(this.loginView, 'trigger:onLoginButtonClick', this.onLoginButtonClick);
						if (this.viewOptions.showCustomForgotten) {
							var that = this;
							this.listenTo(this.loginView, 'trigger:onForgottenButtonClick', function() {
								that.onCustomForgottenButtonClick.call(that, userLogin);
							});	
						} else {
							this.listenTo(this.loginView, 'trigger:onForgottenButtonClick', this.onForgottenButtonClick);
						}
						if (this.viewOptions.showCustomRegister) {
							this.listenTo(this.loginView, 'trigger:onCustomRegisterButtonClick', this.onCustomRegisterButtonClick);
						}
						this.region.show(this.loginView);
					}
				}

			} else {
				WMAPP.Log.getLogger("WMAPP.UserLogin").trace("LOGIN Module createView region required");
			}
		} else {
			WMAPP.Log.getLogger("WMAPP.UserLogin").trace("LOGIN Module createView options required");
		}
		WMAPP.Log.getLogger("WMAPP.UserLogin").trace("UserLogin Module createView end");
	},

	/**
	 * General login button click event handler
	 * @param model
	 */
	onLoginButtonClick: function (model) {
		WMAPP.Log.getLogger("WMAPP.UserLogin").trace("UserLogin Module onLoginButtonClick begin");
		// clear any errors
		WMAPP.Helper.clearErrors('CoreLoginTile');
		WMAPP.Helper.clearErrors('CoreRegistrationTile');

		function callback () {
			if (typeof WMAPP.afterLoginHandler == "function") {
				WMAPP.afterLoginHandler(model, callback2);
			} else {
				callback2();
			}
		};
		
		function callback2 () {
			if (WMAPP.isApp) {
				WMAPP.user.set(response);
				WMAPP.vent.trigger('trigger:login:success');
			} else {
				WMAPP.Helper.showSpinner();
				if (that.viewOptions && that.viewOptions.redirect) {
					window.location = that.viewOptions.redirect
					//$('#CoreLoginTile').attr('action', that.viewOptions.redirect);
					//$('#CoreLoginTile').trigger('submit', that.viewOptions.redirect);
				} else {
					window.location = '/user';
				}
			}
		};
		
		function successAuth (response) {
			WMAPP.Helper.hideSpinner();
			WMAPP.Helper.wmAjaxEnd();
			
			if (response.id) {
				
				if (WMAPP.registerSns && typeof cordova != 'undefined' && window.device) {
					WMAPP.Extension.SNS.registerEndpoint(model.id, WMAPP.Helper.slugify((model.get('site') ? model.get('site') : WMAPP.site).replace(/\s/g, ''))).then(callback, callback);
				} else {
					callback();
				}
			} else {
				throw new Error("No 'id' returned in login response.");
			}
		}

		function failureAuth (response) {
			WMAPP.Helper.hideSpinner();
			WMAPP.Helper.wmAjaxEnd();
			if (response.responseJSON && response.responseJSON.errors) {
				// handle the validation within the form
				_.each(response.responseJSON.errors, function (val, attr) {
					Backbone.Validation.callbacks.invalid(that.loginView, attr, val[0], attr);
				});
			}
			if (response.responseJSON && response.responseJSON.eula) {
				var eula = new WMAPP.Extension.UserLogin.View.EulaView({
					eula: response.responseJSON.eula,
					callback: function() {
						loginModel.set('accepted_eula', 1);
						that.onLoginButtonClick.call(that, loginModel);
					}
				});
				WMAPP.LightboxRegion.show(eula, {
					width: '90%',
					maxWidth: '720px',
					height: window.innerHeight > 640 ? '640px' : window.innerHeight*0.9 + 'px',
					fixedSize: true,
				});
			} else if (response.responseJSON && response.responseJSON.message) {
				WMAPP.Helper.showMessage('error', response.responseJSON.message);
			} else {
				WMAPP.Helper.showMessage('error', 'Unable to login at this time. Please try again.');
			}

			WMAPP.domain = WMAPP.parent_subdomain + WMAPP.server_tld;
		}

		model.validate();

		if (model.isValid()) {
			var loginModel = model.clone();
			var that = this;

			model.remote = true;
			model.unset('id', {silent: true});

			// logout first!!
			WMAPP.Helper.showSpinner();

			if (model.get('site') && model.get('site').indexOf(".") >= 0) {
				WMAPP.domain = model.get('site');
				//WMAPP.parent_subdomain = WMAPP.domain.split(".")[0];
				WMAPP.server_tld = WMAPP.domain.replace(/[^.]+/, "");
			}

			if (this.loginView.options.customAuthorisation) {
				this.loginView.options.customAuthorisation(model.get('email'), model.get('password')).then(successAuth, failureAuth);
			} else if (WMAPP.isApp) {
				// if (localStorage.getItem('WMAPP.updateRequired')) {
				// 	WMAPP.Helper.showMessage('error', 'A critical update has been released for ' + WMAPP.appName + '. Please update from the app store before logging in again.');
				// 	WMAPP.Helper.hideSpinner();
				// 	WMAPP.Helper.wmAjaxEnd();
				// 	return;
				// }
				$.ajax({
					type: "get",
					url: (WMAPP.isApp ? ('https://' + WMAPP.domain) : '') + '/feature/core/core/logout',
					dataType: 'json',
					context: this,
					async: true,
				}).then(function () {
					WMAPP.setOnline(true); // we're expected to be online to login!
					var response = model.save();
					response.then(function (response) {
						WMAPP.Helper.hideSpinner();
						WMAPP.Helper.wmAjaxEnd();
						if (response.id) {
							var callback = function() {
								if (typeof WMAPP.afterLoginHandler == "function") {
									WMAPP.afterLoginHandler(model, callback2);
								} else {
									callback2();
								}
							};
							
							var callback2 = function() {
								if (WMAPP.isApp) {
									WMAPP.user.set(response);
									WMAPP.vent.trigger('trigger:login:success');
								} else {
									WMAPP.Helper.showSpinner();
									if (that.viewOptions && that.viewOptions.redirect) {
										window.location = that.viewOptions.redirect
										//$('#CoreLoginTile').attr('action', that.viewOptions.redirect);
										//$('#CoreLoginTile').trigger('submit', that.viewOptions.redirect);
									} else {
										window.location = '/user';
									}
								}
							};
							
							if (WMAPP.registerSns && typeof cordova != 'undefined' && window.device) {
								WMAPP.Extension.SNS.registerEndpoint(model.id, WMAPP.Helper.slugify((model.get('site') ? model.get('site') : WMAPP.site).replace(/\s/g, ''))).then(callback, callback);
							} else {
								callback();
							}
						}
					}, function (response) {
						WMAPP.Helper.hideSpinner();
						WMAPP.Helper.wmAjaxEnd();
						if (response && response.responseJSON && response.responseJSON.errors) {
							// handle the validation within the form
							_.each(response.responseJSON.errors, function (val, attr) {
								Backbone.Validation.callbacks.invalid(that.loginView, attr, val[0], attr);
							});
						}
						if  (response && response.responseJSON && response.responseJSON.eula) {
							var eula = new WMAPP.Extension.UserLogin.View.EulaView({
								eula: response.responseJSON.eula,
								callback: function() {
									loginModel.set('accepted_eula', 1);
									that.onLoginButtonClick.call(that, loginModel);
								}
							});
							WMAPP.LightboxRegion.show(eula, {
								width: '90%',
								maxWidth: '720px',
								height: window.innerHeight > 640 ? '640px' : window.innerHeight*0.9 + 'px',
								fixedSize: true,
							});
						} else if (response && response.responseJSON && response.responseJSON.message) {
							WMAPP.Helper.showMessage('error', response.responseJSON.message);
						} else {
							WMAPP.Helper.showMessage('error', 'Unable to login at this time. Please try again.');
						}

						WMAPP.domain = WMAPP.parent_subdomain + WMAPP.server_tld;
					});
				}, function() {
					WMAPP.Helper.hideSpinner();
					WMAPP.Helper.wmAjaxEnd();
					WMAPP.domain = WMAPP.parent_subdomain + WMAPP.server_tld;
					// sneaky hack to make sure this error shows after any ajax errors
					setTimeout(function() {
						WMAPP.Helper.showMessage('error', 'The site entered does not exist');
					}, 10);
				});
			} else {
				var response = model.save();
				response.then(function (response) {
					WMAPP.Helper.hideSpinner();
					WMAPP.Helper.wmAjaxEnd();
					if (response.id) {
						WMAPP.Helper.showSpinner();
						if (that.viewOptions && that.viewOptions.redirect) {
							if (that.viewOptions.redirect.models && that.viewOptions.redirect.models.length) {
								// go through each of the users groups and see where we need to redirect to
								var redirect = _.find(that.viewOptions.redirect.models, function(r) {
									var found = false;
									if (r.get('group') == 0) {
										found = true;
									} else {
										var group = _.find(model.get('_groups'), function(g) {
											return g.id == r.get('group');
										});	
										if (group) {
											found = true;
										}										
									}
									return found;
								});							

								if (typeof redirect != "undefined" && typeof redirect.get('_redirect') != "undefined") {
									window.location = '/' + redirect.get('_redirect').get('slug')
								} else {
									window.location = '/user';
								}								
							} else {
								window.location = that.viewOptions.redirect;
							}
							
							//$('#CoreLoginTile').attr('action', that.viewOptions.redirect);
							//$('#CoreLoginTile').trigger('submit', that.viewOptions.redirect);
						} else {
							window.location = '/user';
						}
					}
				}, function (response) {
					WMAPP.Helper.hideSpinner();
					WMAPP.Helper.wmAjaxEnd();
					if (response && response.responseJSON && response.responseJSON.errors) {
						// handle the validation within the form
						_.each(response.responseJSON.errors, function (val, attr) {
							Backbone.Validation.callbacks.invalid(that.loginView, attr, val[0], attr);
						});
					}

					if  (response && response.responseJSON && response.responseJSON.eula) {
						var eula = new WMAPP.Extension.UserLogin.View.EulaView({
							eula: response.responseJSON.eula,
							callback: function() {
								loginModel.set('accepted_eula', 1);
								that.onLoginButtonClick.call(that, loginModel);
							}
						});
						WMAPP.LightboxRegion.show(eula, {
							width: '90%',
							maxWidth: '720px',
							height: window.innerHeight > 640 ? '640px' : window.innerHeight*0.9 + 'px',
							fixedSize: true,
						});
					} else if (response && response.responseJSON && response.responseJSON.message) {
						WMAPP.Helper.showMessage('error', response.responseJSON.message);
					} else {
						WMAPP.Helper.showMessage('error', 'Unable to login at this time. Please try again.');
					}

					WMAPP.domain = WMAPP.parent_subdomain + WMAPP.server_tld;
				});
			}


		} else {
			WMAPP.Helper.showMessage('error', 'Please check your form');
			WMAPP.Helper.wmAjaxEnd();
		}
		WMAPP.Log.getLogger("WMAPP.UserLogin").trace("UserLogin Module onLoginButtonClick end");
	},

	/**
	 * General registration button click event handler
	 * @param model
	 */
	onRegisterButtonClick: function (model) {
		WMAPP.Log.getLogger("WMAPP.UserLogin").trace("UserLogin Module onRegisterButtonClick begin");
		WMAPP.Helper.clearErrors('CoreRegistrationTile');
		WMAPP.Helper.clearErrors('CoreLoginTile');

		var tc_checked = model.get('tc_checked');
		// TODO active?
		model.set('exported', 0);

		var member = model.get('_member_id');
		member.set('email', model.get('email'));

		// Check site settings to see if the site requires account confirmation
		if(WMAPP.settings && (parseInt(WMAPP.settings.register_status, 10) != 0)) {
			model.set('active', 0);
			member.set('active', 0);
		} else {
			model.set('active', 1);
			member.set('active', 1);
		}

		member.validate();
		model.validate();

		if (member.isValid() && model.isValid()) {
			if (model.get('password') === model.get('confirmPassword')) {
				var tcs = model.get('tc_checked');
				if (tcs != 0) {
					var that = this;
					var response = model.save({}, {
						success: function (model, response) {
							// ONLY log the user in if the confirmation is not  required
							if(model.get('active') == 1) {
								// automatically log the user in after registration
								var userLogin = new WMAPP.Core.Model.UserLogin({
									email: model.get('email'),
									password: model.get('password')
								});
	
								that.onLoginButtonClick(userLogin);
								WMAPP.Helper.wmAjaxEnd();
							} else {

								// Else if confirmation is required
								WMAPP.Helper.showMessage('success', "Thank you for registering! An email will be sent to your account shortly");
								WMAPP.Helper.wmAjaxEnd();
							}
						},
						error: function (model, response) {
							if (response.responseJSON) {
								if (response.responseJSON.message) {
									WMAPP.Helper.showMessage('error', response.responseJSON.message);
								}
								if (response.responseJSON.errors) {
									model.validationError = response.responseJSON.errors;
								}
							} else if (response.statusText && response.status) {
								WMAPP.Helper.showMessage('error', "Error (" + response.status + "): " + response.statusText);
							} else {
								WMAPP.Helper.showMessage('error', "An unknown error has occurred.");
							}
							WMAPP.Helper.wmAjaxEnd();
						},
						wait: true,
					});					
				} else {
					WMAPP.Helper.showMessage('alert', 'Please read the Terms and Conditions and agree to them before you proceed');
					WMAPP.Helper.wmAjaxEnd();
				}
			} else {
				WMAPP.Helper.showMessage('alert', 'Passwords don\'t match');
				model.set('password', '');
				model.set('confirmPassword', '');
				WMAPP.Helper.wmAjaxEnd();
			}

		} else {
			WMAPP.Helper.showMessage('error', 'Please check your form');
			WMAPP.Helper.wmAjaxEnd();
		}
		WMAPP.Log.getLogger("WMAPP.UserLogin").trace("UserLogin Module onRegisterButtonClick end");
	},

	onCustomRegisterButtonClick: function() {
		this.trigger('trigger:onCustomRegisterButtonClick');
	},
	
	onCustomForgottenButtonClick: function(model) {
		this.loginView.trigger('trigger:onCustomForgottenButtonClick', model);
	},
	
	onTryItNowButtonClick: function() {
		var that = this;

		WMAPP.Log.getLogger("WMAPP.UserLogin").trace("UserLogin Module onTryItNowButtonClick begin");
		WMAPP.Helper.clearErrors('CoreRegistrationTile');
		WMAPP.Helper.clearErrors('CoreLoginTile');

		// grab a demo site that is ready to go
		// log the user into that site
		var demoSite = new WMAPP.Site.Model.Site();
		demoSite.url = demoSite.getUrl() + '/0?SiteSite_demo=1&SiteSite_demo_activated=ISNULL&allocateDemoSite=1';
		var invalidSiteDomain = demoSite.url.indexOf('https://.');
		if (invalidSiteDomain !== -1) {
			demoSite.url = demoSite.url.replace('https://.', 'https://' + WMAPP.parent_subdomain + '.');
		}
		demoSite.local = false;
		demoSite.remote = true;
		demoSite.fetch({reset: true}).then(function (model, response, options) {
				if (demoSite.get('id')) {
					// update some details
					localStorage.setItem("WMAPP.subdomain", demoSite.get('subdomain'));
					localStorage.setItem("WMAPP.site_id", demoSite.get('id'));
					localStorage.setItem("WMAPP.demo", 1);

					var userLogin = new WMAPP.Core.Model.UserLogin({
						site: demoSite.get('subdomain'),
						email: 'demo@' + WMAPP.server_tld.substring(1),
						password: demoSite.get('subdomain'),
					});

					// set the site domain for the global user
					WMAPP.user.set('subdomain', WMAPP.Helper.toSubDomain(userLogin.get('site')));
					WMAPP.domain = WMAPP.Helper.toSubDomain(userLogin.get('site')) + WMAPP.server_tld;

					// Make sure that the upgrade menu item is added to the menu
					WMAPP.Site.addUpgradeMenuItem();

					that.onLoginButtonClick(userLogin);
				} else {
					WMAPP.Helper.showMessage('alert', "There has been an error retreiving your demo site. Please contact support.");
				}

				WMAPP.Helper.wmAjaxEnd();
			},
			function (model, response) {
				if (response.responseJSON) {
					if (response.responseJSON.message) {
						WMAPP.Helper.showMessage('alert', response.responseJSON.message);
					}
				} else if (response.statusText && response.status) {
					WMAPP.Helper.showMessage('alert', "Error (" + response.status + "): " + response.statusText);
				} else {
					WMAPP.Helper.showMessage('alert', "An unknown error has occurred.");
				}

				WMAPP.Helper.wmAjaxEnd();

				// set the domain back
				WMAPP.domain = WMAPP.parent_subdomain + WMAPP.server_tld;
			});
	},

	/**
	 * Group registration button click event handler
	 * @param model
	 */
	onGroupRegisterButtonClick: function (model) {
		WMAPP.Log.getLogger("WMAPP.UserLogin").trace("UserLogin Module onGroupRegisterButtonClick begin");
		WMAPP.Helper.clearErrors('GroupRegistrationTile');

		var tcs = model.get('tc_checked');
		if (tcs != 0) {
			var that = this;
			var response = model.save({}, {
				success: function (model, response) {
					// TODO temporary page reload
					// This page reload is required because when you add a
					// user to a group, WMAPP object is not refreshing :(
					window.location.reload();

					//that.onUserLoggedIn();
					WMAPP.Helper.wmAjaxEnd();
				},
				error: function (model, response) {
					//model.validationError = response.responseJSON.errors;
					WMAPP.Helper.showMessage('error', 'Unable to save your account. Please try again');
					WMAPP.Helper.wmAjaxEnd();
				},
				wait: true
			});

		} else {
			WMAPP.Helper.showMessage('alert', 'Please read the Terms and Conditions and agree to them before you proceed');
			WMAPP.Helper.wmAjaxEnd();
		}
		WMAPP.Log.getLogger("WMAPP.UserLogin").trace("UserLogin Module onRegisterButtonClick end");
	},

	/**
	 * Checks if the user is a member of all required groups
	 * @returns {boolean}
	 */
	checkUserGroups: function () {
		WMAPP.Log.getLogger("WMAPP.UserLogin").trace("UserLogin Module checkUserGroups begin");
		// get the groups from the view options
		var groupsRequiredObject = this.viewOptions.groups_membership,
			result = false;

		// if groups are specified
		if (groupsRequiredObject) {
			// get the groups the user is a member of
			var groupsUserObject = WMAPP.user.groups,
				// convert group objects into arrays of group names
				// TODO this workaround will be here until we implement frontend groups stuff
				groupsRequired = _.values(groupsRequiredObject),
				groupsUser = _.values(groupsUserObject);

			//console.log('GROUPS REQUIRED FROM THE USER', this.viewOptions, groupsRequired);
			if (groupsUser) {
				//console.log('GROUPS required', groupsRequired, ' user in ', groupsUser);
				// finds the intersection of two arrays
				var intersection = _.intersection(groupsRequired, groupsUser);
				//console.log('GROUPS THE USER IS A MEMBER OF', groupsUser, intersection, _.isEqual(groupsRequired, intersection));
				// compares intersection to a list of required groups
				// if they're equal, the user is a member of all required groups
				result = _.isEqual(groupsRequired, intersection);
			}
		} else {
			// if groups are not specified, there's no check required
			result = true;
		}

		WMAPP.Log.getLogger("WMAPP.UserLogin").trace("UserLogin Module checkUserGroups end");
		return result;
	},



	/**
	 * Checks additional options after the user has logged in
	 */
	onUserLoggedIn: function () {
		WMAPP.Log.getLogger("WMAPP.UserLogin").trace("UserLogin Module onUserLoggedIn begin");
		// TODO hardcoded groups
		//console.log('user login');
		if (this.checkUserGroups()) {
			//console.log('in groups');
			// if the user is logged in and in groups
			var activationAttribute = 1;
			if (this.viewOptions && this.viewOptions.activation_attribute && this.viewOptions.model) {
				activationAttribute = this.viewOptions.model.get(this.viewOptions.activation_attribute);
			}

			if (!activationAttribute) {
				// if activation is required
				var groupActivationView = new WMAPP.Extension.UserLogin.View.GroupActivationView({
					viewOptions: this.viewOptions,
				});

				this.region.show(groupActivationView);
			} else {
				// if no activation is required or something went wrong
				if (this.viewOptions && this.viewOptions.redirect) {
					window.location = this.viewOptions.redirect
				} else {
					this.vent.trigger('trigger:userLogin:onUserLoggedInAndInGroups');
				}
			}
		} else {
			//console.log('not in groups');
			this.vent.trigger('trigger:userLogin:onUserLoggedInAndNotInGroups');

			// if the user is logged in and not in groups
			// create group-specific registration views

			if (this.viewOptions && this.viewOptions.model) {
				var model = this.viewOptions.model
			}

			//if (model) {
			var groupRegistrationView = new WMAPP.Extension.UserLogin.View.GroupRegistrationView({
				viewOptions: this.viewOptions,
				model: model
			});

			this.listenTo(groupRegistrationView, 'trigger:onGroupRegisterButtonClick', this.onGroupRegisterButtonClick);

			this.region.show(groupRegistrationView);
			//}

		}
		WMAPP.Log.getLogger("WMAPP.UserLogin").trace("UserLogin Module onUserLoggedIn end");
	},


	onForgottenButtonClick: function (model) {

		var usermodel = new WMAPP.Core.Model.User({
			id: 0,
			email: model.get('email'),
			password: 'reset',
			reset: true,
			member_id: 0,
		});
		
		var forgottenOptions = {
            model: usermodel
        }

        if (this.viewOptions.forgottenTemplate) {
            forgottenOptions.template = this.viewOptions.forgottenTemplate;
        }
        
		var userLoginForgottenPasswordLayout = new WMAPP.Extension.UserLogin.View.UserLoginForgottenPasswordLayout(forgottenOptions);

		this.listenTo(userLoginForgottenPasswordLayout, 'trigger:onSendButtonClick', this.onSendButtonClick);
		this.listenTo(userLoginForgottenPasswordLayout, 'trigger:onCancelButtonClick', this.onCancelForgottenButtonClick);
		this.listenTo(userLoginForgottenPasswordLayout, 'trigger:onLoginButtonClick', this.onCancelForgottenButtonClick);

		this.region.show(userLoginForgottenPasswordLayout);
	},

	onSendButtonClick: function (model) {
		//avoid local db execution when not login
		if (WMAPP.isApp) {
			model.remote = true;
			model.local = false;
		}
		
		//model.validation
		model.validate();
		
		if (model.isValid()) {
			var that = this;
			var response = model.save({}, {
				success: function (model, response) {
					WMAPP.Helper.showMessage('success', response.message);
					WMAPP.Helper.wmAjaxEnd();
					that.createView(that.viewOptions);
				},
				error: function (model, response) {
					if (response.responseJSON) {
						if (response.responseJSON.message) {
							WMAPP.Helper.showMessage('alert', response.responseJSON.message);
						}
						if (response.responseJSON.errors) {
							model.validationError = response.responseJSON.errors;
						}
					} else if (response.statusText && response.status) {
						WMAPP.Helper.showMessage('alert', "Error (" + response.status + "): " + response.statusText);
					} else {
						WMAPP.Helper.showMessage('alert', "An unknown error has occurred.");
					}
					WMAPP.Helper.wmAjaxEnd();
				},
				wait: true
			});
		} else {
			WMAPP.Helper.showMessage('error', 'Please check your form');
			WMAPP.Helper.wmAjaxEnd();
		}
	},

	onCancelForgottenButtonClick: function () {
		this.createView(this.viewOptions);
		WMAPP.Helper.wmAjaxEnd();
	},

	onFacebookLogin: function(userId, facebookId) {
		var that = this;
		var promise = $.Deferred();
		WMAPP.Helper.showSpinner();
		$.ajax({
			type: 'POST',
			dataType: 'json',
			contentType: "application/json",
			url: '/feature/core/core/third_party_login',
			data: JSON.stringify({
				service: 'facebook',
				user_id: userId,
				facebook_id: facebookId,
			})
		}).then(function(response) {
			var model = new WMAPP.Core.Model.UserLogin(response);
			if (that.viewOptions && that.viewOptions.redirect) {
				// go through each of the users groups and see where we need to redirect to
				var redirect = _.find(that.viewOptions.redirect.models, function(r) {
					var found = false;
					var group = _.find(model.get('_groups'), function(g) {
						return g.id == r.get('group');
					});	
					if (group) {
						found = true;
					}
					return found;
				});

				if (typeof redirect != "undefined" && typeof redirect.get('_redirect') != "undefined") {
					window.location = '/' + redirect.get('_redirect').get('slug')
				} else {
					window.location = '/user';
				}
			}
			// } else {
			// 	window.location = '/user';
			// }
			promise.resolve();
		}, function(response) {
			WMAPP.Helper.hideSpinner();
			WMAPP.Helper.wmAjaxEnd();
			if (response.responseJSON && response.responseJSON.message) {
				WMAPP.Helper.showMessage('error', response.responseJSON.message);
			} else {
				WMAPP.Helper.showMessage('error', 'Unable to login at this time. Please try again.');
			}
			promise.reject();
		});
		
		return promise;
	},

	/**
	 * Function for third party login using LinkedIn API
	 */
    onLinkedInLogin: function(email, linkedinId) {
    	var that = this;
    	
		// Fire off the data to the backend to process
		WMAPP.Helper.hideMessage();
		WMAPP.Helper.showSpinner();
		$.ajax({
			type: 'POST',
			dataType: 'json',
			url:(WMAPP.isApp ? ('https://' + WMAPP.domain):'') + '/feature/core/core/third_party_login',
			contentType: "application/json",
			data: JSON.stringify({
				service: 'linkedin',
				email: email,
				linkedin_id: linkedinId
			}),
			
			success: function(data) {
				var model = new WMAPP.Core.Model.UserLogin(data);
				console.log('MODEL', model);
				console.log('VO', that.viewOptions);
				if (WMAPP.isApp) {
					WMAPP.user.set(model);
					WMAPP.vent.trigger('trigger:login:success');
				} else {
					if (that.viewOptions && that.viewOptions.redirect) {
						// go through each of the users groups and see where we need to redirect to
						var redirect = _.find(that.viewOptions.redirect.models, function(r) {
							console.log('RGROUP', r.get('group'));
							var found = false;
							var group = _.find(model.get('_groups'), function(g) {
								console.log('GROUP', g.id);
								return g.id == r.get('group');
							});	
							if (group) {
								found = true;
							}
							return found;
						});							

						if (typeof redirect != "undefined" && typeof redirect.get('_redirect') != "undefined") {
							window.location = '/' + redirect.get('_redirect').get('slug')
						} else {
							window.location = '/user';
						}

						//$('#CoreLoginTile').attr('action', that.viewOptions.redirect);
						//$('#CoreLoginTile').trigger('submit', that.viewOptions.redirect);
					} else {
						window.location = '/user';
					}
				}
				
			},
			error: function(response) {
				WMAPP.Helper.hideSpinner();
				WMAPP.Helper.wmAjaxEnd();
				if (response.responseJSON && response.responseJSON.message) {
					WMAPP.Helper.showMessage('error', response.responseJSON.message);
				} else {
					WMAPP.Helper.showMessage('error', 'Unable to login at this time. Please try again.');
				}

				WMAPP.domain = WMAPP.parent_subdomain + WMAPP.server_tld;
			},
		});
		WMAPP.Helper.wmAjaxEnd();
	},
}));
//});

WMAPP.module('Extension.UserLogin.View', function (View) {
	View.vent = WMAPP.Extension.UserLogin.getChannel().vent;

	//---------------------------------GENERAL-----------------------------------------

	View.EulaView = WMAPP.Extension.View.LayoutView.extend({
		template: function(options) {
			return 	'<div class="wmapp-eula-wrapper">' +
					'	<h3>End User Licence Agreement (EULA)</h3>' +
					'	<p>You must accept this EULA before continuing.</p>' +
					'	<div class="wmapp-eula">' + options.eula + '</div>' +
					'	<div class="button-group">' +
					'		<button class="wmapp-button decline">Decline</button>' +
					'		<button class="wmapp-button accept">Accept</button>' +
					'	</div>' +
					'</div>';
		},
		templateHelpers: function() {
			return this.options;
		},
		events: {
			'click button.accept': 'onAcceptClicked',
			'click button.decline': 'onDeclineClicked',
		},
		onAcceptClicked: function() {
			var that = this;
			WMAPP.confirm('Are you sure you accept the EULA?', function(confirmed) {
				if (confirmed) {
					that.closeLightbox();
					that.options.callback.call(that);
				}
			})
		},
		onDeclineClicked: function() {
			this.closeLightbox();
		},
		closeLightbox: function() {
			WMAPP.LightboxRegion._destroy();
			WMAPP.LightboxRegion.close();
		}
	});

	/**
	 * General login view
	 */
	View.LoginView = WMAPP.Extension.View.LayoutView.extend({
		options: {
			title: 'Login',
			facebookAppId: null,
		},
		template: function (data) {
			var options = data.options;
			if (options.loginTemplate) {
				return options.loginTemplate(data);
			} else {
				var page = window.location.pathname;
				var ele = '<form action="' + page + '" id="CoreLoginTile" method="post"><fieldset>';
				if (options.title) {
					ele += '<legend>' + options.title + '</legend>';
				}
				if (options.textBefore) {
					ele += '<div class="wmapp-form-text-before">' + options.textBefore + '</div>';
				}
	
				ele += '<div class="wmapp-form"><div class="wmapp-core-login-email"></div><div class="wmapp-core-login-password"></div></div>';
				if (options.showCustomForgotten) {
					ele += '<div class="wmapp-form-forgotten"><a class="wmapp-core-login-custom-forgotten">Forgotten Password?</a></div>';
				} else if (WMAPP.isApp) {
					ele += '<div class="wmapp-form-forgotten"><a class="wmapp-core-login-forgotten">Forgotten Password?</a></div>';
				} else {
					ele += '<div class="wmapp-form-forgotten-password"><a class="wmapp-core-login-forgotten-password" href="/forgotten">Forgotten Password?</a></div>';
				}
	
				if (options.textAfter) {
					ele += '<div class="wmapp-form-text-after">' + options.textAfter + '</div>';
				}
				ele += '	<ul class="button-group wmapp-button-group-spaced">';
				ele += '		<li><button type="submit" class="wmapp-button wmapp-submit-button">Login</button></li>';
				
				if (typeof(IN) != "undefined" ) {
					ele += '		<li><button type="button" class="wmapp-button wmapp-linkedin-button">Sign in with LinkedIn</button></li>';
				}
				if (WMAPP.isApp && typeof(facebookConnectPlugin) != "undefined") {
					ele += '		<li><button type="button" class="wmapp-button wmapp-facebook-button">Sign in with Facebook</button></li>';
				}			
				ele += '	</ul>';
				
				if (options.showCustomRegister) {
					ele += '<div class="wmapp-form-register"><a class="wmapp-core-login-custom-register">Create an Account</a></div>';
				} else if (WMAPP.isApp) {
					ele += '<div class="wmapp-form-register"><a class="wmapp-core-login-register">Create an Account</a></div>';
				}			
				ele += '</fieldset></form>';
				return ele;
			}
		},
		templateHelpers: function () {
			return {
				model: this.model,
				options: this.options
			}
		},
		regions: {
			emailField: '.wmapp-core-login-email',
			passwordField: '.wmapp-core-login-password',
		},
		initialize: function () {
			var that = this;
			this.options.layoutId = 'CoreLoginTile';
			if (this.model) {
				Backbone.Validation.bind(this);
			}
			if (this.options.facebookAppId) {
				if (!window.facebookConnectPlugin) {
					window.fbAsyncInit = function() {
						FB.init({
							appId: that.options.facebookAppId,
							xfbml: true,
							version: 'v2.8'
						});
						FB.AppEvents.logPageView();
					};
					(function(d, s, id){
						var js, fjs = d.getElementsByTagName(s)[0];
						if (d.getElementById(id)) {return;}
						js = d.createElement(s); js.id = id;
						js.src = "//connect.facebook.net/en_US/sdk.js";
						fjs.parentNode.insertBefore(js, fjs);
					}(document, 'script', 'facebook-jssdk'));
				}
			}
		},
		ui: {
			siteField: '#CoreLoginTileSite',
			emailField: '#CoreLoginTileEmail',
			passwordField: '#CoreLoginTilePassword',
		},
		events: function () {
			var events = {
				"click .wmapp-core-login-forgotten-password": "onForgottenButtonClick",
				"submit #CoreLoginTile": "onSubmitLogin",
				"click .wmapp-linkedin-button": "onLinkedIn"
			};
			if (this.options.showCustomForgotten) {
				events['click .wmapp-core-login-custom-forgotten'] = "onCustomForgottenButtonClick";
			} else if (WMAPP.isApp) {
				events['click .wmapp-core-login-forgotten'] = "onCustomForgottenButtonClick";
			}
			if (this.options.showCustomRegister) {
				events['click .wmapp-core-login-custom-register'] = "onCustomRegisterButtonClick";
			} else if (WMAPP.isApp) {
				events['click .wmapp-core-login-register'] = "onRegisterButtonClick";
			}
			return events;
		},

		onLinkedIn: function(e) {
			
			IN.User.authorize(function(){
					  
			});
		

		},		
		
		onFacebookLoginClicked: function() {
			var that = this;
			var facebookSdk = window.facebookConnectPlugin || window.FB;
			
			WMAPP.Helper.showSpinner();
			
			facebookSdk.getLoginStatus(function(response) {
				WMAPP.Helper.hideSpinner();
				// if (response.status != 'unknown') {
				// 	// log out first
				// 	facebookSdk.logout(function() {
				// 		// log in 
				// 		that.loginWithFacebook.call(that);
				// 	}, function(error) {
				// 		//WMAPP.Helper.showMessage('error', 'Facebook Logout Error: ' + error);
				// 		that.loginWithFacebook.call(that);
				// 	});
				// } else {
					that.loginWithFacebook.call(that);
				// }
			});
		},
		
		loginWithFacebook: function() {
			WMAPP.Helper.showSpinner();
			var that = this;
			if (window.facebookConnectPlugin) {
				facebookConnectPlugin.login(["public_profile", "email"], function() {
					WMAPP.Helper.hideSpinner();
					that.options.onFacebookLoginSuccess.apply(that, arguments);
				}, function (error) {
					WMAPP.Helper.hideSpinner();
					console.error('Facebook Login Error', error);
				});
			} else if (window.FB) {
				FB.login(function() {
					WMAPP.Helper.hideSpinner();
					that.options.onFacebookLoginSuccess.apply(that, arguments);
				}, {
					scope: "email",
				});
			}
		},
		
		onSubmitLogin: function(e, redirect) {
			if (!redirect) {
				e.preventDefault();
				e.stopPropagation();

				var emailInput = $("#CoreLoginTileEmail");
				var passwordInput = $("#CoreLoginTilePassword");

				emailInput.change();
				passwordInput.change();

				this.triggerDelayed('trigger:onLoginButtonClick', this.model);
				return false;
			}
		},

		processKey: function (e) {
			if (e.which === 13) {
				// sart the ajax icon on the submit button
				WMAPP.Helper.wmAjaxStart(this.$el.find('.wmapp-submit-button'));

				var emailInput = $("#CoreLoginTileEmail");
				var passwordInput = $("#CoreLoginTilePassword");

				emailInput.change();
				passwordInput.change();

				this.triggerDelayed('trigger:onLoginButtonClick', this.model);
			}
		},

		onLoginButtonClick: function (e) {
			//WMAPP.Helper.wmAjaxStart($(e.target));
			e.preventDefault();
			e.stopPropagation();
			// a hack for firefox remembering passwords
			var emailInput = $("#CoreLoginTileEmail");
			var passwordInput = $("#CoreLoginTilePassword");

			emailInput.change();
			passwordInput.change();

			this.triggerDelayed('trigger:onLoginButtonClick', this.model);
			return false;
		},

		onForgottenButtonClick: function (e) {
			if (typeof this.options.customForgotten == "function") {
				console.log("FORGOTTEN TREASURES");
				this.options.customForgotten();
			} else {
				WMAPP.Helper.wmAjaxStart($(e.target));
				e.preventDefault();
				e.stopPropagation();
				this.triggerDelayed('trigger:onForgottenButtonClick', this.model);				
			}			
		},
		
		onCustomForgottenButtonClick: function (e) {
			if (typeof this.options.customForgotten == "function") {
				console.log("FORGOTTEN TREASURES");
				this.options.customForgotten();
			} else {
				WMAPP.Helper.wmAjaxStart($(e.target));
				e.preventDefault();
				e.stopPropagation();
				this.triggerDelayed('trigger:onCustomForgottenButtonClick', this.model);				
			}			
		},
	
		onCustomRegisterButtonClick: function(e) {
			if (typeof this.options.customRegister == "function") {
				this.options.customRegister();
			} else {
				WMAPP.Helper.wmAjaxStart($(e.target));
				e.preventDefault();
				e.stopPropagation();
				this.triggerDelayed('trigger:onCustomRegisterButtonClick', this.model);				
			}
		},
		
		onRegisterButtonClick: function(e) {
			e.preventDefault();
			e.stopPropagation();
			$('.wmapp-login-view').hide();
			$('.wmapp-registration-view').show();
		},

		onRender: function () {
			var that = this;
			
			if (this.options.facebookAppId) {
				if (window.facebookConnectPlugin || window.fbAsyncInit) {
					var facebookLoginButton = $('<div class="facebook-login">Login with Facebook</div>');
					facebookLoginButton.on('click', function() {
						that.onFacebookLoginClicked.call(that);
					});
					that.$el.append(facebookLoginButton);
				} else {
					console.error('Facebook plugin is not available, so not showing as a login method');
				}
			}
			
			// Name TextField for domain_record create
			var coreLoginTileEmail = new WMAPP.Extension.View.TextField({
				model: this.model,
				fieldId: 'CoreLoginTileEmail',
				fieldClass: '',
				fieldType: 'email',
				placeholder: this.options.loginLabel,
				name: 'email',
				label: this.options.loginLabel,
				maxlength: 255,
				autocomplete: 'on'
			});

			// Value TextField for domain_record create
			var coreLoginTilePassword = new WMAPP.Extension.View.TextField({
				model: this.model,
				fieldId: 'CoreLoginTilePassword',
				fieldClass: '',
				fieldType: 'password',
				placeholder: this.options.passwordLabel,
				name: 'password',
				label: this.options.passwordLabel,
				maxlength: 255,
				autocomplete: 'on'
			});

			this.emailField.show(coreLoginTileEmail);
			this.passwordField.show(coreLoginTilePassword);

			this.bindUIElements();
		},
	});

	/**
	 * App login view
	 */
	View.AppLoginView = View.LoginView.extend({
		template: function (data) {
			var options = data.options;
			var page = window.location.pathname;
			if (options.loginTemplate) {
				return options.loginTemplate(data);
			} else {
				var ele = '<form action="' + page + '" id="CoreLoginTile" method="post">';
	
				if (WMAPP.isApp && WMAPP.logoImage) {
					ele += '<img class="logo" src="'+WMAPP.logoImage+'" />';
				}
	
				if (options.textBefore) {
					ele += '<div>' + options.textBefore + '</div>';
				} else {
					ele += '<div><p>Please enter your details below to login.</p></div>';
				}
				ele += '<div class="wmapp-form">';
				
				if (WMAPP.isSaas) {
					ele += '<div class="wmapp-core-login-site"></div>';
				}
				
				ele += '<div class="wmapp-core-login-email"></div><div class="wmapp-core-login-password"></div></div>';
				ele += options.showCustomForgotten
					? '<div class="wmapp-form-forgotten"><a class="wmapp-core-login-custom-forgotten">Forgotten Password?</a></div>'
					: '<div class="wmapp-form-forgotten-password"><a class="wmapp-core-login-forgotten-password" href="/forgotten">Forgotten Password?</a></div>';
	
				if (options.textAfter) {
					ele += '<div>' + options.textAfter + '</div>';
				}
	
				ele += '<button type="submit" class="wmapp-submit-button">Login</button>';
				if(typeof cordova != 'undefined' && typeof(cordova.plugins.LinkedIn)!= "undefined"){
					ele += '<button type="submit" class="wmapp-linkedin-button">Sign in with LinkedIn</button>';
				}
				if (options.showCustomRegister) {
					ele += '<div class="wmapp-form-register"><a class="wmapp-core-login-custom-register">Create an Account</a></div>';
				}			
	
				if (WMAPP.isApp) {
					/* TEMPORARILY DISABLE SIGNUP
					ele += '<div class="button-group">'+
							'<button class="wmapp-try-now-button notification">Try it Now</button>' +
							'<button class="wmapp-signup-button">Signup</button>' +
							'</div>';
					*/
					if (WMAPP.version) {
						ele += '<div class="wmapp-app-version">v' + WMAPP.version + (WMAPP.build ? (' (' + WMAPP.build + ')') : '') + '</div>';
					}
				}
	
				return ele;
			}
		},
		templateHelpers: function () {
			return {
				model: this.model,
				options: this.options
			}
		},
		regions: {
			siteField: '.wmapp-core-login-site',
			emailField: '.wmapp-core-login-email',
			passwordField: '.wmapp-core-login-password',
		},

		events: function() {
			var events = {
				"click .wmapp-submit-button": "onLoginButtonClick",
				"click .wmapp-linkedin-button": "onLinkedInButtonClick",
				"click .wmapp-try-now-button": "onTryItNowButtonClick",
				"click .wmapp-signup-button": "onSignupButtonClick",
				"submit #CoreLoginTile": "onLoginButtonClick",
				"click .wmapp-core-login-forgotten-password": "onForgottenButtonClick"
			};
			if (this.options.showCustomForgotten) {
				events["click .wmapp-core-login-custom-forgotten"] = "onCustomForgottenButtonClick";
			}
			if (this.options.showCustomRegister) {
				events["click .wmapp-core-login-custom-register"] = "onCustomRegisterButtonClick";
			}
			return events;
		},
		onLinkedInButtonClick: function(e){
			e.preventDefault();
			e.stopPropagation();
			var that = this;
			var scopes = ['r_basicprofile', 'r_emailaddress'];
			cordova.plugins.LinkedIn.login(scopes,false,function(success) {
				  // get connections
				cordova.plugins.LinkedIn.getRequest('people/~:(first-name,last-name,id,email-address)', function(data){
						WMAPP.Extension.UserLogin.Application.onLinkedInLogin(data.emailAddress, data.id); 
						
	        		}, function(model, response, options) {
	            		WMAPP.Helper.showMessage('alert', "Error ("+response.status+"): " + response.statusText);
	            	});
				
			}, function(error){
				WMAPP.Helper.showMessage('alert', error);		
          	});
			
			WMAPP.Helper.hideSpinner();
			
		},
		onLoginButtonClick: function (e) {
			//WMAPP.Helper.wmAjaxStart($(e.target));
			e.preventDefault();
			e.stopPropagation();
			// a hack for firefox remembering passwords
			if (WMAPP.isSaas) {
				var siteInput = $("#CoreLoginTileSite");
			}
			var emailInput = $("#CoreLoginTileEmail");
			var passwordInput = $("#CoreLoginTilePassword");

			if (WMAPP.isSaas) {
				siteInput.change();
			}
			emailInput.change();
			passwordInput.change();

			// set the site domain for the global user
			if (WMAPP.isSaas) {
				WMAPP.user.set('subdomain', WMAPP.Helper.toSubDomain(this.model.get('site')));
				WMAPP.domain = WMAPP.Helper.toSubDomain(this.model.get('site')) + WMAPP.server_tld;
			}

			this.triggerDelayed('trigger:onLoginButtonClick', this.model);
			return false;
		},

		onSignupButtonClick: function (e) {
			e.preventDefault();
			e.stopPropagation();
			WMAPP.vent.trigger('trigger:productTour:signup');
			return false;
		},

		onTryItNowButtonClick: function (e) {
			WMAPP.Helper.wmAjaxStart($(e.target));
			e.preventDefault();
			e.stopPropagation();
			this.triggerDelayed('trigger:onTryItNowButtonClick');
			return false;
		},

		onForgottenButtonClick: function(e) {
            e.preventDefault();
            e.stopPropagation();
            this.triggerDelayed('trigger:onForgottenButtonClick', this.model);
        },
        
		onCustomForgottenButtonClick: function(e) {
			if (typeof this.options.customForgotten == "function") {
				this.options.customForgotten();
			} else {
				e.preventDefault();
				e.stopPropagation();
				this.triggerDelayed('trigger:onCustomForgottenButtonClick', this.model);				
			}
		},      

		onCustomRegisterButtonClick: function(e) {
			if (typeof this.options.customRegister == "function") {
				this.options.customRegister();
			} else {
				e.preventDefault();
				e.stopPropagation();
				this.triggerDelayed('trigger:onCustomRegisterButtonClick', this.model);				
			}
		},      

		onPrivacyPolicyClick: function (e) {
			e.preventDefault();
			window.open(WMAPP.privacyUrl, "_system");
		},

		onTermsAndConditionsClick: function (e) {
			e.preventDefault();
			window.open(WMAPP.termsUrl, "_system");
		},

		onRender: function () {
			var that = this;
			
			if (this.options.facebookAppId) {
				if (window.facebookConnectPlugin || window.fbAsyncInit) {
					var facebookLoginButton = $('<div class="facebook-login">Login with Facebook</div>');
					facebookLoginButton.on('click', function() {
						that.onFacebookLoginClicked.call(that);
					});
					that.$el.append(facebookLoginButton);
				} else {
					console.error('Facebook plugin is not available, so not showing as a login method');
				}
			}

			if (WMAPP.isApp && WMAPP.version) {
				this.$el.attr('data-app-version', 'v' + WMAPP.version + (WMAPP.build ? (' (' + WMAPP.build + ')') : ''));
			}

			// Site TextField for user login create
			if (WMAPP.isSaas) {
				var coreLoginTileSite = new WMAPP.Extension.View.TextField({
					model: this.model,
					fieldId: 'CoreLoginTileSite',
					fieldClass: '',
					fieldType: 'text',
					placeholder: 'Site',
					name: 'site',
					label: 'Site',
					maxlength: 255,
					autocomplete: 'on',
					value: localStorage.getItem("WMAPP.site"),
				});
			}

			// Email TextField for user login create
			var coreLoginTileEmail = new WMAPP.Extension.View.TextField({
				model: this.model,
				fieldId: 'CoreLoginTileEmail',
				fieldClass: '',
				fieldType: 'email',
                placeholder: this.options.loginLabel,
				name: 'email',
                label: this.options.loginLabel,
				maxlength: 255,
				autocomplete: 'on'
			});

			// Password TextField for user login create
			var coreLoginTilePassword = new WMAPP.Extension.View.TextField({
				model: this.model,
				fieldId: 'CoreLoginTilePassword',
				fieldClass: '',
				fieldType: 'password',
                placeholder: this.options.passwordLabel,
				name: 'password',
                label: this.options.passwordLabel,
				maxlength: 255,
				autocomplete: 'on'
			});

			if (WMAPP.isSaas) {
				this.siteField.show(coreLoginTileSite);
			}
			this.emailField.show(coreLoginTileEmail);
			this.passwordField.show(coreLoginTilePassword);

			if (this.options.autoLogin) {
				this.$el.find('.wmapp-submit-button').trigger('click');
			}
		},
	});

	View.MemberFieldRegistrationView = WMAPP.Extension.View.LayoutView.extend({
		template: function () {
			var tmplStr = '<div class="wmapp-core-registration-firstname"></div>' +
				'<div class="wmapp-core-registration-lastname"></div>';
			return tmplStr;
		},

		regions: {
			firstnameField: '.wmapp-core-registration-firstname',
			lastnameField: '.wmapp-core-registration-lastname',
		},

		initialize: function () {
			this.options.layoutId = 'CoreRegistrationTile';
			if (this.model) {
				Backbone.Validation.bind(this);
			}
		},

		onRender: function () {
			// Name TextField for domain_record create
			var coreRegistrationTileFirstName = new WMAPP.Extension.View.TextField({
				model: this.model,
				fieldId: 'CoreRegistrationTileFirstname',
				fieldClass: '',
				fieldType: 'text',
				placeholder: 'First Name',
				name: 'firstname',
				label: 'First Name',
				maxlength: 255,
			});

			// Name TextField for domain_record create
			var coreRegistrationTileLastName = new WMAPP.Extension.View.TextField({
				model: this.model,
				fieldId: 'CoreRegistrationTileLastname',
				fieldClass: '',
				fieldType: 'text',
				placeholder: 'Last Name',
				name: 'lastname',
				label: 'Last Name',
				maxlength: 255,
			});

			this.firstnameField.show(coreRegistrationTileFirstName);
			this.lastnameField.show(coreRegistrationTileLastName);
		}

	});

	/**
	 * General user registration view
	 */
	View.RegistrationView = WMAPP.Extension.View.LayoutView.extend({
		template: function (options) {
			var page = window.location;
			var ele = '<form action="' + page + '" id="CoreRegistrationTile" method="post"><fieldset><legend>Registration</legend>' +
				'<p>Please register below.</p>' +
				'<div class="wmapp-form">' +
				'<div class="wmapp-core-registration-first-last-name"></div>' +
				'<div class="wmapp-core-registration-email"></div>' +
				'<div class="wmapp-core-registration-password"></div>' +
				'<div class="wmapp-core-registration-confirm-password"></div>' +
				'<div class="wmapp-core-registration-tcs"></div>' +
				'</div>';
				ele += '<button type="submit" class="wmapp-submit-button wymupdate">Register</button>';
				if (options.hasCancel) {
					ele += '<button class="wmapp-cancel-button">Back</button>';
				} else if (WMAPP.isApp) {
					ele += '<button class="wmapp-cancel-button"' + ((WMAPP.isApp) ? ' style="display:inline-block;"' : '') + '>Cancel</button>';
				}
				ele += '</fieldset></form>';
			return ele;
		},
		templateHelpers: function() {
			return this.options;
		},
		regions: {
			firstnamelastnameField: '.wmapp-core-registration-first-last-name',
			emailField: '.wmapp-core-registration-email',
			passwordField: '.wmapp-core-registration-password',
			confirmPasswordField: '.wmapp-core-registration-confirm-password',
			tcsField: '.wmapp-core-registration-tcs'

		},

		initialize: function () {
			this.options.layoutId = 'CoreRegistrationTile';
			if (this.model) {
				Backbone.Validation.bind(this);
			}
		},
		events: function() {
			var events = {};
			events["click .wmapp-submit-button"] = "onRegisterButtonClick";
			events['submit #CoreRegistrationTile'] = "onRegisterButtonClick";
			if (this.options.hasCancel) {
				events['click .wmapp-cancel-button'] = "onRegisterCancelButtonClick";
			} else if (WMAPP.isApp) {
				events['click .wmapp-cancel-button'] = "onRegisterCancelAppButtonClick";
			}
			return events;
		},

		onRegisterButtonClick: function (e) {
			WMAPP.Helper.wmAjaxStart($(e.target));
			e.preventDefault();
			e.stopPropagation();

			var emailInput = $("#CoreRegistrationTileEmail");
			var passwordInput = $("#CoreRegistrationTilePassword");

			emailInput.change();
			passwordInput.change();

			this.triggerDelayed('trigger:onRegisterButtonClick', this.model);

			return false;
		},

		onRegisterCancelButtonClick: function(e) {
			WMAPP.Helper.wmAjaxStart($(e.target));
			e.preventDefault();
			e.stopPropagation();
			
			this.triggerDelayed('trigger:onRegisterCancelButtonClick', this.model);
			
			return false;
		},
		
		onRegisterCancelAppButtonClick: function(e) {
			e.preventDefault();
			e.stopPropagation();
			$('.wmapp-login-view').show();
			$('.wmapp-registration-view').hide();			

			return false;
		},		
		
		onRender: function () {

			var memberFieldRegistrationView = new WMAPP.Extension.UserLogin.View.MemberFieldRegistrationView({
				model: this.model.get('_member_id')
			});
			this.firstnamelastnameField.show(memberFieldRegistrationView);

			// Name TextField for domain_record create
			var coreRegistrationTileEmail = new WMAPP.Extension.View.TextField({
				model: this.model,
				fieldId: 'CoreRegistrationTileEmail',
				fieldClass: '',
				fieldType: 'email',
				placeholder: 'Email',
				name: 'email',
				label: 'Email',
				maxlength: 255,
			});

			// Value TextField for domain_record create
			var coreRegistrationTilePassword = new WMAPP.Extension.View.TextField({
				model: this.model,
				fieldId: 'CoreRegistrationTilePassword',
				fieldClass: '',
				fieldType: 'password',
				placeholder: 'Password',
				name: 'password',
				label: 'Password',
				maxlength: 255,
			});

			// Value TextField for domain_record create
			var coreRegistrationTileConfirmPassword = new WMAPP.Extension.View.TextField({
				model: this.model,
				fieldId: 'CoreRegistrationTileConfirmPassword',
				fieldClass: '',
				fieldType: 'password',
				placeholder: 'Confirm Password',
				name: 'confirmPassword',
				label: 'Confirm Password',
				maxlength: 255,
			});

			var siteTCs = WMAPP.isApp ? WMAPP.termsUrl : WMAPP.settings.site_privacy_policy;

			if (siteTCs) {
				// Value CheckBox for domain_record create
				var coreRegistrationTileTCs = new WMAPP.Extension.View.CheckBox({
					model: this.model,
					fieldId: 'CoreRegistrationTileTCs',
					fieldClass: '',
					label: 'I agree to the <a href="' + Backbone.history.location.origin + siteTCs + '" target="_blank"> Terms and Conditions </a>',
					name: 'tc_checked',
				});

				this.tcsField.show(coreRegistrationTileTCs);
			}

			this.emailField.show(coreRegistrationTileEmail);
			this.passwordField.show(coreRegistrationTilePassword);
			this.confirmPasswordField.show(coreRegistrationTileConfirmPassword);

		}
	});

	/**
	 * General login/registration layout view
	 */
	View.UserLoginRegistrationLayout = WMAPP.Extension.View.LayoutView.extend({
		template: function (data) {
			var tmplStr = '<div class="row">' +
				'<div class="wmapp-login-view medium-6 columns"></div>' +
				'<div class="wmapp-registration-view medium-6 columns"></div>' +
				'</div>';
			return tmplStr;
		},

		regions: {
			login: '.wmapp-login-view',
			registration: '.wmapp-registration-view'
		},

		onRender: function () {
			
			var options = {
					model: this.options.modelLogin,
	                autoLogin: this.options.autoLogin,
	                textBefore: this.options.textBefore,
	                textAfter: this.options.textAfter,
	                loginLabel: this.options.loginLabel,
	                passwordLabel: this.options.passwordLabel,
				};
			if (this.options.loginTemplate) {
				options.template = this.options.loginTemplate;
			}

			this.loginView = new WMAPP.Extension.UserLogin.View.LoginView(options);

			var registrationView = new WMAPP.Extension.UserLogin.View.RegistrationView({
				model: this.options.modelRegistration,
                autoLogin: this.options.autoLogin,
                textBefore: this.options.textBefore,
                textAfter: this.options.textAfter,
                loginLabel: this.options.loginLabel,
                passwordLabel: this.options.passwordLabel,
			});

			this.listenTo(this.loginView, 'trigger:onLoginButtonClick', this.onLoginButtonClick);
			this.listenTo(this.loginView, 'trigger:onForgottenButtonClick', this.onForgottenButtonClick);
			this.listenTo(registrationView, 'trigger:onRegisterButtonClick', this.onRegisterButtonClick);

			this.login.show(this.loginView);
			this.registration.show(registrationView);
		},

		modelEvents: {
			'change': 'render'
		},

		onLoginButtonClick: function (e) {
			this.trigger('trigger:onLoginButtonClick', this.options.modelLogin, this.options);
		},

		onRegisterButtonClick: function (e) {
			this.trigger('trigger:onRegisterButtonClick', this.options.modelRegistration, this.options);
		},

		onForgottenButtonClick: function (e) {
			this.trigger('trigger:onForgottenButtonClick', this.options.modelLogin, this.options);
		}
	});

	View.AppUserLoginRegistrationLayout = WMAPP.Extension.View.LayoutView.extend({
		template: function (data) {
			var tmplStr = '<div class="row">' +
				'<div class="wmapp-login-view medium-6 columns"></div>' +
				'<div class="wmapp-registration-view medium-6 columns hide"></div>' +
				'</div>';
			return tmplStr;
		},

		regions: {
			login: '.wmapp-login-view',
			registration: '.wmapp-registration-view'
		},

		onRender: function () {

			this.loginView = new WMAPP.Extension.UserLogin.View.LoginView({
				model: this.options.modelLogin,
                autoLogin: this.options.autoLogin,
                textBefore: this.options.textBefore,
                textAfter: this.options.textAfter,
                loginLabel: this.options.loginLabel,
                passwordLabel: this.options.passwordLabel,
                showCustomForgotten: this.options.showCustomForgotten,
                showCustomRegister: this.options.showCustomRegister,
			});

			var registrationView = new WMAPP.Extension.UserLogin.View.RegistrationView({
				model: this.options.modelRegistration,
                autoLogin: this.options.autoLogin,
                textBefore: this.options.textBefore,
                textAfter: this.options.textAfter,
                loginLabel: this.options.loginLabel,
                passwordLabel: this.options.passwordLabel,
			});

			this.listenTo(this.loginView, 'trigger:onLoginButtonClick', this.onLoginButtonClick);
			this.listenTo(this.loginView, 'trigger:onForgottenButtonClick', this.onForgottenButtonClick);
			this.listenTo(registrationView, 'trigger:onRegisterButtonClick', this.onRegisterButtonClick);

			this.login.show(this.loginView);
			this.registration.show(registrationView);
		},

		modelEvents: {
			'change': 'render'
		},

		onLoginButtonClick: function (e) {
			this.trigger('trigger:onLoginButtonClick', this.options.modelLogin, this.options);
		},

		onRegisterButtonClick: function (e) {
			this.trigger('trigger:onRegisterButtonClick', this.options.modelRegistration, this.options);
		},

		onForgottenButtonClick: function (e) {
			this.trigger('trigger:onForgottenButtonClick', this.options.modelLogin, this.options);
		}
	});	
	
	/**
	 * Forgotten password view
	 */
	View.UserLoginForgottenPasswordLayout = WMAPP.Extension.View.LayoutView.extend({
		template: function (options) {
			var page = window.location;
			var ele = '';
			if(options.forgottenTemplate){
				return options.forgottenTemplate({options: options});
			} else {
				if (options.textBefore) {
	 				ele += '<div>' + options.textBefore + '</div>';
				}			
				ele += '<form action="' + page + '" id="CoreForgottenTile" method="post"><fieldset><legend>Forgotten Password</legend>' +
				'<p>Please enter your email to reset your password.</p>' +
				'<div class="wmapp-form"><div class="wmapp-core-forgotten-email"></div></div>' +
				'<button type="submit" class="wmapp-submit-button wymupdate">Send email</button>' +
				'<button type="submit" class="secondary wmapp-cancel-button"' + ((WMAPP.isApp) ? ' style="display:inline-block;"' : '') + '>Cancel</button></fieldset></form>';
				
				return ele;
			}
		},
		templateHelpers: {
			options: this.options
		},
		regions: {
			emailField: '.wmapp-core-forgotten-email'
		},
		initialize: function () {
			this.options.layoutId = 'CoreForgottenTile';
			if (this.model) {
				Backbone.Validation.bind(this);
			}
		},
		events: {
			"click .wmapp-submit-button": "onSendButtonClick",
			"click .wmapp-cancel-button": "onCancelButtonClick",
			"click .wmapp-core-login" : "onLoginButtonClick",
		},

		onSendButtonClick: function (e) {
			WMAPP.Helper.wmAjaxStart($(e.target));
			e.preventDefault();
			e.stopPropagation();
			this.trigger('trigger:onSendButtonClick', this.model);
		},

		onCancelButtonClick: function (e) {
			WMAPP.Helper.wmAjaxStart($(e.target));
			e.preventDefault();
			e.stopPropagation();
			this.trigger('trigger:onCancelButtonClick');
		},

		onLoginButtonClick: function(e) {
			e.preventDefault();
			e.stopPropagation();
			this.trigger('trigger:onLoginButtonClick');
		},
		
		onRender: function () {
			
			console.log(this.model);

			// Name TextField for domain_record create
			var coreLoginTileEmail = new WMAPP.Extension.View.TextField({
				model: this.model,
				fieldId: 'CoreForgottenTileEmail',
				fieldClass: '',
				fieldType: 'email',
				placeholder: 'Email',
				name: 'email',
				label: 'Email',
				maxlength: 255,
			});

			this.emailField.show(coreLoginTileEmail);
		},
	});


	//---------------------------------GROUP REGISTRATION/ACTIVATION-----------------------------------------

	/**
	 * Group registration view
	 */
	View.GroupRegistrationView = WMAPP.Extension.View.LayoutView.extend({
		template: function (data) {
			var page = window.location;

			var registration_title = data.options.registration_title ? data.options.registration_title : 'Registration';
			var registration_message = data.options.registration_message ? data.options.registration_message : 'Please agree to the Terms and Conditions and click Register to create your account';

			var ele = '<form action="' + page + '" id="GroupRegistrationTile" method="post"><fieldset><legend>' + registration_title + '</legend>' +
				'<p>' + registration_message + '</p>';
			if (data.options.register_automatically) {
				ele += '<div class="wmapp-form">' +
					'<div class="wmapp-group-registration-tcs"></div>' +
					'</div>' +
					'<button type="button" class="wmapp-submit-button wymupdate">Register</button>';
			}

			ele += '</fieldset></form>';
			return ele;
		},

		templateHelpers: function () {
			return {
				model: this.model,
				options: this.options.viewOptions
			}
		},

		regions: {
			tcsField: '.wmapp-group-registration-tcs'
		},

		initialize: function () {
			this.options.layoutId = 'GroupRegistrationTile';
			if (this.model) {
				Backbone.Validation.bind(this);
			}
		},
		events: {
			"click .wmapp-submit-button": "onGroupRegisterButtonClick",
		},

		onGroupRegisterButtonClick: function (e) {
			e.preventDefault();
			//e.stopPropagation();
			this.triggerDelayed('trigger:onGroupRegisterButtonClick', this.model);
		},

		onRender: function () {

			var tcs = '';
			if (this.options.viewOptions) {
				tcs = this.options.viewOptions.terms_and_conditions;
			}

			if (tcs) {
				this.model.set('tc_checked', 0);
				// Value CheckBox for domain_record create
				var groupRegistrationTileTCs = new WMAPP.Extension.View.CheckBox({
					model: this.model,
					fieldId: 'GroupRegistrationTileTCs',
					fieldClass: '',
					label: 'I agree to the <a href="' + Backbone.history.location.origin + '/' + tcs + '" target="_blank"> Terms and Conditions </a>',
					name: 'tc_checked',
				});

				this.tcsField.show(groupRegistrationTileTCs);
			}
		}
	});

	/**
	 * Group account activation view
	 */
	View.GroupActivationView = WMAPP.Extension.View.ItemView.extend({
		template: function (data) {
			var activation_title = data.options.activation_title ? data.options.activation_title : 'Congratulations';
			var activation_message = data.options.activation_message ? data.options.activation_message : 'You have successfully created your account, but it needs to be approved by the administrator.' +
				'We\'ll come back to you shortly.';

			var tmplStr = '<fieldset><legend>' + activation_title +
				'</legend>' + activation_message + '</fieldset>';
			return tmplStr;
		},

		templateHelpers: function () {
			return {
				model: this.model,
				options: this.options.viewOptions
			}
		},
	})
});
