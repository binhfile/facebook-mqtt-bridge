const login = require("facebook-chat-api");
const fs = require('fs');
const mqtt = require('mqtt')

let config = JSON.parse(fs.readFileSync('assets/app.json'));

var facebook_api = undefined;
var mqtt_client = undefined;

var selected_group = undefined;
var group_name = config.facebook.group.name;

console.log("Group = "+group_name);
//console.log("User="+config.user.name+"/"+config.user.secret);

const obj = {email: config.facebook.user.name, password: config.facebook.user.secret};
login(obj, (err, api) => {
  facebook_api = api;
  if(err) {
    console.error(err);
    return;
  }
  
  api.getThreadList(100, null, [], function(err, list){
    if(err) {
      console.error(err);
      return;
    }
    

    for(var i = 0; i < list.length; i++) {
      if(list[i].name === group_name) {
        selected_group = list[i];
        break;
      }
    }
    if(selected_group == undefined) {
      console.error('can not find group with name '+group_name);
      return;
    }
    //console.log(selected_group);
    
    //api.sendMessage("online", selected_group.threadID, function(err, list){
    //  if(err) {
    //    console.error(err);
    //  }
    //});        
  });
  
  api.listenMqtt(function callback(err, event) {
    if(err) {
      console.error(err);
      return;
    }
    if(event.type === 'message') {
      var message = event.body.trim().toLowerCase();
      /*if(message === 'hello') {
        api.sendMessage("hi", event.threadID, function(err, list){
          if(err) {
            console.error(err);
          }
        });
        return;
      }*/      
      mqtt_client.publish(config.mqtt.command_topic, message);      
    }
  });

});

mqtt_client  = mqtt.connect(config.mqtt.uri)
 
mqtt_client.on('connect', function () {
  console.log('mqtt connected');
  mqtt_client.subscribe(config.mqtt.notify_topic, function (err) {
    if(err) {
      console.error(err);
    }
  });
});
 
mqtt_client.on('message', function (topic, event) {
  console.log(topic);
  if(topic === config.mqtt.notify_topic){
    //var message = JSON.parse(event);
    //console.log(message)
    if(facebook_api === undefined) {
      return;
    }
    facebook_api.sendMessage(event.toString(), selected_group.threadID, function(err, list){
      if(err) {
        console.error(err);
      }
    });    
  }
})
