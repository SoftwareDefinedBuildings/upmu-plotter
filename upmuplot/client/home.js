if (Meteor.isClient) {
    Template.home.plot_data = [
        { 
            tagsURL: 'http://quasar.cal-sdb.org:4523/backend/api/query?', 
            dataURLStart: 'http://quasar.cal-sdb.org:9000/data/uuid/' 
        }, 
        function (inst) 
        { 
            instances.push(inst); 
        }, 
        function () 
        { 
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
        }];

}
