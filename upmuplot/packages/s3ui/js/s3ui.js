s3ui = {instances: [], instanceid: -1}; // stores functions used in multiple files

s3ui.parsePixelsToInt = function (q) {
    return parseFloat(q.slice(0, q.length - 2));
}

s3ui.default_cb1 = function (inst) {
        $(inst.find(".dispTable")).colResizable({
                    hoverCursor: "ew-resize",
                    dragCursor: "ew-resize",
                    minWidth: 0,
                    onResize: inst.imethods.updateGraphSize
                });
    };
    
s3ui.default_cb2 = function (inst) {
        if (window.location.search.length > 0) {
            s3ui.exec_permalink(inst, window.location.search.slice(1));
        }
    };

Template.s3plot.rendered = function () {
        s3ui.__init__(this);
    };
    
s3ui.exec_permalink = function (self, link_id) {
        Meteor.call("retrievePermalink", link_id, function (error, result) {
                if (error == undefined && result != undefined) {
                    s3ui.executePermalink(self, result);
                }
            });
    };
    
s3ui.__init__ = function (self) {
        s3ui.instances.push(self);
        
        self.idata = {}; // an object to store instance data
        self.imethods = {}; // an object to store instance methods
        
        self.idata.instanceid = ++s3ui.instanceid;
        if (s3ui.instanceid == 4503599627370495) {
            s3ui.instanceid = -4503599627370495;
        }
        
        $(self.find("div.streamLegend")).removeClass("streamLegend").addClass("streamLegend-" + self.idata.instanceid);
        self.idata.dynamicStyles = self.find("style.dynamicStyles");
        
        s3ui.init_axis(self);
        s3ui.init_plot(self);
        s3ui.init_data(self);
        s3ui.init_frontend(self);
        s3ui.init_streamtree(self);
        s3ui.init_control(self);
        
        var c1, c2;
        
        if (self.data !== null && typeof self.data === "object" && typeof self.data[0] === "object" && typeof self.data[1] === "function" && (typeof self.data[2] === "function" || typeof self.data[2] === "string")) {
            init_visuals(self, self.data[0]);
            if (self.data[0].width != undefined) {
                self.idata.widthFunction = self.data[0].width;
            }
            if (self.data[0].widthmin != undefined) {
                self.idata.widthmin = self.data[0].widthmin;
            }
            if (self.data[0].height != undefined) {
                self.find("svg.chart").setAttribute("height", self.data[0].height + self.idata.margin.top + self.idata.margin.bottom);
                self.idata.HEIGHT = self.data[0].height;
            }
            if (self.data[0].dataURLStart != undefined) {
                self.idata.dataURLStart = self.data[0].dataURLStart;
            }
            if (self.data[0].tagsURL != undefined) {
                self.idata.tagsURL = self.data[0].tagsURL;
            }
            if (self.data[0].bracketURL != undefined) {
                self.idata.bracketURL = self.data[0].bracketURL;
            }
            if (self.data[0].permalinkStart != undefined) {
                self.idata.initPermalink = self.data[0].permalinkStart;
            }
            if (self.data[0].queryLow != undefined) {
                self.idata.queryLow = self.data[0].queryLow;
            }
            if (self.data[0].queryHigh != undefined) {
                self.idata.queryHigh = self.data[0].queryHigh;
            }
            if (self.data[0].pweHigh != undefined) {
                self.idata.pweHigh = self.data[0].pweHigh;
            }
            self.imethods.changeVisuals = function (options) {
                    init_visuals(self, options);
                };
            c1 = self.data[1];
            c2 = self.data[2];
        } else {
            c1 = s3ui.default_cb1;
            c2 = s3ui.default_cb2;
        }
        
        init_graph(self, c1, c2);
    };
    
function init_visuals(self, options) {
    setVisibility(self, options, "div.permalinkGenerate", "hide_permalink");
    setVisibility(self, options, "div.graphExport", "hide_graph_export");
    setVisibility(self, options, "div.streamLegend-" + self.idata.instanceid, "hide_stream_legend");
    setVisibility(self, options, "div.axisLegend", "hide_axis_legend");
    setVisibility(self, options, "span.automaticUpdate", "hide_automatic_update");
    setVisibility(self, options, "div.plotButton", "hide_apply_button");
    setVisibility(self, options, "div.resetZoom", "hide_reset_button");
    setVisibility(self, options, "div.showAll", "hide_autozoom_button");
    setVisibility(self, options, "div.plotLoading", "hide_info_bar");
    setVisibility(self, options, "div.timeSelection", "hide_time_selection");
    setVisibility(self, options, "div.streamSelection", "hide_stream_tree");
    setVisibility(self, options, "g.plotDirections", "hide_plot_directions");
    setVisibility(self, options, "button.updateStreamList", "hide_refresh_button");
    
    setCSSRule(self, options, "tr.streamLegend-" + self.idata.instanceid + " select.axis-select { display: none; }", "hide_axis_selection");
    setCSSRule(self, options, "tr.streamLegend-" + self.idata.instanceid + " span.simplecolorpicker { pointer-events: none; }", "disable_color_selection");
}

function setVisibility(self, options, selector, attr) {
    if (options.hasOwnProperty(attr)) {
        if (options[attr]) {
            self.find(selector).setAttribute("style", "display: none;");
        } else {
            self.find(selector).setAttribute("style", "");
        }
    }
}

function setCSSRule(self, options, rule, attr) {
    if (options.hasOwnProperty(attr)) {
        var styles = self.idata.dynamicStyles;
        if (options[attr]) {
            styles.innerHTML += rule;
        } else {
            styles.innerHTML = styles.innerHTML.replace(rule, "");
        }
    }
}
    
function init_graph(self, c1, c2) {
    // Finish building the graph components
    s3ui.addYAxis(self);
    
    // first callback
    c1(self);
    
    // Make the window resize dynamically
    self.imethods.updateGraphSize();
    $(window).resize(self.imethods.updateGraphSize);
    
    // For some reason, Any+Time requires the text elements to have IDs.
    // So, I'm going to give them IDs that are unique across all instances
    self.find(".startdate").id = "start" + self.idata.instanceid;
    self.find(".enddate").id = "end" + self.idata.instanceid;
    
    // Event handlers are added programmatically
    self.find(".getPermalink").onclick = function () {
            self.find(".permalink").innerHTML = 'Generating permalink...';
            setTimeout(function () { s3ui.createPermalink(self); }, 50);
        };
    self.find(".makeGraph").onclick = function () {
            self.find(".download-graph").innerHTML = 'Creating image...';
            setTimeout(function () { s3ui.createPlotDownload(self); }, 50);
        };
    self.find(".addAxis").onclick = function () {
            s3ui.addYAxis(self);
        };
    self.find(".plotButton").onclick = function () {
            self.idata.addedStreams = false;
            self.idata.changedTimes = false;
            s3ui.updatePlot(self);
        };
    self.find(".resetZoom").onclick = function () {
            s3ui.resetZoom(self);
        };
    self.find(".showAll").onclick = function () {
            if (self.idata.selectedStreamsBuffer.length > 0) {
                self.imethods.resetZoom();
                s3ui.getURL("SENDPOST " + self.idata.bracketURL + " " + JSON.stringify({"UUIDS": self.idata.selectedStreamsBuffer.map(function (s) { return s.uuid; })}), function (data) {
                        var range;
                        try {
                            range = JSON.parse(data).Merged;
                        } catch (err) {
                            console.log("Autozoom error: " + err.message);
                            return;
                        }
                        if (range == undefined) {
                            self.find(".plotLoading").innerHTML = "Error: Selected streams have no data.";
                            return;
                        }
                        var offset = 60000 * ((new Date()).getTimezoneOffset() - (new timezoneJS.Date(s3ui.getSelectedTimezone(self))).getTimezoneOffset());
                        self.imethods.setStartTime(new Date(Math.floor(range[0] / 1000000) + offset));
                        self.imethods.setEndTime(new Date(Math.floor(range[1] / 1000000) + offset));
                        self.imethods.applyAllSettings();
                    });
            } else {
                self.find(".plotLoading").innerHTML = "Error: No streams are selected.";
            }
        };
    self.find(".automaticAxisSetting").onchange = function () {
            self.idata.automaticAxisUpdate = !self.idata.automaticAxisUpdate;
            if (self.idata.automaticAxisUpdate) {
                self.idata.selectedStreams = self.idata.selectedStreamsBuffer;
                if (self.idata.otherChange || self.idata.addedStreams) {
                    s3ui.applySettings(self, true);
                }
            } else {
                s3ui.updatePlotMessage(self);
                self.idata.selectedStreamsBuffer = self.idata.selectedStreams.slice();
            }
        };
    var changedDate = function () {
            self.idata.changedTimes = true;
            s3ui.updatePlotMessage(self);
        };
    self.find(".startdate").onchange = changedDate;
    self.find(".enddate").onchange = changedDate;
    self.find(".m1yButton").onclick = function () {
            var m1y = new Date().getTime()-365*24*60*60*1000;
            self.$('.startdate').val(self.idata.dateConverter.format(new Date(m1y))).change();
        };
    self.find(".nowButton").onclick = function () {
            self.$('.enddate').val(self.idata.dateConverter.format(new Date())).change();
        };
    self.find(".timezoneSelect").onchange = function () {
            var visibility = (this[this.selectedIndex].value == 'OTHER' ? 'visible' : 'hidden');
            self.find(".otherTimezone").style.visibility = visibility;
            self.idata.changedTimes = true;
            s3ui.updatePlotMessage(self);
        };
    self.find(".otherTimezone").onchange = changedDate;
    self.find(".updateStreamList").onclick = function () {
            s3ui.updateStreamList(self);
        };
    
    self.$(".datefield").AnyTime_picker({format: self.idata.dateFormat});
    if (self.find(".automaticAxisSetting").checked) { // Some browsers may fill in this value automatically after refresh
        self.idata.automaticAxisUpdate = true;
        self.idata.selectedStreamsBuffer = self.idata.selectedStreams;
    } else {
        self.idata.automaticAxisUpdate = false;
        self.idata.selectedStreamsBuffer = [];
    }
    self.find(".timezoneSelect").onchange(); // In case the browser selects "Other:" after refresh
    self.idata.addedStreams = false;
    self.idata.changedTimes = false;
    self.idata.otherChange = false;
    s3ui.updatePlotMessage(self);
    
    s3ui.updateStreamList(self);
    
    // Second callback
    if (typeof c2 == "function") {
        c2(self);
    }
}
