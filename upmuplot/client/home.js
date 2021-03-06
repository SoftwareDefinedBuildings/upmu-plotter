if (Meteor.isClient) {
    var localtest = false;
    Template.home.valid_browser = navigator.userAgent.search("Firefox") != -1 || navigator.userAgent.search("Chrome") != -1;
    Template.home.plot_data = [
        {
            tagsURL: 'http://localhost:4523/',
            dataURLStart: 'http://miranda.cs.berkeley.edu:9000/data/uuid/',
            bracketURL: 'http://miranda.cs.berkeley.edu:9000/q/bracket',
            csvURL: 'http://miranda.cs.berkeley.edu:9000/wrappedcsv',
            hide_reset_button: true,
            hide_plot_directions: true
        }, 
        function (inst) 
        { 
            instances.push(inst);
            s3ui.default_cb1(inst);
        },
        function (inst)
        {
            if (window.location.search.length > 0) {
                s3ui.exec_permalink(inst, window.location.search.slice(1));
            } else {
                inst.imethods.selectStreams([{ "Path" : "/upmu/soda_a/L1MAG", "uuid" : "abffcf07-9e17-404a-98c3-ea4d60042ff3", "Properties" : { "UnitofTime" : "ns", "Timezone" : "UTC", "UnitofMeasure" : "V", "ReadingType" : "double" }, "Metadata" : { "SourceName" : "uPMU", "Instrument" : { "ModelName" : "PQube3", "SerialNumber" : "P3001244" } } }]);
                inst.find(".showAll").click();
            }
        }];
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
