var mqtt = require ('mqtt')
var client = mqtt.connect('mqtt://broker.hivemq.com:1883')
client.on('connect', function() {
       var i;
       for (i=1; i<10; i++)  //loop
              client.publish('sensor/schmidhuber', 'Moritz Etemad' +i) // empfänger  // nachricht // anzahl der nachrichten
       })
       client.on('message', function (topic, message){
              console.log(message.toString())
       })