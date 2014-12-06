var fs = Npm.require('fs');
Meteor.startup(function () {
        var filepath = process.env.PWD + '/server/account_list.json';
        var data = fs.readFileSync(filepath, {encoding: 'utf-8'});
        var users, users_to_add;
        try {
            data = JSON.parse(data);
        } catch (error) {
            console.log("The account_list contains invalid JSON. The accounts will NOT be updated.");
            return;
        }
        users = data.users
        users_to_add = data.users_to_add;
        if (users == undefined || users_to_add == undefined)  {
            console.log('The JSON document must contain the field "users" and the field "users_to_add". The accounts will NOT be updated.');
            return;
        }
        Meteor.users.remove({});
        for (user in users) {
            if (users.hasOwnProperty(user)) {
                Meteor.users.insert(users[user]);
            }
        }
        var need_to_write = false;
        todelete = {};
        for (user in users_to_add) {
            if (!users_to_add.hasOwnProperty(user)) {
                continue;
            }
            need_to_write = true;
            var document = users_to_add[user];
            var document_to_upload = {};
            var s3ui_tags;
            if (document.hasOwnProperty("username")) {
                document_to_upload["username"] = document["username"];
            } else {
                document_to_upload["username"] = user;
                document["username"] = user; // so we can get it in the next for loop
            }
            if (document.hasOwnProperty("password")) {
                document_to_upload["password"] = document["password"]
            } else {
                document_to_upload["password"] = "asdf";
                console.log('Auto-generating password "asdf" for user ' + document["username"]);
            }
            if (document.hasOwnProperty("s3ui_tags")) {
                s3ui_tags = document["s3ui_tags"]
            } else {
                s3ui_tags = ["public"];
                console.log('Tags field not specified for user ' + document["username"] + '; assuming that "public" is the only tag');
            }
            try {
                Accounts.createUser(document_to_upload);
                Meteor.users.update({"username": document_to_upload["username"]}, {"$set": {"s3ui_tags": s3ui_tags}});
            } catch (error) {
                todelete[user] = true;
                console.log("User " + user + " is to be added, but already exists");
            }
        }
        for (user in users_to_add) {
            if (!users_to_add.hasOwnProperty(user) || todelete.hasOwnProperty(user)) {
                continue;
            }
            var truedoc = Meteor.users.findOne({"username": users_to_add[user]["username"]});
            delete truedoc['_id']
            users[truedoc["username"]] = truedoc;
        }
        data.users_to_add = {};
        if (need_to_write) {
            fs.writeFileSync(filepath, JSON.stringify(data, undefined, 4), {encoding: 'utf-8'});
        }
    });
    
Meteor.methods({
    'updateAccountList': function () {
            // I don't want to read the file and edit it; it could have been corrupted meanwhile...
            // So I'm going to just read the database and rewrite the entire file.
            var document_to_write = {users: {}, users_to_add: {}};
            users = Meteor.users.find();
            users.forEach(function (user) {
                    user.services = {"password": user.services.password}; // throw out extraneous fields
                    document_to_write.users[user["username"]] = user;
                });
            var filepath = process.env.PWD + '/server/account_list.json';
            var data = fs.writeFile(filepath, JSON.stringify(document_to_write, undefined, 4), {encoding: 'utf-8'});
        }
    });
