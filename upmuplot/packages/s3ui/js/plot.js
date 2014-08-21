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
        return function (data) {
            if (thisID != self.idata.drawRequestID) { // another request has been made
                return;
            }
            s3ui.limitMemory(self, selectedStreams, self.idata.oldOffsets, domain[0], domain[1], 300000 * selectedStreams.length, 150000 * selectedStreams.length);
            self.idata.oldData[stream.uuid] = [stream, data, pwe];
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
        .attr("width", self.idata.WIDTH + 2) // Move 1 to the left and increase self.idata.WIDTH by 2 to cover boundaries when zooming
        .attr("height", self.idata.margin.bottom)
        .attr("transform", "translate(-1, 0)")
        .attr("class", "x-axis-background")
        .attr("fill", "white");
    self.idata.xTitle = xaxiscover.append("text")
        .attr("class", "xtitle title")
        .attr("text-anchor", "middle")
        .attr("x", self.idata.WIDTH / 2)
        .attr("y", 45)
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
    datadensitycover.append("rect") // Move 1 to the left and increase self.idata.WIDTH by 2 to cover boundaries when zooming
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
    chart.append("rect") // To sense mouse click/drag
        .attr("width", self.idata.WIDTH)
        .attr("height", self.idata.HEIGHT)
        .attr("transform", "translate(" + self.idata.margin.left + ", " + self.idata.margin.top + ")")
        .call(self.idata.zoom)
        .attr("onmousedown", "$(this).attr('class', 'clickscreen clickedchart');")
        .attr("onmouseup", "$(this).attr('class', 'clickscreen unclickedchart');")
        .attr("fill", "none")
        .attr("class", "clickscreen unclickedchart");
    self.idata.loadingElem = $(self.find('.plotLoading'));
    self.idata.initialized = true;
}

/* Updates the size of the chart based on changes to the margins The width will
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
    self.$("svg.chart g.chartarea, svg.chart rect.clickscreen").attr({
            transform: "translate(" + margin.left + ", " + margin.top + ")",
            width: WIDTH
        });
    self.$("svg.chart g.x-axis-cover").attr("transform", "translate(" + margin.left + ", " + (margin.top + HEIGHT) + ")");
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

function applySettings(self, loadData) {
    if (self.idata.onscreen) {
        if (!self.idata.automaticAxisUpdate) {
            otherChange = true;
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
    // dateConverter is defined in plotter.html
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
        self.idata.zoom.scaleExtent([0, endDate - startDate]); // So we don't zoom in past 1 ms
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
            setTimeout(function () { drawYAxes(self, self.idata.oldData, self.idata.selectedStreams, self.idata.streamSettings, self.idata.oldStartDate, self.idata.oldEndDate, self.idata.oldXScale, loadingElem); }, 50);
        });
}

function drawYAxes(self, data, streams, streamSettings, startDate, endDate, xScale, loadingElem) {
    otherChange = false;
    
    var yAxes = self.idata.yAxes;
    
    // Find the minimum and maximum value in each stream to properly scale the axes
    var axisData = {}; // Maps axis ID to a 2-element array containing the minimum and maximum; later on a third element is added containing the y-Axis scale
    var toDraw = []; // An array of streams that have no data;
    var numstreams;
    var i, j, k;
    var streamdata;
    var totalmin;
    var totalmax;
    var datapointmin, datapointmax;
    var axis;
    for (i = 0; i < yAxes.length; i++) {
        axis = yAxes[i];
        numstreams = axis.streams.length;
        if (numstreams > 0) {
            toDraw.push(axis);
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
            for (k = 0; k < streamdata.length; k++) {
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
            axisData[axis.axisid] = [-1, 1];
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
            } else { // auto scale
                scale = d3.scale.linear()
                    .domain([axisData[elem.axisid][0], axisData[elem.axisid][1]])
                    .range([self.idata.HEIGHT, 0])
                    .nice();
                var domain = scale.domain();
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
    
    self.idata.margin.left = Math.max(100, leftYAxes.length * 100);
    self.idata.margin.right = Math.max(100, rightYAxes.length * 100);
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
        .attr("transform", function (d, i) { return "translate(" + (self.idata.margin.left - (100 * i)) + ", 0)"; })
        .each(function (yAxis) { d3.select(this).call(yAxis.orient("left")); });
    update.exit().remove();
    
    update = d3.select(self.find("svg.chart g.y-axes-right"))
      .selectAll("g.y-axis-right")
      .data(rightYAxes);
    update.enter()
      .append("g")
        .attr("class", "y-axis-right axis");
    update
        .attr("transform", function (d, i) { return "translate(" + (100 * i) + ", 0)"; })
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
                    return "translate(" + (self.idata.margin.left - (100 * j++) - 60) + ", " + (self.idata.HEIGHT / 2) + ")rotate(-90)";
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
                    return "translate(" + ((100 * i++) + 60) + ", " + (self.idata.HEIGHT / 2) + ")rotate(90)";
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
    var lastIteration;
    var color;
    var mint, maxt;
    var outOfRange, noData;
    var WIDTH = self.idata.WIDTH;
    var HEIGHT = self.idata.HEIGHT;
    var pixelw = (domain[1] - domain[0]) / WIDTH * 1000000; // pixel width in nanoseconds
    var currpt;
    var offset = self.idata.offset;

    for (i = 0; i < streams.length; i++) {
        currXPixel = -Infinity;
        currPointList = [];
        if (!data.hasOwnProperty(streams[i].uuid)) {
            continue;
        }
        streamdata = data[streams[i].uuid][1];
        minval = [];
        mean = [];
        maxval = [];
        yScale = axisData[streamSettings[streams[i].uuid].axisid][2];
        startTime = domain[0].getTime() - offset;
        endTime = domain[1].getTime() - offset;
        startIndex = s3ui.binSearch(streamdata, startTime - 1, function (point) { return point[0]; });
        if (startIndex > 0 && streamdata[startIndex][0] > startTime - 1) {
            startIndex--; // plot the previous datapoint so the graph looks continuous (subtract 1000 in case nanoseconds push it into graph)
        }
        lastIteration = false;
        outOfRange = true;
        noData = true;
        for (j = startIndex; j < streamdata.length; j++) {
            currpt = streamdata[j];
            xPixel = xScale(currpt[0] + offset);
            // correct for nanoseconds
            xPixel += (currpt[1] / pixelw);
            mint = yScale(currpt[2]);
            minval.push(xPixel + "," + mint);
            mean.push(xPixel + "," + yScale(currpt[3]));
            maxt = yScale(currpt[4]);
            maxval.push(xPixel + "," + maxt);
            if (xPixel >= WIDTH) {
                break;
            } else if (xPixel >= 0) {
                outOfRange = outOfRange && (mint <= 0 || mint >= HEIGHT) && (maxt <= 0 || maxt >= HEIGHT) && (mint < HEIGHT || maxt > 0);
                noData = false;
            }
        }
        if (noData) {
            s3ui.setStreamMessage(self, streams[i].uuid, "No data in specified time range", 3);
        } else {
            s3ui.setStreamMessage(self, streams[i].uuid, undefined, 3);
        }
        minval.reverse();
        mean = mean.join(" ");
        maxval = maxval.join(" ") + " " + minval.join(" ");
        color = streamSettings[streams[i].uuid].color;
        dataArray.push({color: color, data: [maxval, mean], uuid: streams[i].uuid});
        if (outOfRange) {
            s3ui.setStreamMessage(self, streams[i].uuid, "Data outside axis range; try rescaling y-axis", 2);
        } else {
            s3ui.setStreamMessage(self, streams[i].uuid, undefined, 2);
        }
    }    
    update = d3.select(self.find("g.chartarea"))
      .selectAll("g")
      .data(dataArray);
        
    update.enter()
      .append("g");
        
    if (!drawFast) {
        update
            .attr("class", function (dataObj) { return "series-" + dataObj.uuid; })
            .attr("stroke", function (d) { return d.color; })
            .attr("stroke-width", 1)
            .attr("fill", function (d) { return d.color; })
            .attr("fill-opacity", 0.3);
    }
        
    update.exit()
        .remove();
        
    update = d3.select(self.find("g.chartarea"))
      .selectAll("g")
      .selectAll("polyline")
      .data(function (d, i) { return dataArray[i].data; });
      
    update.enter()
      .append("polyline");
    
    update
        .attr("class", function (d, i) { return i == 1 ? "streamMean" : "streamRange"; })
        .attr("points", function (d) { return d; });
        
    update.exit()
      .remove(); // I suspect I may not actually need this
    
    if (!drawFast) {
        s3ui.updatePlotMessage(self);
        self.idata.onscreen = true;
    }
    
    if (self.idata.showingDensity != undefined) {
        s3ui.setStreamMessage(self, self.idata.showingDensity, "Interval width: " + s3ui.nanosToUnit(Math.pow(2, self.idata.oldData[self.idata.showingDensity][2])), 4);
        self.$("svg.chart g.data-density-plot polyline").remove();
        showDataDensity(self, self.idata.showingDensity);
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
    var toDraw = [[0, 0]];
    var lastiteration;
    var startIndex;
    var oldXScale = self.idata.oldXScale;
    if (streamdata.length == 0) {
        toDraw.push([WIDTH, 0]);
        totalmax = 0;
    } else {    
        startIndex = s3ui.binSearch(streamdata, startTime, function (point) { return point[0]; });
        if (startIndex > 0 && streamdata[startIndex][0] > startTime) {
            startIndex--;
        }
        totalmax = streamdata[startIndex][5];
        lastiteration = false;
        for (var i = startIndex; i < streamdata.length; i++) {
            xPixel = oldXScale(streamdata[i][0] + offset);
            xPixel += ((streamdata[i][1] - pw/2) / pixelw);
            if (xPixel < 0) {
                xPixel = 0;
            }
            if (xPixel > WIDTH) {
                xPixel = WIDTH;
                lastiteration = true;
            }
            if (i == 0 || ((streamdata[i][0] - streamdata[i - 1][0]) * 1000000) + streamdata[i][1] - streamdata[i - 1][1] <= pw) {
                toDraw.push([xPixel, toDraw[toDraw.length - 1][1]]);
            } else {
                prevIntervalEnd = Math.max(0, oldXScale(streamdata[i - 1][0] + offset) + ((streamdata[i - 1][1] + (pw/2)) / pixelw));
                if (prevIntervalEnd != 0) {
                    if (i == startIndex) {
                        toDraw.pop();
                    }
                    toDraw.push([prevIntervalEnd, streamdata[i - 1][5]]);
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
        if (!lastiteration && ((oldXScale.domain()[1] - offset - streamdata[i - 1][0]) * 1000000) + streamdata[i - 1][1] > pw) {
            toDraw.push([toDraw[toDraw.length - 1][0], 0]);
            toDraw.push([WIDTH, 0]);
        }
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
    ddplot.append("polyline")
        .attr("class", "density-" + uuid)
        .attr("points", toDraw.join(" "))
        .attr("fill", "none")
        .attr("stroke", self.idata.streamSettings[uuid].color);
        
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
    self.$("svg.chart g.data-density-plot polyline").remove();
    self.$("svg.chart g.data-density-plot g.data-density-axis").empty();
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
s3ui.updateSize = updateSize;
s3ui.updatePlot = updatePlot;
s3ui.applySettings = applySettings;
s3ui.showDataDensity = showDataDensity;
s3ui.hideDataDensity = hideDataDensity;
s3ui.resetZoom = resetZoom;
