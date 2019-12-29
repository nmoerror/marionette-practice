// When defining an Application Module always prefix it with Base Module Name
WMAPP.module("Intro.Application", function(Application) {
  Application.IntroHelloWorldTileApplication = WMAPP.Extension.Application.AbstractApplication.extend(
    {
      onStart: function(options) {
        this.options = options;
        this.tileRegion = new WMAPP.Extension.View.Region({
          el: options.regionId
        });
      }
    }
  );
});
