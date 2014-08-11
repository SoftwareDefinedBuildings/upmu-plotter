instances = [];

if (Meteor.isClient) {
  Template.navbar.helpers({
    activeIf: function (template) {
      var currentRoute = Router.current();
      return currentRoute &&
        template === currentRoute.lookupTemplate() ? 'active' : '';
    }
  });
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
  });
}
