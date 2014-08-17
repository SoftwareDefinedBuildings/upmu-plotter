function init_frontend(self) {
    self.idata.streamList = [];
    self.idata.dateFormat = "%a %b %d, %Y %T";
    self.idata.dateConverter = new AnyTime.Converter({format: self.idata.dateFormat});
    self.idata.labelFormatter = new AnyTime.Converter({format: self.idata.dateFormat, utcFormatOffsetImposed: 0});
    self.idata.makeColorMenu = s3ui.makeMenuMaker();
    self.idata.streamSettings = {}; // Stores the stream settings chosen in the legend (maps uuid to a setting object)
    self.idata.selectedStreamsBuffer = self.idata.selectedStreams; // Streams that have been selected and are displayed in the legend
    self.idata.streamMessages = {}; // Maps a stream's uuid to a 2-element array containing 1) an object mapping importances (ints) to messages and 2) the importance of the current message being displayed

    self.idata.addedStreams = undefined;
    self.idata.changedTimes = undefined;
    self.idata.otherChange = undefined;
    self.idata.automaticAxisUpdate = false; // True if axes will be updated without the need for an "Update Axes" button
    self.idata.initPermalink = window.location.hostname + (function (port) { if (port === '') { return ''; } return ':' + port; })(window.location.port) + window.location.pathname + '?'; // The start of the permalink
    self.idata.selectedLegendEntry = undefined; // The currently selected legend entry
    self.idata.chart = self.find("svg.chart");
    self.idata.widthFunction = function () { return window.innerWidth * 0.75; };
}

/* Adds or removes (depending on the value of SHOW) the stream
    described by STREAMDATA to or from the legend. UPDATE is true if
    applySettings should be immediately called after insertion or removal. */
function toggleLegend (self, show, streamdata, update) {
    if (update == undefined) {
        update = true;
    }
    self.idata.drawnBefore = false;
    var streamSettings = self.idata.streamSettings;
    var nameElem;
    if (show) {
        if (streamSettings.hasOwnProperty(streamdata.uuid) && streamSettings[streamdata.uuid].active) {
            return;
        }
        self.idata.selectedStreamsBuffer.push(streamdata);
        var row = d3.select(self.find("tbody.legend"))
          .append("tr")
            .datum(streamdata)
            .attr("class", function (d) { return "legend-" + d.uuid; });
        var colorMenu = row.append("td")
            .append(self.idata.makeColorMenu)
            .attr("class", function (d) { return "color-" + d.uuid; })
          .node();
        colorMenu.onchange = function () {
                var newColor = this[this.selectedIndex].value;
                self.$("g.series-" + streamdata.uuid).attr({
                        "stroke": newColor,
                        "fill": newColor
                    });
                self.$("polyline.density-" + streamdata.uuid).attr("stroke", newColor);
                color = [parseInt(newColor.slice(1, 3), 16), parseInt(newColor.slice(3, 5), 16), parseInt(newColor.slice(5, 7), 16)].join(", ");
                if (self.idata.selectedLegendEntry == nameElem) {
                    nameCell.style("background-color", "rgba(" + color + ", 0.3)");
                }
                streamSettings[streamdata.uuid].color = newColor;
            };
        streamSettings[streamdata.uuid] = { color: colorMenu[colorMenu.selectedIndex].value, axisid: "y1", active: true }; // axisid is changed
        self.idata.streamMessages[streamdata.uuid] = [{0: ""}, 0];
        var color = streamSettings[streamdata.uuid].color;
        color = [parseInt(color.slice(1, 3), 16), parseInt(color.slice(3, 5), 16), parseInt(color.slice(5, 7), 16)].join(", ");
        var nameCell = row.append("td")
            .html(function (d) { return s3ui.getFilepath(d); })
            .attr("class", "streamName streamName-" + streamdata.uuid);
        nameElem = nameCell.node();
        nameElem.onclick = function () {
                if (self.idata.selectedLegendEntry == nameElem) {
                    self.idata.selectedLegendEntry = undefined;
                    setStreamMessage(self, streamdata.uuid, undefined, 4);
                    s3ui.hideDataDensity(self);
                    nameCell.style("background-color", "rgba(" + color + ", 0.1)");
                    $(self.find(".metadataDisplay")).empty();
                } else {
                    if (self.idata.selectedLegendEntry != undefined) {
                        var oldSelection = self.idata.selectedLegendEntry;
                        oldSelection.onclick(); //deselect the previous selection
                        self.idata.selectedLegendEntry = nameElem;
                        oldSelection.onmouseout();
                    } else {
                        self.idata.selectedLegendEntry = nameElem;
                    }
                    if (self.idata.oldData.hasOwnProperty(streamdata.uuid)) {
                        var xdomain = self.idata.oldXScale.domain();
                        setStreamMessage(self, streamdata.uuid, "Interval width: " + s3ui.nanosToUnit(Math.pow(2, self.idata.oldData[streamdata.uuid][2])), 4);
                    }
                    s3ui.showDataDensity(self, streamdata.uuid);
                    nameCell.style("background-color", "rgba(" + color + ", 0.3)");
                    self.find(".metadataDisplay").innerHTML = "<h3>Stream Metadata</h3>" + s3ui.getInfo(streamdata, "<br>");
                }
            };
        var hovered = false;
        nameElem.onmouseover = function () {
                hovered = true;
                if (self.idata.selectedLegendEntry != nameElem) {
                    nameCell.style("background-color", "rgba(" + color + ", 0.1)");
                }
            };
        nameElem.onmouseout = function () {
                hovered = false;
                if (self.idata.selectedLegendEntry != nameElem) {
                    nameCell.style("background-color", "");
                }
            };
        var selectElem = row.append("td")
          .append("select")
            .attr("class", "axis-select axis-select-" + streamdata.uuid);
        selectElem.selectAll("option")
          .data(self.idata.yAxes)
          .enter()
          .append("option")
            .attr("class", function (d) { return "option-" + d.axisid; })
            .attr("value", function (d) { return d.axisid; })
            .html(function (d) { return d.axisname; });
        var selectNode = selectElem.node();
        var initIndex = s3ui.guessYAxis(self, streamdata); // use a heuristic to get the initial selection
        if (initIndex == undefined) {
            initIndex = self.idata.yAxes.length;
            s3ui.addYAxis(self);
        }
        selectNode.selectedIndex = initIndex;
        selectNode.setAttribute("data-prevselect", selectNode[selectNode.selectedIndex].value);
        selectNode.onchange = function (event, suppressUpdate) {
                var newID = this[this.selectedIndex].value;
                s3ui.changeAxis(self, streamdata, this.getAttribute("data-prevselect"), newID);
                this.setAttribute("data-prevselect", newID);
                if (suppressUpdate == undefined) {
                    s3ui.applySettings(self);
                }
            };
        var intervalWidth = row.append("td").attr("class", "message-" + streamdata.uuid).node();
        s3ui.changeAxis(self, streamdata, null, selectNode[selectNode.selectedIndex].value);
        $("select.color-" + streamdata.uuid).simplecolorpicker({picker: true});
        if (update) { // Go ahead and display the stream
            s3ui.applySettings(self);
        }
    } else {
        if (!streamSettings.hasOwnProperty(streamdata.uuid) || !streamSettings[streamdata.uuid].active) {
            return;
        }
        nameElem = self.idata.selectedLegendEntry;
        if (nameElem != undefined && nameElem.className == "streamName streamName-" + streamdata.uuid) {
            nameElem.onclick();
            nameElem.onmouseout(); // Deselect the stream before removing it
        }
        var toRemove = self.find(".legend-" + streamdata.uuid);
        var selectElem = d3.select(toRemove).select('.axis-select').node();
        var oldAxis = selectElem[selectElem.selectedIndex].value;
        s3ui.changeAxis(self, streamdata, oldAxis, null);
        toRemove.parentNode.removeChild(toRemove);
        // we could delete self.idata.streamSettings[streamdata.uuid]; but I want to keep the settings around
        streamSettings[streamdata.uuid].active = false;
        for (var i = 0; i < self.idata.selectedStreamsBuffer.length; i++) {
            if (self.idata.selectedStreamsBuffer[i].uuid == streamdata.uuid) {
                self.idata.selectedStreamsBuffer.splice(i, 1);
                break;
            }
        }
        if (update) {
            s3ui.applySettings(self); // Make stream removal visible on the graph
        }
    }
}

/* Sets the message to be displayed for a certain importance; the message with
   the highest importanced is displayed. */
function setStreamMessage(self, uuid, message, importance) {
    var messages = self.idata.streamMessages[uuid];
    messages[0][importance] = message;
    if (message == undefined) {
        if (importance == messages[1]) {
            while (messages[0][importance] == undefined) {
                importance--;
            }
            messages[1] = importance;
            self.find(".message-" + uuid).innerHTML = messages[0][importance];
        }
    } else if (importance >= messages[1]) {
        messages[1] = importance;
        self.find(".message-" + uuid).innerHTML = message;
    }
}

function updatePlotMessage(self) {
    var message = "";
    if (self.idata.automaticAxisUpdate) {
        if (self.idata.addedStreams || self.idata.changedTimes) {
            message = 'Click "Apply all Settings and Plot Data" to update the graph.';
        }
    } else {
        if (self.idata.addedStreams || self.idata.changedTimes || self.idata.otherChange) {
            message = 'Click "Apply all Settings and Plot Data" to update the graph.';
        }
    }
    self.find(".plotLoading").innerHTML = message;
}

function getSelectedTimezone(self) {
    var timezoneSelect = self.find(".timezoneSelect");
    var selection = timezoneSelect[timezoneSelect.selectedIndex].value;
    if (selection == "OTHER") {
        return self.find(".otherTimezone").value.trim();
    } else {
        return selection;
    }
}

function createPlotDownload(self) {
    var chartElem = self.find(".chart");
    var chartData = chartElem.innerHTML.replace(/[\d.]+em/g, function (match) {
            return (parseFloat(match.slice(0, match.length - 2)) * 16) + "px";
        }); // It seems that using "em" to position fonts doesn't work in Inkview, a common SVG viewing application
    var graphStyle = self.find(".plotStyles").innerHTML;
    var xmlData = '<svg width="' + chartElem.getAttribute("width") + '" height="' + chartElem.getAttribute("height") + '" font-family="serif" font-size="16px">'
        + '<defs><style type="text/css"><![CDATA[' + graphStyle + ']]></style></defs>' + chartData + '</svg>';
    var downloadAnchor = document.createElement("a");
    downloadAnchor.innerHTML = "Download Image (created " + (new Date()).toLocaleString() + ", local time)";
    downloadAnchor.setAttribute("href", 'data:text/svg;charset="utf-8",' + encodeURIComponent(xmlData));
    downloadAnchor.setAttribute("download", "graph.svg");
    var linkLocation = self.find(".download-graph");
    linkLocation.innerHTML = ""; // Clear what was there before...
    linkLocation.insertBefore(downloadAnchor, null); // ... and replace it with this download link
}

function createPermalink(self) {
    var coerce_stream;
    if (self.find(".includeMetadata").checked) {
        coerce_stream = JSON.stringify;
    } else {
        coerce_stream = function (stream) { return stream.uuid; };
    }
    var permalink = 'streams=' + $.map(self.idata.selectedStreams, function (d) { return encodeURIComponent(coerce_stream(d) + "_" + self.idata.streamSettings[d.uuid].color); }).join(',');
    permalink += '&start=' + (self.idata.oldStartDate / 1000) + '&end=' + (self.idata.oldEndDate / 1000) + '&tz=' + encodeURIComponent(self.idata.oldTimezone) + '&zoom=' + encodeURIComponent(self.idata.zoom.scale()) + '&translate=' + encodeURIComponent(self.idata.zoom.translate()[0]) + '&autoupdate=' + self.idata.automaticAxisUpdate + '&axes=';
    var axes = $.map(self.idata.yAxes, function (d) {
            return {
                    axisname: d.axisname,
                    streams: $.map(d.streams, function (s) { return s.uuid; }),
                    scale: d.manualscale, // even if it's autoscale, we want to make sure it isn't corrected for scrolling
                    rightside: d.right
                };
        });
    permalink += encodeURIComponent(JSON.stringify(axes));
    var URL = self.idata.initPermalink + permalink;
    var anchor = document.createElement("a");
    anchor.innerHTML = URL;
    anchor.setAttribute("href", URL);
    var permalocation = self.find(".permalink");
    permalocation.innerHTML = "";
    permalocation.insertBefore(anchor, null);
}

s3ui.init_frontend = init_frontend;
s3ui.toggleLegend = toggleLegend;
s3ui.setStreamMessage = setStreamMessage;
s3ui.updatePlotMessage = updatePlotMessage;
s3ui.getSelectedTimezone = getSelectedTimezone;
s3ui.createPlotDownload = createPlotDownload;
s3ui.createPermalink = createPermalink;
