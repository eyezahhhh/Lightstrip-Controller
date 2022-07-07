const Ping = require("ping");
const API = require("./api");
const serverConfig = require("../config/ping.json");

function doTask(type, id) {
    if (type == "profile") {
        try {
            API.setProfile(id);
        } catch (e) {
            console.log(e);
        }
    } else if (type == "playlist") {
        try {
            API.setPlaylist(id);
        } catch (e) {
            console.log(e);
        }
    }
}

function checkMachine(server, wasAlive = false) {
    Ping.sys.probe(server.ip, function(isAlive) {
        if (isAlive != wasAlive) {
            if (isAlive) {
                console.log(server.name + " is online!");
                if (server.onConnect) doTask(server.onConnect.type, server.onConnect.id);
            } else {
                console.log(server.name + " is offline!");
                if (server.onConnect) doTask(server.onDisconnect.type, server.onDisconnect.id);
            }
        }
        setTimeout(function() {
            checkMachine(server, isAlive);
        }, 1000);
    });
}

for (server in serverConfig) {
    checkMachine(serverConfig[server]);
}