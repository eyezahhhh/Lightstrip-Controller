const Ping = require("ping");
const fs = require("fs");
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

var machineStates = {};

function checkMachine(server, id, wasAlive = false) {
    if (id != timestamp) {
        console.log("Shutting down pinger...");
        return;
    }
    Ping.sys.probe(server.ip, function(isAlive) {
        if (id != timestamp) {
            console.log("Shutting down old pinger...");
            return;
        }
        if (isAlive) {
            machineStates[server.name] = 0;
        } else {
            machineStates[server.name]++;
        }
        isAlive = machineStates[server.name] >= 3;
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
            checkMachine(server, id, isAlive);
        }, 1000);
    });
}

var timestamp;

function reloadConfig() {
    timestamp = (new Date()).getTime();
    machineStates = {};
    for (server in serverConfig) {
        machineStates[serverConfig[server].ip] = 0;
        checkMachine(serverConfig[server], timestamp);
    }
}

reloadConfig();

var configReloader;

fs.watch(__dirname + "/../config", function (event, filename) {
    if (filename === "ping.json") {
        clearTimeout(configReloader);
        configReloader = setTimeout(function() {
            console.log("Config file has been updated! Reloading...");
            reloadConfig();
        }, 1000);
    }
});