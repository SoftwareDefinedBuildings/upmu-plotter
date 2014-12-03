Accounts.config({
        forbidClientAccountCreation: true
    });
    
if (Meteor.isServer) {
    Meteor.startup(function () {
            var users = new Mongo.Collection('users_to_add');
            var users_to_create = users.find({"password": {"$exists": true}, "username": {"$exists": true}});
            var user;
            users_to_create.forEach(function (user) {
                    if (Meteor.users.find({"username": user.username}).count() == 0) {
                        Accounts.createUser(user);
                    }
                });
            users.remove({"password": {"$exists": true}, "username": {"$exists": true}});
        });
}
