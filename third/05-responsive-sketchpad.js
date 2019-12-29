(function ($) {
    $.fn.sketchpad = function (options) {
        // Canvas info
        var canvas = this;
        
        canvas.readOnly = false;
        var ctx = $(this)[0].getContext('2d');

        var baseWidth = 0;
        var baseHeight = 0;        
        
        var drawingTool = 'marker';
        var onDrawEnd = null;
        
        // Default aspect ratio
        var aspectRatio = 1;

        // For storing strokes
        var strokes = [];

        // Whether or not currently drawing
        var sketching = false;

        // Default Context
        var lineColor = 'black';
        var lineSize = 5;
        var lineCap = 'round';
        var lineJoin = 'round';
        var lineMiterLimit = 10;
        var background = false;
        var backgroundImage = false;

        // Array for storing strokes that were undone
        var undo = [];
        
        $(window).resize( respondCanvas );

        // Resize canvas with window
        canvas.parent().resize(function (e) {
            var width = canvas.parent().width();
            var height = width / aspectRatio;

            setSize(width, height);
            redraw(ctx, canvas);
        });

        // Return the mouse/touch location
        function getCursor(element, event) {
            var cur = {x: 0, y: 0};
            if (event.type.indexOf('touch') !== -1) {
                cur.x = event.originalEvent.touches[0].pageX;
                cur.y = event.originalEvent.touches[0].pageY;
            } else {
                cur.x = event.pageX;
                cur.y = event.pageY;
            }
            return {
                x: (cur.x - $(element).offset().left) / $(element).width(),
                y: (cur.y - $(element).offset().top) / $(element).height()
            }
        }

        // Set the canvas size
        function setSize(w, h) {
            lineSize *= (w / canvas.width());
            canvas.width(w);
            canvas.height(h);
            
            canvas[0].setAttribute('width', w);
            canvas[0].setAttribute('height', h);
        }

        // On mouse down, create new stroke, push start location
        var startEvent = 'mousedown touchstart ';
        canvas.on(startEvent, function (e) {
            if (canvas.readOnly) {
                return false;
            }

            if (e.type == 'touchstart') {
                e.preventDefault();
            } else {
                e.originalEvent.preventDefault();
            }

            sketching = true;
            undo = []; // Clear undo strokes

            strokes.push({
                stroke: [],
                tool: drawingTool,
                color: lineColor,
                size: lineSize / $(this).width(),
                cap: lineCap,
                join: lineJoin,
                miterLimit: lineMiterLimit
            });

            var cursor = getCursor(this, e);

            strokes[strokes.length - 1].stroke.push({
                x: cursor.x,
                y: cursor.y
            });

            if (drawingTool === 'stamp') {
            	var radius = lineSize / $(this).width() * 3;
                var width = $(canvas).width();
                var height = $(canvas).height();            	

                strokes[strokes.length - 1].stroke.push({
                    x: (cursor.x-radius),
                    y: (cursor.y-radius)
                });  
                strokes[strokes.length - 1].stroke.push({
                    x: cursor.x,
                    y: cursor.y
                }); 
                
                strokes[strokes.length - 1].stroke.push({
                    x: (cursor.x+radius),
                    y: (cursor.y-radius)
                });  
                strokes[strokes.length - 1].stroke.push({
                    x: cursor.x,
                    y: cursor.y
                });
                
                strokes[strokes.length - 1].stroke.push({
                    x: (cursor.x-radius),
                    y: (cursor.y+radius)
                });  
                strokes[strokes.length - 1].stroke.push({
                    x: cursor.x,
                    y: cursor.y
                }); 
                
                strokes[strokes.length - 1].stroke.push({
                    x: (cursor.x+radius),
                    y: (cursor.y+radius)
                });  
                strokes[strokes.length - 1].stroke.push({
                    x: cursor.x,
                    y: cursor.y
                });
            }
            
            redraw(ctx, canvas);
        });

        // On mouse move, record movements
        var moveEvent = 'mousemove touchmove ';
        canvas.on(moveEvent, function (e) {
            if (canvas.readOnly) {
                return false;
            }

            var cursor = getCursor(this, e);

            if (sketching && drawingTool === 'marker') {
                strokes[strokes.length - 1].stroke.push({
                    x: cursor.x,
                    y: cursor.y
                });
                redraw(ctx, canvas);
            }
        });

        // On mouse up, end stroke
        var endEvent = 'mouseup mouseleave touchend ';
        canvas.on(endEvent, function (e) {
            sketching = false;
            onDrawEnd();
        });

        function respondCanvas() { 
			if (options.background && _.isObject(options.background) && options.background.get('id')) {
				background = options.background;
				backgroundImage = canvas.parent().find('img');
				
	            // Set canvas size
				aspectRatio = background.get('width') / background.get('height');
				if (background.get('width') > canvas.parent().width()) {
					var width = canvas.parent().width();
				} else {
					var width = background.get('width');
				}
				var height = width / aspectRatio;
			} else {
	            // Set canvas size
	            var width = canvas.parent().width();
	            var height = width / aspectRatio;				
			}
			
			setSize(width, height);
			redraw(ctx, canvas);
        }        
        
        function redraw(context, canvas) {
            var width = $(canvas).width();
            var height = $(canvas).height();

            context.clearRect(0, 0, width, height); // Clear Canvas
            
			if (background && _.isObject(background) && backgroundImage) {
				context.drawImage(backgroundImage[0],0,0,background.get('width'),background.get('height'),0,0,width,height);
			}                

            for (var i = 0; i < strokes.length; i++) {
            	var stroke = strokes[i].stroke;
            	
            	context.beginPath();
                for (var j = 0; j < stroke.length - 1; j++) {
                	context.moveTo(stroke[j].x * width, stroke[j].y * height);
                	context.lineTo(stroke[j + 1].x * width, stroke[j + 1].y * height);
                }
                context.closePath();

                context.strokeStyle = strokes[i].color;
                context.lineWidth = strokes[i].size * width;
                context.lineJoin = strokes[i].join;
                context.lineCap = strokes[i].cap;
                context.miterLimit = strokes[i].miterLimit;

                context.stroke();
            }
        }      
        
        function init() {
            if (options.data) {
                aspectRatio = typeof options.data.aspectRatio !== 'undefined' ? options.data.aspectRatio : aspectRatio;
                strokes = typeof options.data.strokes !== 'undefined' ? options.data.strokes : [];
            } else {
                aspectRatio = typeof options.aspectRatio !== 'undefined' ? options.aspectRatio : aspectRatio;
            }
            	
            baseWidth = typeof options.baseWidth !== 'undefined' ? options.baseWidth : 250;
            baseHeight = typeof options.baseHeight !== 'undefined' ? options.baseHeight : 250;            
            
            lineColor = typeof options.lineColor !== 'undefined' ? options.lineColor : '#000';
            lineSize = typeof options.lineSize !== 'undefined' ? options.lineSize : 20;
            
            //var canvasColor = typeof options.canvasColor !== 'undefined' ? options.canvasColor : '#fff';
            //canvas.css('background-color', canvasColor);
            //return;

            var locked = typeof options.locked !== 'undefined' ? options.locked : false;
            if (locked) {
                canvas.unbind(startEvent + moveEvent + endEvent);
            } else {
                canvas.css('cursor', 'crosshair');
            }

			if (options.background && _.isObject(options.background) && options.background.get('id')) {				
				background = options.background;
				backgroundImage = canvas.parent().find('img');
				
	            // Set canvas size
				aspectRatio = background.get('width') / background.get('height');
				if (background.get('width') > canvas.parent().width()) {
					var width = canvas.parent().width();
				} else {
					var width = background.get('width');
				}
				var height = width / aspectRatio;
				
				baseWidth = background.get('width');
				baseHeight = background.get('height');				
			} else {
	            // Set canvas size
	            var width = canvas.parent().width();
	            var height = width / aspectRatio;				
			}

            onDrawEnd = typeof options.onDrawEnd === 'function' ? options.onDrawEnd : null;
            
            setSize(width, height);
            redraw(ctx, canvas);
        }

        init();
        
        // when the background image has loaded, redraw the canvas
        $(backgroundImage).load(function() {
        	redraw(ctx, canvas);
        	onDrawEnd();
        });

        this.json = function () {
            return JSON.stringify({
                aspectRatio: aspectRatio,
                strokes: strokes
            });
        };        
        
        this.json = function () {
            return JSON.stringify({
                aspectRatio: aspectRatio,
                strokes: strokes
            });
        };

        this.jsonLoad = function (json) {
            var array = JSON.parse(json);
            aspectRatio = array.aspectRatio;
            strokes = array.strokes;
            redraw(ctx, canvas);
        };

        this.getImage = function () {
            var canvasIMG = document.createElement('canvas');

	        var width = baseWidth;
	        var height = baseHeight;				
         
            canvasIMG.width = width;
            canvasIMG.height = height;

            var ctx2 = canvasIMG.getContext("2d");
            document.body.appendChild(canvasIMG);
            redraw(ctx2, canvasIMG);
            var toUrl = '<img src="' + canvasIMG.toDataURL("image/png") + '"/>';
            document.body.removeChild(canvasIMG);
            return toUrl;
        };

        this.getLineColor = function () {
            return lineColor;
        };

        this.setLineColor = function (color) {
            lineColor = color;
        };

        this.getLineSize = function () {
            return lineSize;
        };
        
        this.setTool = function (tool) {
        	drawingTool = tool;
        };

        this.getTool = function () {
            return drawingTool;
        };        

        this.setLineSize = function (size) {
            lineSize = size;
        };

        this.undo = function () {
            if (strokes.length > 0) {
                undo.push(strokes.pop());
                redraw(ctx, canvas);
            }
        };

        this.redo = function () {
            if (undo.length > 0) {
                strokes.push(undo.pop());
                redraw(ctx, canvas);
            }
        };

        this.clear = function () {
            strokes = [];
            redraw(ctx, canvas);
        };

        this.setReadOnly = function(state) {
            this.readOnly = state;
            if (state) {
                canvas.css('cursor', 'default');
            }
            else {
                canvas.css('cursor', 'crosshair');
            }
        };

        return this;
    };
}(jQuery));
