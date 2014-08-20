function parsePixelsToInt(q) {
    return parseFloat(q.slice(0, q.length - 2));
}

if (Meteor.isClient) {
    var localtest = true;
    Template.home.plot_data = [
        {
            tagsURL: localtest ? 'http://localhost:7856' : 'http://quasar.cal-sdb.org:4523/backend/api/query?',
            dataURLStart: localtest ? 'http://localhost:7856/data/uuid/' : 'http://quasar.cal-sdb.org:9000/data/uuid/',
            width: function () {
                    var $parent = $(instances[0].find('.chartContainer'))
                    var width = $parent.css("width");
                    var leftpadding = $parent.css("padding-left");
                    var rightpadding = $parent.css("padding-right");
                    return parsePixelsToInt(width) - parsePixelsToInt(leftpadding) - parsePixelsToInt(rightpadding);
                }/*,
            hide_main_title: true,
            hide_graph_title: true,
            hide_settings_title: true*/
        }, 
        function (inst) 
        { 
            instances.push(inst);
            var resetColWidth = function () {
                    if (window.innerWidth > 1475) {
                        $(inst.find(".left-column")).removeClass("col-lg-3").addClass("col-lg-2");
                        $(inst.find(".right-column")).removeClass("col-lg-9").addClass("col-lg-10");
                    } else {
                        $(inst.find(".left-column")).removeClass("col-lg-2").addClass("col-lg-3");
                        $(inst.find(".right-column")).removeClass("col-lg-10").addClass("col-lg-9");
                    }
                };
            resetColWidth();
            $(window).resize(resetColWidth);
        },
        window.location.search.length == 0 ? '' : window.location.search.slice(1)];
        //function () 
        //{ 
            /*var inst = instances[instances.length - 1]; 
            inst.imethods.selectStreams([
            {
                "Path": "/tests/uPMU Range Test", 
                "Metadata": 
                {
                    "SourceName": "Fake Data", 
                    "Instrument": 
                    {
                        "ModelName": "A Python Program"
                    }
                }, 
                "uuid": "b213930f-66d3-4878-9a24-0a643a3d2943", 
                "Properties": 
                {
                    "UnitofTime": "ns", 
                    "Timezone": "America/Phoenix", 
                    "UnitofMeasure": "deg", 
                    "ReadingType": "long"
                }
            }*//*, 
            {
                "Path": "/keti/1665/temperature", 
                "uuid": "39ef31da-d369-5d90-bcdf-f6245ab0387a", 
                "Properties": 
                {
                    "UnitofTime": "s", 
                    "Timezone": "America/Los_Angeles", 
                    "UnitofMeasure": "C", 
                    "ReadingType": "double"
                }, 
                "Metadata": 
                {
                    "Building": "CIEE", 
                    "Room": "General Area East", 
                    "Floor": "2", 
                    "SourceName": "CIEE KETImotes", 
                    "moteid": "1665", 
                    "Site": "51320145-1f5d-11e4-bd08-6003089ed1d0", 
                    "System": "Monitoring", 
                    "Hvaczone": "General Area", 
                    "Location": 
                    {
                        "Building": "CIEE Office", 
                        "Room": "General Area East"
                    }, 
                    "Type": "Sensor"
                }
            }
            ]); */
        //}];

}
