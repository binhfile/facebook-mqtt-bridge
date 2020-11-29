const login = require("facebook-chat-api");
const fs = require('fs');
const mqtt = require('mqtt')
const arg = require('arg')

const args = arg({
	// Types
	'--help':    Boolean,
	'--common-cfg': String,
	'--app-cfg': String,
	'--name':    String,
}, {
  permissive: true
});

let common_cfg_file="assets/common.json";
let app_cfg_file="assets/common.json";
if (args["--common-cfg"] !== undefined && args["--common-cfg"].length > 0){
  common_cfg_file = args["--common-cfg"];
}
if (args["--app-cfg"] !== undefined && args["--app-cfg"].length > 0){
  app_cfg_file = args["--app-cfg"];
}

console.log("common config = "+common_cfg_file+" app config = "+app_cfg_file);

let common_cfg = JSON.parse(fs.readFileSync(common_cfg_file));
let app_cfg = JSON.parse(fs.readFileSync(app_cfg_file));
let config = Object.assign({}, common_cfg, app_cfg);


var facebook_api = undefined;
var mqtt_client = undefined;

var selected_group = undefined;
var group_name = config.facebook.group.name;

console.log("Group = " + group_name);
console.log("Facebook = "+config.facebook.user.name);
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

console.log("Mqtt = "+"mqtt://"+config.broker.mqtt.address+":"+config.broker.mqtt.port);
console.log("Mqtt notify topic  = "+config.mqtt.notify_topic);
console.log("Mqtt command topic = "+config.mqtt.command_topic);
mqtt_client  = mqtt.connect("mqtt://"+config.broker.mqtt.address+":"+config.broker.mqtt.port)
 
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
