'use strict';

WMAPP.module('Extension.Login', Backbone.Marionette.Module.extend({
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
		WMAPP.Log.getLogger("WMAPP." + this.moduleName).trace("Login Module onStart begin");
		WMAPP.Log.getLogger("WMAPP." + this.moduleName).trace("Login Module onStart end");
	},
	onStop: function () {
		WMAPP.Log.getLogger("WMAPP." + this.moduleName).trace("Login Module onStop begin");
		WMAPP.Log.getLogger("WMAPP." + this.moduleName).trace("Login Module onStop end");
	}
}));

WMAPP.module('Extension.Login.Router', function(Router) {
	Router.LoginsRouter = WMAPP.Extension.Router.AppRouter.extend({
		appRoutes : {
			"reset_password" : "onShowResetPassword"
		},
	});
});

WMAPP.module('Extension.Login.Application', Backbone.Marionette.Module.extend({
	startWithParent: true,
	alertMessage: null,
	successMessage: null,
	notificationMessage: null,
	vent: WMAPP.Extension.Login.getChannel().vent,
	redirect: '/user',
	defaultView: 'login',
    onStop: function() {
        this.stopListening();
    },

	onStart: function() {
		
		
		// declare listeners here
		this.listenTo(this.vent, 'trigger:onShowLogin', this.onShowLogin);
		this.listenTo(this.vent, 'trigger:onLoginButtonClick', this.onLoginButtonClick);
		this.listenTo(this.vent, 'trigger:onLinkedInButtonClick', this.onLinkedInButtonClick);
		this.listenTo(this.vent, 'trigger:onPrivacyPolicyClick', this.onPrivacyPolicyClick);
		this.listenTo(this.vent, 'trigger:onTermsAndConditionsClick', this.onTermsAndConditionsClick);
		this.listenTo(this.vent, 'trigger:onShowRegister', this.onShowRegister);
		this.listenTo(this.vent, 'trigger:onRegisterButtonClick', this.onRegisterButtonClick);
		this.listenTo(this.vent, 'trigger:onRegisterCancelButtonClick', this.onRegisterCancelButtonClick);
		this.listenTo(this.vent, 'trigger:onShowForgotten', this.onShowForgotten);
		this.listenTo(this.vent, 'trigger:onForgottenButtonClick', this.onForgottenButtonClick);
		this.listenTo(this.vent, 'trigger:onCancelForgottenButtonClick', this.onCancelForgottenButtonClick);
		this.listenTo(this.vent, 'trigger:onShowResetPassword', this.onShowResetPassword);
		this.listenTo(this.vent, 'trigger:onResetPasswordButtonClick', this.onResetPasswordButtonClick);
		this.listenTo(this.vent, 'trigger:onCancelResetPasswordButtonClick', this.onCancelResetPasswordButtonClick);		
	},
	
	//---------------------------------GENERAL-----------------------------------------	
	startExtension: function (options) {
		WMAPP.Log.getLogger("WMAPP.Login").trace("Login Module startExtension begin");
		if (options) {			 
			var that = this;
			this.extensionOptions = options;
			if (typeof this.extensionOptions.defaultView == "undefined") {
				this.extensionOptions.defaultView = this.defaultView;
			}
			
			if (typeof this.extensionOptions.redirect != "undefined") {
				this.redirect = this.extensionOptions.redirect;
			}

			// Event listener for LinkedIn Login
			if(typeof(that.extensionOptions.linkedIn) == "undefined"){
				this.extensionOptions.linkedIn = true;
			}
			if (typeof(IN) != "undefined") {
	            IN.Event.on(IN, "auth", function() {
	            	IN.API.Raw("/people/~:(first-name,last-name,id,email-address)").result(function(data) {
	            		if(that.extensionOptions.linkedIn){
	            			WMAPP.Extension.Login.Application.onLinkedInLogin.call(that, data.emailAddress, data.id);
	            		}
	            	}).error(function(error){console.log(error);});
            		IN.User.logout();
	            });
	            IN.Event.on(IN, "logout", function() {
	            	WMAPP.Helper.hideSpinner();
	            });				
			}

			if (this.extensionOptions.region) {
				this.region = this.extensionOptions.region;
				
				if (WMAPP.user && WMAPP.user.id && ((!(WMAPP.user instanceof WMAPP.Core.Model.User) && !WMAPP.user.isAdmin && !WMAPP.user.isGod) || ((WMAPP.user instanceof WMAPP.Core.Model.User) && !WMAPP.user.get('isAdmin') && !WMAPP.user.get('isGod')))) {
					// the user is logged in and they arent an admin or super user
					// we are logged in, 
					if (typeof this.extensionOptions.onUserLoggedIn == "function") {
						this.extensionOptions.onUserLoggedIn();
					} else {
						if (this.extensionOptions.redirect) {
							window.location = this.redirect;
						} else {
							window.location = '/user';
						}
					}
				} else {
					// there's no user, create all the views
					if (this.extensionOptions.userLoginModel) {
						this.userLogin = new this.extensionOptions.userLoginModel();
					} else {
						this.userLogin = new WMAPP.Core.Model.UserLogin();
					}
					if (this.extensionOptions.site)
						this.userLogin.set('site', this.extensionOptions.site);
					if (this.extensionOptions.email)
						this.userLogin.set('email', this.extensionOptions.email);
					if (this.extensionOptions.password)
						this.userLogin.set('password', this.extensionOptions.password);
					if (WMAPP.isSaas) {
						this.userLogin.validation['site'] = {
								required: true,
						};
					}

					// the member/user model
					if (this.extensionOptions.registrationModel) {
						this.user = this.extensionOptions.registrationModel;
						this.member = this.user.get('_member_id');
					} else {
						this.user = new WMAPP.Core.Model.User();
						this.member = new WMAPP.Core.Model.Member();
						var memberValidation = _.clone(this.member.validation);
						var userValidation = _.extend(memberValidation, _.clone(this.user.validation));
						userValidation['password'] = { required: true };
						userValidation['confirm_password'] = { required: true };					
						this.user.validation = userValidation;
						this.user.set('_member_id', this.member);

						// check if terms and conditions are required
						if (WMAPP.settings) {
							var siteTCs = WMAPP.settings.site_privacy_policy;
							if (siteTCs) {
								this.user.set('tc_checked', 0);
							}	
						}
					}
					
					if (WMAPP.isApp) {
						// trigger the auto login if we have all the info
						if (this.extensionOptions.autoLogin) {
							// set the site domain for the global user
							WMAPP.user.set('subdomain', WMAPP.Helper.toSubDomain(userLogin.get('site')));
							WMAPP.domain = WMAPP.Helper.toSubDomain(userLogin.get('site')) + WMAPP.server_tld;

							this.onLoginButtonClick(this.userLogin);
						} else {
							var loginOptions = { model: this.userLogin };
							for (var optKey in this.extensionOptions) {
								if (this.extensionOptions.hasOwnProperty(optKey)) {
									loginOptions[optKey] = this.extensionOptions[optKey];
								}
							}
						}
					}
					
					// set a model for the forgotten password view
					this.forgotUser = new WMAPP.Core.Model.User({
						id: 0,
						email: null,
						password: 'reset',
						reset: true,
						member_id: 0,
					});					
					
					// render the login layout 
					if (this.extensionOptions.extensionLayoutView) {
						this.loginLayoutView = new this.options.extensionOptions.extensionLayoutView({
							modelLogin: this.userLogin,
							modelRegistration: this.user,
							modelForgot: this.forgotUser,
							extensionOptions: this.extensionOptions
						});						
					} else {
						this.loginLayoutView = new WMAPP.Extension.Login.View.ExtensionLayoutView({
							modelLogin: this.userLogin,
							modelRegistration: this.user,
							modelForgot: this.forgotUser,
							extensionOptions: this.extensionOptions
						});
					}
					this.region.show(this.loginLayoutView);
				}
			} else {
				WMAPP.Log.getLogger("WMAPP.Login").trace("LOGIN Module startExtension region required");
			}
		} else {
			WMAPP.Log.getLogger("WMAPP.Login").trace("LOGIN Module startExtension options required");
		}
		WMAPP.Log.getLogger("WMAPP.Login").trace("Login Module startExtension end");
	},

	/**
	 * Login methods
	 */
	onShowLogin: function() {
		// show the login form
		WMAPP.Helper.wmAjaxEnd();
		this.loginLayoutView.showLogin();		
	},
	
	onLoginButtonClick: function (userLogin) {
		WMAPP.Log.getLogger("WMAPP.Login").trace("Login Module onLoginButtonClick begin");
		// clear any errors
		WMAPP.Helper.clearErrors('LoginExtensionLogin');
		
		// a hack for firefox remembering passwords
		if (WMAPP.isSaas) {
			var siteInput = $("#LoginExtensionLoginSite");
		}
		var emailInput = $("#LoginExtensionLoginEmail");
		var passwordInput = $("#LoginExtensionLoginPassword");

		if (WMAPP.isSaas) {
			siteInput.change();
		}
		emailInput.change();
		passwordInput.change();

		// set the site domain for the global user
		if (WMAPP.isSaas) {
			WMAPP.user.set('subdomain', WMAPP.Helper.toSubDomain(this.userLogin.get('site')));
			WMAPP.domain = WMAPP.Helper.toSubDomain(this.userLogin.get('site')) + WMAPP.server_tld;
		}		

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
				if (that.extensionOptions && that.extensionOptions.redirect) {
					window.location = that.extensionOptions.redirect
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
				var eula = new WMAPP.Extension.Login.View.EulaView({
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

		// If directly after a registration will attempt to login
		// But userLogin will not have the details inside user
		// So if the userLogin fields aren't set, but the user ones are, get the details from there
		if ((!this.userLogin.get('email')) && (this.user.get('email'))) {
			this.userLogin.set('email', this.user.get('email'));
		};
		if ((!this.userLogin.get('password')) && (this.user.get('password'))) {
			this.userLogin.set('password', this.user.get('password'));
		};
		if (!this.userLogin.get('site')) {
			this.userLogin.set('site');
		};
		// if user login is pass as a parameter,use the userLogin
		// because some function like regitration pass the userLogin as the parameter, which should be used to login
		if(userLogin) {
			this.userLogin.set('email', userLogin.get('email'));
			this.userLogin.set('password', userLogin.get('password'));
		}

		this.userLogin.validate();

		if (this.userLogin.isValid()) {
			var loginModel = this.userLogin.clone();
			var that = this;

			this.userLogin.remote = true;
			this.userLogin.unset('id', {silent: true});

			// logout first!!
			WMAPP.Helper.showSpinner();

			if (this.userLogin.get('site') && this.userLogin.get('site').indexOf(".") >= 0) {
				WMAPP.domain = this.userLogin.get('site');
				//WMAPP.parent_subdomain = WMAPP.domain.split(".")[0];
				WMAPP.server_tld = WMAPP.domain.replace(/[^.]+/, "");
			}

			if (this.options.customAuthorisation) {
				this.options.customAuthorisation(this.userLogin.get('email'), this.userLogin.get('password')).then(successAuth, failureAuth);
			} else if (WMAPP.isApp) {
				$.ajax({
					type: "get",
					url: (WMAPP.isApp ? ('https://' + WMAPP.domain) : '') + '/feature/core/core/logout',
					dataType: 'json',
					context: this,
					async: true,
				}).then(function () {
					WMAPP.setOnline(true); // we're expected to be online to login!
					var response = this.userLogin.save();
					response.then(function (response) {
						WMAPP.Helper.hideSpinner();
						WMAPP.Helper.wmAjaxEnd();
						if (response.id) {
							// set the user from the response
							WMAPP.user.set(response);
							
							var callback = function() {
								if (typeof WMAPP.afterLoginHandler == "function") {
									WMAPP.afterLoginHandler(that.userLogin, callback2);
								} else {
									callback2();
								}
							};
							
							var callback2 = function() {
								WMAPP.Log.getLogger("WMAPP.Login").trace("callback2");
								if (WMAPP.isApp) {
									WMAPP.vent.trigger('trigger:login:success');
								} else {
									WMAPP.Helper.showSpinner();
									if (that.redirect) {
										window.location = that.redirect
									}
								}
							};
							
							if (WMAPP.registerSns && typeof cordova != 'undefined' && window.device) {
								WMAPP.Extension.SNS.registerEndpoint(that.userLogin.get('_member').id, WMAPP.Helper.slugify((that.userLogin.get('site') ? this.userLogin.get('site') : WMAPP.site).replace(/\s/g, ''))).then(callback, callback);
								WMAPP.Log.getLogger("WMAPP.Login").trace("Finished registering sns");
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
							var eula = new WMAPP.Extension.Login.View.EulaView({
								eula: response.responseJSON.eula,
								callback: function() {
									this.userLogin.set('accepted_eula', 1);
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
				var response = this.userLogin.save();
				response.then(function (response) {
					WMAPP.Helper.hideSpinner();
					WMAPP.Helper.wmAjaxEnd();

					if (response.id) {
						WMAPP.Helper.showSpinner();
						if (typeof WMAPP.afterLoginHandler === "function") {
							WMAPP.afterLoginHandler(that.userLogin, callback2);
						} else {
							callback2();
						}
						if (that.redirect) {
							if (that.redirect.models && that.redirect.models.length) {
								// go through each of the users groups and see where we need to redirect to
								var redirect = _.find(that.redirect.models, function(r) {
									if (r.get('group') == 0) {
										return true;
									} else {
										var group = _.find(that.userLogin.get('_groups'), function(g) {
											return WMAPP.Helper.compareIds(g.id, r.get('group'));
										});
										if (group) {
											return true;
										}
									}
									return false;
								});							

								if (typeof redirect != "undefined" && typeof redirect.get('_redirect') != "undefined") {
									window.location = '/' + redirect.get('_redirect').get('slug')
								} else {
									window.location = '/user';
								}								
							} else {
								window.location = that.redirect;
							}
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
						var eula = new WMAPP.Extension.Login.View.EulaView({
							eula: response.responseJSON.eula,
							callback: function() {
								this.userLogin.set('accepted_eula', 1);
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
						if (that.extensionOptions.onLoginFailed !== null && typeof that.extensionOptions.onLoginFailed === 'function') {
                        	that.extensionOptions.onLoginFailed();
						}
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
		WMAPP.Log.getLogger("WMAPP.Login").trace("Login Module onLoginButtonClick end");
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
			if (that.redirect.models && that.redirect.models.length) {
				// go through each of the users groups and see where we need to redirect to
				var redirect = _.find(that.redirect.models, function(r) {
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
	
	onLinkedInButtonClick: function() {
		var that = this;
		var scopes = ['r_basicprofile', 'r_emailaddress'];
		cordova.plugins.LinkedIn.login(scopes,false,function(success) {
			  // get connections
			cordova.plugins.LinkedIn.getRequest('people/~:(first-name,last-name,id,email-address)', function(data){
					WMAPP.Extension.Login.Application.onLinkedInLogin(data.emailAddress, data.id); 
					
	    		}, function(model, response, options) {
	        		WMAPP.Helper.showMessage('alert', "Error ("+response.status+"): " + response.statusText);
	        	});
			
		}, function(error){
			WMAPP.Helper.showMessage('alert', error);		
	  	});	
		WMAPP.Helper.hideSpinner();		
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
				if (WMAPP.isApp) {
					WMAPP.user.set(model);
					WMAPP.vent.trigger('trigger:login:success');
				} else {
					if (that.extensionOptions && that.extensionOptions.redirect) {
						// go through each of the users groups and see where we need to redirect to
						var redirect = _.find(that.extensionOptions.redirect.models, function(r) {
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
	
	/**
	 * Registration handling
	 */
	onShowRegister: function() {
		// show the register form
		this.loginLayoutView.showRegistration();		
	},
	
	onRegisterButtonClick: function () {
		WMAPP.Log.getLogger("WMAPP.Login").trace("Login Module onRegisterButtonClick begin");
		WMAPP.Helper.clearErrors('LoginExtensionRegistration');
		
		var emailInput = $("#LoginExtensionRegistrationEmail");
		var passwordInput = $("#LoginExtensionRegistrationPassword");

		emailInput.change();
		passwordInput.change();		

		var tc_checked = this.user.get('tc_checked');
		// TODO active?
		this.user.set('exported', 0);

		var member = this.user.get('_member_id');
		member.set('email', this.user.get('email'));
		member.set('firstname', this.user.get('firstname'));
		member.set('lastname', this.user.get('lastname'));

		// Check site settings to see if the site requires account confirmation
		if(WMAPP.settings && (parseInt(WMAPP.settings.register_status, 10) != 0)) {
			this.user.set('active', 0);
			member.set('active', 0);
		} else {
			this.user.set('active', 1);
			member.set('active', 1);
		}

		this.user.validate();
		if (this.user.isValid()) {
			if (this.user.get('password') === this.user.get('confirm_password')) {
				var tcs = this.user.get('tc_checked');
				if (tcs != 0) {
					var that = this;
					this.user.remote = true;
					this.user.local = false;
					var response = this.user.save({}, {
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
								WMAPP.Helper.wmAjaxEnd();
								WMAPP.Extension.Login.View.vent.trigger('trigger:onShowLogin');
								
								// Else if confirmation is required
								WMAPP.Helper.showMessage('success', "Thank you for registering! An email will be sent to your account shortly");
							}
						},
						error: function (model, response) {
							if (response.responseJSON) {
								if (response.responseJSON.message) {
									if (response.responseJSON.errors && (Object.keys(response.responseJSON.errors).length > 0)) {
										WMAPP.Helper.showMessage('error', Object.values(response.responseJSON.errors).join('<br />'));
									} else {
										WMAPP.Helper.showMessage('error', response.responseJSON.message);
									}
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
				this.user.set('password', '');
				this.user.set('confirmPassword', '');
				WMAPP.Helper.wmAjaxEnd();
			}

		} else {
			WMAPP.Helper.showMessage('alert', 'Please check your form!');
			WMAPP.Helper.wmAjaxEnd();
		}
		WMAPP.Log.getLogger("WMAPP.Login").trace("Login Module onRegisterButtonClick end");
	},
	
	onRegisterCancelButtonClick: function() {
		// show the register form
		WMAPP.Helper.wmAjaxEnd();
		this.loginLayoutView.showLogin();		
	},

	onTryItNowButtonClick: function() {
		var that = this;

		WMAPP.Log.getLogger("WMAPP.Login").trace("Login Module onTryItNowButtonClick begin");
		WMAPP.Helper.clearErrors('LoginExtensionRegistration');

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
	 * Checks additional options after the user has logged in
	 */
	onUserLoggedIn: function () {
		WMAPP.Log.getLogger("WMAPP.Login").trace("Login Module onUserLoggedIn begin");
		// TODO hardcoded groups
		if (this.checkUserGroups()) {
			// if the user is logged in and in groups
			var activationAttribute = 1;
			if (this.extensionOptions && this.extensionOptions.activation_attribute && this.extensionOptions.model) {
				activationAttribute = this.extensionOptions.model.get(this.extensionOptions.activation_attribute);
			}

			if (!activationAttribute) {
				// if activation is required
				var groupActivationView = new WMAPP.Extension.Login.View.GroupActivationView({
					extensionOptions: this.extensionOptions,
				});

				this.region.show(groupActivationView);
			} else {
				// if no activation is required or something went wrong
				if (this.extensionOptions && this.extensionOptions.redirect) {
					window.location = this.extensionOptions.redirect
				} else {
					this.vent.trigger('trigger:userLogin:onUserLoggedInAndInGroups');
				}
			}
		} else {
			this.vent.trigger('trigger:userLogin:onUserLoggedInAndNotInGroups');

			// if the user is logged in and not in groups
			// create group-specific registration views
			if (this.extensionOptions && this.extensionOptions.model) {
				var model = this.extensionOptions.model
			}

			var groupRegistrationView = new WMAPP.Extension.Login.View.GroupRegistrationView({
				extensionOptions: this.extensionOptions,
				model: model
			});

			this.listenTo(groupRegistrationView, 'trigger:onGroupRegisterButtonClick', this.onGroupRegisterButtonClick);
			this.region.show(groupRegistrationView);
		}
		WMAPP.Log.getLogger("WMAPP.Login").trace("Login Module onUserLoggedIn end");
	},

	onPrivacyPolicyClick: function () {
		window.open(WMAPP.privacyUrl, "_system");
	},

	onTermsAndConditionsClick: function () {
		window.open(WMAPP.termsUrl, "_system");
	},	
	
	onShowForgotten: function () {
		// show the login form
		WMAPP.Helper.wmAjaxEnd();
		this.loginLayoutView.showForgottenPassword();
	},

	onForgottenButtonClick: function () {
		//avoid local db execution when not login
		if (WMAPP.isApp) {
			this.forgotUser.remote = true;
			this.forgotUser.local = false;
		}
		
		//model.validation
		this.forgotUser.validate();
		if (this.forgotUser.isValid()) {
			var that = this;
			var response = this.forgotUser.save({}, {
				success: function (model, response) {
					WMAPP.Helper.showMessage('success', response.message);
					WMAPP.Helper.wmAjaxEnd();
					WMAPP.Extension.Login.View.vent.trigger('trigger:onShowLogin');
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
		// show the login form
		WMAPP.Helper.wmAjaxEnd();
		this.loginLayoutView.showLogin();
	},

	onResetPasswordButtonClick: function() {
		//avoid local db execution when not login
		WMAPP.Helper.clearErrors('LoginExtensionResetPassword');
		
		if (WMAPP.isApp) {
			this.forgotUser.remote = true;
			this.forgotUser.local = false;
		}
		
		//model.validation
		this.forgotUser.validate();
		if (this.forgotUser.isValid()) {
			var that = this;
			var response = this.forgotUser.save({}, {
				success: function (model, response) {
					WMAPP.Helper.showMessage('success', response.message);
					WMAPP.Helper.wmAjaxEnd();
					WMAPP.Extension.Login.View.vent.trigger('trigger:onShowLogin');
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
	
	onCancelResetPasswordButtonClick: function() {
		// show the login form
		WMAPP.Helper.wmAjaxEnd();
		this.loginLayoutView.showLogin();			
	}	
	
}));

WMAPP.module('Extension.Login.View', function (View) {
	View.vent = WMAPP.Extension.Login.getChannel().vent;

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
	 * Layout view
	 */
	View.ExtensionLayoutView = WMAPP.Extension.View.LayoutView.extend({
		template: function (data) {
			var options = data.options;
			var tmplStr = '';
			tmplStr += '<div class="wmapp-core-login-extension-login-view"></div>';
			tmplStr += '<div class="wmapp-core-login-extension-registration-view"></div>';
			tmplStr += '<div class="wmapp-core-login-extension-forgotten-password-view"></div>';
			tmplStr += '<div class="wmapp-core-login-extension-reset-password-view"></div>';
			return tmplStr;
		},
		regions: {
			loginRegion: '.wmapp-core-login-extension-login-view',
			registerRegion: '.wmapp-core-login-extension-registration-view',
			forgottenPasswordRegion: '.wmapp-core-login-extension-forgotten-password-view',
			resetPasswordRegion: '.wmapp-core-login-extension-reset-password-view',
		},		
		onRender: function () {
			// check if we are trying to reset our password
			if (window.location.pathname.includes("/reset_password")) {
				this.$el.find('.wmapp-core-login-extension-registration-view').hide();
				this.$el.find('.wmapp-core-login-extension-forgotten-password-view').hide();
				this.$el.find('.wmapp-core-login-extension-login-view').hide();				
				
				var queryParams = WMAPP.Helper.parseQueryString(window.location.search.substr(1));
				this.options.modelForgot.set('confirm_reset', true);
				this.options.modelForgot.unset('reset');
				if (queryParams.hash && queryParams.email) {
					this.options.modelForgot.set('email', queryParams.email);
					this.options.modelForgot.set('hash', queryParams.hash);
					
					var userValidation = _.clone(this.options.modelForgot.validation);
					userValidation['password'] = { required: true, passwords: true };
					userValidation['confirm_password'] = { required: true };
					this.options.modelForgot.validation = userValidation;
					
					if (this.options.extensionOptions.resetPasswordView) {	
						this.resetPasswordView = new this.options.extensionOptions.resetPasswordView({
							model: this.options.modelForgot,
							extensionOptions: this.options.extensionOptions
						});				
					} else {
						this.resetPasswordView = new WMAPP.Extension.Login.View.ResetPasswordView({
							model: this.options.modelForgot,
							extensionOptions: this.options.extensionOptions
						});
					}		

					this.resetPasswordRegion.show(this.resetPasswordView);
				} else {
					WMAPP.alert('Invalid URL!');
					//window.location.href = '/';
				}	
			} else {
				this.$el.find('.wmapp-core-login-extension-login-view').hide();
				this.$el.find('.wmapp-core-login-extension-registration-view').hide();
				this.$el.find('.wmapp-core-login-extension-forgotten-password-view').hide();
				this.$el.find('.wmapp-core-login-extension-reset-password-view').hide();				
				if (this.options.extensionOptions.defaultView == 'forgotten') {
					this.$el.find('.wmapp-core-login-extension-forgotten-password-view').show();
				} else if (this.options.extensionOptions.defaultView == 'register') {
					this.$el.find('.wmapp-core-login-extension-registration-view').show();
				} else {
					this.$el.find('.wmapp-core-login-extension-login-view').show();
				}
			}
			
			// render the login view
			if (this.options.extensionOptions.loginView) {
				this.loginView = new this.options.extensionOptions.loginView({
					model: this.options.modelLogin,
					extensionOptions: this.options.extensionOptions
				});				
			} else {
				this.loginView = new WMAPP.Extension.Login.View.LoginView({
					model: this.options.modelLogin,
					extensionOptions: this.options.extensionOptions
				});				
			}
			this.loginRegion.show(this.loginView);

			// render the register view if registration is enabled
			if (WMAPP.settings && parseInt(WMAPP.settings.register_enable, 10) == 1) {
				if (this.options.extensionOptions.registrationView) {
					this.registerView = new this.options.extensionOptions.registrationView({
						model: this.options.modelRegistration,
						extensionOptions: this.options.extensionOptions
					});
				} else {
					this.registerView = new WMAPP.Extension.Login.View.RegistrationView({
						model: this.options.modelRegistration,
						extensionOptions: this.options.extensionOptions
					});
				}
				this.registerRegion.show(this.registerView);
			}
			
			// render the forgotten password view
			if (this.options.extensionOptions.forgottenView) {	
				this.forgottenPasswordView = new this.options.extensionOptions.forgottenView({
					model: this.options.modelForgot,
					extensionOptions: this.options.extensionOptions
				});				
			} else {
				this.forgottenPasswordView = new WMAPP.Extension.Login.View.ForgottenPassword({
					model: this.options.modelForgot,
					extensionOptions: this.options.extensionOptions
				});
			}
			this.forgottenPasswordRegion.show(this.forgottenPasswordView);			
		},
		
		events: function() {
			var events = {
				"click .wmapp-login-extension-submit-login": "onLoginButtonClick",
				"submit #LoginExtensionLogin": "onLoginButtonClick",
				"click .wmapp-login-extension-linkedin": "onLinkedInButtonClick",
				"click .wmapp-login-extension-try-now": "onTryItNowButtonClick",
				"click .wmapp-login-extension-submit-register": "onRegisterButtonClick",
				"submit #LoginExtensionRegister": "onRegisterButtonClick",
				"click .wmapp-login-extension-cancel-register": "onRegisterCancelButtonClick",				
				"click .wmapp-login-extension-submit-forgotten": "onForgottenButtonClick",
				"submit #LoginExtensionForgotten": "onForgottenButtonClick",
				"click .wmapp-login-extension-cancel-forgotten": "onCancelForgottenButtonClick",
				"click .wmapp-login-extension-submit-reset-password": "onResetPasswordButtonClick",
				"submit #LoginExtensionResetPassword": "onResetPasswordButtonClick",
				"click .wmapp-login-extension-cancel-reset-password": "onCancelResetPasswordButtonClick",				
				"click .wmapp-login-extension-login": "onShowLogin",
				"click .wmapp-login-extension-register": "onShowRegister",
				"click .wmapp-login-extension-forgotten-password": "onShowForgotten",
			};
			return events;
		},

		onLoginButtonClick: function (e) {
			e.preventDefault();
			e.stopPropagation();
			WMAPP.Extension.Login.View.vent.trigger('trigger:onLoginButtonClick');
			return false;
		},
		onLinkedInButtonClick: function(e){
			e.preventDefault();
			e.stopPropagation();	
			WMAPP.Extension.Login.View.vent.trigger('trigger:onLinkedInButtonClick');
		},		
		onTryItNowButtonClick: function (e) {
			e.preventDefault();
			e.stopPropagation();
			WMAPP.Extension.Login.View.vent.trigger('trigger:onTryItNowButtonClick');
		},

		onRegisterButtonClick: function (e) {
			WMAPP.Helper.wmAjaxStart($(e.target));
			e.preventDefault();
			e.stopPropagation();			
			WMAPP.Extension.Login.View.vent.trigger('trigger:onRegisterButtonClick', this.model);
		},
		onRegisterCancelButtonClick: function(e) {
			e.preventDefault();
			e.stopPropagation();
			WMAPP.Extension.Login.View.vent.trigger('trigger:onRegisterCancelButtonClick', this.model);
		},
		
		onForgottenButtonClick: function (e) {
			WMAPP.Helper.wmAjaxStart($(e.target));
			e.preventDefault();
			e.stopPropagation();
			WMAPP.Extension.Login.View.vent.trigger('trigger:onForgottenButtonClick', this.model);
		},
		onCancelForgottenButtonClick: function (e) {
			e.preventDefault();
			e.stopPropagation();
			WMAPP.Extension.Login.View.vent.trigger('trigger:onCancelForgottenButtonClick');
		},	
		
		onResetPasswordButtonClick: function (e) {
			WMAPP.Helper.wmAjaxStart($(e.target));
			e.preventDefault();
			e.stopPropagation();
			WMAPP.Extension.Login.View.vent.trigger('trigger:onResetPasswordButtonClick', this.model);
		},
		onCancelResetPasswordButtonClick: function (e) {
			e.preventDefault();
			e.stopPropagation();
			WMAPP.Extension.Login.View.vent.trigger('trigger:onCancelResetPasswordButtonClick');
		},			
		
		onShowLogin: function(e) {
			e.preventDefault();
			e.stopPropagation();
			WMAPP.Extension.Login.View.vent.trigger('trigger:onShowLogin');
		},		
		onShowRegister: function (e) {
			e.preventDefault();
			e.stopPropagation();
			WMAPP.Extension.Login.View.vent.trigger('trigger:onShowRegister');
		},		
		onShowForgotten: function(e) {
            e.preventDefault();
            e.stopPropagation();
            WMAPP.Extension.Login.View.vent.trigger('trigger:onShowForgotten');
        },
		onShowResetPassword: function(e) {
            e.preventDefault();
            e.stopPropagation();
            WMAPP.Extension.Login.View.vent.trigger('trigger:onShowResetPassword');
        },         
		onPrivacyPolicyClick: function (e) {
			e.preventDefault();
			WMAPP.Extension.Login.View.vent.trigger('trigger:onPrivacyPolicyClick', this.model);
		},
		onTermsAndConditionsClick: function (e) {
			e.preventDefault();
			WMAPP.Extension.Login.View.vent.trigger('trigger:onPrivacyPolicyClick', this.model);
		},		
		
		showLogin: function() {
			this.$el.find('.wmapp-core-login-extension-login-view').show();
			this.$el.find('.wmapp-core-login-extension-registration-view').hide();
			this.$el.find('.wmapp-core-login-extension-forgotten-password-view').hide();
			this.$el.find('.wmapp-core-login-extension-reset-password-view').hide();
		},
		showRegistration: function() {
			this.$el.find('.wmapp-core-login-extension-login-view').hide();
			this.$el.find('.wmapp-core-login-extension-registration-view').show();
			this.$el.find('.wmapp-core-login-extension-forgotten-password-view').hide();			
		},
		showForgottenPassword: function() {
			this.$el.find('.wmapp-core-login-extension-login-view').hide();
			this.$el.find('.wmapp-core-login-extension-registration-view').hide();
			this.$el.find('.wmapp-core-login-extension-forgotten-password-view').show();			
		},
		showResetPassword: function() {
			this.$el.find('.wmapp-core-login-extension-login-view').hide();
			this.$el.find('.wmapp-core-login-extension-registration-view').hide();
			this.$el.find('.wmapp-core-login-extension-forgotten-password-view').hide();
			this.$el.find('.wmapp-core-login-extension-reset-password-view').show();		
		},		
	});


	/**
	 * Login view
	 */
	View.LoginView = WMAPP.Extension.Login.View.ExtensionLayoutView.extend({
		initialize: function () {
			var that = this;
			this.options.layoutId = 'LoginExtensionLogin';
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
		template: function (data) {
			var options = data.options;
			var page = window.location.pathname;
			if (options.loginTemplate) {
				return options.loginTemplate(data);
			} else {
				var tmplStr = '<form action="' + page + '" id="LoginExtensionLogin" method="post"><fieldset><legend>Login</legend>';
	
				if (WMAPP.isApp && WMAPP.logoImage) {
					tmplStr += '<img class="logo" src="' + WMAPP.logoImage + '" />';
				}

				tmplStr += '<div><p>Please enter your details below to login.</p></div>';
				tmplStr += '<div class="wmapp-form">';
				
				if (WMAPP.isSaas) {
					tmplStr += '<div class="wmapp-login-extension-site"></div>';
				}
				
				tmplStr += '<div class="wmapp-login-extension-email"></div>';
				tmplStr += '<div class="wmapp-login-extension-password"></div>';
				tmplStr += '</div>';
				
				tmplStr += '<button type="submit" class="wmapp-login-extension-submit-login">Login</button>';
				if(typeof cordova != 'undefined' && typeof(cordova.plugins.LinkedIn)!= "undefined"){
					tmplStr += '<button type="submit" class="wmapp-button wmapp-login-extension-linkedin">Sign in with LinkedIn</button>';
				}
				if (WMAPP.isApp && typeof(facebookConnectPlugin) != "undefined") {
					tmplStr += '<button type="button" class="wmapp-button wmapp-facebook-button">Sign in with Facebook</button>';
				}
				if (WMAPP.settings && parseInt(WMAPP.settings.register_enable, 10) == 1) {
					tmplStr += '<button type="button" class="wmapp-button wmapp-login-extension-register">Register</button>';
				}
				tmplStr += '<button type="button" class="wmapp-button wmapp-login-extension-forgotten-password">Forgotten Password?</button>';				

				if (WMAPP.isApp) {
					if (WMAPP.version) {
						tmplStr += '<div class="wmapp-app-version">v' + WMAPP.version + (WMAPP.build ? (' (' + WMAPP.build + ')') : '') + '</div>';
					}
				}
				
				tmplStr += '</fieldset></form>';
	
				return tmplStr;
			}
		},
		templateHelpers: function () {
			return {
				model: this.model,
				options: this.options
			}
		},
		regions: {
			siteField: '.wmapp-login-extension-site',
			emailField: '.wmapp-login-extension-email',
			passwordField: '.wmapp-login-extension-password',
		},
		ui: {
			siteField: '#LoginExtensionSite',
			emailField: '#LoginExtensionEmail',
			passwordField: '#LoginExtensionPassword',
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
					fieldId: 'LoginExtensionLoginSite',
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
				fieldId: 'LoginExtensionLoginEmail',
				fieldClass: '',
				fieldType: 'email',
                placeholder: this.options.extensionOptions.loginLabel || 'Email',
				name: 'email',
                label: this.options.extensionOptions.loginLabel,
				maxlength: 255,
				autocomplete: 'on'
			});

			// Password TextField for user login create
			var coreLoginTilePassword = new WMAPP.Extension.View.TextField({
				model: this.model,
				fieldId: 'LoginExtensionLoginPassword',
				fieldClass: '',
				fieldType: 'password',
                placeholder: this.options.extensionOptions.passwordLabel || 'Password',
				name: 'password',
                label: this.options.extensionOptions.passwordLabel,
				maxlength: 255,
				autocomplete: 'on'
			});

			if (WMAPP.isSaas) {
				this.siteField.show(coreLoginTileSite);
			}
			this.emailField.show(coreLoginTileEmail);
			this.passwordField.show(coreLoginTilePassword);

			if (this.options.extensionOptions.autoLogin) {
				this.$el.find('.wmapp-submit-button').trigger('click');
			}
		},
	});

	/**
	 * General user registration view
	 */
	View.RegistrationView = WMAPP.Extension.Login.View.ExtensionLayoutView.extend({
		template: function (options) {
			var page = window.location;
			var tmplStr = '<form action="' + page + '" id="LoginExtensionRegister" method="post"><fieldset><legend>Registration</legend>' +
				'<p>Please register below.</p>' +
				'<div class="wmapp-form">' +
				'<div class="wmapp-login-extension-first-name"></div>' +
				'<div class="wmapp-login-extension-last-name"></div>' +
				'<div class="wmapp-login-extension-email"></div>' +
				'<div class="wmapp-login-extension-password"></div>' +
				'<div class="wmapp-login-extension-confirm-password"></div>' +
				'<div class="wmapp-login-extension-tcs"></div>' +
				'</div>';
				tmplStr += '<button type="submit" class="wmapp-button wmapp-login-extension-submit-register">Register</button>';
				tmplStr += '<button type="button" class="wmapp-button wmapp-login-extension-login">Login</button>';
				tmplStr += '<button type="button" class="wmapp-button wmapp-login-extension-forgotten-password">Forgotten Password?</button>';
				tmplStr += '</fieldset></form>';
			return tmplStr;
		},
		templateHelpers: function() {
			return this.options;
		},
		regions: {
			firstnameField: '.wmapp-login-extension-first-name',
			lastnameField: '.wmapp-login-extension-last-name',
			emailField: '.wmapp-login-extension-email',
			passwordField: '.wmapp-login-extension-password',
			confirmPasswordField: '.wmapp-login-extension-confirm-password',
			tcsField: '.wmapp-login-extension-tcs'
		},

		initialize: function () {
			this.options.layoutId = 'LoginExtensionRegistration';
			if (this.model) {
				Backbone.Validation.bind(this);
			}
		},
				
		onRender: function () {

			// first name 
			this.firstnameView = new WMAPP.Extension.View.TextField({
				model: this.model,
				fieldId: 'LoginExtensionRegistrationFirstname',
				fieldClass: '',
				fieldType: 'text',
				placeholder: 'First Name',
				name: 'firstname',
				label: 'First Name',
				maxlength: 255,
			});
			
			// first name 
			this.lastnameView = new WMAPP.Extension.View.TextField({
				model: this.model,
				fieldId: 'LoginExtensionRegistrationLastname',
				fieldClass: '',
				fieldType: 'text',
				placeholder: 'Last Name',
				name: 'lastname',
				label: 'Last Name',
				maxlength: 255,
			});			

			// email textfield
			this.emailView = new WMAPP.Extension.View.TextField({
				model: this.model,
				fieldId: 'LoginExtensionRegistrationEmail',
				fieldClass: '',
				fieldType: 'email',
				placeholder: 'Email',
				name: 'email',
				label: 'Email',
				maxlength: 255,
			});

			// password 
			this.passwordView = new WMAPP.Extension.View.TextField({
				model: this.model,
				fieldId: 'LoginExtensionRegistrationPassword',
				fieldClass: '',
				fieldType: 'password',
				placeholder: 'Password',
				name: 'password',
				label: 'Password',
				maxlength: 255,
			});

			// confirm password
			this.confirmPasswordView = new WMAPP.Extension.View.TextField({
				model: this.model,
				fieldId: 'LoginExtensionRegistrationConfirmPassword',
				fieldClass: '',
				fieldType: 'password',
				placeholder: 'Confirm Password',
				name: 'confirm_password',
				label: 'Confirm Password',
				maxlength: 255,
			});

			var siteTCs = WMAPP.isApp ? WMAPP.termsUrl : WMAPP.settings.site_privacy_policy;
			if (siteTCs) {
				// Value CheckBox for domain_record create
				this.tcsView = new WMAPP.Extension.View.CheckBox({
					model: this.model,
					fieldId: 'LoginExtensionRegistrationTCs',
					fieldClass: '',
					label: 'I agree to the <a href="' + Backbone.history.location.origin + siteTCs + '" target="_blank"> Terms and Conditions </a>',
					name: 'tc_checked',
				});

				this.tcsField.show(this.tcsView);
			}

			this.firstnameField.show(this.firstnameView);
			this.lastnameField.show(this.lastnameView);
			this.emailField.show(this.emailView);
			this.passwordField.show(this.passwordView);
			this.confirmPasswordField.show(this.confirmPasswordView);

		}
	});
	
	/**
	 * Forgotten password view
	 */
	View.ForgottenPassword = WMAPP.Extension.Login.View.ExtensionLayoutView.extend({
		initialize: function () {
			this.options.layoutId = 'LoginExtensionForgotten';
			if (this.model) {
				Backbone.Validation.bind(this);
			}
		},	
		
		template: function (options) {
			var page = window.location;
			var tmplStr = '';
			if (options.textBefore) {
 				tmplStr += '<div>' + options.textBefore + '</div>';
			}			
			tmplStr += '<form action="' + page + '" id="LoginExtensionForgotten" method="post"><fieldset><legend>Forgotten Password</legend>' +
			'<p>Please enter your email to reset your password.</p>' +
			'<div class="wmapp-form"><div class="wmapp-login-extension-email"></div></div>' +
			'<button type="submit" class="wmapp-login-extension-submit-forgotten">Send</button>' +
			'<button type="submit" class="wmapp-login-extension-login">Login</button>' +
			'<button type="submit" class="wmapp-login-extension-register">Register</button></fieldset></form>';
			
			return tmplStr;
		},
		
		templateHelpers: {
			options: this.options
		},
		
		regions: {
			emailField: '.wmapp-login-extension-email'
		},

		onRender: function () {
			// Name TextField for domain_record create
			this.emailView = new WMAPP.Extension.View.TextField({
				model: this.model,
				fieldId: 'LoginExtensionForgottenEmail',
				fieldClass: '',
				fieldType: 'email',
				placeholder: 'Email',
				name: 'email',
				label: 'Email',
				maxlength: 255,
			});

			this.emailField.show(this.emailView);
		},
	});
	
	/**
	 * General reset password view
	 */
	View.ResetPasswordView = WMAPP.Extension.Login.View.ExtensionLayoutView.extend({
		template: function (options) {
			var page = window.location;
			var tmplStr = '<form action="' + page + '" id="LoginExtensionResetPassword" method="post"><fieldset><legend>Change Password</legend>' +
				'<p>Please enter your new password below.</p>' +
				'<div class="wmapp-form">' +
				'<div class="wmapp-login-extension-hash"></div>' +
				'<div class="wmapp-login-extension-email"></div>' +
				'<div class="wmapp-login-extension-password"></div>' +
				'<div class="wmapp-login-extension-confirm-password"></div>' +
				'</div>';
				tmplStr += '<button type="submit" class="wmapp-button wmapp-login-extension-submit-reset-password">Change Password</button>';
				tmplStr += '<button type="button" class="wmapp-button wmapp-login-extension-cancel-reset-password">Cancel</button>';
				tmplStr += '</fieldset></form>';
			return tmplStr;
		},
		templateHelpers: function() {
			return this.options;
		},
		regions: {
			hashField: '.wmapp-login-extension-hash',
			emailField: '.wmapp-login-extension-email',
			passwordField: '.wmapp-login-extension-password',
			confirmPasswordField: '.wmapp-login-extension-confirm-password',
		},

		initialize: function () {
			this.options.layoutId = 'LoginExtensionResetPassword';
			if (this.model) {
				Backbone.Validation.bind(this);
			}
		},
				
		onRender: function () {

			// hash 
			this.hashView = new WMAPP.Extension.View.HiddenField({
				model: this.model,
				fieldId: 'LoginExtensionRegistrationHash',
				fieldClass: '',
				fieldType: 'text',
				name: 'hash',
				maxlength: 255,
			});			

			// email textfield
			this.emailView = new WMAPP.Extension.View.HiddenField({
				model: this.model,
				fieldId: 'LoginExtensionResetPasswordEmail',
				fieldClass: '',
				fieldType: 'text',
				name: 'email',
				maxlength: 255,
			});

			// password 
			this.passwordView = new WMAPP.Extension.View.TextField({
				model: this.model,
				fieldId: 'LoginExtensionResetPasswordPassword',
				fieldClass: '',
				fieldType: 'password',
				placeholder: 'Password',
				name: 'password',
				label: 'Password',
				maxlength: 255,
			});

			// confirm password
			this.confirmPasswordView = new WMAPP.Extension.View.TextField({
				model: this.model,
				fieldId: 'LoginExtensionResetPasswordConfirmPassword',
				fieldClass: '',
				fieldType: 'password',
				placeholder: 'Confirm Password',
				name: 'confirm_password',
				label: 'Confirm Password',
				maxlength: 255,
			});

			this.emailField.show(this.emailView);
			this.hashField.show(this.hashView);
			this.passwordField.show(this.passwordView);
			this.confirmPasswordField.show(this.confirmPasswordView);

		}
	});	
});
