// Code to describe the behavior of cursors

function init_cursors(self) {
    self.idata.horizCursor1 = undefined;
    self.idata.horizCursor2 = undefined;
    self.idata.vertCursor1 = undefined;
    self.idata.vertCursor2 = undefined;
}

/* d3chartgroup is a d3 selection. updateCallback is a function to call when the position of this cursor is updated. */
function Cursor(self, coord, d3chartgroup, length, vertical, $background, updateCallback) {
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
    this.callback = updateCallback;
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
    this.callback();
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
    this.callback();
}

function updateVertCursorStats(self) {
    if (self.idata.initialized && self.idata.onscreen) {
        var cursors = self.idata.cursorDataElems;
        var scale = self.idata.oldXScale;
        var firstCursor = self.idata.vertCursor1;
        var secondCursor = self.idata.vertCursor2;
        if (firstCursor == undefined && secondCursor == undefined) {
            cursors.x1.innerHTML = "";
            cursors.x2.innerHTML = "";
            cursors.deltax.innerHTML = "";
            cursors.freqx.innerHTML = "";
            cursors.fx1.innerHTML = "";
            cursors.fx2.innerHTML = "";
            return;
        } else if (firstCursor == undefined) {
            firstCursor = secondCursor;
            secondCursor = undefined;
        } else if (secondCursor != undefined && firstCursor.coord > secondCursor.coord) {
            secondCursor = firstCursor;
            firstCursor = self.idata.vertCursor2;
        }
        var domain = scale.domain();
        var x1date, x1millis, x1nanos;
        var x2date, x2millis, x2nanos;
        pixelwidthnanos = (domain[1] - domain[0]) / self.idata.WIDTH * 1000000;
        var arr = getScaleTime(firstCursor, scale, pixelwidthnanos);
        x1date = arr[0];
        x1millis = arr[1];
        x1nanos = arr[2];
        var x1millisextra = x1millis >= 0 ? x1millis % 1000 : ((x1millis % 1000) + 1000);
        cursors.x1.innerHTML = "x1 = " + self.idata.labelFormatter.format(x1date) + "." + x1millisextra + (1000000 + x1nanos).toString().slice(1);
        if (secondCursor == undefined) {
            cursors.x2.innerHTML = "";
            cursors.deltax.innerHTML = "";
            cursors.freqx.innerHTML = "";
        } else {
            arr = getScaleTime(secondCursor, scale, pixelwidthnanos);
            x2date = arr[0];
            x2millis = arr[1];
            x2nanos = arr[2];
            var x2millisextra = x2millis >= 0 ? x2millis % 1000 : ((x2millis % 1000) + 1000);
            cursors.x2.innerHTML = "x2 = " + self.idata.labelFormatter.format(x2date) + "." + x2millisextra + (1000000 + x2nanos).toString().slice(1);
            var millidiff = x2millis - x1millis;
            var nanodiff = x2nanos - x1nanos;
            if (nanodiff < 0) {
                nanodiff += 1000000;
                millidiff--;
            }
            nanodiff = s3ui.timeToStr([millidiff, nanodiff]);
            cursors.deltax.innerHTML = "delta x = " + nanodiff + " ns";
            cursors.freqx.innerHTML = "frequency = " + (1000 / (x2millis - x1millis + ((x2nanos - x1nanos) / 1000000))) + " Hz";
        }
        if (self.idata.showingDensity != undefined) {
            x1millis -= self.idata.offset; // switch to UTC time
            x2millis -= self.idata.offset; // switch to UTC time
            var selectedData = self.idata.oldData[self.idata.showingDensity][1];
            if (selectedData.length > 0) {
                var units = self.idata.oldData[self.idata.showingDensity][0].Properties.UnitofMeasure;
                var leftPoint = getNearestDataPoint(x1millis, x1nanos, selectedData);
                cursors.fx1.innerHTML = "Left: (" + s3ui.timeToStr(leftPoint) + " ns, " + leftPoint[3] + " " + units + ")";
                if (secondCursor == undefined) {
                    cursors.fx2.innerHTML = "";
                } else {
                    var rightPoint = getNearestDataPoint(x2millis, x2nanos, selectedData);
                    cursors.fx2.innerHTML = "Right: (" + s3ui.timeToStr(rightPoint) + " ns, " + rightPoint[3] + " " + units + ")";
                }
            }
        } else {
            cursors.fx1.innerHTML = "";
            cursors.fx2.innerHTML = "";
        }
    }
}

/* PIXELWIDTHNANOS is (scale.domain()[1] - scale.domain()[0]) / self.idata.WIDTH * 1000000.
   It is a parameter for the sake of efficiency. Returns an array of the form
   [date obj, milliseconds, nanoseconds] which represents the time on the given scale. */
function getScaleTime(cursor, scale, pixelwidthnanos) {
    var xdate = scale.invert(cursor.coord);
    var xmillis; // date converted to a number
    var xnanos = (cursor.coord - scale(xdate)) * pixelwidthnanos;
    if (xnanos < 0) {
        xnanos = Math.round(xnanos + 1000000);
        xmillis = xdate - 1;
        xdate = new Date(xmillis);
    } else {
        xmillis = xdate.getTime();
        xnanos = Math.round(xnanos);
    }
    return [xdate, xmillis, xnanos];
}

/* XMILLIS and XNANOS are the times in milliseconds and nanoseconds, in UTC time. */
function getNearestDataPoint(xmillis, xnanos, data) {
    var xpoint = [xmillis, xnanos];
    var closestIndex = s3ui.binSearchCmp(data, xpoint, s3ui.cmpTimes);
    var currentPoint, currentDiff;
    var rivalPoint, rivalDiff;
    currentPoint = data[closestIndex];
    rivalPoint = undefined;
    if (closestIndex > 0 && s3ui.cmpTimes(currentPoint, xpoint) > 0) {
        rivalPoint = data[closestIndex - 1];
        rivalDiff = [xmillis - rivalPoint[0], xnanos - rivalPoint[1]];
        currentDiff = [currentPoint[0] - xmillis, currentPoint[1] - xnanos];
    } else if (closestIndex < data.length - 1) {
        rivalPoint = data[closestIndex + 1];
        rivalDiff = [rivalPoint[0] - xmillis, rivalPoint[1] - xnanos];
        currentDiff = [xmillis - currentPoint[0], xnanos - currentPoint[1]];
    }
    if (rivalPoint != undefined) {
        if (rivalDiff[1] < 0) {
            rivalDiff[0]--;
            rivalDiff[1] += 1000000;
        }
        if (currentDiff[1] < 0) {
            currentDiff[0]--;
            currentDiff[1] += 1000000;
        }
    }
    if (s3ui.cmpTimes(currentDiff, rivalDiff) > 0) {
        return rivalPoint;
    }
    return currentPoint;
}

s3ui.init_cursors = init_cursors;
s3ui.Cursor = Cursor;
s3ui.updateVertCursorStats = updateVertCursorStats;
