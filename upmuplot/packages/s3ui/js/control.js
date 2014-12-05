function bind_method(func, self) {
    return function () {
        return func.apply(self, arguments);
    }
}

function init_control(self) {
    self.idata.bracketURL = 'http://quasar.cal-sdb.org:9000/q/bracket';
    self.imethods.setStartTime = bind_method(setStartTime, self);
    self.imethods.setEndTime = bind_method(setEndTime, self);
    self.imethods.setTimezone = bind_method(setTimezone, self);
    self.imethods.addAxis = function () { return s3ui.addYAxis(self); };
    self.imethods.removeAxis = bind_method(removeAxis, self);
    self.imethods.renameAxis = bind_method(renameAxis, self);
    self.imethods.setAxisSide = bind_method(setAxisSide, self);
    self.imethods.setAxisScale = bind_method(setAxisScale, self);
    self.imethods.setStreamAxis = bind_method(setStreamAxis, self);
    self.imethods.setStreamColor = bind_method(setStreamColor, self);
    self.imethods.applyAllSettings = bind_method(applyAllSettings, self);
    self.imethods.resetZoom = function () { return s3ui.resetZoom(self); };
    self.imethods.toggleAutomaticUpdate = bind_method(toggleAutomaticUpdate, self);
    self.imethods.toggleEmbedMetadata = bind_method(toggleEmbedMetadata, self);
    self.imethods.selectStreams = bind_method(selectStreams, self);
    self.imethods.deselectStreams = bind_method(deselectStreams, self);
    self.imethods.applySettings = bind_method(applySettings, self);
    self.imethods.updateGraphSize = bind_method(updateGraphSize, self);
}

/* Given DATE, a date object, sets the start time to be the day/time it
   it represents in local time. The start time is set with "second" precision;
   milliseconds are ignored. */
function setStartTime(date) {
    var startTime = this.find(".startdate");
    var newValue = this.idata.dateConverter.format(date);
    if (startTime.value != newValue) {
        startTime.value = newValue;
        startTime.onchange();
    }
}

/* Given DATE, a date object, sets the start time to be the day/time it
   it represents in local time. The start time is set with "second" precision;
   milliseconds are ignored. */
function setEndTime(date) {
    var endTime = this.find(".enddate");
    var newValue = this.idata.dateConverter.format(date);
    if (endTime.value != newValue) {
        endTime.value = newValue;
        endTime.onchange();
    }
}

/* Sets the timezone to the IANA timezone string TZ. */
function setTimezone(tz) {
    var select = this.find(".timezoneSelect");
    var i;
    for (i = 0; select[i].value !== "OTHER"; i++) {
        if (tz === select[i].value) {
            if (i == select.selectedIndex) {
                return;
            }
            break;
        }
    }
    select.selectedIndex = i;
    select.onchange();
    var otherTZ;
    if (select[i].value === "OTHER") {
        otherTZ = this.find(".otherTimezone");
        if (otherTZ.value !== tz) {
            otherTZ.value = tz;
            otherTZ.onchange();
        }
    }
}

/* To create another y-axis, call "addYAxis". */

/* Removes the y-axis with the id ID. */
function removeAxis(id) {
    if (this.idata.axisMap.hasOwnProperty(id)) {
        s3ui.removeYAxis(this, this.idata.axisMap[id]);
    }
}

/* Changes the name of the axis with the specified ID. */
function renameAxis(id, newName) {
    var input = this.find(".axis-" + id).firstChild.firstChild;
    if (input.value !== newName) {
        input.value = newName;
        input.onchange();
    }
}

/* Sets the side of the axis with the specified ID. If LEFT is true, sets its
   side to "Left"; if false, sets its side to "Right". If LEFT is null, the
   axis is hidden. */
function setAxisSide(id, left) {
    if (!this.idata.axisMap.hasOwnProperty(id)) {
        return;
    }
    var radButton = this.find(".axis-" + id + " .axisside");
    $(radButton).children().removeClass("active");
    if (left === null) {
        radButton = radButton.firstChild.nextSibling.firstChild;
    } else if (left) {
        radButton = radButton.firstChild.firstChild;
    } else {
        radButton = radButton.lastChild.firstChild;
    }
    if (!radButton.checked) {
        $(radButton.parentNode).addClass("active");
        radButton.checked = true;
        radButton.onchange();
    }
}

/* Sets the scale of the axis with the specified ID to the range [LOW, HIGH].
   If one of LOW and HIGH is undefined (or not specified), only the specified
   endpoint is changed; if both are undefined, the "Autoscale" setting is set
   to true. */
function setAxisScale(id, low, high) {
    var axis = this.idata.axisMap[id];
    if (axis == undefined) {
        return;
    }
    var checkbox;
    var endpoints;
    if (low == undefined && high == undefined) {
        this.idata.axisMap[id].autoscale = true;
        s3ui.applySettings(this, false);
    } else {
        // Set the endpoints to those specified
        endpoints = axis.rangeRow.querySelectorAll("input.axisrange");
        if (low != undefined && endpoints[0].value !== low) {
            endpoints[0].value = low;
            endpoints[0].onchange();
        }
        if (high != undefined && endpoints[1].value !== high) {
            endpoints[1].value = high;
            endpoints[1].onchange();
        }
    }
}

/* Assigns the stream corresponding to UUID to the axis corresponding to ID. */
function setStreamAxis(uuid, id) {
    var selectElem = this.find(".axis-select-" + uuid);
    if (selectElem.getAttribute("data-prevselect") === id) {
        return;
    }
    for (var i = 0; i < selectElem.length; i++) {
        if (selectElem[i].value === id) {
            selectElem.selectedIndex = i;
            selectElem.onchange();
            break;
        }
    }
}

/* Assigns the stream corresponding to UUID the color COLOR. See
   "makeMenuMaker()" in utils.js for a list of possible colors. */
function setStreamColor(uuid, color) {
    var colorSelect = this.find(".color-" + uuid);
    if (colorSelect[colorSelect.selectedIndex].value !== color) {
        $.data(colorSelect).simplecolorpicker.selectColor(color);
        colorSelect.onchange();
    }
}

/* Programmatically presses the "Apply all Settings and Update Plot" button. */
function applyAllSettings() {
    this.find(".plotButton").onclick();
}

/* To programmatically press the "Reset Zoom" button, just call "resetZoom". */

/* Programmatically toggles the "Automatic Axis Update" checkbox. Its value can
   be found by reading the value of the "automaticAxisUpdate" boolean. */
function toggleAutomaticUpdate() {
    var checkbox = this.find(".automaticAxisSetting");
    checkbox.checked = !checkbox.checked;
    checkbox.onchange();
}

/* Programmatically toggles the "Embed Stream Metadata" checkbox. */
function toggleEmbedMetadata() {
    var elem = this.find(".includeMetadata");
    elem.checked = !elem.checked;
}

/* Given DATA_LST, a list of stream objects, selects the corresponding streams.
   If present in the tree, selects them in the tree. This function works even
   before the tree is loaded. */
function selectStreams(data_lst) {
     var node;
     var source;
     var path;
     var streamTree = this.idata.streamTree;
     var loadingRootNodes = this.idata.loadingRootNodes;
     for (var i = 0; i < data_lst.length; i++) {
         source = data_lst[i].Metadata.SourceName;
         path = data_lst[i].Path;
         node = this.idata.leafNodes[source + path];
         if (node != undefined) {
             node = streamTree.get_node(node);
         }
         if (node == undefined || node === false) { // check if it appears in the tree. if not ...
             if (this.idata.initiallySelectedStreams.hasOwnProperty(source)) {
                 var entry = this.idata.initiallySelectedStreams[source];
                 entry.count++;
                 entry[path] = data_lst[i];
             } else {
                 var newObj = { count: 1 };
                 newObj[path] = data_lst[i];
                 this.idata.initiallySelectedStreams[source] = newObj;
             }
             s3ui.toggleLegend(this, true, data_lst[i], false);
             source = this.idata.rootNodes[source];
             if (source == undefined) {
                 continue;
             }
             node = streamTree.get_node(source);
             if (node.children.length == 0 && !loadingRootNodes[node.id]) {
                 loadingRootNodes[node.id] = true;
                 streamTree.load_node(source, function () {
                        loadingRootNodes[node.id] = false;
                    }); // It will be automatically selected if it is there
             }
         } else {
             streamTree.select_node(node, false, true);
         }
     }
     s3ui.applySettings(this, true);
}

/* Given DATA_LST, a list of stream objects, deselects the corresponding
   streams and removes them from the stream selection tree (if it has been
   loaded already). This function works even before the tree is loaded. */
function deselectStreams(data_lst) {
    var node;
    var source;
    var streamTree = this.idata.streamTree;
    var initiallySelectedStreams = this.idata.initiallySelectedStreams;
    for (var i = 0; i < data_lst.length; i++) {
        node = this.idata.leafNodes[data_lst[i].Metadata.SourceName + data_lst[i].Path];
        if (node != undefined) {
            node = streamTree.get_node(node);
        }
        if (node == undefined || node === false || node.data.streamdata == undefined) { // check if it has been *loaded* in the tree; if so, it's checked state is correct
            node = data_lst[i];
            var sourceName = node.Metadata.SourceName;
            var path = node.Path;
            if (initiallySelectedStreams.hasOwnProperty(sourceName) && initiallySelectedStreams[sourceName].hasOwnProperty(path)) {
                initiallySelectedStreams[sourceName].count--;
                if (initiallySelectedStreams[sourceName].count == 0) {
                    delete initiallySelectedStreams[sourceName];
                } else {
                    delete initiallySelectedStreams[sourceName][path];
                }
            }
            s3ui.toggleLegend(this, false, node, false);
        } else {
            streamTree.deselect_node(node);
        }
    }
    s3ui.applySettings(this, false);
}

function applySettings() {
    this.idata.addedStreams = false;
    this.idata.otherChange = false;
    this.idata.selectedStreams = this.idata.selectedStreamsBuffer.slice();
    s3ui.applySettings(this, true, true);
}

function updateGraphSize() {
    this.idata.TARGETWIDTH = this.idata.widthFunction();
    s3ui.updateSize(this, true);
}

/* Given LINK, the portion of a hyperlink that occurs after the question mark
   in a url, creates the state of the graph it describes. This function assumes
   that the graph has just been loaded, with no streams selected or custom
   settings applied. */
function executePermalink(self, args, set_streams_only) {
    var streams = (args.streams || args.streamids);
    var streamObjs = [];
    var stream;
    var colors = [];
    var noRequest = true;
    var uuidMap = {}; // Maps uuid to an index in the array
    var query = 'select * where';
    for (i = 0; i < streams.length; i++) {
        stream = streams[i];
        colors.push(stream.color);
        if (typeof stream.stream == 'object') {
            streamObjs[i] = stream.stream;
        } else {
            uuidMap[stream.stream] = i;
            if (!noRequest) {
                query += ' or';
            }
            query += ' uuid = "' + stream.stream + '"';
            noRequest = false;
        }
    }
    
    if (noRequest) {
        setTimeout(function () { finishExecutingPermalink(self, streamObjs, colors, args, set_streams_only); }, 50);
    } else {
        Meteor.call('requestMetadata', query, self.idata.tagsURL, function (error, data) {
                var receivedStreamObjs = JSON.parse(data);
                for (i = 0; i < receivedStreamObjs.length; i++) {
                    streamObjs[uuidMap[receivedStreamObjs[i].uuid]] = receivedStreamObjs[i];
                }
                for (i = streamObjs.length - 1; i >= 0; i--) {
                    if (streamObjs[i] == undefined) {
                        streamObjs.splice(i, 1);
                        colors.splice(i, 1);
                    }
                }
                finishExecutingPermalink(self, streamObjs, colors, args, set_streams_only);
            });
    }
}

function finishExecutingPermalink(self, streams, colors, args, set_streams_only) {
    self.imethods.selectStreams(streams);
    var i;
    for (i = 0; i < streams.length; i++) {
        if (colors[i] != undefined) {
            try {
                self.imethods.setStreamColor(streams[i].uuid, colors[i]);
            } catch (err) {
                console.log('Could not set ' + streams[i].uuid + ' to ' + colors[i] + ': ' + err.message);
            }
        }
    }
    if (args.hasOwnProperty('axes')) {
        var axes = args.axes;
        var yAxes = self.idata.yAxes;
        while (axes.length > yAxes.length) {
            self.imethods.addAxis();
        }
        while (axes.length < yAxes.length) {
            self.imethods.removeAxis(yAxes[yAxes.length - 1]);
        }
        var j;
        var id;
        var axis;
        for (i = 0; i < axes.length; i++) {
            id = "y" + (i + 1);
            axis = axes[i];
            for (j = 0; j < axis.streams.length; j++) {
                if (self.idata.streamSettings.hasOwnProperty(axis.streams[j]) && self.idata.streamSettings[axis.streams[j]].axisid != id) {
                    self.imethods.setStreamAxis(axis.streams[j], id);
                }
            }
            self.imethods.renameAxis(id, axis.axisname);
            if (axis.scale !== false) {
                self.imethods.setAxisScale(id, axis.scale[0], axis.scale[1]);
            }
            if (axis.rightside !== false) {
                self.imethods.setAxisSide(id, axis.rightside === null ? null : !axis.rightside);
            }
        }
    }
    if (set_streams_only) {
        return; // special handling for logging in/out
    }
    if (args.hasOwnProperty('tz')) {
        self.imethods.setTimezone(args.tz);
    } else {
        args.tz = s3ui.getSelectedTimezone(self);
    }
    if (args.hasOwnProperty('autoupdate')) {
        if (!args.autoupdate) {
            self.imethods.toggleAutomaticUpdate();
        }
    }
    var start;
    var end;
    var resetStart;
    var resetEnd;
    if (args.window_type == "now") {
        end = (new Date()).getTime();
        start = end - nanos_to_millis(args.window_width);
        if ((end - start) * 1000000 < args.window_width) {
            start--;
        }
    } else if (args.window_type == "last") {
        s3ui.getURL("SENDPOST " + self.idata.bracketURL + " " + JSON.stringify({"UUIDS": self.idata.selectedStreamsBuffer.map(function (s) { return s.uuid; })}), function (data) {
                var response = JSON.parse(data);
                console.log(response);
                end = nanos_to_millis(response.Merged[1]);
                start = end - nanos_to_millis(args.window_width);
                if (end * 1000000 < response.Merged[1]) {
                    end++;
                }
                if ((end - start) * 1000000 < args.window_width) {
                    start--;
                }
                setTimeZoom(self, start, end, args.resetStart, args.resetEnd, args.tz);
            }, 'text/json');
        return;
    } else {
        start = nanos_to_millis(args.start);
        end = nanos_to_millis(args.end);
        if (start == end) {
            if (start * 1000000 <= args.start) {
                end++;
            } else {
                start--;
            }
        }
    }
    setTimeZoom(self, start, end, args.resetStart, args.resetEnd, args.tz);
}

function setTimeZoom(self, start, end, resetStart, resetEnd, tz) {
    if (resetStart == undefined || resetEnd == undefined) {
        resetStart = Math.floor(start / 1000) * 1000;
        resetEnd = Math.ceil(end / 1000) * 1000;
        if (resetStart == resetEnd) {
            resetEnd++;
         }
    } else {
        var oldResetStart = resetStart;
        resetStart = nanos_to_millis(resetStart);
        resetEnd = nanos_to_millis(resetEnd);
        if (resetStart == resetEnd) {
            if (resetStart * 1000000 <= oldResetStart) {
                resetEnd++;
            } else {
                resetStart--;
            }
        }
    }
    self.idata.inittrans = (resetStart - start) / (end - start) * self.idata.WIDTH;
    self.idata.initzoom = (resetEnd - resetStart) / (end - start);
    var offset;
    try {
        offset = 60000 * ((new Date()).getTimezoneOffset() - (new timezoneJS.Date(tz)).getTimezoneOffset());
        self.imethods.setStartTime(new Date(resetStart + offset));
        self.imethods.setEndTime(new Date(resetEnd + offset));
        self.imethods.applyAllSettings();
    } catch (err) {
        console.log("Could not execute permalink: " + err.message);
    }
}

/* Converts nanoseconds to milliseconds. */
function nanos_to_millis(num) {
    num = num.toString();
    var millis = num.slice(0, -6);
    var nanos = num.slice(-6);
    if (millis.length == 0) {
        return floor ? 0 : 1;
    } else {
        return Number(millis) + (Number(nanos) < 500000 ? 0 : 1);
    }
}

s3ui.init_control = init_control;
s3ui.bind_method = bind_method;
s3ui.executePermalink = executePermalink;
