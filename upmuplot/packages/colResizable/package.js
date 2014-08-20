Package.describe({
  summary: "S3UI::colResizable"
});

Package.on_use(function (api) {
  api.use('jquery');
  api.use('jquery-migrate');

  var path = Npm.require('path');
  var asset_path = path.join('.');
  api.add_files(path.join(asset_path, 'js', 'colResizable-1.3.med.js'), 'client');
    api.add_files(path.join(asset_path, 'js', 'colResizable-1.3.source.js'), 'client');
});
