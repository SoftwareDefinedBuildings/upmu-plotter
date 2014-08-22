// This code is to be run on the Meteor server (all other files in this package are to be run on the client)

s3ui_permalinks = new Meteor.Collection("s3ui-permalinks");

Meteor.methods({
        processQuery: function (query, type) {
                this.unblock();
                var params = query.split(" ");
                var url, payload, request;
                if (params[0] === "SENDPOST") {
                    url = params[1];
                    payload = params.slice(2).join(' ');
                    request = "POST";
                } else {
                    url = params[0];
                    payload = '';
                    request = "GET";
                }
                try { 
                    var result = HTTP.call(request, url, {
                            content: payload
                        });
                    return result.content;
                } catch (err) {
                    console.log(err);
                    return '[]';
                }
            },
        createPermalink: function (permalinkJSON) {
                permalinkJSON.created = (new Date()).getTime();
                permalinkJSON.lastAccessed = "never";
                return s3ui_permalinks.insert(permalinkJSON);
            },
        retrievePermalink: function (permalinkID) {
                var obj = s3ui_permalinks.findOne({"_id": permalinkID});
                if (obj == undefined) {
                    obj = null;
                } else {
                    s3ui_permalinks.update(permalinkID, {$set: {lastAccessed: (new Date()).getTime()}});
                }
                return obj;
            }
    });
