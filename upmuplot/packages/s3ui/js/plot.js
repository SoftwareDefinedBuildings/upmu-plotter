// Stores state of graph and contains functions to manipulate it

function init_plot(self) {
    self.idata.initialized = false;
    
    // For the permalink
    self.idata.initzoom = 1;
    self.idata.inittrans = 0;

    // Margin size (not constant)
    self.idata.margin = {left: 100, right: 100, top: 70, bottom: 60};
    
    // Height of the chart area (constant)
    self.idata.HEIGHT = 300;
    
    // Width of the chart and chart area (WIDTH is set automatically by updateSize)
    self.idata.TARGETWIDTH = undefined;
    self.idata.WIDTH = undefined;
    self.idata.widthmin = 350;

    // Selection of the element to display progress
    self.idata.loadingElem = self.$('.plotLoading');

    // Parameters of the last update
    self.idata.oldStartDate = undefined;
    self.idata.oldEndDate = undefined;
    self.idata.oldTimezone = undefined;
    self.idata.oldData = {};
    self.idata.oldXScale = undefined;
    self.idata.oldXAxis = undefined;
    self.idata.oldYScales = undefined;
    self.idata.oldYAxisArray = undefined;
    self.idata.oldAxisData = undefined;
    self.idata.offset = undefined;
    self.idata.oldDomain = undefined;

    // Keeps track of whether the graph is drawn on the screen
    self.idata.onscreen = false;

    self.idata.selectedStreams = []; // The streams that are being displayed on the graph
    self.idata.drawRequestID = -1; // The ID of a request for "repaintZoomNewData"; if a later request is made and processed before an earlier one is processed, the earlier one is not processed

    // The uuid of the relevant stream if a data density plot is being shown, undefined otherwise
    self.idata.showingDensity = undefined;
    // Keeps track of whether the previous draw of the data density plot could be completed
    self.idata.drawnBefore = true;

    // The HTML elements showing the title of the x-axis, and the start and end dates
    self.idata.xTitle = undefined;
    self.idata.xStart = undefined;
    self.idata.xEnd = undefined;
    
    self.idata.zoom = d3.behavior.zoom()
        .on("zoomstart", function () { repaintZoomNewData(self, function () {}, true); })
        .on("zoom", function () { repaintZoom(self); })
        .on("zoomend", function () { repaintZoomNewData(self); })
        .size([self.idata.WIDTH, self.idata.HEIGHT]);
        
    self.idata.testElem = undefined;
    
    self.idata.horizCursor1 = undefined;
    self.idata.horizCursor2 = undefined;
    self.idata.vertCursor1 = undefined;
    self.idata.vertCursor2 = undefined;
}

/* d3chartgroup is a d3 selection. */
function Cursor(self, coord, d3chartgroup, length, vertical, $background) {
    this.s3ui_instance = self;
    this.coord = coord;
    coord--;
    if (vertical) {
        this.rectMarker = d3chartgroup.append("rect")
            .attr("x", coord)
            .attr("y", 0)
            .attr("width", 3)
            .attr("height", length)
            .attr("fill-opacity", 1)
            .style("cursor", "col-resize")
          .node();
    } else {
        this.rectMarker = d3chartgroup.append("rect")
            .attr("x", 0)
            .attr("y", coord)
            .attr("width", length)
            .attr("height", 3)
            .attr("fill-opacity", 1)
            .style("cursor", "row-resize")
          .node();
    }
    this.parent = d3chartgroup.node();
    this.vertical = vertical;
    this.selected = false;
    var cursorObj = this;
    this.$background = $background;
    $(this.rectMarker).on("mousedown.cursor", function (event) {
            cursorObj.select(vertical ? event.pageX : event.pageY);
        });
}

Cursor.prototype.updateLength = function (newLength) {
    if (this.vertical) {
        this.rectMarker.setAttribute("height", newLength);
    } else {
        this.rectMarker.setAttribute("width", newLength);
    }
}

Cursor.prototype.updateCoordinate = function (newCoord) {
    this.coord = newCoord;
    if (this.vertical) {
        this.rectMarker.setAttribute("x", newCoord);
    } else {
        this.rectMarker.setAttribute("y", newCoord);
    }
}

Cursor.prototype.select = function (initCoord) {
    this.selected = true;
    this.rectMarker.setAttribute("fill-opacity", 0.5);
    var intermediateCoord = this.coord;
    var cursorObj = this;
    cursorObj.$background.css("cursor", this.vertical ? "col-resize" : "row-resize");
    $(document).on("mousemove.cursor", function (event) {
            var attr, eventVal;
            if (cursorObj.vertical) {
                attr = "x";
                eventVal = event.pageX;
            } else {
                attr = "y";
                eventVal = event.pageY;
            }
            intermediateCoord = cursorObj.coord + (eventVal - initCoord);
            cursorObj.rectMarker.setAttribute(attr, intermediateCoord - 1);
        });
    $(document).on("mouseup.cursor", function (event) {
            if (intermediateCoord < 0 || intermediateCoord >= (cursorObj.vertical ? cursorObj.s3ui_instance.idata.WIDTH : cursorObj.s3ui_instance.idata.HEIGHT)) {
                cursorObj.deleteSelf();
            } else {
                cursorObj.coord = intermediateCoord;
                cursorObj.deselect();
            }
        });
}

Cursor.prototype.deselect = function () {
    this.selected = false;
    this.$background.css("cursor", "");
    this.rectMarker.setAttribute("fill-opacity", 1);
    $(document).off(".cursor");
}

Cursor.prototype.deleteSelf = function () {
    if (this.selected) {
        $(document).off(".cursor");
        this.$background.css("cursor", "");
    }
    $(this.rectMarker).off(".cursor");
    if (this.vertical) {
        if (this.s3ui_instance.idata.vertCursor1 == this) {
            this.s3ui_instance.idata.vertCursor1 = undefined;
        } else {
            this.s3ui_instance.idata.vertCursor2 = undefined;
        }
    } else {
        if (this.s3ui_instance.idata.horizCursor1 == this) {
            this.s3ui_instance.idata.horizCursor1 = undefined;
        } else {
            this.s3ui_instance.idata.horizCursor2 = undefined;
        }
    }
    this.parent.removeChild(this.rectMarker);
}

// Behavior for zooming and scrolling
function repaintZoom(self) {
    d3.select(self.find("g.x-axis")).call(self.idata.oldXAxis);
    drawStreams(self, self.idata.oldData, self.idata.selectedStreams, self.idata.streamSettings, self.idata.oldXScale, self.idata.oldYScales, self.idata.oldYAxisArray, self.idata.oldAxisData, self.idata.loadingElem, true);
}

// In these functions, I abbreviate point self.idata.WIDTH exponent with pwe

function cacheData(self, uuid, drawID, pwe, startTime, endTime) {
    var sideCache = endTime - startTime;
    if (drawID != self.idata.drawRequestID) {
        return;
    }
    s3ui.ensureData(self, uuid, pwe, startTime - sideCache, startTime,
        function () {
            if (drawID != self.idata.drawRequestID) {
                return;
            }
            s3ui.ensureData(self, uuid, pwe, endTime, endTime + sideCache,
            function () {
                if (drawID != self.idata.drawRequestID || pwe == 0) {
                    return;
                }
                s3ui.ensureData(self, uuid, pwe - 1, startTime - sideCache, endTime + sideCache,
                function () {
                    if (drawID != self.idata.drawRequestID || pwe == 1) {
                        return;
                    }
                    s3ui.ensureData(self, uuid, pwe + 1, startTime - sideCache, endTime + sideCache,
                    function () {
                        if (drawID != self.idata.drawRequestID) {
                            return;
                        }
                        s3ui.ensureData(self, uuid, pwe - 2, startTime - sideCache, endTime + sideCache, function () { s3ui.setStreamMessage(self, uuid, undefined, 1); }, true);
                    }, true);
                }, true);
            }, true);
        }, true);
}

function repaintZoomNewData(self, callback, stopCache) {
    if (callback == undefined) {
        callback = function () { repaintZoom(self); };
    }
    var selectedStreams = self.idata.selectedStreams;
    var domain = self.idata.oldXScale.domain();
    self.idata.xStart.innerHTML = self.idata.labelFormatter.format(domain[0]);
    self.idata.xEnd.innerHTML = self.idata.labelFormatter.format(domain[1]);
    var numResponses = 0;
    function makeDataCallback(stream, startTime, endTime) {
        return function (data, low, high) {
            if (thisID != self.idata.drawRequestID) { // another request has been made
                return;
            }
            if (!self.idata.pollingBrackets && s3ui.shouldPollBrackets(self, stream.uuid, domain)) {
                s3ui.startPollingBrackets(self);
            }
            s3ui.limitMemory(self, selectedStreams, self.idata.oldOffsets, domain[0], domain[1], 300000 * selectedStreams.length, 150000 * selectedStreams.length);
            if (data != undefined) {
                self.idata.oldData[stream.uuid] = [stream, data, pwe, low, high];
            }
            numResponses++;
            s3ui.setStreamMessage(self, stream.uuid, undefined, 5);
            if (!stopCache) {
                s3ui.setStreamMessage(self, stream.uuid, "Caching data...", 1);
                setTimeout(function () { cacheData(self, stream.uuid, thisID, pwe, startTime, endTime); }, 0); // do it asynchronously
            }
            if (numResponses == selectedStreams.length) {
                callback();
            }
        };
    }
    var pwe = s3ui.getPWExponent((domain[1] - domain[0]) / self.idata.WIDTH);
    var thisID = ++self.idata.drawRequestID;
    if (self.idata.drawRequestID > 8000000) {
        self.idata.drawRequestID = -1;
    }
    for (var i = 0; i < selectedStreams.length; i++) {
        s3ui.setStreamMessage(self, selectedStreams[i].uuid, "Fetching data...", 5);
        s3ui.ensureData(self, selectedStreams[i].uuid, pwe, domain[0] - self.idata.offset, domain[1] - self.idata.offset, makeDataCallback(selectedStreams[i], domain[0] - self.idata.offset, domain[1] - self.idata.offset));
    }
    if (selectedStreams.length == 0) {
        callback();
    }
}

function initPlot(self) {
    var chart = d3.select(self.find("svg.chart"));
    $(chart.node()).empty(); // Remove directions from inside the chart
    self.idata.testElem = chart.append("g")
        .attr("class", "tick")
      .append("text")
        .style("visibility", "none")
        .node();
    chart.attr("width", self.idata.margin.left + self.idata.WIDTH + self.idata.margin.right)
        .attr("height", self.idata.margin.top + self.idata.HEIGHT + self.idata.margin.bottom)
      .append("rect")
        .attr("class", "background-rect")
        .attr("fill", "white")
        .attr("width", self.idata.margin.left + self.idata.WIDTH + self.idata.margin.right)
        .attr("height", self.idata.margin.top + self.idata.HEIGHT + self.idata.margin.bottom)
    var chartarea = chart.append("g")
        .attr("class", "chartarea")
        .attr("width", self.idata.WIDTH)
        .attr("height", self.idata.HEIGHT)
        .attr("transform", "translate(" + self.idata.margin.left + ", " + self.idata.margin.top + ")");
    var yaxiscover = chart.append("g")
        .attr("class", "y-axis-cover axiscover");
    yaxiscover.append("rect")
        .attr("width", self.idata.margin.left)
        .attr("height", self.idata.margin.top + self.idata.HEIGHT + self.idata.margin.bottom)
        .attr("class", "y-axis-background-left")
        .attr("fill", "white");
    yaxiscover.append("rect")
        .attr("width", self.idata.margin.right)
        .attr("height", self.idata.margin.top + self.idata.HEIGHT + self.idata.margin.bottom)
        .attr("transform", "translate(" + (self.idata.margin.left + self.idata.WIDTH) + ", 0)")
        .attr("class", "y-axis-background-right")
        .attr("fill", "white");
    var xaxiscover = chart.append("g")
        .attr("class", "x-axis-cover")
        .attr("transform", "translate(" + self.idata.margin.left + ", " + (self.idata.margin.top + self.idata.HEIGHT) + ")");
    xaxiscover.append("rect")
        .attr("width", self.idata.WIDTH + 2) // Move 1 to the left and increase width by 2 to cover boundaries when zooming
        .attr("height", self.idata.margin.bottom)
        .attr("transform", "translate(-1, 0)")
        .attr("class", "x-axis-background")
        .attr("fill", "white");
    self.idata.xTitle = xaxiscover.append("text")
        .attr("class", "xtitle title")
        .attr("text-anchor", "middle")
        .attr("x", self.idata.WIDTH / 2)
        .attr("y", 53)
        .html("Time")
        .node();
    self.idata.xStart = xaxiscover.append("text")
        .attr("text-anchor", "middle")
        .attr("class", "label")
        .attr("x", 0)
        .attr("y", 35)
        .node();
    self.idata.xEnd = xaxiscover.append("text")
        .attr("text-anchor", "middle")
        .attr("class", "label")
        .attr("x", self.idata.WIDTH)
        .attr("y", 35)
        .node();
    var datadensitycover = chart.append("g")
        .attr("class", "data-density-cover")
        .attr("transform", "translate(" + self.idata.margin.left + ", 0)");
    datadensitycover.append("rect") // Move 1 to the left and increase width by 2 to cover boundaries when zooming
        .attr("width", self.idata.WIDTH + 2)
        .attr("height", self.idata.margin.top)
        .attr("transform", "translate(-1, 0)")
        .attr("class", "data-density-background")
        .attr("fill", "white");
    xaxiscover.append("g")
        .attr("class", "x-axis axis");
    var yaxes = chart.append("g")
        .attr("transform", "translate(0, " + self.idata.margin.top + ")")
        .attr("class", "y-axes")
    yaxes.append("g")
        .attr("class", "y-axes-left");
    yaxes.append("g")
        .attr("transform", "translate(" + (self.idata.margin.left + self.idata.WIDTH) + ", 0)")
        .attr("class", "y-axes-right");
    datadensitycover.append("g")
        .attr("transform", "translate(0, 10)")
        .attr("class", "data-density-plot")
      .append("g")
        .attr("class", "data-density-axis");
    var plotclickscreen = chart.append("rect") // To sense mouse click/drag
        .attr("width", self.idata.WIDTH)
        .attr("height", self.idata.HEIGHT)
        .attr("transform", "translate(" + self.idata.margin.left + ", " + self.idata.margin.top + ")")
        .attr("class", "plotclickscreen clickscreen unclickedchart")
      .node();
    plotclickscreen.onmousedown = function () {
            $(this).attr('class', 'plotclickscreen clickscreen clickedchart');
        };
    plotclickscreen.onmouseup = function () {
            $(this).attr('class', 'plotclickscreen clickscreen unclickedchart');
        };
    var bottomcursorselect = chart.append("rect")
        .attr("width", self.idata.WIDTH)
        .attr("height", self.idata.margin.bottom)
        .attr("transform", "translate(" + self.idata.margin.left + ", " + (self.idata.margin.top + self.idata.HEIGHT) + ")")
        .attr("class", "clickscreen bottomcursorselect")
      .node();
    $(bottomcursorselect).mousedown(function (event) {
            if (self.idata.vertCursor1 != undefined && self.idata.vertCursor2 != undefined) {
                return;
            }
            var newCursor = new Cursor(self, event.pageX - (self.idata.margin.left + $(chart.node()).offset().left), cursorgroup, self.idata.HEIGHT, true, $background);
            if (self.idata.vertCursor1 == undefined) {
                self.idata.vertCursor1 = newCursor;
            } else{
                self.idata.vertCursor2 = newCursor;
            }
            newCursor.select(event.pageX);
        });
    var leftcursorselect = chart.append("rect")
        .attr("width", self.idata.margin.left)
        .attr("height", self.idata.HEIGHT)
        .attr("class", "clickscreen leftcursorselect")
        .attr("transform", "translate(0, " + self.idata.margin.top + ")")
      .node();
    var createHorizCursor = function (event) {
        if (self.idata.horizCursor1 != undefined && self.idata.horizCursor2 != undefined) {
            return;
        }
        var newCursor = new Cursor(self, event.pageY - (self.idata.margin.top + $(chart.node()).offset().top), cursorgroup, self.idata.WIDTH, false, $background);
        if (self.idata.horizCursor1 == undefined) {
            self.idata.horizCursor1 = newCursor;
        } else{
            self.idata.horizCursor2 = newCursor;
        }
        newCursor.select(event.pageY);
    };
    $(leftcursorselect).mousedown(createHorizCursor);
    var rightcursorselect = chart.append("rect")
        .attr("width", self.idata.margin.right)
        .attr("height", self.idata.HEIGHT)
        .attr("class", "clickscreen rightcursorselect")
        .attr("transform", "translate(" + (self.idata.margin.left + self.idata.WIDTH) + ", " + self.idata.margin.top + ")")
      .node();
    $(rightcursorselect).mousedown(createHorizCursor);
    var cursorgroup = chart.append("g")
        .attr("transform", "translate(" + self.idata.margin.left + ", " + self.idata.margin.top + ")")
        .attr("class", "cursorgroup");
    var $background = $("svg.chart > .clickscreen, svg.chart .data-density-background, svg.chart .y-axis-background-left, svg.chart .y-axis-background-right");
    self.idata.loadingElem = $(self.find('.plotLoading'));
    self.idata.initialized = true;
}

/* Updates the size of the chart based on changes to the margins. The width will
   be changed to best match self.idata.TARGETWIDTH. */
function updateSize(self, redraw) {
    var oldwidth = self.idata.WIDTH;
    var margin = self.idata.margin;
    
    self.idata.WIDTH = Math.max(self.idata.widthmin, self.idata.TARGETWIDTH - margin.left - margin.right);
    var WIDTH = self.idata.WIDTH;
    var HEIGHT = self.idata.HEIGHT;
    self.idata.zoom.size([WIDTH, HEIGHT]);
    self.$("svg.chart, svg.chart rect.background-rect").attr({
            width: margin.left + WIDTH + margin.right,
            height: margin.top + HEIGHT + margin.bottom
        });
    self.$("svg.chart g.chartarea, svg.chart rect.plotclickscreen, svg.chart g.cursorgroup").attr({
            transform: "translate(" + margin.left + ", " + margin.top + ")",
            width: WIDTH
        });
    self.$("svg.chart g.x-axis-cover, svg.chart rect.bottomcursorselect").attr("transform", "translate(" + margin.left + ", " + (margin.top + HEIGHT) + ")");
    self.$("svg.chart g.data-density-cover").attr("transform", "translate(" + margin.left + ", 0)");
    self.$("rect.x-axis-background").attr({
            height: margin.bottom,
            width: WIDTH + 2
        });
    self.$("rect.y-axis-background-left").attr({
            width: margin.left,
            height: margin.top + HEIGHT + margin.bottom
        });
    self.$("rect.y-axis-background-right").attr({
            width: margin.right,
            height: margin.top + HEIGHT + margin.bottom,
            transform: "translate(" + (margin.left + WIDTH) + ", 0)"
        });
    $(self.find("rect.leftcursorselect")).attr({
            width: margin.left,
            height: HEIGHT,
            transform: "translate(0, " + margin.top + ")"
        });
    $(self.find("rect.rightcursorselect")).attr({
            width: margin.right,
            height: HEIGHT,
            transform: "translate(" + (margin.left + WIDTH) + ", " + margin.top + ")"
        });
    $(self.find("rect.bottomcursorselect")).attr({
            width: WIDTH,
            height: margin.bottom
        });
    self.$("rect.data-density-background").attr({
            width: WIDTH + 2,
            height: margin.top
        });
    self.$("g.y-axes").attr("transform", "translate(0, " + margin.top + ")");
    self.$("g.y-axes-right").attr("transform", "translate(" + (margin.left + WIDTH) + ", 0)");
    if (oldwidth == WIDTH || !self.idata.initialized) {
        return;
    }
    var zoom = self.idata.zoom;
    zoom.size([WIDTH, HEIGHT]);
    self.idata.xTitle.setAttribute("x", WIDTH / 2);
    self.idata.xEnd.setAttribute("x", WIDTH);
    var oldXScale = self.idata.oldXScale;
    if (self.idata.oldXScale != undefined) {
        var scale = zoom.scale();
        var translate = zoom.translate()[0];
        oldXScale.domain(self.idata.oldDomain);
        oldXScale.range([0, WIDTH]);
        zoom.x(oldXScale).scale(scale).translate([translate / oldwidth * WIDTH, 0]);
        self.idata.oldXAxis(d3.select(self.find("g.x-axis")));
        // I could do it more efficiently if I just mutated the object's attributes directly rather than creating
        // methods, but that would be much less readable (enough to make up for the slowness of checking this.vertical
        // twice unnecessarily)
        if (self.idata.vertCursor1 != undefined) {
            self.idata.vertCursor1.updateCoordinate(self.idata.vertCursor1.coord * WIDTH / oldwidth);
        }
        if (self.idata.vertCursor2 != undefined) {
            self.idata.vertCursor2.updateCoordinate(self.idata.vertCursor2.coord * WIDTH / oldwidth);
        }
        if (self.idata.horizCursor1 != undefined) {
            self.idata.horizCursor1.updateLength(WIDTH);
        }
        if (self.idata.horizCursor2 != undefined) {
            self.idata.horizCursor2.updateLength(WIDTH);
        }
        // The height can't change, so we're done. If the height could also change, I'd also have to update
        // the heights of the vertical cursors and the positions of the horizontal cursors.
    }
    if (redraw) {
        setTimeout(function () { repaintZoomNewData(self); }, 50);
    }
}

function updatePlot(self) {
    if (!self.idata.automaticAxisUpdate) {
        self.idata.selectedStreams = self.idata.selectedStreamsBuffer.slice();
    }
    if (!self.idata.initialized) {
        initPlot(self);
    }
    drawPlot(self);
}

function applySettings(self, loadData, overrideAutomaticAxisUpdate) {
    if (self.idata.onscreen) {
        if (!(self.idata.automaticAxisUpdate || overrideAutomaticAxisUpdate)) {
            self.idata.otherChange = true;
            s3ui.updatePlotMessage(self);
        } else {
            if (loadData) {
                repaintZoomNewData(self, function () {
                        drawYAxes(self, self.idata.oldData, self.idata.selectedStreams, self.idata.streamSettings, self.idata.oldStartDate, self.idata.oldEndDate, self.idata.oldXScale, self.idata.loadingElem);
                    });
            }
            drawYAxes(self, self.idata.oldData, self.idata.selectedStreams, self.idata.streamSettings, self.idata.oldStartDate, self.idata.oldEndDate, self.idata.oldXScale, self.idata.loadingElem);
        }
    }
}

function drawPlot(self) {
    // Get the time range we are going to plot
    var loadingElem = self.idata.loadingElem;
    loadingElem.html("Verifying date range...");
    var startText = self.find(".startdate").value;
    var endText = self.find(".enddate").value;
    if (startText == "") {
        loadingElem.html("Error: Start date is not selected.");
        return;
    } else if (endText == "") {
        loadingElem.html("Error: End date is not selected.");
        return;
    }
    var selectedTimezone = s3ui.getSelectedTimezone(self);
    self.idata.oldTimezone = selectedTimezone;
    var naiveStartDateObj = self.idata.dateConverter.parse(startText);
    var naiveEndDateObj = self.idata.dateConverter.parse(endText);
    try {
        var startDateObj = new timezoneJS.Date(naiveStartDateObj.getFullYear(), naiveStartDateObj.getMonth(), naiveStartDateObj.getDate(), naiveStartDateObj.getHours(), naiveStartDateObj.getMinutes(), naiveStartDateObj.getSeconds(), selectedTimezone);
        var endDateObj = new timezoneJS.Date(naiveEndDateObj.getFullYear(), naiveEndDateObj.getMonth(), naiveEndDateObj.getDate(), naiveEndDateObj.getHours(), naiveEndDateObj.getMinutes(), naiveEndDateObj.getSeconds(), selectedTimezone);
        var startDate = startDateObj.getTime();
        var endDate = endDateObj.getTime();
    } catch (err) {
        loadingElem.html(err);
        return;
    }
    if (startDate >= endDate) {
        loadingElem.html("Error: Selected date range is invalid.");
        return;
    }
    
    /* Used for optimization; GET request is not sent if same time range and streams are used. */
    var sameTimeRange = ((startDate == self.idata.oldStartDate) && (endDate == self.idata.oldEndDate));
    
    // Verify that streams have been selected
    loadingElem.html("Verifying stream selection...");
    var numstreams = self.idata.selectedStreams.length;
    if (numstreams == 0) {
        loadingElem.html("Error: No streams are selected.");
        return;
    }
    
    self.idata.offset = startDateObj.getTimezoneOffset() * -60000; // what to add to UTC to get to selected time zone
    
    self.idata.xTitle.innerHTML = "Time [" + selectedTimezone + "]";
    
    self.idata.oldDomain = [startDate + self.idata.offset, endDate + self.idata.offset];
    // Create the xScale and axis if we need to
    var xScale, xAxis;
    if (!sameTimeRange) {
        xScale = d3.time.scale.utc() // I'm telling d3 it's in UTC time, but in reality I'm going to add an offset to everything so it actually displays the selected time zone
            .domain([startDate + self.idata.offset, endDate + self.idata.offset])
            .range([0, self.idata.WIDTH]);
        xAxis = d3.svg.axis().scale(xScale).orient("bottom").ticks(5);
        self.idata.oldStartDate = startDate;
        self.idata.oldEndDate = endDate;
        self.idata.oldXScale = xScale;
        self.idata.oldXAxis = xAxis;
        self.idata.zoom.scaleExtent([(endDate - startDate) / 315360000000000, endDate - startDate]); // So we don't zoom in past 1 ms, or zoom out past 10000 years
    } else {
        xScale = self.idata.oldXScale;
        xAxis = self.idata.oldXAxis;
    }
    
    loadingElem.html("Fetching data...");
    
    self.idata.zoom.x(xScale);
    self.idata.zoom.scale(self.idata.initzoom).translate([self.idata.inittrans, 0]);
    self.idata.initzoom = 1;
    self.idata.inittrans = 0;
    
    // Get the data for the streams
    repaintZoomNewData(self, function () {
            if (!sameTimeRange) {
                d3.select(self.find("g.x-axis"))
                    .call(xAxis);
            }
            loadingElem.html("Drawing graph...");
            // Set a timeout so the new message (Drawing graph...) actually shows
            setTimeout(function () { d3.select(".plotclickscreen").call(self.idata.zoom); drawYAxes(self, self.idata.oldData, self.idata.selectedStreams, self.idata.streamSettings, self.idata.oldStartDate, self.idata.oldEndDate, self.idata.oldXScale, loadingElem); }, 50);
        });
}

function drawYAxes(self, data, streams, streamSettings, startDate, endDate, xScale, loadingElem) {
    otherChange = false;
    
    var yAxes = self.idata.yAxes;
    
    // Find the minimum and maximum value in each stream to properly scale the axes
    var axisData = {}; // Maps axis ID to a 2-element array containing the minimum and maximum; later on a third element is added containing the y-Axis scale
    var toDraw = [];
    var numstreams;
    var i, j, k;
    var streamdata;
    var totalmin;
    var totalmax;
    var datapointmin, datapointmax;
    var axis;
    var startIndex, endIndex;
    var domain = xScale.domain();
    var startTime = domain[0] - self.idata.offset;
    var endTime = domain[1] - self.idata.offset;
    for (i = 0; i < yAxes.length; i++) {
        axis = yAxes[i];
        numstreams = axis.streams.length;
        if (numstreams > 0) {
            toDraw.push(axis);
        }
        if (axis.newaxis && (axis.leftBox.value != "" || axis.rightBox.value != "")) { // Check if the user gave this axis an initial scale
            axis.newaxis = false;
            axis.autoscale = false;
        }
        if (!axis.autoscale && (axis.manualscale[1] > axis.manualscale[0])) {
            axisData[axis.axisid] = [NaN, NaN]; // so we know that we're using a manual scale for this axis
            continue;
        }
        totalmin = undefined;
        totalmax = undefined;
        for (j = 0; j < numstreams; j++) {
            if (!data.hasOwnProperty(axis.streams[j].uuid)) {
                continue;
            }
            streamdata = data[axis.streams[j].uuid][1];
            startIndex = s3ui.binSearch(streamdata, startTime, function (point) { return point[0]; });
            if (startIndex < streamdata.length && streamdata[startIndex][0] < startTime) {
                startIndex++; // make sure we only look at data in the specified range
            }
            endIndex = s3ui.binSearch(streamdata, endTime, function (point) { return point[0]; });
            if (endIndex < streamdata.length && streamdata[endIndex][0] > endTime) {
                endIndex--; // make sure we only look at data in the specified range
            }
            for (k = startIndex; k < endIndex; k++) {
                datapointmin = streamdata[k][2];
                datapointmax = streamdata[k][4];
                if (!(totalmin <= datapointmin)) {
                    totalmin = datapointmin;
                }
                if (!(totalmax >= datapointmax)) {
                    totalmax = datapointmax;
                }
            }
        }
        if (totalmin != undefined) {
            if (totalmin == totalmax) { // Choose a range so the axis can show something meaningful
                totalmin--;
                totalmax++;
            }
            axisData[axis.axisid] = [totalmin, totalmax];
        } else {
            axisData[axis.axisid] = [-1, 1, true];
        }
    }
    
    self.idata.oldAxisData = axisData;    
    
    numstreams = streams.length;
    
    var yScales = $.map(toDraw, function (elem) {
            var scale;
            if (isNaN(axisData[elem.axisid][0])) { // manual scale
                scale = d3.scale.linear()
                    .domain([elem.manualscale[0], elem.manualscale[1]])
                    .range([self.idata.HEIGHT, 0]);
                elem.newaxis = false;
            } else { // auto scale
                scale = d3.scale.linear()
                    .domain([axisData[elem.axisid][0], axisData[elem.axisid][1]])
                    .range([self.idata.HEIGHT, 0])
                    .nice();
                var domain = scale.domain();
                if (elem.autoscale) { // if this is the result of an AUTOSCALE rather than bad input...
                    if (!axisData[elem.axisid][2]) { // only set the text in the axes if autoscale came up with something reasonable
                        elem.leftBox.value = domain[0];
                        elem.rightBox.value = domain[1];
                        elem.newaxis = false;
                    }
                    if (!elem.newaxis) {
                        elem.autoscale = false;
                    }
                }
                elem.manualscale[0] = domain[0];
                elem.manualscale[1] = domain[1];
            }
            axisData[elem.axisid].push(scale);
            return scale;
        });
        
    self.idata.oldYScales = yScales;
    
    var yAxisArray = $.map(yScales, function (yScale) { return d3.svg.axis().scale(yScale).ticks(5); });
    
    var leftYAxes = [];
    var leftYObjs = [];
    var rightYAxes = [];
    var rightYObjs = [];
    for (i = 0; i < toDraw.length; i++) {
        if (toDraw[i].right === null) {
            continue;
        } else if (toDraw[i].right) {
            rightYAxes.push(yAxisArray[i]);
            rightYObjs.push(toDraw[i]);
        } else {
            leftYAxes.push(yAxisArray[i]);
            leftYObjs.push(toDraw[i]);
        }
    }
    
    self.idata.oldYAxisArray = yAxisArray;
    var leftMargins = leftYAxes.map(function (axis) { var scale = axis.scale(); return 65 + Math.max(35, Math.max.apply(this, scale.ticks().map(function (d) { self.idata.testElem.innerHTML = scale.tickFormat()(d); return self.idata.testElem.getComputedTextLength(); }))); });
    var rightMargins = rightYAxes.map(function (axis) { var scale = axis.scale(); return 65 + Math.max(35, Math.max.apply(this, scale.ticks().map(function (d) { self.idata.testElem.innerHTML = scale.tickFormat()(d); return self.idata.testElem.getComputedTextLength(); }))); });
    for (i = 1; i < leftMargins.length; i++) {
        leftMargins[i] += leftMargins[i - 1];
    }
    leftMargins.unshift(0);
    for (i = 1; i < rightMargins.length; i++) {
        rightMargins[i] += rightMargins[i - 1];
    }
    rightMargins.unshift(0);
    self.idata.margin.left = Math.max(100, leftMargins[leftMargins.length - 1]);
    self.idata.margin.right = Math.max(100, rightMargins[rightMargins.length - 1]);
    updateSize(self, false);
    
    // Draw the y-axes
    var update;
    update = d3.select(self.find("svg.chart g.y-axes"))
      .selectAll("g.y-axis-left")
      .data(leftYAxes);
    update.enter()
      .append("g")
        .attr("class", "y-axis-left axis");
    update
        .attr("transform", function (d, i) { return "translate(" + (self.idata.margin.left - leftMargins[i]) + ", 0)"; })
        .each(function (yAxis) { d3.select(this).call(yAxis.orient("left")); });
    update.exit().remove();
    
    update = d3.select(self.find("svg.chart g.y-axes-right"))
      .selectAll("g.y-axis-right")
      .data(rightYAxes);
    update.enter()
      .append("g")
        .attr("class", "y-axis-right axis");
    update
        .attr("transform", function (d, i) { return "translate(" + rightMargins[i] + ", 0)"; })
        .each(function (yAxis) { d3.select(this).call(yAxis.orient("right")); });
    update.exit().remove();
    
    // Draw the y-axis titles
    update = d3.select(self.find("svg.chart g.y-axes-left"))
      .selectAll("text.ytitle")
      .data(leftYObjs);
    update.enter()
      .append("text");
    update
        .attr("class", function (d) { return "ytitle title axistitle-" + d.axisid; })
        .attr("text-anchor", "middle")
        .attr("transform", (function () {
                var j = 0; // index of left axis
                return function (d) {
                    return "translate(" + (self.idata.margin.left - leftMargins[++j] + 40) + ", " + (self.idata.HEIGHT / 2) + ")rotate(-90)";
                };
             })())
        .html(function (d) { return d.axisname; });
    update.exit().remove();
    update = d3.select(self.find("svg.chart g.y-axes-right"))
      .selectAll("text.ytitle")
      .data(rightYObjs);
    update.enter()
      .append("text");
    update
        .attr("class", function (d) { return "ytitle title axistitle-" + d.axisid; })
        .attr("text-anchor", "middle")
        .attr("transform", (function () {
                var i = 0; // index of right axis
                return function (d) {
                    return "translate(" + (rightMargins[++i] - 40) + ", " + (self.idata.HEIGHT / 2) + ")rotate(90)";
                };
             })())
        .html(function (d) { return d.axisname; });
    update.exit().remove();
    
    drawStreams(self, data, streams, streamSettings, xScale, yScales, yAxisArray, axisData, loadingElem, false);
}

/* Render the graph on the screen. If DRAWFAST is set to true, the entire plot is not drawn (for the sake of speed); in
   paticular new streams are not added and old ones not removed (DRAWFAST tells it to optimize for scrolling).
*/
function drawStreams (self, data, streams, streamSettings, xScale, yScales, yAxisArray, axisData, loadingElem, drawFast) {
    if (!drawFast && (streams.length == 0 || yAxisArray.length == 0)) {
        if (streams.length == 0) {
            loadingElem.html("Error: No streams are selected.");
        } else {
            loadingElem.html("Error: All selected streams have no data.");
        }
        self.$("g.chartarea > g").remove();
        return;
    }
    if (yAxisArray == undefined) {
        return;
    }
    self.idata.onscreen = true;
    // Render the graph
    var update;
    var uuid;
    var dataArray = [];
    var yScale;
    var minval, mean, maxval;
    var subsetdata;
    var scaledX;
    var startIndex;
    var domain = xScale.domain();
    var startTime, endTime;
    var xPixel;
    var color;
    var mint, maxt;
    var outOfRange;
    var WIDTH = self.idata.WIDTH;
    var HEIGHT = self.idata.HEIGHT;
    var pixelw = (domain[1] - domain[0]) / WIDTH * 1000000; // pixel width in nanoseconds
    var currpt;
    var prevpt;
    var offset = self.idata.offset;
    var lineChunks;
    var points;
    var currLineChunk;
    var pw;
    var dataObj;
    var j;

    for (var i = 0; i < streams.length; i++) {
        xPixel = -Infinity;
        if (!data.hasOwnProperty(streams[i].uuid)) {
            continue;
        }
        lineChunks = [];
        points = [];
        currLineChunk = [[], [], []]; // first array is min points, second is mean points, third is max points
        streamdata = data[streams[i].uuid][1];
        pw = Math.pow(2, data[streams[i].uuid][2]);
        yScale = axisData[streamSettings[streams[i].uuid].axisid][2];
        startTime = domain[0].getTime() - offset;
        endTime = domain[1].getTime() - offset;
        startIndex = s3ui.binSearch(streamdata, startTime, function (point) { return point[0]; });
        if (startIndex < streamdata.length && streamdata[startIndex][0] < startTime) {
            startIndex++; // make sure we only plot data in the specified range
        }
        outOfRange = true;
        for (j = startIndex; j < streamdata.length && (xPixel = xScale((currpt = streamdata[j])[0] + offset)) < WIDTH && xPixel >= 0; j++) {
            prevpt = streamdata[j - 1];
            if (currLineChunk[0].length > 0 && (j == startIndex || (currpt[0] - prevpt[0]) * 1000000 + (currpt[1] - prevpt[1]) > pw)) {
                processLineChunk(currLineChunk, lineChunks, points);
                currLineChunk = [[], [], []];
            }
            // correct for nanoseconds
            xPixel += (currpt[1] / pixelw);
            mint = Math.min(Math.max(yScale(currpt[2]), -2000000), 2000000);
            currLineChunk[0].push(xPixel + "," + mint);
            currLineChunk[1].push(xPixel + "," + Math.min(Math.max(yScale(currpt[3]), -2000000), 2000000));
            maxt = Math.min(Math.max(yScale(currpt[4]), -2000000), 2000000);
            currLineChunk[2].push(xPixel + "," + maxt);
            outOfRange = outOfRange && (mint < 0 || mint > HEIGHT) && (maxt < 0 || maxt > HEIGHT) && (mint < HEIGHT || maxt > 0);
        }
        processLineChunk(currLineChunk, lineChunks, points);
        if (lineChunks.length == 1 && lineChunks[0][0].length == 0) {
            s3ui.setStreamMessage(self, streams[i].uuid, "No data in specified time range", 3);
        } else {
            s3ui.setStreamMessage(self, streams[i].uuid, undefined, 3);
        }
        color = streamSettings[streams[i].uuid].color;
        dataObj = {color: color, points: points, uuid: streams[i].uuid};
        dataObj.linechunks = lineChunks.map(function (x) {
                x[0].reverse();
                x[1] = x[1].join(" ");
                x[0] = x.pop().join(" ") + " " + x[0].join(" ");
                return x;
            });
        dataArray.push(dataObj);
        if (outOfRange) {
            s3ui.setStreamMessage(self, streams[i].uuid, "Data outside axis range; try rescaling y-axis", 2);
        } else {
            s3ui.setStreamMessage(self, streams[i].uuid, undefined, 2);
        }
    }
    update = d3.select(self.find("g.chartarea"))
      .selectAll("g.streamGroup")
      .data(dataArray);
        
    update.enter()
      .append("g")
      .attr("class", "streamGroup");
        
    if (!drawFast) {
        update
            .attr("class", function (dataObj) { return "streamGroup series-" + dataObj.uuid; })
            .attr("stroke", function (d) { return d.color; })
            .attr("stroke-width", function (d) { return self.idata.showingDensity == d.uuid ? 3 : 1; })
            .attr("fill", function (d) { return d.color; })
            .attr("fill-opacity", function (d) { return self.idata.showingDensity == d.uuid ? 0.5 : 0.3; });
    }
        
    update.exit()
        .remove();
        
    var oldUpdate = update;
        
    update = update.selectAll("g")
      .data(function (d, i) { return dataArray[i].linechunks; });
      
    update.enter()
      .append("g");
      
    update.exit()
      .remove();
    
    update.selectAll("polyline").remove();
    
    update
      .append("polyline")
        .attr("class", "streamRange")
        .attr("points", function (d) { return d[0]; });
        
    update
      .append("polyline")
        .attr("class", "streamMean")
        .attr("points", function (d) { return d[1]; });
        
    update = oldUpdate
      .selectAll("circle.streamPoint")
      .data(function (d, i) { return dataArray[i].points; });
      
    update.enter()
      .append("circle")
      .attr("class", "streamPoint");
      
    update
        .attr("cx", function (d) { return d[0]; })
        .attr("cy", function (d) { return d[1]; })
        .attr("r", 1);
    
    update.exit().remove();
    
    if (!drawFast) {
        s3ui.updatePlotMessage(self);
    }
    
    if (self.idata.showingDensity != undefined) {
        s3ui.setStreamMessage(self, self.idata.showingDensity, "Interval width: " + s3ui.nanosToUnit(Math.pow(2, self.idata.oldData[self.idata.showingDensity][2])), 4);
        var ddplot = $(self.find("svg.chart g.data-density-plot"));
        ddplot.children("polyline, circle").remove();
        showDataDensity(self, self.idata.showingDensity);
    }
}

function processLineChunk(lc, lineChunks, points) {
    if (lc[0].length == 1) {
        var minval = lc[0];
        var maxval = lc[2];
        var meanval = lc[1];
        if (minval[0] == maxval[0]) {
            meanval = meanval[0].split(",");
            points.push([parseFloat(meanval[0]), parseFloat(meanval[1])]);
        } else {
            var minv = minval[0].split(",");
            var mint = parseFloat(minv[0]);
            lc[0] = [(mint - 0.5) + "," + minv[1], (mint + 0.5) + "," + minv[1]];
            var meanv = meanval[0].split(",");
            var meant = parseFloat(meanv[0]);
            lc[1] = [(meant - 0.5) + "," + meanv[1], (meant + 0.5) + "," + meanv[1]];
            var maxv = maxval[0].split(",");
            var maxt = parseFloat(maxv[0]);
            lc[2] = [(maxt - 0.5) + "," + maxv[1], (maxt + 0.5) + "," + maxv[1]];
            lineChunks.push(lc);
        }
    } else {
        lineChunks.push(lc);
    }
}

function showDataDensity(self, uuid) {
    var oldShowingDensity = self.idata.showingDensity;
    self.idata.showingDensity = uuid;
    if (!self.idata.onscreen || !self.idata.oldData.hasOwnProperty(uuid)) {
        self.idata.drawnBefore = false;
        return;
    }
    if (oldShowingDensity != uuid || !self.idata.drawnBefore) {
        $("g.series-" + uuid).attr({"stroke-width": 3, "fill-opacity": 0.5});
    }
    self.idata.drawnBefore = true;
    var domain = self.idata.oldXScale.domain();
    var streamdata = self.idata.oldData[uuid][1];
    var j;
    var selectedStreams = self.idata.selectedStreams;
    for (j = 0; j < selectedStreams.length; j++) {
        if (selectedStreams[j].uuid == uuid) {
            break;
        }
    }
    var WIDTH = self.idata.WIDTH;
    var pixelw = (domain[1] - domain[0]) / WIDTH;
    var pw = Math.pow(2, self.idata.oldData[uuid][2]);
    pixelw *= 1000000;
    var offset = self.idata.offset
    var startTime = domain[0].getTime() - offset;
    var totalmax;
    var xPixel;
    var prevIntervalEnd;
    var toDraw = [];
    var lastiteration;
    var startIndex;
    var prevpt;
    var oldXScale = self.idata.oldXScale;
    if (streamdata.length > 0) {    
        var i;
        startIndex = s3ui.binSearch(streamdata, startTime, function (point) { return point[0]; });
        if (startIndex < streamdata.length && streamdata[startIndex][0] < startTime) {
            startIndex++;
        }
        if (startIndex >= streamdata.length) {
            startIndex = streamdata.length - 1;
        }
        totalmax = streamdata[startIndex][5];
        if (startIndex < streamdata.length) {
            lastiteration = false;
            for (i = startIndex; i < streamdata.length; i++) {
                xPixel = oldXScale(streamdata[i][0] + offset);
                xPixel += ((streamdata[i][1] - pw/2) / pixelw);
                if (xPixel < 0) {
                    xPixel = 0;
                }
                if (xPixel > WIDTH) {
                    xPixel = WIDTH;
                    lastiteration = true;
                }
                if (i == 0) {
                    prevpt = [self.idata.oldData[uuid][3], 0, 0, 0, 0, 0];
                } else {
                    prevpt = streamdata[i - 1];
                }
                if (((streamdata[i][0] - prevpt[0]) * 1000000) + streamdata[i][1] - prevpt[1] <= pw) {
                    if (i != 0) { // if this is the first point in the cache entry, then the cache start is less than a pointwidth away and don't drop it to zero
                        if (i == startIndex) {
                            toDraw.push([Math.max(0, oldXScale(prevpt[1] + offset)), prevpt[5]]);
                        }
                        toDraw.push([xPixel, toDraw[toDraw.length - 1][1]]);
                    }
                } else {
                    prevIntervalEnd = Math.max(0, oldXScale(prevpt[0] + offset) + ((prevpt[1] + (pw/2)) / pixelw)); // x pixel of end of previous interval
                    if (prevIntervalEnd != 0) {
                        toDraw.push([prevIntervalEnd, prevpt[5]]);
                    }
                    toDraw.push([prevIntervalEnd, 0]);
                    toDraw.push([xPixel, 0]);
                }
                if (!lastiteration) {
                    toDraw.push([xPixel, streamdata[i][5]]);
                }
                if (!(streamdata[i][5] <= totalmax)) {
                    totalmax = streamdata[i][5];
                }
                if (lastiteration) {
                    break;
                }
            }
            if (i == streamdata.length && (self.idata.oldData[uuid][4] - streamdata[i - 1][0]) * 1000000 - streamdata[i - 1][1] >= pw) {
                // Force the plot to 0
                toDraw.push([toDraw[toDraw.length - 1][0], 0]);
                // Keep it at zero for the correct amount of time
                toDraw.push([Math.min(oldXScale(self.idata.oldData[uuid][4] + offset), WIDTH), 0]);
            }
        }
    }
    if (toDraw.length == 0) { // streamdata is empty, OR nothing relevant is there to draw
        toDraw = [[Math.max(0, oldXScale(self.idata.oldData[uuid][3] + offset)), 0], [Math.min(WIDTH, oldXScale(self.idata.oldData[uuid][4] + offset)), 0]];
        totalmax = 0;
    } 
    var yScale;
    if (totalmax == 0) {
        totalmax = 1;
    }
    yScale = d3.scale.log().base(2).domain([0.5, totalmax]).range([45, 0]);
    
    for (j = 0; j < toDraw.length; j++) {
        if (toDraw[j][0] == 0 && j > 0) {
            toDraw.shift(); // Only draw one point at x = 0; there may be more in the array
            j--;
        }
        if (toDraw[j][1] == 0) {
            // To plot a density of 0, I'm putting 0.5 into the data so the log scale will work; 
            toDraw[j][1] = yScale(0.5);
        } else {
            toDraw[j][1] = yScale(toDraw[j][1]);
        }
    }
    var ddplot = d3.select(self.find("svg.chart g.data-density-plot"));
    if (toDraw.length == 1) {
        ddplot.append("circle")
            .attr("class", "density-" + uuid)
            .attr("cx", toDraw[0][0])
            .attr("cy", toDraw[0][1])
            .attr("r", 1)
            .attr("fill", self.idata.streamSettings[uuid].color);
    } else {
        ddplot.append("polyline")
            .attr("class", "density-" + uuid)
            .attr("points", toDraw.join(" "))
            .attr("fill", "none")
            .attr("stroke", self.idata.streamSettings[uuid].color);
    }
        
    var formatter = d3.format("d");
    
    ddplot.select("g.data-density-axis")
        .call(d3.svg.axis().scale(yScale).orient("left").tickValues([0.5, Math.round(Math.sqrt(totalmax)), totalmax])
        .tickFormat(function (d) {
                if (d < 1) {
                    d = Math.floor(d);
                }
                return formatter(d);
            }));
}

function hideDataDensity(self) {
    var ddplot = $(self.find("svg.chart g.data-density-plot"));
    ddplot.children("polyline, circle").remove();
    ddplot.children("g.data-density-axis").empty();
    $("svg.chart g.series-" + self.idata.showingDensity).attr({"stroke-width": 1, "fill-opacity": 0.3});
    self.idata.showingDensity = undefined;
}

function resetZoom(self) {
    self.idata.zoom.scale(1)
        .translate([0, 0]);
    if (self.idata.onscreen) {
        repaintZoomNewData(self);
    }
}

s3ui.init_plot = init_plot;
s3ui.repaintZoomNewData = repaintZoomNewData;
s3ui.updateSize = updateSize;
s3ui.updatePlot = updatePlot;
s3ui.applySettings = applySettings;
s3ui.showDataDensity = showDataDensity;
s3ui.hideDataDensity = hideDataDensity;
s3ui.resetZoom = resetZoom;
