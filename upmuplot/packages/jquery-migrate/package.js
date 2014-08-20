Package.describe({
  summary: "S3UI::jquery-migrate"
});

Package.on_use(function (api) {
  api.use('jquery');

  var path = Npm.require('path');
  var asset_path = path.join('.');
  api.add_files(path.join(asset_path, 'js', 'jquery-migrate-1.2.1.js'), 'client');
});
