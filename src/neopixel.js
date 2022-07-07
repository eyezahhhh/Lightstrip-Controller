var WebSocketClient = require('websocket').client;
const EventEmitter = require('node:events');
const request = require("request");
const Config = require("./configtranslator");

function createNewLightstrip(options) {
    if (!Object.keys(options).includes("ip")) throw "Lightstrip is missing ip!";

    var connectionURI = (options.secure === true ? "wss://" : "ws://") + options.ip + "/ws";

    console.log("connecting to " + connectionURI);

    const emitter = new EventEmitter();

    var strip = {
        socket: new WebSocketClient(),
        getConnection: function() {
            throw "Websocket hasn't connected yet!";
        },
        setState: function(state) {
            throw "Websocket hasn't connected yet!";
        },
        getState: function() {
            throw "Websocket hasn't received state yet!";
        },
        getEffects: function() {
            throw "Websocket hasn't received effects yet!";
        },
        getEffectIndex: function(name) {
            throw "Websocket hasn't received effects yet!";
        }
    };

    var prerequisites = [
        "connect",
        "effects list",
        "state"
    ];

    function removePrerequisite(name) {
        if (!prerequisites.length) return; // already met all requirements
        var index = prerequisites.indexOf(name)
        if (index !== -1) prerequisites.splice(index, 1);
        if (!prerequisites.length) { // met all requirements for the first time
            emitter.emit("ready", strip);
        }
    }

    strip.socket.on("connect", function(connection) {
        strip.getConnection = function() {
            return connection;
        }

        emitter.emit("connect", strip);
        removePrerequisite("connect");

        var currentState;

        strip.setState = function(state) {
            connection.send(JSON.stringify(state));
        }

        connection.on("close", function() {
            console.log("disconnected!");
            emitter.emit("close");
        });

        request("http://" + options.ip + "/json/effects", function (error, response, body) {
            if (error) return console.log("Failed to load effects list!");
            try {
                var list = JSON.parse(body);
                strip.getEffects = function() {
                    return list;
                };
                strip.getEffectIndex = function(name) {
                    name = name.toLowerCase();
                    var effects = strip.getEffects();
                    for (let i = 0; i < effects.length; i++) {
                        if (effects[i].toLowerCase() == name) return i;
                    }
                    throw "No effect by that name!";
                }
                emitter.emit("effects load", list);
                removePrerequisite("effects list");
            } catch {}
        });

        connection.on("message", function(message) {
            var isJson = false;
            var data = null;
            if (message.type == "utf8") {
                try {
                    message.utf8Data = JSON.parse(message.utf8Data);
                    isJson = true;
                } catch {}
                data = message.utf8Data;
            }
            if (isJson && data.state) {
                currentState = data.state;
                strip.getState = function() {
                    return currentState;
                }
                emitter.emit("state update", data.state);
                removePrerequisite("state");
            }
        });
    });
    strip.socket.connect(connectionURI);

    return emitter;

}

function translateProfile(strip, p, stripId, segment) {
    function ocf(object, field) {
        return Object.keys(object).includes(field);
    }

    var out = {};

    if (p.on === false) { // force disable section
        out.stop = 0;
        out.start = 0;
    } else { // respect other settings
        try {
            var strips = Config.getStrips();
            var info = strips[stripId].segments[segment];
            out.start = info.start;
            out.stop = info.end;
            out.of = info.offset;
        } catch {}
        out.on = true;
        out.ix = 255; // intensity
        if (ocf(p, "palette")) {
            try {
                var palette = translatePalette(p.palette);
                out.pal = palette;
            } catch {
                console.log("palette \"" + p.palette + "\" not found! Defaulting to gay...");
                out.pal = 11;
            }
        }
        if (ocf(p, "colors") && out.pal == 5) {
            out.pal = 0;
            out.col = p.colors;
        }
        try {
            var index = -1;
            if (ocf(p, "effect")) index = strip.getEffectIndex(p.effect);
            if (index !== -1) out.fx = index;
        } catch {
            console.log("effect \"" + p.effect + "\" not found! Turning segment off...");
            out.stop = 0;
            out.start = 0;
        }
        out.sx = ocf(p, "speed") ? p.speed : 255;
        out.bri = ocf(p, "brightness") ? p.brightness : 255;
        out.tt = ocf(p, "transition") ? p.transition : 0;
        out.rev = p.reverse == true;
        out.mi = p.mirror == true;
    }
    return out;
}

function translatePalette(name) {
    const list = {
        "custom": 5,
        "custom gradient": 4,
        "random cycle": 1,
        "rainbow": 11,
        "rainbow split": 12
    }
    if (!Object.keys(list).includes(name.toLowerCase())) throw "Invalid palette!";
    return list[name];
}


module.exports = {createNewLightstrip, translateProfile, translatePalette};