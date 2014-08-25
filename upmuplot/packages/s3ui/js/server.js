// This code is to be run on the Meteor server (all other files in this package are to be run on the client)

s3ui_permalinks = new Meteor.Collection("s3ui_permalinks");

s3ui_server = {};
s3ui_server.createPermalink = function (permalinkJSON) {
                permalinkJSON.created = (new Date()).getTime();
                permalinkJSON.lastAccessed = "never";
                return s3ui_permalinks.insert(permalinkJSON);
            };
            
Meteor.methods({
        processQuery: function (query, type) {
                this.unblock();
                var params = query.split(" ");
                var url, payload, request;
                if (params[0] === "SENDPOST") {
                    console.log("full params: ", params);
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
        createPermalink: s3ui_server.createPermalink,
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
    
Router.map(function () {
        this.route('permalink_generator', {
                path: '/s3ui_permalink',
                where: 'server',
                action: function () {
                        this.response.statusCode = 400;
                        this.response.setHeader('Content-Type', 'text/plain');
                        if (this.request.method != "POST") {
                            this.response.write("To create a permalink, send the data as a JSON document via a POST request. Use the following format:\n\npermalink_data=<JSON>");
                            this.response.end();
                            return;
                        }
                        var jsonPermalink = this.request.body.permalink_data;
                        var id;
                        if (jsonPermalink == undefined) {
                            this.response.write("Error: required key 'permalink_data' is not present");
                            this.response.end();
                        } else {
                            try {
                                jsonPermalink = JSON.parse(jsonPermalink);
                            } catch (exception) {
                                this.response.write("Error: received invalid JSON: " + exception);
                                this.response.end();
                                return;
                            }
                            try {
                                id = Meteor.call('createPermalink', jsonPermalink);
                            } catch (exception) {
                                this.response.write("Error: document could not be inserted into Mongo database: " + exception);
                                this.response.end();
                                return;
                            }
                            this.response.statusCode = 200;
                            this.response.write(id);
                            this.response.end();
                        }
                    }
            });
    });
