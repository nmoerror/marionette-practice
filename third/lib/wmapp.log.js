'use strict';

WMAPP.module('Log', function(Log) {
    Log.enabled = true;
    Log.getLogger = function(loggerName) {
        var logger = log4javascript.getLogger(loggerName);
        // TODO SET LOGGER LEVEL
        return logger;
    };
    Log.addInitializer(function() {
        log4javascript.setEnabled(this.enabled);
        this.patternLayout = new log4javascript.PatternLayout("%d %p %c - %m%n");
        this.browserConsoleAppender = new log4javascript.BrowserConsoleAppender();
        this.browserConsoleAppender.setLayout(this.patternLayout);
        this.browserConsoleAppender.setThreshold(log4javascript.Level.ALL);
        var rootLogger = log4javascript.getLogger('WMAPP');
        rootLogger.setLevel(log4javascript.Level.ALL);
        rootLogger.addAppender(this.browserConsoleAppender);
    });
});
