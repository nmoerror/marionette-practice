'use strict';

WMAPP.module('Extension.Chat', Backbone.Marionette.Module.extend({
	// This module should be manually started, as it is quite intensive
	startWithParent: false,
	onStart: function() {
		var that = this;
		
		this._channel = Backbone.Wreqr.radio.channel('WMAPP.' + this.moduleName);
		this.vent = this._channel.vent;
		
		this.currentChannel = null;
		this.currentParticipant = null;
		
		var textarea = new $('<div><textarea></textarea></div>');
		this.simplemde = new SimpleMDE({
			element: textarea.find('textarea')[0],
			autoDownloadFontAwesome: false,
			indentWithTabs: true,
			lineWrapping: false,
			tabSize: 4,
		});
		
		this.emojiSpriteSheet = new Image();
		this.emojiSpriteSheet.src = WMAPP.getAppRoot() + 'img/emojis.png';
		this.emojiSpriteCategories = {};
		
		if (window.EmojiSpriteConfig) {
			this.loadEmojiSpiteCategories();
		} else {
			$.get(WMAPP.getAppRoot() + (WMAPP.isApp ? 'js/lib/vendor/emojis.js' : 'js/vendor/emojis.js')).then(function(response) {
				eval(response);
				that.loadEmojiSpiteCategories.call(that);
			});
		}
	},
	show: function(options) {
		this.options = options;
		
		this.currentParticipant = this.options.currentParticipant;
		
		if (!this.options.currentParticipant.id) {
			this.options.fetchCurrentParticipant();
		}
		
		this.chatView = new WMAPP.Extension.Chat.View.ChatLayoutView({
			vent: this.vent,
			simplemde : this.simplemde,
			initialChannel: options.initialChannel,
			
			emojiCategories: this.emojiSpriteCategories,
			emojiSpriteSheet: this.emojiSpriteSheet.src,
			
			currentParticipant: this.options.currentParticipant,
			
			recentChannelLabel: this.options.recentChannelLabel,
			privateChannelLabel: this.options.privateChannelLabel,
			publicChannelLabel: this.options.publicChannelLabel,
			directChannelLabel: this.options.directChannelLabel,
			
		});
		
		this.listenTo(this.vent, 'trigger:fetch:channel:' + WMAPP.Helper.slugify(this.options.recentChannelLabel), this.fetchRecentChannels);
		this.listenTo(this.vent, 'trigger:fetch:channel:' + WMAPP.Helper.slugify(this.options.privateChannelLabel), this.fetchPrivateChannels);
		this.listenTo(this.vent, 'trigger:fetch:channel:' + WMAPP.Helper.slugify(this.options.publicChannelLabel), this.fetchPublicChannels);
		this.listenTo(this.vent, 'trigger:fetch:channel:' + WMAPP.Helper.slugify(this.options.directChannelLabel), this.fetchDirectChannels);
		this.listenTo(this.vent, 'trigger:fetch:messages', this.fetchMessages);
		this.listenTo(this.vent, 'trigger:fetch:participant:filter', this.filterParticipants);
		
		this.listenTo(this.vent, 'trigger:show:channel:add-participant', this.showAddParticipant);
		
		this.listenTo(this.vent, 'trigger:show:channel:create:' + WMAPP.Helper.slugify(this.options.privateChannelLabel), this.showCreateChannel.bind(this, 'private'));
		this.listenTo(this.vent, 'trigger:show:channel:create:' + WMAPP.Helper.slugify(this.options.publicChannelLabel), this.showCreateChannel.bind(this, 'public'));
		this.listenTo(this.vent, 'trigger:show:channel:create:' + WMAPP.Helper.slugify(this.options.directChannelLabel), this.showCreateDirectChannel);

		this.listenTo(this.vent, 'trigger:add:channel:participant', this.addParticipant);
		this.listenTo(this.vent, 'trigger:add:channel:message', this.addMessage);
		this.listenTo(this.vent, 'trigger:add:channel:files', this.addFiles);
		this.listenTo(this.vent, 'trigger:add:channel:files-from-clipboard', this.addFilesFromClipboard);
		this.listenTo(this.vent, 'trigger:edit:channel:message', this.editMessage);
		
		this.listenTo(this.vent, 'trigger:changed:channel', this.onChannelChanged);
		this.listenTo(this.vent, 'trigger:changed:messages:height', this.onMessagesHeightChanged);

		options.tileRegion.show(this.chatView);
	},
	onChannelChanged: function(channel) {
		this.currentChannel = channel;
		if (typeof this.options.onChannelChanged == 'function') {
			this.options.onChannelChanged(channel);
		}
	},
	onMessagesHeightChanged: function(heightChange) {
		if (this.chatView.initialMessageRender) {
			this.chatView.setScrollBottom(this.chatView.getScrollBottom() - heightChange);
		}
	},
	loadEmojiSpiteCategories: function() {
		EmojiSpriteConfig.sort(function(a, b) {
			return a.sort_order - b.sort_order;
		});
		
		for (var i=0; i<EmojiSpriteConfig.length; i++) {
			if (!this.emojiSpriteCategories[EmojiSpriteConfig[i].category]) {
				this.emojiSpriteCategories[EmojiSpriteConfig[i].category] = [];
			}
			EmojiSpriteConfig[i].sheet = this.emojiSpriteSheet.src;
			this.emojiSpriteCategories[EmojiSpriteConfig[i].category].push(EmojiSpriteConfig[i]);
		}
	},
	fetchRecentChannels: function() {
		var that = this;
		this.options.fetchRecentChannels().then(function() {
			var chatCollection = _.last(arguments);
			that.chatView.updateCurrentCollection.call(that.chatView, chatCollection.fullCollection);
		});
	},
	fetchPrivateChannels: function() {
		var that = this;
		this.options.fetchPrivateChannels().then(function() {
			var chatCollection = _.last(arguments);
			that.chatView.updateCurrentCollection.call(that.chatView, chatCollection);
		});
	},
	fetchPublicChannels: function() {
		var that = this;
		this.options.fetchPublicChannels().then(function() {
			var chatCollection = _.last(arguments);
			that.chatView.updateCurrentCollection.call(that.chatView, chatCollection);
		});
	},
	fetchDirectChannels: function() {
		var that = this;
		this.options.fetchDirectChannels().then(function() {
			var chatCollection = _.last(arguments);
			that.chatView.updateCurrentCollection.call(that.chatView, chatCollection);
		});
	},
	fetchMessages: function(channel, pageIncrement) {
		var that = this;
		var promise = $.Deferred();
		
		var scrollBottom = null;
		if (pageIncrement) {
			scrollBottom = that.chatView.getScrollBottom.call(that.chatView);
			that.chatView.initialMessageRender = false;
		}
		
		this.options.fetchMessages(channel, pageIncrement).then(function(messages, fetchedChannel, addToExistingCollection) {
			addToExistingCollection = addToExistingCollection || false;
			
			if (channel != fetchedChannel) {
				channel = fetchedChannel;
				that.currentChannel = fetchedChannel;
				that.onChannelChanged.call(that, fetchedChannel);
			}
			
			if (addToExistingCollection) {
				if (scrollBottom) {
					that.chatView.setScrollBottom.call(that.chatView, scrollBottom);
				}
			} else {
				that.messageCollection = messages;
				if (channel.get('_participants').findWhere({id: that.currentParticipant.id})) {
					that.chatView.showMessagesView.call(that.chatView, channel, that.messageCollection);
				} else {
					that.addParticipant.call(that, channel, that.currentParticipant);
				}
			}
			promise.resolve(that.messageCollection);
		});
		
		return promise;
	},
	scrollToMessage: function(message) {
		this.chatView.scrollToMessage(message);
	},
	showCreateChannel: function(type, name) {
		var that = this;
		var channelLabel = (type == 'private' ? this.options.privateChannelLabel.replace(/s$/, '') : this.options.publicChannelLabel.replace(/s$/, ''));
		
		var channel = new WMAPP.Core.Model.ChatChannel({
			type: type,
			name: name || '',
		});
		
		var dialog = WMAPP.dialog({
			title: 'Create ' + channelLabel,
			showClose: true,
			buttons: ['Create'],
			view: new WMAPP.Extension.View.TextField({
				placeholder: channelLabel + ' name',
				model: channel,
				name: 'name',
			}),
		});
		
		dialog.promise.then(function() {
			channel.save().then(function() {
				var chatChannelParticipant = new WMAPP.Core.Model.ChatChannelParticipant({
					participant_id: that.currentParticipant.id,
					chat_channel_id: channel.id,
					is_owner: 1,
					is_admin: 1,
				});
				chatChannelParticipant.save().then(function() {
					that.fetchMessages.call(that, channel);
				});
			})
		});
	},
	showAddParticipant: function() {
		
		this.participantCollection = new WMAPP.Core.Model.ChatParticipantCollection(null, {preventDestroy: true});
		
		var searchView = new WMAPP.Extension.Chat.View.ParticipantSearchView({
			vent: this.vent,
			collection: this.participantCollection,
			currentChannel: this.currentChannel,
		});
		
		WMAPP.dialog({
			title: 'Search',
			showClose: true,
			buttons: false,
			view: searchView,
		});
	},
	addParticipant: function(channel, participant) {
		var that = this;
		
		channel = channel || this.currentChannel;
		participant = participant || this.currentParticipant;
		
		if (channel) {
			var chatChannelParticipant = new WMAPP.Core.Model.ChatChannelParticipant({
				participant_id: participant.id,
				chat_channel_id: channel.id
			});
			chatChannelParticipant.save().then(function() {
				if (that.participantCollection) {
					that.participantCollection.remove(participant);
				}
				that.fetchMessages.call(that, channel);
			});
		}
	},
	editMessage: function(message, messageStr) {
		message.unset('focused');
		message.unset('active');
		message.set('message', WMAPP.Helper.escape(messageStr));
		message.save();
	},
	addMessage: function(messageStr) {
		var that = this;
		if (this.currentChannel) {
			var message = new WMAPP.Core.Model.ChatMessage({
				message: WMAPP.Helper.escape(messageStr),
				chat_channel_id: this.currentChannel.id,
				chat_participant_id: this.currentParticipant.id,
				modified: moment().format('YYYY-MM-DD HH:mm:ss'),
				created: moment().format('YYYY-MM-DD HH:mm:ss'),
				_file: new WMAPP.Core.Model.File(),
			});

			this.messageCollection.add(message);
			message.save({suppressSpinner: true});
			
			this.chatView.scrollToMessage();
		}
	},
	addFiles: function(files) {
		var that = this;
		var promises = [];
		var messages = new WMAPP.Core.Model.ChatMessageCollection();
		
		var addMessage = function(file) {
			var message = new WMAPP.Core.Model.ChatMessage({
				message: file.get('name'),
				chat_channel_id: that.currentChannel.id,
				chat_participant_id: that.currentParticipant.id,
				modified: moment().format('YYYY-MM-DD HH:mm:ss'),
				created: moment().format('YYYY-MM-DD HH:mm:ss'),
				file: 0,
				_file: file
			});
			messages.push(message);
		}

		WMAPP.Helper.showSpinner();
		
		_.each(files, function(file) {
			var promise = $.Deferred();
			var isImage = file.type.indexOf('image') >= 0;
			var model = new WMAPP.Core.Model.File({id: 0});
			
			promises.push(promise);

			model.loadFileData(file).then(function(data) {
				model.updateModelAndPreview(file, null, data);
				addMessage(model);
				promise.resolve();
			});
		});
		
		$.when.apply(null, promises).then(function() {
			WMAPP.Helper.hideSpinner();
			
			messages.each(function(model) {
				that.messageCollection.add(model);
				model.save({suppressSpinner: true});
			});
		});
	},
	addFilesFromClipboard: function(files) {
		var that = this;
		var promises = [];
		var messages = new WMAPP.Core.Model.ChatMessageCollection();
		
		for (var i=0; i<files.length; i++) {
			var promise = $.Deferred();
			var file = files[i];
			
			promises.push(promise);
			
			if (file.kind === 'file') {
				var blob = file.getAsFile();
				var reader = new FileReader();
				reader.onload = function(event) {
					var filename = 'Pasted Image ' + moment().format('YYYY-MM-DD HH:mm:ss') + '.' + _.last(blob.type.split('/')).toLowerCase();
					var message = new WMAPP.Core.Model.ChatMessage({
						message: filename,
						chat_channel_id: that.currentChannel.id,
						chat_participant_id: that.currentParticipant.id,
						modified: moment().format('YYYY-MM-DD HH:mm:ss'),
						created: moment().format('YYYY-MM-DD HH:mm:ss'),
						file: 0,
						_file: new WMAPP.Core.Model.File({
							id: 0,
							type: blob.type,
							size: blob.size,
							data: event.target.result,
							file: filename,
							name: filename
						})
					});
					messages.push(message);
					promise.resolve();
				};
				reader.readAsDataURL(blob);
			}
		}
		
		$.when.apply(null, promises).then(function() {
			messages.each(function(model) {
				that.messageCollection.add(model);
				model.save({suppressSpinner: true});
			});
		});
	},
	filterParticipants: function(query, collection) {
		var collection = collection || this.participantCollection;
		if (collection) {
			if (query.trim() == "") {
				collection.reset();
			} else {
				collection.queryParams['expand'] = 'member_id';
				collection.queryParams['CoreChatParticipant_name'] = query;
				collection.fetch({suppressSpinner: !WMAPP.isApp});
			}
		}
	}
}));

WMAPP.module('Extension.Chat.View', function (View) {

	/**
	 * Channels
	 */
	View.ChannelsItemView = WMAPP.Extension.View.ItemView.extend({
		className: function() {
			var className = 'wmapp-chat-channel-item';
			if (this.options.model && this.options.model.get('_last_message') && this.options.model.get('_last_message').id) {
				className += ' has-message-content';
			}
			return className;
		},
		template: function(options) {
			var model = options.model;
			var avatarSrc = WMAPP.Extension.Chat.View.ChatLayoutView.prototype.getAvatarSrc.call(null, options.model);
			var channelName = model instanceof WMAPP.Core.Model.ChatParticipant ? model.get('screen_name') : model.get('name');
			
			var tmplStr =	'<div class="wmapp-chat-avatar" style="background-image: url(' + avatarSrc + ')"></div>' + 
							'<div>' +
							'	<span class="wmapp-chat-channel-item-name">' + channelName + '</span>';
			
			if (model.get('_last_message') && model.get('_last_message').id) {
				var messageContent = WMAPP.Extension.Chat.View.ChatLayoutView.prototype.parseAndFormatMessage.call(null, options.model.get('_last_message'), null, true);
				var messageTime = WMAPP.Extension.Chat.View.ChatLayoutView.prototype.getMessageTime.call(null, options.model.get('_last_message'));
				
				tmplStr +=	'	<span class="wmapp-chat-channel-item-message">' + options.model.get('_last_message').get('_chat_participant_id').get('screen_name') +  ': ' +  messageContent  + '</span>' +
							'	<span class="wmapp-chat-channel-item-time">' + messageTime + '</span>';
			}
			
			tmplStr += 		'</div>';
			
							return tmplStr;
		},
		templateHelpers: function() {
			return this.options;
		},
		events: {
			'click' : 'onChannelClicked'
		},
		onChannelClicked: function(e) {
			e.preventDefault();
			e.stopPropagation();
			this.$el.addClass('active');
			this.options.vent.trigger('trigger:fetch:messages', this.options.model);
		}
	});
	
	View.ChannelsCollectionView = WMAPP.Extension.View.CompositeView.extend({
		initialize: function() {
			WMAPP.Extension.View.CompositeView.prototype.initialize.apply(this, arguments);
			
			if (this.options.collection) {
				this.listenTo(this.options.collection, 'add', _.debounce(this.onCollectionAdd, 10));
				
				if (this.options.collection.pageableCollection) {
					this.listenTo(this.options.collection.pageableCollection, 'request', function(e) {
						this.$el.parents('.wmapp-chat-content').addClass('loading');
					});
					
					this.listenTo(this.options.collection.pageableCollection, 'sync', function(e) {
						this.$el.parents('.wmapp-chat-content').removeClass('loading');
					});
				}
				
				// This marionette function normally gets called when this view is instanciated,
				// but only if the collection exists at the time of instanciation. In our case,
				// we're setting the collection manually after the fact, so we need to call this
				// manually. It binds the basic add/remove/reset/sync events.
				
				if (this.options.collection.eventsInitialized) {
					this._initialEvents();
					this.options.collection.eventsInitialized = true;
				}
			}
		},
		className: 'wmapp-chat-channel-list',
		template: function(options) {
			var tmplStr =	options.title;
			return tmplStr;
		},
		childView: View.ChannelsItemView,
		childViewOptions: function() {
			return this.options;
		},
		onRender: function() {
			// Trigger a check for the pageable collection length
			if (this.options.collection) {
				if (this.options.collection.length) {
					this.$el.removeClass('empty');
				} else {
					this.$el.addClass('empty');
				}
				this.onCollectionAdd();
				
				if (this.options.collection.pageableCollection) {
					this.onScrollDebounced = _.debounce(this.onScroll.bind(this), 10);
					$('.wmapp-chat-content').on('scroll', this.onScrollDebounced);
				}
			}
		},
		onBeforeDestroy: function() {
			$('.wmapp-chat-content').off('scroll', this.onScrollDebounced);
		},
		onCollectionAdd: function() {
			if (this.options.collection.pageableCollection) {
				if (this.options.collection.pageableCollection.hasNextPage()) {
					this.$el.addClass('can-load-more');
				} else {
					this.$el.removeClass('can-load-more');
				}
			}
		},
		onScroll: function() {
			var el = $('.wmapp-chat-content');
			
			if (el[0].scrollHeight < el.scrollTop() + el.innerHeight() + window.innerHeight / 2) {
				if (this.options.collection.pageableCollection.hasNextPage()) {
					this.options.collection.pageableCollection.getNextPage({suppressStatus: true});
				}
			}
		},
	});
	
	
	/**
	 * Messages
	 */
	View.ChatMessagesMessageItemView = WMAPP.Extension.View.LayoutView.extend({
		className: function() {
			var className = 'wmapp-chat-messages-list-item';
			
			if (this.options.compact) {
				className += ' compact-header';
			}
			
			if (this.options.isCurrentParticipant) {
				className += ' current-participant';
			}
			
			if (!this.options.model.id) {
				className += ' message-unsent';
			}
			
			if (this.options.model.get('active')) {
				className += ' active';
			}
			
			if (this.options.model.get('focused')) {
				className += ' focused';
			}
			
			if (!this.options.model.get('chat_participant_id')) {
				className += ' system';
			}
			
			return className;
		},
		template: function(options) {
			var model = options.model;
			var participant = model.get('chat_participant_id') ? options.channel.get('_participants').findWhere({id: model.get('chat_participant_id')}) : null;
			
			var avatarSrc = WMAPP.Extension.Chat.View.ChatLayoutView.prototype.getAvatarSrc.call(null, participant);
			var messageContent = WMAPP.Extension.Chat.View.ChatLayoutView.prototype.parseAndFormatMessage.call(null, model, options.simplemde);
			var messageTime = WMAPP.Extension.Chat.View.ChatLayoutView.prototype.getMessageTime.call(null, model);
			
			var tmplStr =	'<div class="wmapp-chat-avatar small" style="background-image: url(' + avatarSrc + ')"></div>' +
							'<div class="wmapp-chat-message-wrapper">' +
							'	<div class="wmapp-chat-message-header">';
			if (participant) {
				tmplStr += 	'		<span class="wmapp-chat-message-participant-name">' + participant.get('screen_name') + '</span>';
			}
			tmplStr += 		'		<span class="wmapp-chat-message-time">' + messageTime + '</span>' +
							'	</div>' +
							'	<div class="wmapp-chat-message-content">' + messageContent + '</div>'+
							'</div>';
			return tmplStr;
		},
		templateHelpers: function() {
			return this.options;
		},
		modelEvents: {
			'sync' : 'render',
			'change:focused' : 'onFocusedChanged',
			'change:active' : 'onActiveChanged',
		},
		onRender: function() {
			var that = this;
			this.$el.attr('class', this.className());
			
			// Manually call these to trigger the JS timer
			this.onFocusedChanged();
			this.onActiveChanged();
			
			this.$el.find('img').each(function() {
				this.onload = that.onImageLoaded.bind(that, this);
			});
		},
		onAttach: function() {
			this.renderedHeight = this.$el.height();
		},
		onBeforeDestroy: function() {
			this.$el.find('img').each(function() {
				this.onload = null
			});
		},
		onImageLoaded: function(el, e) {
			if (this.renderedHeight != this.$el.innerHeight()) {
				this.options.vent.trigger('trigger:changed:messages:height', this.$el.innerHeight() - this.renderedHeight);
			}
		},
		onFocusedChanged: function() {
			if (this.options.model.get('focused')) {
				this.$el.addClass('focused');
				setTimeout((function() {
					this.options.model.unset('focused');
				}).bind(this), 3000);
			} else {
				this.$el.removeClass('focused');
			}
		},
		onActiveChanged: function() {
			if (this.options.model.get('active')) {
				this.$el.addClass('active');
			} else {
				this.$el.removeClass('active');
			}
		}
	});
	
	View.ChatMessagesMessageEmptyView = WMAPP.Extension.View.LayoutView.extend({
		className: 'wmapp-chat-messages-empty',
		template: function() {
			return '<p>Nothing\'s been said yet. Maybe you should break the ice?</p>';
		}
	});
	
	View.ChatMessagesMessageCollectionView = WMAPP.Extension.View.CompositeView.extend({
		template: function() {
			return '';
		},
		emptyView: View.ChatMessagesMessageEmptyView,
		childView: View.ChatMessagesMessageItemView,
		childViewOptions: function(model, index) {
			return {
				vent: this.options.vent,
				simplemde: this.options.simplemde,
				channel: this.options.model,
				compact: this.checkIfShouldCompact(model, index),
				isCurrentParticipant: this.isCurrentParticipant(model, index),
				currentParticipant: this.options.currentParticipant,
			};
		},
		isCurrentParticipant: function(model, index) {
			return model.get('chat_participant_id') == this.options.currentParticipant.id;
		},
		checkIfShouldCompact: function(model, index) {
			if (index > 0) {
				var previousMessage = this.options.collection.at(index - 1);

				if (model.get('chat_participant_id') == previousMessage.get('chat_participant_id')) {
					var currentMessageTime = moment(model.get('created'), 'YYYY/MM/DD HH:mm:ss');
					var previousMessageTime = moment(previousMessage.get('created'), 'YYYY/MM/DD HH:mm:ss');
					if (currentMessageTime.diff(previousMessageTime, 'minute') <= 2) {
						return true;
					}
				}
			}
			return false;
		},
		collectionEvents: function() {
			return {
				add: _.debounce(this.checkForMoreMessages, 20)
			}
		},
		onRender: function() {
			this.checkForMoreMessages();
		},
		checkForMoreMessages: function() {
			if (this.options.collection.pageableCollection && this.options.collection.pageableCollection.hasNextPage()) {
				this.$el.addClass('can-load-more');
			} else {
				this.$el.removeClass('can-load-more');
			}
		}
	});
	
	View.ChatMessagesLayoutView = WMAPP.Extension.View.LayoutView.extend({
		className: 'wmapp-chat-messages-wrapper',
		template: function(options) {
			var model = options.model;
			
			var avatarSrc = WMAPP.Extension.Chat.View.ChatLayoutView.prototype.getAvatarSrc.call(null, options.model)
			
			var tmplStr =	'<div class="wmapp-chat-messages-header">' +
							'	<div class="wmapp-chat-channel-name">' +
							'		<div class="wmapp-chat-avatar" style="background-image:url(' + avatarSrc + ')"></div>' + 
							'		<span>' + model.get('name') + '</span>' +
							'	</div>' +
							'	<div class="wmapp-chat-messages-participants"></div>' + 
							'</div>' +
							'<div class="wmapp-chat-messages-list"></div>' +
							'<div class="wmapp-chat-messages-input">' +
							'	<button class="cb-icon-plus" data-action="upload"></button>' +
							// '	<button class="cb-icon-at-sign"></button>' +
							'	<textarea class="wmapp-chat-messages-input-message" placeholder="Message chat" rows="1" cols="1"></textarea>' +
							'	<button class="cb-icon-message" data-action="send"></button>' +
							'	<button class="cb-icon-emoji" data-action="insert-emoji"></button>' +
							'	<div class="wmapp-chat-emoji-wrapper">' +
							'		<input type="text" class="wmapp-chat-emoji-search" placeholder="Search emojis"/>' +
							'		<div class="wmapp-chat-emoji-category-heading">';

			var firstCategory = null;
			_.each(_.keys(options.emojiCategories), function(category, i) {
				if (i === 0) {
					firstCategory = category;
				}
				var categoryEmoji = options.emojiCategories[category][0];
				var emojiStyle = WMAPP.Extension.Chat.View.ChatLayoutView.prototype.getEmojiStyle.call(null, categoryEmoji);
				tmplStr += 	'			<a href="#" title="' + category + '" class="wmapp-chat-emoji ' + (i === 0 ? 'active' : '') + '" style="' + emojiStyle + '"></a>';
			});
			
			tmplStr += 		'		</div>' +
							'		<div class="wmapp-chat-emoji-category-content">';
			
			_.each(options.emojiCategories, function(emojis, category) {
				tmplStr += '			<div class="wmapp-chat-emoji-category-emojis ' + (category == firstCategory ? 'active' : '') + '" data-emoji-category="' + category + '">';
				_.each(emojis, function(emoji) {
					var emojiStyle = WMAPP.Extension.Chat.View.ChatLayoutView.prototype.getEmojiStyle.call(null, emoji);
					tmplStr += '			<a href="#" data-emoji-name="' + emoji.short_name + '" title=":' + emoji.short_name + ':' + (emoji.text ? (' or ' + emoji.text) : '') + '" class="wmapp-chat-emoji" style="' + emojiStyle + '"></a>';
				});
				tmplStr += '			</div>';
			});
			tmplStr +=		'			<div class="wmapp-chat-emoji-category-emojis search-results"></div>' +
					 		'		</div>' +
							'	</div>' +
							'</div>';
							
			return tmplStr;
		},
		templateHelpers: function() {
			return this.options;
		},
		regions: {
			chatParticipantsRegion: '.wmapp-chat-messages-participants',
			chatMessagesRegion: '.wmapp-chat-messages-list',
			emojiRegion: '.wmapp-chat-emoji-wrapper',
		},
		events: function() {
			var onEmojiSearchKeyUp = _.debounce(this.onEmojiSearchKeyUp, 200);
			var events = {
				'click button[data-action="upload"]' : 'onUploadClicked',
				'click button[data-action="send"]' : 'onSendClicked',
				'click button[data-action="insert-emoji"]' : 'onInsertEmojiClicked',
				'click .wmapp-chat-emoji-category-heading a.wmapp-chat-emoji': 'onShowEmojiCategoryClicked',
				'click .wmapp-chat-emoji-category-content a.wmapp-chat-emoji': 'onEmojiClicked',
				'keydown .wmapp-chat-messages-input-message': 'onMessageKeyDown',
				'keydown .wmapp-chat-emoji-search' : onEmojiSearchKeyUp,
			}
			return events;
		},
		onRender: function() {
			$(document).on('paste', this.onPaste.bind(this));
			
			//this.chatMessageListInterval = setInterval(this.chatMessageListSizeSensor, )
			
			this.onChatMessageListScrollDebounced = _.debounce(this.onChatMessageListScroll.bind(this), 200);
			this.$el.find('.wmapp-chat-messages-list').scroll(this.onChatMessageListScrollDebounced);
			
			// $(document).on('load', 'img', function() {
			// 	console.error('load image', this, arguments);
			// });
			
			if (this.options.model.get('type') != 'direct') {
				this.chatParticipantsRegion.show(new View.ChatMessagesParticipantsView({
					vent: this.options.vent,
					model: this.options.model,
					collection: this.options.model.get('_participants'),
					currentParticipant: this.options.currentParticipant,
				}));
			}
			
			var chatMessagesView = new View.ChatMessagesMessageCollectionView({
				vent: this.options.vent,
				model: this.options.model,
				simplemde: this.options.simplemde,
				collection: this.options.collection,
				currentParticipant: this.options.currentParticipant,
			});
			this.chatMessagesRegion.show(chatMessagesView);
		},
		onBeforeDestroy: function() {
			$(document).off('paste');
			//this.$el.find('.wmapp-chat-messages-list').off('load');
		},
		
		onChatMessageListScroll: function(e) {
			
			var chatMessagesEl = $('.wmapp-chat-messages-list');
			var scrollBottom = chatMessagesEl.prop('scrollHeight') - chatMessagesEl.scrollTop() - chatMessagesEl.innerHeight();
			this.options.vent.trigger('trigger:changed:messages:scroll', scrollBottom);

			if (e.target.scrollTop <= 300) {
				this.options.vent.trigger('trigger:fetch:messages', this.options.model, 1);
			} else if (e.target.scrollTop == e.target.scrollHeight - $(e.target).innerHeight()) {
				this.options.vent.trigger('trigger:scroll:bottom');
			}
		},
		onShowEmojiCategoryClicked: function(e) {
			e.preventDefault()
			e.stopPropagation();
			this.$el.find('.wmapp-chat-emoji-category-heading a.wmapp-chat-emoji.active').removeClass('active');
			$(e.target).addClass('active');
			
			this.$el.find('.wmapp-chat-emoji-category-emojis.active').removeClass('active');
			this.$el.find('.wmapp-chat-emoji-category-emojis[data-emoji-category="' + $(e.target).attr('title') + '"]').addClass('active');
			this.$el.find('.wmapp-chat-emoji-search').val("");
		},
		onInsertEmojiClicked: function(e) {
			e.preventDefault()
			e.stopPropagation();
			this.$el.find('.wmapp-chat-emoji-wrapper').toggleClass('active');
		},
		onEmojiClicked: function(e) {
			e.preventDefault()
			e.stopPropagation();
			
			var currentVal = this.$el.find('.wmapp-chat-messages-input-message').val();
			this.$el.find('.wmapp-chat-messages-input-message').val(currentVal + (currentVal.match(/\s$/) ? '' : ' ') + ':' + $(e.target).attr('data-emoji-name') + ': ');
			
			this.$el.find('.wmapp-chat-emoji-wrapper').removeClass('active');
			this.autosizeMessageInput(true);
			
			this.$el.find('.wmapp-chat-messages-input-message').focus();
		},
		onPaste: function(e) {
			var clipboardItems = (event.clipboardData || event.originalEvent.clipboardData).items;
			var files = [];
			
			for (var i=0; i<clipboardItems.length; i++) {
				if (clipboardItems[i].kind == "file") {
					files.push(clipboardItems[i]);
				}
			}
			
			if (files.length) {
				e.stopPropagation();
				e.preventDefault();
				this.options.vent.trigger('trigger:add:channel:files-from-clipboard', files);
			}
		},
		onMessageKeyDown: function(e){ 
	
			if (e.key == "Enter" && !e.shiftKey) {
				this.onSendClicked(e);
				this.cancelMessageEdit();
			}
			else if ((e.key == "ArrowUp" || e.key == "ArrowDown") && e.ctrlKey) {
				e.preventDefault()
				e.stopPropagation();
				setTimeout((function() {
					this.editMessageRelative(e.key == "ArrowUp" ? -1 : +1);
				}).bind(this), 0);
			}
			else if (e.key == "Escape") {
				this.cancelMessageEdit();
			}
			
			// Only resize the input if it was a single chaacter, and ctrl/alt not held down
			if (e.key.length == 1 & !e.ctrlKey & !e.altKey) {
				this.autosizeMessageInput();
			}
		},
		onEmojiSearchKeyUp: function(e) {
			var input = this.$el.find('.wmapp-chat-emoji-search');
			var query = input.val().trim();
			
			var searchResultsEl = this.$el.find('.wmapp-chat-emoji-category-emojis.search-results');
			searchResultsEl.empty();
			
			if (query == "") {
				this.$el.find('.wmapp-chat-emoji-category-emojis').removeClass('active').first().addClass('active');
			} else {
				this.$el.find('.wmapp-chat-emoji-category-emojis').removeClass('active').last().addClass('active');
				this.$el.find('.wmapp-chat-emoji-category-heading .wmapp-chat-emoji.active').removeClass('active');

				var emojis = _.filter(EmojiSpriteConfig, function(emoji) {
					var name = (emoji.name || "") + (emoji.short_name || "");
					return name.indexOf(query) >= 0;
				});
				
				_.each(emojis, function(emoji) {
					var emojiStyle = WMAPP.Extension.Chat.View.ChatLayoutView.prototype.getEmojiStyle.call(null, emoji);
					searchResultsEl.append('<a href="#" data-emoji-name="' + emoji.short_name + '" title=":' + emoji.short_name + ':' + (emoji.text ? (' or ' + emoji.text) : '') + '" class="wmapp-chat-emoji" style="' + emojiStyle + '"></a>');
				});
			}
		},
		onUploadClicked: function(e) {
			e.preventDefault();
			e.stopPropagation();
			var that = this;
			var uploadEl = $('<input type="file" multiple>');
			uploadEl.on('change', function() {
				if (this.files.length) {
					that.options.vent.trigger('trigger:add:channel:files', this.files);
				}
			});
			uploadEl.click();
		},
		onSendClicked: function(e) {
			e.preventDefault();
			e.stopPropagation();
			var textarea = this.$el.find('.wmapp-chat-messages-input-message');
			
			var message = textarea.val().trim();
			if (message != "") {
				_.each(EmojiSpriteConfig, function(emoji) {
					if (emoji.text) {
						message = message.replace(emoji.text, ":" + emoji.short_name + ":");
					}
				});
				if (this.options.currentEditing) {
					this.options.vent.trigger('trigger:edit:channel:message', this.options.currentEditing, message);
				} else {
					this.options.vent.trigger('trigger:add:channel:message', message);
				}
			}
			textarea.val("");
		},
		autosizeMessageInput: function(useScrollHeight) {
			
			var el = this.$el.find('.wmapp-chat-messages-input-message');
			setTimeout(function() {
				var lines = (el.val().match(/\r\n|\n|\r/g) || []).length + 1;
				
				var lineHeight = 16+(lines*16);
				
				if (useScrollHeight && lineHeight < el.prop('scrollHeight')) {
					lineHeight = el.prop('scrollHeight');
				}
				
				el.css('height', lineHeight + 'px');
			}, 0);
		},
		cancelMessageEdit: function() {
			if (this.options.currentEditing) {
				this.$el.find('.wmapp-chat-messages-input-message').val(this.options.draftMessage);
				this.options.currentEditing.unset('active');
				
				delete this.options.draftMessage;
				delete this.options.currentEditing;
			}
		},
		getMessageRelative: function(relativeIndex) {
			var index = this.options.currentEditing ? this.options.collection.indexOf(this.options.currentEditing) : this.options.collection.length;
			var nextMessage = null;
			
			do {
				if (index + relativeIndex < 0) {
					break;
				}
				else if (index + relativeIndex >= this.options.collection.length) {
					break;
				}
				else {
					index += relativeIndex;
					if (this.options.collection.at(index).get('chat_participant_id') == this.options.currentParticipant.id) {
						nextMessage = this.options.collection.at(index);
					}
				}
			} while (nextMessage == null);
			
			return nextMessage;
		},
		editMessageRelative: function(relativeIndex) {
			var nextMessage = this.getMessageRelative(relativeIndex);
			if (nextMessage) {
				var nextMessageIndex = this.options.collection.indexOf(nextMessage);
				
				if (this.options.currentEditing) {
					this.options.currentEditing.unset('active');
					this.options.currentEditing = nextMessage;
				} else {
					this.options.draftMessage = this.$el.find('.wmapp-chat-messages-input-message').val().trim();
					this.options.currentEditing = nextMessage;
				}
				
				nextMessage.set('active', true);
				this.$el.find('.wmapp-chat-messages-input-message').val(nextMessage.get('message'));
			}
			else if (this.options.currentEditing) {
				var index = this.options.collection.indexOf(this.options.currentEditing);
				
				if (index + relativeIndex >= this.options.collection.length) {
					this.cancelMessageEdit();
				}
			}
		}
	});
	
	View.ChatMessagesParticipantsItemView = WMAPP.Extension.View.LayoutView.extend({
		className: 'wmapp-chat-messages-participant',
		template: function(options) {
			var model = options.model;
			var avatarSrc = WMAPP.Extension.Chat.View.ChatLayoutView.prototype.getAvatarSrc.call(null, model);
			var tmplStr	=	'<div class="wmapp-chat-avatar small" style="background-image: url(' + avatarSrc + ')" data-name="' + model.get('screen_name') + '" title="' + model.get('screen_name') + '"></div>';
			if (options.showName) {
				tmplStr +=	'<span class="wmapp-chat-message-participant-name">' + model.get('screen_name') + '</span>';
			}
			return tmplStr;
		},
		templateHelpers: function() {
			return this.options;
		}
	});
	
	View.ChatMessagesParticipantsView = WMAPP.Extension.View.CompositeView.extend({
		template: function(options) {
			var currentParticipantFromChannel = options.model.get('_participants').findWhere({id: options.currentParticipant.id});
			
			var tmplStr =	'';
			if (currentParticipantFromChannel && currentParticipantFromChannel.get('_chat_channel_participant') && currentParticipantFromChannel.get('_chat_channel_participant').get('is_admin')) {
				tmplStr +=	'<button class="cb-icon-person-add" title="Invite to channel"></button>';
			}
			
			return tmplStr;
		},
		templateHelpers: function() {
			return this.options
		},
		events: {
			'click .cb-icon-person-add': 'onAddParticipantClicked'
		},
		childView: View.ChatMessagesParticipantsItemView,
		// filter: function(model) {
		// 	return this.options.currentParticipant.id != model.id;
		// },
		onAddParticipantClicked: function(e){
			e.preventDefault();
			e.stopPropagation();
			
			this.options.vent.trigger('trigger:show:channel:add-participant')
		}
	});
	
	
	/** Main Layout */
	View.ChatLayoutView = WMAPP.Extension.View.LayoutView.extend({
		initialize: function() {
			WMAPP.Extension.View.LayoutView.prototype.initialize.apply(this, arguments);
			
			this.listenTo(this.options.currentParticipant, 'sync', this.render);
		},
		className: 'wmapp-chat-wrapper',
		template: function(options) {
			var tmplStr =	'<div class="wmapp-chat-tabs">' +
							'	<div class="cb-icon-message" data-tab-name="' + WMAPP.Helper.slugify(options.recentChannelLabel) + '">' + options.recentChannelLabel + '</div>' +
							'	<div class="cb-icon-person-group" data-tab-name="' + WMAPP.Helper.slugify(options.privateChannelLabel) + '">' + options.privateChannelLabel + '</div>' +
							'	<div class="cb-icon-team" data-tab-name="' + WMAPP.Helper.slugify(options.publicChannelLabel) + '">' + options.publicChannelLabel + '</div>' +
							'	<div class="cb-icon-person" data-tab-name="' + WMAPP.Helper.slugify(options.directChannelLabel) + '">' + options.directChannelLabel + '</div>' +
							'</div>' +
							'<div class="wmapp-chat-channel-search cb-icon-search" style="display:none"><input type="text" placeholder="Search ' + options.directChannelLabel + '" /></div>' +
							'<div class="wmapp-chat-channel-create" style="display:none"><button>Create Channel</button></div>' +
							'<div class="wmapp-chat-content"></div>';
			return tmplStr;	
		},
		templateHelpers: function() {
			return this.options;
		},
		regions: {
			tabRegion : '.wmapp-chat-content'
		},
		events: function() {
			var events = {};
			events['click div[data-tab-name="' + WMAPP.Helper.slugify(this.options.recentChannelLabel) + '"]'] = 'onRecentChannelClicked',
			events['click div[data-tab-name="' + WMAPP.Helper.slugify(this.options.privateChannelLabel) + '"]'] = 'onPrivateChannelClicked',
			events['click div[data-tab-name="' + WMAPP.Helper.slugify(this.options.publicChannelLabel) + '"]'] = 'onPublicChannelClicked',
			events['click div[data-tab-name="' + WMAPP.Helper.slugify(this.options.directChannelLabel) + '"]'] = 'onDirectChannelClicked',
			events['click div.wmapp-chat-channel-create button'] = 'onStartChatClicked';
			
			var onSearchInputKeyUp = this.onSearchInputKeyUp.bind(this);
			events['keyup div.wmapp-chat-channel-search input'] = _.debounce(onSearchInputKeyUp, 200);
			
			return events;
		},
		onRender: function() {
			if (this.options.initialChannel && this.options.currentParticipant.id) {
				switch(this.options.initialChannel) {
					case WMAPP.Helper.slugify(this.options.recentChannelLabel): 
						this.onRecentChannelClicked(new Event(null));
						break;
					case WMAPP.Helper.slugify(this.options.privateChannelLabel): 
						this.onPrivateChannelClicked(new Event(null));
						break;
					case WMAPP.Helper.slugify(this.options.publicChannelLabel): 
						this.onPublicChannelClicked(new Event(null));
						break;
					case WMAPP.Helper.slugify(this.options.directChannelLabel): 
						this.onDirectChannelClicked(new Event(null));
						break;
				}
			}
		},

		switchRegion: function(name, view) {
			
			if (name == WMAPP.Helper.slugify(this.options.directChannelLabel)) {
				this.$el.find('.wmapp-chat-channel-search').css('display', '');
			} else {
				this.$el.find('.wmapp-chat-channel-search').css('display', 'none');
			}
			
			if (name == WMAPP.Helper.slugify(this.options.privateChannelLabel) || name == WMAPP.Helper.slugify(this.options.publicChannelLabel)) {
				this.$el.find('.wmapp-chat-channel-create').css('display', '').find('button').text('Create ' + this.$el.find('.wmapp-chat-tabs > div[data-tab-name="' + name + '"]').text().replace(/s$/, ''));
			} else {
				this.$el.find('.wmapp-chat-channel-create').css('display', 'none');
			}
			
			if (
				!this.tabRegion.currentView ||
				!(this.tabRegion.currentView instanceof View.ChannelsCollectionView) ||
				WMAPP.Helper.slugify(this.tabRegion.currentView.options.title) != name
			) {
				this.$el.find('.wmapp-chat-tabs > .active').removeClass('active');
				this.$el.find('.wmapp-chat-tabs > div[data-tab-name="' + name + '"]').addClass('active');
				this.tabRegion.show(view);
				this.tabRegion.$el.addClass('loading');
				this.options.vent.trigger('trigger:fetch:channel:' + name);
			}
		},
		getTopShownMessage: function(messageCollection) {
			var chatMessagesEl = this.$el.find('.wmapp-chat-messages-list');
			var percentage = chatMessagesEl.scrollTop() / chatMessagesEl.prop('scrollHeight');
			var index = Math.floor(messageCollection.length*percentage);
			return messageCollection.at(index);
		},
		getScrollBottom: function() {
			var chatMessagesEl = this.$el.find('.wmapp-chat-messages-list');
			return chatMessagesEl.prop('scrollHeight') - chatMessagesEl.scrollTop() - chatMessagesEl.innerHeight();
		},
		setScrollBottom: function(scrollBottom) {
			var chatMessagesEl = this.$el.find('.wmapp-chat-messages-list');
			chatMessagesEl.scrollTop(chatMessagesEl.prop('scrollHeight') - scrollBottom - chatMessagesEl.innerHeight());
		},
		scrollToMessage: function(message) {
			if (!message) {
				// scroll to end
				this.$el.find('.wmapp-chat-messages-list').scrollTop(this.$el.find('.wmapp-chat-messages-list').prop('scrollHeight'));
				this.options.vent.trigger('trigger:scroll:bottom');
			} else {
				message.set('focused', true);
				var messageEl = this.$el.find('.wmapp-chat-messages-list-item[data-model-cid="' + message.cid + '"]');
				if (messageEl.length) {
					this.$el.find('.wmapp-chat-messages-list').scrollTop(messageEl.offset().top + $('.wmapp-chat-messages-list').offset().top);
				}
			}
			
		},
		showMessagesView: function(channel, messages) {
			var that = this;
			this.initialMessageRender = true;
			
			this.tabRegion.$el.removeClass('loading');
			this.$el.find('.wmapp-chat-channel-search').css('display', 'none');
			this.$el.find('.wmapp-chat-channel-create').css('display', 'none');
			this.options.vent.trigger('trigger:changed:channel', channel);
			
			var messageView = new View.ChatMessagesLayoutView({
				vent: this.options.vent,
				simplemde: this.options.simplemde,
				currentParticipant: this.options.currentParticipant,
				emojiCategories: this.options.emojiCategories,
				emojiSpriteSheet: this.options.emojiSpriteSheet,
				model: channel,
				collection: messages,
			});
			
			this.listenTo(messageView, 'show', function(e) {
				this.scrollToMessage();
			});
			
			this.tabRegion.show(messageView);
		},
		updateCurrentCollection: function(collection) {
			if (this.tabRegion.hasView() && this.tabRegion.currentView.options.collection != collection)  {
				this.tabRegion.currentView.options.collection = collection;
				this.tabRegion.currentView.collection = collection;
				this.tabRegion.currentView.initialize();
				this.tabRegion.currentView.render();
				this.tabRegion.$el.removeClass('loading');
			}
		},
		getEmojiStyle: function(emoji) {
			var x = emoji.sheet_x * 34 + 1
			var y = emoji.sheet_y * 34 + 1;
			return 'background-image: url(' + emoji.sheet + '); background-position: -' + x + 'px -' + y + 'px';
		},
		getAvatarSrc: function(model) {
			var src = WMAPP.getAppRoot() + (WMAPP.isApp ? 'img/base' : 'Base/img') + '/default-avatar-01.png';
			
			if (model instanceof WMAPP.Core.Model.ChatChannel) {
				if (model.get('_avatar') && model.get('_avatar').id) {
					src = '/site/img/' + model.get('_avatar').get('file');
					if (WMAPP.isApp) {
						src = 'https://' + WMAPP.domain + src;
					}
				}
			}
			else if (model instanceof WMAPP.Core.Model.ChatParticipant) {
				if (model.get('_member_id') && model.get('_member_id').get('_image') && model.get('_member_id').get('_image').id) {
					src = '/site/img/' + model.get('_member_id').get('_image').get('file');
					if (WMAPP.isApp) {
						src = 'https://' + WMAPP.domain + src;
					}
				}
			}

			return src;
		},
		parseAndFormatMessage: function(message, simplemde, plaintext) {
			simplemde = simplemde || (this && this.options ? this.options.simplende : null);
			
			if (message.get('_file') && (message.get('_file').id || message.get('_file').get('data'))) {
				// message is a file
				var file = message.get('_file');
				var fileIcon = WMAPP.getAppRoot() + (WMAPP.isApp ? 'img' : 'webroot/img') + '/file-types/' + _.last(file.get('file').split('.')).toLowerCase() + '.png';

				if (file.get('data')) {
					// file is base64 string
					if (file.get('type').indexOf('image/') >= 0) {
						return '<img src="' + file.get('data') + '" title="' + file.get('file') + '" alt="' + file.get('file') + '"/>';
					} else {
						return '<img src="' + fileIcon + '" title="' + file.get('file') + '" alt="' + file.get('file') + '"/>';
					}
					
				} else {
					// file is link
					var fileSrc = '/site/files/' + file.get('file');
					if (WMAPP.isApp) {
						fileSrc = 'https://' + WMAPP.domain + fileSrc;
					}
					
					var messageStr = '<a href="' + fileSrc + '" target="_blank">';
					
					if (file.get('type').indexOf('image/') >= 0) {
						messageStr += '<img src="' + fileSrc + '" title="' + file.get('file') + '" alt="' + file.get('file') + '"/>';
					} else {
						messageStr += '<img src="' + fileIcon + '" title="' + file.get('file') + '" alt="' + file.get('file') + '"/>';
					}
					
					messageStr += '</a>';
					
					return messageStr
				}
			} else {
				// message is a string
				if (plaintext) {
					return message.get('message');
				}

				// Get the message, and unescape any code blocks
				var messageString = message.get('message').replace(/\`([\s\S]+?)\`/g, function (match, capture) {
					return "`" + WMAPP.Helper.unescape(capture).replace(":", "&#58;") + "`";
				});

				messageString = messageString.replace(/\:(.+?)\:/g, function(match, capture) {
					var emoji = _.find(window.EmojiSpriteConfig, function(emoji) {
						return emoji.short_name == capture.trim().toLowerCase();
					});
					if (emoji) {
						var emojiStyle = WMAPP.Extension.Chat.View.ChatLayoutView.prototype.getEmojiStyle.call(null, emoji);
						return '<span data-emoji-name="' + emoji.short_name + '" title=":' + emoji.short_name + ':" class="wmapp-chat-emoji" style="' + emojiStyle + '"></span>';
					}
					
					return match;
				});
				
				messageString = messageString.replace("&#58;", ":");
				
				// Convert markdown to HTML
				return simplemde.options.previewRender(messageString);
			}
		},
		getMessageTime: function(message) {
			var time = moment(message.get('created'), 'YYYY/MM/DD HH:mm:ss');
			var timeDiff = moment().diff(time, 'days');
			
			if (timeDiff === 0) {
				return time.fromNow();
			}
			else if (timeDiff < 7) {
				return time.format('ddd h:mma');
			}
			else if (timeDiff < 365) {
				return time.format('D/M h:mma')
			}
			else {
				return time.format('D/M/YY h:mma')
			}
		},
		
		onSearchInputKeyUp: function(e) {
			var query = $(e.target).val().trim();
			if (query == "") {
				console.error('empty query');
			} else {
				this.options.vent.trigger('trigger:fetch:participant:filter', query, this.options.participantCollection);
			}
		},
		onRecentChannelClicked: function(e) {
			e.preventDefault();
			e.stopPropagation();

			this.switchRegion(WMAPP.Helper.slugify(this.options.recentChannelLabel), new View.ChannelsCollectionView({
				vent: this.options.vent,
				title: this.options.recentChannelLabel,
				currentParticipant: this.options.currentParticipant,
			}));
		},
		onPrivateChannelClicked: function(e) {
			e.preventDefault();
			e.stopPropagation();
			
			this.switchRegion(WMAPP.Helper.slugify(this.options.privateChannelLabel), new View.ChannelsCollectionView({
				vent: this.options.vent,
				title: this.options.privateChannelLabel,
				currentParticipant: this.options.currentParticipant,
			}));
		},
		onPublicChannelClicked: function(e) {
			e.preventDefault();
			e.stopPropagation();
			
			this.switchRegion(WMAPP.Helper.slugify(this.options.publicChannelLabel), new View.ChannelsCollectionView({
				vent: this.options.vent,
				title: this.options.publicChannelLabel,
				currentParticipant: this.options.currentParticipant,
			}));
		},
		onDirectChannelClicked: function(e) {
			var that = this;
			e.preventDefault();
			e.stopPropagation();
			
			if (!this.options.participantCollection) {
				this.options.participantCollection = new WMAPP.Core.Model.ChatParticipantCollection();
				this.listenTo(this.options.participantCollection, 'sync', function() {
					that.updateCurrentCollection.call(that, that.options.participantCollection);
				});
			}
			
			this.switchRegion(WMAPP.Helper.slugify(this.options.directChannelLabel), new View.ChannelsCollectionView({
				vent: this.options.vent,
				title: this.options.directChannelLabel,
				currentParticipant: this.options.currentParticipant,
			}));
		},
		onStartChatClicked: function(e) {
			e.preventDefault();
			e.stopPropagation();
			
			this.options.vent.trigger('trigger:show:channel:create:' + WMAPP.Helper.slugify(this.tabRegion.currentView.options.title));
		},
	});
	
	
	/**
	 * Participant Search (Invite participant to channel)
	 */
	View.ParticipantSearchResultsEmptyView = WMAPP.Extension.View.LayoutView.extend({
		template: function() {
			return '<p>No matching results.</p>';
		},
	});
	
	View.ParticipantSearchResultsItemView = WMAPP.Extension.View.LayoutView.extend({
		className: function() {
			var className = 'wmapp-chat-search-results-participant';
			if (this.options.isAlreadyParticipating) {
				className += ' already-participating';
			}
			return className;
		},
		template: function(options) {
			var model = options.model;
			var avatarSrc = WMAPP.Extension.Chat.View.ChatLayoutView.prototype.getAvatarSrc.call(null, model);
			
			var tmplStr	=	'<div class="wmapp-chat-avatar small" style="background-image:url(' + avatarSrc + ')" data-name="' + model.get('screen_name') + '" title="' + model.get('screen_name') + '"></div>' +
							'<span class="wmapp-chat-message-participant-name">' + model.get('screen_name') + '</span>';
			return tmplStr;
		},
		templateHelpers: function() {
			return this.options;
		},
		events: {
			'click' : 'onSearchResultClicked',
		},
		onSearchResultClicked: function(e) {
			e.preventDefault();
			e.stopPropagation();
			
			if (!this.options.isAlreadyParticipating) {
				this.options.vent.trigger('trigger:add:channel:participant', null, this.options.model);
				this.trigger('trigger:add:channel:participant', null, this.options.model);
			}
		},
		
	});
	
	View.ParticipantSearchResultsCollectionView = WMAPP.Extension.View.CompositeView.extend({
		className: 'wmapp-chat-search-results',
		template: function() {
			return '';
		},
		emptyView: View.ParticipantSearchResultsEmptyView,
		childView: View.ParticipantSearchResultsItemView,
		childViewOptions: function(model, index) {
			return {
				vent: this.options.vent,
				isAlreadyParticipating: this.isAlreadyParticipating(model),
			}
		},
		isAlreadyParticipating: function(model) {
			if (this.options.currentChannel.get('_participants').findWhere({id: model.id})) {
				return true;
			}
			return false;
		}
	});
	
	View.ParticipantSearchView = WMAPP.Extension.View.LayoutView.extend({
		className: 'wmapp-chat-search',
		template: function(options) {
			var tmplStr = 	'<input type="text" placeholder="Search"/>' +
							'<div></div>';
			return tmplStr;
		},
		templateHelpers: function() {
			return this.options;
		},
		regions: {
			resultsRegion: 'div',
		},
		events: function() {
			var onInputKeyUp = this.onInputKeyUp.bind(this);
			return {
				'keyup input': _.debounce(onInputKeyUp, 200),
			}
		},
		onRender: function() {
			var that = this;
			var searchResultsView = new View.ParticipantSearchResultsCollectionView({
				vent: this.options.vent,
				collection: this.options.collection,
				currentChannel: this.options.currentChannel
			});
			this.listenTo(searchResultsView, 'childview:trigger:add:channel:participant', function(e) {
				that.$el.find('input').val("");
			});
			
			this.resultsRegion.show(searchResultsView);
			
			setTimeout(function() {
				that.$el.find('input').focus();
			}, 100);
		},
		onInputKeyUp: function(e) { 
			e.preventDefault();
			e.stopPropagation();
			this.options.vent.trigger('trigger:fetch:participant:filter', $(e.target).val());
		}
	});
	
});

