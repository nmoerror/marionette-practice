'use strict';

WMAPP.module('Extension.View', function(View) {

    /*
    ArticleViewFrontendListTileLayout
        main: ArticleViewFrontendListTileMainListLayout
            header: ArticleViewFrontendListTileMainListHeader
            articlelist: ArticleViewFrontendListTileMainListCollection
            pagination: ArticleViewFrontendListTileMainListPagination
        main: ArticleViewFrontendListTileMainArticleLayout
            header: ArticleViewFrontendListTileMainArticleHeader
            content: ArticleViewFrontendListTileMainArticleContent
            categories: ArticleViewFrontendListTileMainArticleCategories
            social: ArticleViewFrontendListTileMainArticleSocial
            comments: ArticleViewFrontendListTileMainArticleComments
        side: ArticleViewFrontendListTileSideLayout
            search: ArticleViewFrontendListTileSideSearch
            categories: ArticleViewFrontendListTileSideCategories
            form: ArticleViewFrontendListTileSideForm
            related: ArticleViewFrontendListTileSideRelated
    * */

    //List tile

    /**
     * Outer layout view
     */
    View.ArticleViewFrontendListTileLayout = WMAPP.Extension.View.LayoutView.extend({
        className: 'wmapp-articleview-frontend-list-tile-layout row',
        template: _.template('<div class="wmapp-articleview-frontend-list-tile-layout-main small-12 medium-9 columns"></div>' +
        '<div class="wmapp-articleview-frontend-list-tile-layout-side small-12 medium-3 columns"></div>'),
        regions: {
            main:    '.wmapp-articleview-frontend-list-tile-layout-main',
            side:    '.wmapp-articleview-frontend-list-tile-layout-side'
        }
    });

    /**
     * Main article list layout view
     */
    View.ArticleViewFrontendListTileMainListLayout = WMAPP.Extension.View.LayoutView.extend({
        className: 'wmapp-articleview-frontend-list-tile-main-list-layout',
        template: _.template('<div class="wmapp-articleview-frontend-list-tile-main-list-layout-header"></div>' +
        '<div class="wmapp-articleview-frontend-list-tile-main-list-layout-collection"></div>' +
        '<div class="wmapp-articleview-frontend-list-tile-main-list-layout-pagination"></div>'),
        regions: {
            header:      '.wmapp-articleview-frontend-list-tile-main-list-layout-header',
            articlelist: '.wmapp-articleview-frontend-list-tile-main-list-layout-collection', // CANNOT USE collection, naming collision with marionette predefined attribute
            pagination:  '.wmapp-articleview-frontend-list-tile-main-list-layout-pagination'
        }
    });

    /**
     * Main article list header
     */
    View.ArticleViewFrontendListTileMainListHeader = WMAPP.Extension.View.ItemView.extend({
        className: 'wmapp-articleview-frontend-list-tile-main-list-header',
        template: function (model) {
            var tmplStr = '';

            var root = '';
            if (Backbone.history.root) {
                root = Backbone.history.root
            }

            if (model.title) {
                tmplStr += '<a class="wmapp-articleview-frontend-list-tile-main-list-header-title" href="' + root + '"><h1 class="wmapp-articleview-frontend-list-tile-main-list-header-title">' + model.title + '</h1></a>';
            }

            if (model.intro) {
                tmplStr += '<p class="wmapp-articleview-frontend-list-tile-main-list-header-intro">' + model.intro + '</p>';
            }

            return tmplStr;
        },
    });

    /**
     * Main article list pagination
     */
    View.ArticleViewFrontendListTileMainListPagination = WMAPP.Extension.View.PaginationView.extend({});

    /**
     * Main article list item single category view
     */
    View.ArticleViewFrontendListTileMainListCollectionItemCategory = WMAPP.Extension.View.ItemView.extend({
        tagName: 'dd',
        className: 'label',
        template: function(model) {
            var tmplStr = '<a href="' + Backbone.history.root + model.slug + '/?et=category">' + model.name + '</a>';
            return tmplStr;
        },

        triggers: {
            "click a": "trigger:category:clicked"
        }

    });

    /**
     * Main article list item single article view
     */
    View.ArticleViewFrontendListTileMainListCollectionItem = WMAPP.Extension.View.CompositeView.extend({
        className: 'panel wmapp-articleview-frontend-list-tile-main-list-collection-item',
        tagName: 'li',
        childView: View.ArticleViewFrontendListTileMainListCollectionItemCategory,
        childViewContainer: '.wmapp-articleview-frontend-list-tile-main-list-collection-item-categories',

        initialize: function(options) {
            if (options.display_categories) {
                this.collection = options.model.get('_categorys');
            }
        },

        template: function(model) {

            var tmplStr = '',
                image = model._thumbnail_image,
                categories = model._categorys;

            tmplStr += '<div class="clearfix">';

            // display the thumbnail
            if (image && model.display_thumbnail) {
                var thumbnail = image.file,
                    plugin_id = image.plugin_id;

                if (thumbnail) {
                    tmplStr += '<div class="left text-center wmapp-articleview-frontend-list-tile-main-list-collection-item-thumbnail">' +
                    '<img class="th" src="/site/img/' + ((plugin_id && plugin_id != 0) ? plugin_id + '/' : '' ) + '/' + thumbnail +'"></img></div>';
                }
            }

            tmplStr += '<div class="left wmapp-articleview-frontend-list-tile-main-list-collection-item-details">';

            // display the article title
            if(model.name && model.slug) {
                tmplStr += '<a class="wmapp-articleview-frontend-list-tile-main-list-collection-item-name" href="' + Backbone.history.root + model.slug + '"><h3>' + model.name + '</h3></a>';
            }

            // display the article details (author, date)
            if (model.display_details) {
                tmplStr += '<h3><small>';
                if (model.author_id) {
                    if (model._author_id.google)
                    {
                        tmplStr += 'by <a href="' + model._author_id.google + '?rel=author">' + model._author_id.member_name + '</a>';
                    } else {
                        tmplStr += 'by ' + model._author_id.member_name;
                    }
                }
                
                if (model.published_date) {
                    if (model.author_id) {
                        tmplStr += ', ';
                    }
                    tmplStr += moment(model.published_date, "DD-MM-YYYY HH:mm:ss").format('MMM Do, YYYY');
                } else if (model.created) {
                    if (model.author_id) {
                        tmplStr += ', ';
                    }
                    tmplStr += moment(model.created).format('MMM Do, YYYY');
                }
                tmplStr += '</small></h3>';
            }

            tmplStr += '</div></div>';

            //display the article intro
            if (model.display_intro) {
                if (model.intro) {
                    tmplStr += '<div class="wmapp-articleview-frontend-list-tile-main-list-collection-item-intro">' + model.intro + '</div>';
                }
            }

            tmplStr += '<div class="row wmapp-articleview-frontend-list-tile-main-list-collection-item-additional">' +
            '<dl class="medium-10 small-8 columns wmapp-articleview-frontend-list-tile-main-list-collection-item-categories"></dl>';

            //display the comments

            if (model.display_comments) {
                var comments = model._comments;
                tmplStr += '<p class="secondary label medium-2 small-4 columns wmapp-articleview-frontend-list-tile-main-list-collection-item-comments">';
                if (comments) {
                    var length = comments.length,
                        text = ' Comments';

                    if (length === 1) {
                        text = ' Comment';
                    }

                    tmplStr += length + text;
                }
                tmplStr += '</p>';
            }

            tmplStr += '</div>';

            return tmplStr;
        },

        templateHelpers: function () {
            return {
                number_of_articles: this.options.number_of_articles,
                number_of_related_articles: this.options.number_of_related_articles,
                display_categories: this.options.display_categories,
                display_thumbnail: this.options.display_thumbnail,
                display_comments: this.options.display_comments,
                display_details: this.options.display_details,
                display_intro: this.options.display_intro
            }
        },

        triggers: {
            "click a.wmapp-articleview-frontend-list-tile-main-list-collection-item-name": "trigger:name:clicked",
            "click div.wmapp-articleview-frontend-list-tile-main-list-collection-item-thumbnail": "trigger:thumbnail:clicked",
        }
    });

    /**
     * Main article list collection
     */
    View.ArticleViewFrontendListTileMainListCollection = WMAPP.Extension.View.CollectionView.extend({
        className: 'no-bullet wmapp-articleview-frontend-list-tile-main-list-collection',
        tagName: 'ul',
        childView: View.ArticleViewFrontendListTileMainListCollectionItem,
        initialize: function(options) {
            this.tileOptions = options.tileOptions;
        },

        childViewOptions: function () {
            return this.tileOptions;
        }
    });


    /**
     * Side layout view
     */
    View.ArticleViewFrontendListTileSideLayout = WMAPP.Extension.View.LayoutView.extend({
        className: 'wmapp-articleview-frontend-list-tile-side-layout',
        template: _.template('<div class="wmapp-articleview-frontend-list-tile-side-layout-search"></div>' +
        '<div class="wmapp-articleview-frontend-list-tile-side-layout-categories"></div>' +
        '<div class="wmapp-articleview-frontend-list-tile-side-layout-form"></div>' +
        '<div class="wmapp-articleview-frontend-list-tile-side-layout-related"></div>'),
        regions: {
            search: '.wmapp-articleview-frontend-list-tile-side-layout-search',
            categories: '.wmapp-articleview-frontend-list-tile-side-layout-categories',
            form: '.wmapp-articleview-frontend-list-tile-side-layout-form',
            related: '.wmapp-articleview-frontend-list-tile-side-layout-related'
        }
    });
    
    /**
     * Side form item view
     */
    View.ArticleViewFrontendListTileSideForm = WMAPP.Extension.View.ItemView.extend({
    	initialize: function() {
    		this.tile = 'form_display_tile';
    		this.tileId = this.tile + '-' + moment().unix();
    	},
        className: 'wmapp-articleview-frontend-list-tile-side-form',
        template: function(data){
        	var tmplStr = 	'<div data-tile-app="' + data.tile + '">' +
							'	<div class="wmapp-tile" data-tile-type="' + data.tile + '" data-page-tile-id="'+data.tileId+'">' +
							'		<div id="wmappTileInner'+data.tileId+'"></div>' +
							'	</div>' +
							'</div>';
            return tmplStr;
        },
        templateHelpers: function() {
        	return {
        		tileId: this.tileId,
        		tile: this.tile,
        	}
        },
        onRender: function() {
        	var options = {  
    		    "regionId":"#wmappTileInner"+this.tileId,
    		    "model": {  
    		        "form_id": this.options.data.model.id,
    		        "show_border": this.options.tileOptions.show_border,
    		        "show_title": this.options.tileOptions.show_title,
    		        "submit_text": this.options.tileOptions.submit_text,
    		        "thankyou": this.options.tileOptions.thankyou,
    		        "thankyou_page": this.options.tileOptions.thankyou_page,
    		        "category": this.options.tileOptions.category,
    		        "action": this.options.tileOptions.action,
    		        "label": this.options.tileOptions.label,
    		        "conversational_form": this.options.tileOptions.conversational_form,
    		        "app_default_tile":null,
    		        "_form_id": this.options.data.model,
    		    }
    		}
        	WMAPP.renderContentArea(this.$el[0], options);
        },
        onBeforeDestroy: function() {
        	WMAPP.destroyContentArea(this.$el[0]);
        },
    });

    /**
     * Side search item view
     */
    View.ArticleViewFrontendListTileSideSearch = WMAPP.Extension.View.ItemView.extend({
        //TODO get that search done
        className: 'wmapp-articleview-frontend-list-tile-side-search',
        template: function(data){
            var searchString = '';
            if (data && data.options && data.options.searchString) {
                searchString = data.options.searchString;
            }
            var tmplStr = '<form class="wmapp-articleview-frontend-list-tile-side-search-form"><h3 class="wmapp-articleview-frontend-list-tile-side-layout-search-title">Search</h3>' +
                '<input class="wmapp-articleview-frontend-list-tile-side-search-name" value="' + searchString + '" type="search">' +
                '<button type="submit" class="small wmapp-articleview-frontend-list-tile-side-search-button">Search</button></form>'
            return tmplStr;
        },

        ui: {
            searchField: "input.wmapp-articleview-frontend-list-tile-side-search-name"
        },

        triggers: {
            "submit form.wmapp-articleview-frontend-list-tile-side-search-form": {
                event: "trigger:search:clicked",
                preventDefault: true,
                stopPropagation: true
            }
        },

        templateHelpers: function() {
            return {
                options: this.options
            }
        }
    });

    //TODO search form

    /**
     * Side categories item view
     */
    View.ArticleViewFrontendListTileSideCategoriesItem = WMAPP.Extension.View.ItemView.extend({
        className: 'wmapp-articleview-frontend-list-tile-side-categories-item',
        tagName: 'li',
        template: function(model){
            var tmplStr = '';
            // show rss if it's set in tile options
            if (model.rss_url) {
                tmplStr += '<a class="wmapp-articleview-frontend-list-tile-side-layout-categories-rssicon-link right" href="' + model.rss_url + '/' + model.slug + '" target="blank">' +
                '<img class="wmapp-articleview-frontend-list-tile-side-layout-categories-rssicon" src="/img/icons/Rss.png"></a>'
            }

            tmplStr += '<a class="wmapp-articleview-frontend-list-tile-side-categories-item-link" href="' + Backbone.history.root + model.slug + '/?et=category">' + model.name + '</a>';

            return tmplStr;
        },

        triggers: {
            "click .wmapp-articleview-frontend-list-tile-side-categories-item-link": "trigger:category:clicked"
        },

        templateHelpers: function() {
            return {
                rss_url: this.options.rss_url
            }
        }

    });

    /**
     * Side categories
     */
    View.ArticleViewFrontendListTileSideCategories = WMAPP.Extension.View.CompositeView.extend({
        //TODO add show_rss to tile options?
        className: 'no-bullet wmapp-articleview-frontend-list-tile-side-categories',
        tagName: 'div',
        childViewContainer: '.wmapp-articleview-frontend-list-tile-side-layout-categories-list',
        childView: View.ArticleViewFrontendListTileSideCategoriesItem,
        template: function (model) {
            var tmplStr = '<h3 class="wmapp-articleview-frontend-list-tile-side-layout-categories-title">';
            if (model.rss_url) {
                tmplStr += '<a class="wmapp-articleview-frontend-list-tile-side-layout-categories-rssicon-link right" href="' + model.rss_url + '" target="blank">' +
                '<img class="wmapp-articleview-frontend-list-tile-side-layout-categories-rssicon" src="/img/icons/Rss.png"></a>'
            }
            tmplStr += 'Categories</h3><ul class="wmapp-articleview-frontend-list-tile-side-layout-categories-list"></ul>';

            return tmplStr;
        },

        initialize: function(options) {
            this.tileOptions = options.tileOptions;
        },

        templateHelpers: function() {
            if (this.tileOptions)
            return {
                rss_url: this.tileOptions.rss_url
            }
        },

        childViewOptions: function() {
            return this.tileOptions;

        }
    });

    /**
     * Side related articles
     */
    View.ArticleViewFrontendListTileSideRelatedItem = WMAPP.Extension.View.ItemView.extend({
        className: 'panel wmapp-articleview-frontend-list-tile-side-related-item',
        tagName: 'li',
        template: function(model) {
            var tmplStr = '',
                image = model._social_media_image;

            if (image)
            {
                var thumbnail = image.file,
                    plugin_id = image.plugin_id;

                if (thumbnail) {
                    tmplStr += '<div><img class="th" src="/site/img/' + ((plugin_id && plugin_id != 0) ? plugin_id + '/' : '' ) + '/' + thumbnail +'"></img></div>';
                }
            }
            if(model.name && model.slug) {
                tmplStr += '<a class="wmapp-articleview-frontend-list-tile-side-related-item-name" href="/' + model._silo_id.slug + '/' + model.slug + '"><h4>' + model.name + '</h4></a>';
            }

            if (model.intro) {
                tmplStr += '<h4 class="wmapp-articleview-frontend-list-tile-side-related-item-intro"><small>' + _.string.truncate(model.intro, 100) + '</small></h4>';
            }

            return tmplStr;
        },
});

    /**
     * Side related articles
     */
    View.ArticleViewFrontendListTileSideRelated = WMAPP.Extension.View.CompositeView.extend({
        className: 'no-bullet wmapp-articleview-frontend-list-tile-side-related',
        tagName: 'ul',
        childView: View.ArticleViewFrontendListTileSideRelatedItem,
        template: _.template('<h3 class="wmapp-articleview-frontend-list-tile-side-layout-related-title">Related Articles</h3>'),

        initialize: function(){
        }
    });

    /**
     * Main article layout
     */
    View.ArticleViewFrontendListTileMainArticleLayout = WMAPP.Extension.View.LayoutView.extend({
        className: 'wmapp-articleview-frontend-list-tile-main-article-layout',
        template: _.template('<div class="wmapp-articleview-frontend-list-tile-main-article-layout-header"></div>' +
        '<div class="wmapp-articleview-frontend-list-tile-main-article-layout-social"></div>' +
        '<div class="wmapp-articleview-frontend-list-tile-main-article-layout-content"></div>' +
        '<div class="wmapp-articleview-frontend-list-tile-main-article-layout-categories"></div>' +
        '<div class="wmapp-articleview-frontend-list-tile-main-article-layout-comments"></div>'),
        regions: {
            header: '.wmapp-articleview-frontend-list-tile-main-article-layout-header',
            content: '.wmapp-articleview-frontend-list-tile-main-article-layout-content',
            categories: '.wmapp-articleview-frontend-list-tile-main-article-layout-categories',
            social: '.wmapp-articleview-frontend-list-tile-main-article-layout-social',
            comments: '.wmapp-articleview-frontend-list-tile-main-article-layout-comments'
        }
    });


    /**
     * Social icons single item
     */
    View.ArticleViewFrontentListTileMainArticleSocialIcon = WMAPP.Extension.View.ItemView.extend({
        tagName: 'li',
        className: 'wmapp-articleview-social',
        template: function(data) {
            var tmplStr = '';
            tmplStr += '<button class="wmapp-social-icon small sharrre ' + data.service + '">&zwj;<i class="social fa ' + data.icon + '"></i></button>';
            return tmplStr;
        },

        ui: {
            icon: '.wmapp-social-icon'
        },

        onShow: function() {
            var that = this;
            this.ui.icon.sharrre({
                share: {
                    facebook: this.model.get('service') === 'facebook',
                    googlePlus: this.model.get('service') === 'googlePlus',
                    twitter: this.model.get('service') === 'twitter',
                    linkedin: this.model.get('service') === 'linkedin',
                    pinterest: this.model.get('service') === 'pinterest',
                },
                url: this.model.get('url'),
                text: this.model.get('text'),
                enableCounter: false,
                enableHover: false,
                enableTracking: false,
                buttons: {},
                click: function (api, options) {
                    api.openPopup(that.model.get('service'));
                }
            });
        }
    });

    /**
     * Social icons list
     */
    View.ArticleViewFrontendListTileMainArticleSocial = WMAPP.Extension.View.CollectionView.extend({
        childView: View.ArticleViewFrontentListTileMainArticleSocialIcon,
        tagName: 'ul',
        className: 'wmapp-articleview-social button-group',
        initialize: function() {
        	var that = this;
        	var text;
        	var url;
        	function modifyTheString(message) {
        		if(message.length > 0){
        			message = message.last().get('social_message');
        			text = message.substr(0, message.lastIndexOf(' '));
            		url = message.substr(message.lastIndexOf(' ') + 1);
            		if (!(/https?:\/\/.*/).test(url)) {
            			url = 'http://' + url;
            		}
        		} else {
        			text = 'Check out this article';
        			//manually create slug if shortlink is unavailable
        			url = document.origin + '/' + that.model.get('_silo_id').get('slug') + '/' + that.model.get('slug');
        		}
        		
        	} 
            var iconCollection = new WMAPP.Extension.Model.Collection();
            
            if (this.options.tileOptions) {
                if (this.options.tileOptions.display_facebook) {
                	var facebookMessage = new Backbone.Collection(this.model.get('_social_messages').filter(function(model) {
						return model.get('social_network').toString() == '1';
					}));
                	modifyTheString(facebookMessage);
                    iconCollection.add({
                        text: text,
                        service: 'facebook',
                        icon: 'fa-facebook',
                        url: url
                    })
                }

                if (this.options.tileOptions.display_twitter) {
                	var twitterMessage = new Backbone.Collection(this.model.get('_social_messages').filter(function(model) {
						return model.get('social_network').toString() == '6';
					}));
                	modifyTheString(twitterMessage);
                    iconCollection.add({
                        text: text,
                        service: 'twitter',
                        icon: 'fa-twitter',
                        url: url
                    })
                }

                if (this.options.tileOptions.display_google) {
                	var googleMessage = new Backbone.Collection(this.model.get('_social_messages').filter(function(model) {
						return model.get('social_network').toString() == '2';
					}));
            		modifyTheString(googleMessage);
                    iconCollection.add({
                        text: text,
                        service: 'googlePlus',
                        icon: 'fa-google-plus',
                        url: url
                    })
                }

                if (this.options.tileOptions.display_linkedin) {
                	var linkedinMessage = new Backbone.Collection(this.model.get('_social_messages').filter(function(model) {
						return model.get('social_network').toString() == '4';
					}));
            		modifyTheString(linkedinMessage);
                    iconCollection.add({
                        text: text,
                        service: 'linkedin',
                        icon: 'fa-linkedin',
                        url: url
                    })
                }

                if (this.options.tileOptions.display_pinterest) {
                	var pinterestMessage = new Backbone.Collection(this.model.get('_social_messages').where({'social_network' : 5}));
            		modifyTheString(pinterestMessage);
                    iconCollection.add({
                        text: text,
                        service: 'pinterest',
                        icon: 'fa-pinterest',
                        url: url
                    })
                }
            }

            this.collection = iconCollection;
        },
        
    });

    /**
     * Main article header
     */
    View.ArticleViewFrontendListTileMainArticleHeader = WMAPP.Extension.View.ItemView.extend({
        className: 'clearfix wmapp-articleview-frontend-list-tile-main-article-header',
        //TODO class names
        initialize : function(options) {
            this.tileOptions = options.tileOptions;
            this.model.on("change", this.render);
        },

        modelEvents: {
            'change': 'render'
        },

        template: function (model) {
            var tmplStr = '',
                thumb_image = model._thumbnail_image,
                social_media_image = model._social_media_image;

            if (model) {
                if (social_media_image && model.display_social_media_image) {
                    var sm_image = social_media_image.file,
                        plugin_id = social_media_image.plugin_id;

                    if (sm_image) {
                        tmplStr += '<div class="text-center wmapp-articleview-frontend-list-tile-main-article-header-social-media-image"><img src="/site/img/' + ((plugin_id && plugin_id != 0) ? plugin_id + '/' : '' ) + '/' + sm_image +'"></img></div>';
                    }
                }
            }

            tmplStr += '<div class="wmapp-articleview-frontend-list-tile-main-article-header-wrap">';
            tmplStr += '<button class="secondary right wmapp-articleview-frontend-list-tile-main-article-header-back ">Back</button>';

            if (model) {
                if (thumb_image && model.display_thumbnail) {
                    var thumbnail = thumb_image.file,
                        plugin_id = thumb_image.plugin_id;

                    if (thumbnail) {
                        tmplStr += '<div class="left text-center wmapp-articleview-frontend-list-tile-main-article-header-thumbnail"><img class="th" src="/site/img/' + ((plugin_id && plugin_id != 0) ? plugin_id + '/' : '' ) + '/' + thumbnail +'"></img></div>';
                    }
                }

                tmplStr += '<div class="left">';

                tmplStr += '<div class="wmapp-articleview-frontend-list-tile-main-article-header-details">';
                if(model.name) {
                    tmplStr += '<h1>' + model.name + '</h1>';
                }

                if (model.display_details) {
                    tmplStr += '<h3><small>';
                    if (model.author_id) {
                        if (model._author_id.google)
                        {
                            tmplStr += 'by <a href="' + model._author_id.google + '?rel=author">' + model._author_id.member_name + '</a>';
                        } else {
                            tmplStr += 'by ' + model._author_id.member_name;
                        }
                    }

                    if (model.published_date) {
                        if (model.author_id) {
                            tmplStr += ', ';
                        }
                        tmplStr += moment(model.published_date, "DD-MM-YYYY HH:mm:ss").format('MMM Do, YYYY');
                    } else if (model.created) {
                        if (model.author_id) {
                            tmplStr += ', ';
                        }
                        tmplStr += moment(model.created).format('MMM Do, YYYY');
                    }
                    tmplStr += '</small></h3>';
                }

                tmplStr += '</div>';
                tmplStr += '</div>';
                tmplStr += '</div>';
            }
            else {
                tmplStr += 'Article does not exist in the system, or you do not have permission to view it';
            }

            return tmplStr;
        },

        templateHelpers: function () {
            return {
                display_thumbnail: this.tileOptions.display_thumbnail,
                display_social_media_image: this.tileOptions.display_social_media_image,
                display_details: this.tileOptions.display_details,
                tileOptions: this.tileOptions
            }
        },

        events: {
            "click button.wmapp-articleview-frontend-list-tile-main-article-header-back": "onBack"

        },

		onBack: function(){
			this.trigger('trigger:back:clicked');
		}
    });

    /**
     * Main article content
     */
    View.ArticleViewFrontendListTileMainArticleContent = WMAPP.Extension.View.AbstractContentArea.extend();

    /**
     * Main article categories item view
     */
    View.ArticleViewFrontendListTileMainArticleCategoriesItem = WMAPP.Extension.View.ItemView.extend({
        className: 'label wmapp-articleview-frontend-list-tile-main-article-categories-item',
        tagName: 'dd',
        template: function(model) {
            var tmplStr = '<a href="' + Backbone.history.root + model.slug + '/?et=category">' + model.name + '</a>';
            return tmplStr;
        },

        triggers: {
            "click a": "trigger:category:clicked"
        }
    });

    /**
     * Main article categories
     * Before creating this view, the category collection MUST be initialised
     */
    View.ArticleViewFrontendListTileMainArticleCategories = WMAPP.Extension.View.CollectionView.extend({
        className: 'wmapp-articleview-frontend-list-tile-main-article-categories',
        tagName: 'dl',
        childView: View.ArticleViewFrontendListTileMainArticleCategoriesItem,
        initialize: function(options){
            this.tileOptions = options.tileOptions;
            this.model.on("change:_categorys", this.render);
        }
    });

    /**
     * Main article comments tree item
     */
    View.ArticleViewFrontendListTileMainArticleCommentsItem = WMAPP.Extension.View.CompositeView.extend({
        tagName: 'li',
        className: 'panel wmapp-articleview-frontend-list-tile-main-article-comments-item-content',
        template: function(model){
            var tmplStr = '<h3><small><strong>';
            if (model._user) {
                //TODO member_name is broken at the moment, to be fixed shortly
                tmplStr += model._user.member_name
            } else {
                tmplStr += 'User'
            }

            tmplStr += '</strong> on ' + moment(model.created).format('MMM Do, YYYY') +
                ' - ' + moment(model.created).fromNow() + '</small></h3>' +
                '<p>' + model.comment + '</p>';

            //TODO hardcoded comment depth level
            if (model.depth_level < 2 && WMAPP.user.id > 0) {
                tmplStr += '<button class="tiny wmapp-articleview-frontend-list-tile-main-article-comments-item-reply-btn">Reply</button>';

                tmplStr += '<div class="wmapp-articleview-frontend-list-tile-main-article-comments-item-reply-box clearfix" hidden="true">' +
                '<textarea class="wmapp-articleview-frontend-list-tile-main-article-comments-item-reply-box-text" placeholder="Reply to this comment"></textarea>' +
                '<button class="wmapp-articleview-frontend-list-tile-main-article-comments-item-reply-box-btn tiny right disabled">Post</button></div>';
            }

            return tmplStr;

        },

        ui: {
            replyBox: ".wmapp-articleview-frontend-list-tile-main-article-comments-item-reply-box",
            textArea: "textarea.wmapp-articleview-frontend-list-tile-main-article-comments-item-reply-box-text",
            postButton: "button.wmapp-articleview-frontend-list-tile-main-article-comments-item-reply-box-btn"
        },

        initialize: function(options){
            this.collection = options.model.get('_childrens');
        },

        onBeforeAddChild: function(childView){
            childView.options.depth_level = this.options.depth_level + 1;
        },

        templateHelpers: function(){
            return {
                depth_level: this.options.depth_level
            }
        },

        events: {
            "click button.wmapp-articleview-frontend-list-tile-main-article-comments-item-reply-btn" : "onShowReplyBox",
            "click button.wmapp-articleview-frontend-list-tile-main-article-comments-item-reply-box-btn" : "onCommentReply",
            'keyup @ui.textArea': 'onChangeTextArea'
        },

        onShowReplyBox: function(e){
            e.preventDefault();
            e.stopPropagation();
            $(this.ui.replyBox).toggle();
        },

        onCommentReply: function(e){
            if (!$(this.ui.postButton).hasClass("disabled")) {
                this.trigger('trigger:comment:reply:clicked', this.model, $(this.ui.textArea).val());
                $(this.ui.textArea).val('');
                $(this.ui.replyBox).hide();
            }
        },

        onChangeTextArea: function(e) {
            e.stopPropagation();
            if ($(this.ui.textArea).val()) {
                $(this.ui.postButton).removeClass("disabled");
            } else {
                $(this.ui.postButton).addClass("disabled");
            }
        }

    });

    /**
     * Main article comments tree
     */
    View.ArticleViewFrontendListTileMainArticleComments = WMAPP.Extension.View.CompositeView.extend({
        childView: View.ArticleViewFrontendListTileMainArticleCommentsItem,
        childViewContainer: '.wmapp-articleview-frontend-list-tile-main-article-comments-item',
        tagName: 'ul',
        className: 'no-bullet',
        template: function(){
            var tmplStr = '<h3>Comments</h3>';
            if (WMAPP.user.id > 0) {
                tmplStr += '<div class="wmapp-articleview-frontend-list-tile-main-article-comments-reply-box clearfix">' +
                '<textarea class="wmapp-articleview-frontend-list-tile-main-article-comments-reply-box-text" placeholder="Reply to this article"></textarea>' +
                '<button class="wmapp-articleview-frontend-list-tile-main-article-comments-reply-box-btn disabled tiny right">Post</button></div>';
            } else {
                tmplStr += '<p>You must be logged in to leave a comment.</p><p><a href="/register">Click here</a> to login or register</p>';
            }

            tmplStr += '<div class="wmapp-articleview-frontend-list-tile-main-article-comments-item">';

            return tmplStr;
        },

        collectionEvents: {
            'reset': 'render'
        },

        ui: {
            textArea: "textarea.wmapp-articleview-frontend-list-tile-main-article-comments-reply-box-text",
            postButton: "button.wmapp-articleview-frontend-list-tile-main-article-comments-reply-box-btn"
        },

        initialize : function(options) {
            this.tileOptions = options.tileOptions;
        },

        onBeforeAddChild: function(childView) {
            childView.options.depth_level = 0;
        },

        events: {
            "click button.wmapp-articleview-frontend-list-tile-main-article-comments-reply-box-btn": "onArticleReply",
            'keyup @ui.textArea': 'onChangeTextArea'
        },

        onArticleReply: function(e) {
            if (!$(this.ui.postButton).hasClass("disabled")) {
                this.trigger('trigger:article:reply:clicked', this.model, $(this.ui.textArea).val());
                $(this.ui.textArea).val('');
            }
        },

        onChangeTextArea: function(e) {
            e.stopPropagation();
            if ($(this.ui.textArea).val()) {
                $(this.ui.postButton).removeClass("disabled");
            } else {
                $(this.ui.postButton).addClass("disabled");
            }
        }
    });


    //Feed tile

    /**
     * Main article list item single category view
     */
    View.ArticleViewFrontendFeedTileMainListCollectionItemCategory = WMAPP.Extension.View.ItemView.extend({
        tagName: 'dd',
        className: 'label',
        template: function(model) {
            var tmplStr = '<a href="' + model.page + '/' + model.slug + '/?et=category">' + model.name + '</a>';

            return tmplStr;
        },

        templateHelpers: function () {
            return {
                page: this.options.page
            }
        }
    });

    /**
     * Main article feed list item single article view
     */
    View.ArticleViewFrontendFeedTileMainListCollectionItem = WMAPP.Extension.View.ItemView.extend({
        className: 'panel wmapp-articleview-frontend-feed-tile-main-list-collection-item',
        tagName: 'li',
        template: function(model) {
        	console.log(model);
        	
            var tmplStr = '',
                image = model._social_media_image;

            if (image && model.display_thumbnail)
            {
                var thumbnail = image.file,
                    plugin_id = image.plugin_id;

                if (thumbnail) {
                    tmplStr += '<div><img src="/site/img/' + ((plugin_id && plugin_id != 0) ? plugin_id + '/' : '' ) + '/' + thumbnail +'"></img></div>';
                }
            }

            if(model.name && model.slug) {
            	tmplStr += '<a class="wmapp-articleview-frontend-feed-tile-main-list-collection-item-name" href="' + model.page + '/' + model.slug + '"><h4>' + model.name + '</h4></a>';
                //tmplStr += '<a class="wmapp-articleview-frontend-list-tile-side-related-item-name" href="' + Backbone.history.root + model.slug + '"><h4>' + model.name + '</h4></a>';
            }
            
            // display the article details (author, date)
            if (model.display_author || model.display_date) {
                tmplStr += '<h3><small>';
                if (model.display_author && model.author_id) {
                    if (model._author_id.google)
                    {
                        tmplStr += 'by <a href="' + model._author_id.google + '?rel=author">' + model._author_id.member_name + '</a>';
                    } else {
                        tmplStr += 'by ' + model._author_id.member_name;
                    }
                }
                
                if (model.display_date) {
                    if (model.published_date) {
                        if (model.author_id) {
                            tmplStr += ', ';
                        }
                        tmplStr += moment(model.published_date, "DD-MM-YYYY HH:mm:ss").format('MMM Do, YYYY');
                    } else if (model.created) {
                        if (model.author_id) {
                            tmplStr += ', ';
                        }
                        tmplStr += moment(model.created).format('MMM Do, YYYY');
                    }
                }
                tmplStr += '</small></h3>';
            }            

            if (model.intro) {
                tmplStr += '<h4 class="wmapp-articleview-frontend-feed-tile-side-related-item-intro"><small>' + _.string.truncate(model.intro, 100) + '</small></h4>';
            }

            return tmplStr;
        },

        templateHelpers: function () {
            return {
                display_categories: this.options.display_categories,
                display_thumbnail: this.options.display_thumbnail,
                display_comments: this.options.display_comments,
                display_author: this.options.display_author,
                display_date: this.options.display_date,
                category: this.options.category,
                number_of_intro_characters: this.options.number_of_intro_characters,
                page: this.options.page

            }
        },
        
        events: {
            "click button.wmapp-articleview-frontend-feed-tile-main-list-collection-item-button" : "onReadArticle",
        }, 
        
        onReadArticle: function(e) {
        	location.href = $(e.target).data('href');
        }
    });    

    /**
     * Main article list collection
     */
    View.ArticleViewFrontendFeedTileMainListCollection = WMAPP.Extension.View.CollectionView.extend({
        className: 'no-bullet wmapp-articleview-frontend-feed-tile-main-list-collection',
        tagName: 'ul',
        childView: View.ArticleViewFrontendFeedTileMainListCollectionItem,
        initialize: function(options) {
            this.tileOptions = options.tileOptions;
        },

        childViewOptions: function () {
            return this.tileOptions;
        }
    });
});
