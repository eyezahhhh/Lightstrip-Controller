const fs = require("fs");
const EventEmitter = require('node:events');

var config = {
    strips: {},
    profiles: {}
};

function reloadConfig() {
    if (!fs.existsSync(__dirname + "/../config/config.json")) {
        fs.writeFileSync(__dirname + "/../config/config.json", JSON.stringify(config));
    }
    var data = fs.readFileSync(__dirname + "/../config/config.json");
    try {
        data = JSON.parse(data);
    } catch (e) {
        console.log("Config file was not JSON!");
        return config;
    }
    config = data;
    emitter.emit("reload", config);
    return config;
}

const emitter = new EventEmitter();

function subscribeToConfigEvents() {
    return emitter;
}

function getConfig() {
    return config;
}

function getStateForProfile(segment, profile) {
    try {
        var data = config.profiles[profile][segment];
        if (!data) throw "No profile";
        return data;
    } catch {
        return null;
    }
}

function getStrips() {
    return config.strips;
}

function getPlaylists() {
    return config.playlists;
}

reloadConfig();

var configReloader;

fs.watch(__dirname + "/../config", function (event, filename) {
    if (filename === "config.json") {
        clearTimeout(configReloader);
        configReloader = setTimeout(function() {
            console.log("Config file has been updated! Reloading...");
            reloadConfig();
        }, 1000);
    }
});

module.exports = {reloadConfig, getConfig, getStateForProfile, getStrips, subscribeToConfigEvents, getPlaylists};