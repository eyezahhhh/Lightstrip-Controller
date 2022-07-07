const Config = require("./configtranslator");
const Neopixel = require("./neopixel");

var stripList = {};

function setProfile(profile, options = {}) {
    if (!Object.keys(Config.getConfig().profiles).includes(profile)) throw "Profile does not exist!";
    var strips = Config.getStrips();
    if (options.segments && options.segments.length) {
        let temp = {};
        for (let i = 0; i < Object.keys(segments).length; i++) {
            let strip = Object.keys(segments)[i];
            for (segment in segments[strip]) {
                segment = segments[strip][segment];
                try {
                    if (Object.keys(strips[strip].segments).includes(segment)) {
                        if (!Object.keys(temp).includes(strip)) temp[strip] = JSON.parse(JSON.stringify(strips[strip]));
                        temp[strip].segments = {};
                        temp[strip].segments[segment] = strips[strip].segments[segment];
                    }
                } catch {}
            }
        }
        strips = temp;
    }
    for (strip in strips) {
        if (isConnectedToStrip(strip)) {
            let settings = {
                "seg": []
            };
            for (segment in strips[strip].segments) {
                var segmentProfile = Config.getStateForProfile(segment, profile);
                if (segmentProfile != null) {
                    if (options.segmentOverrides) {
                        for (field in options.segmentOverrides) {
                            segmentProfile[field] = options.segmentOverrides[field];
                        }
                    }
                    let output = Neopixel.translateProfile(stripList[strip].strip, segmentProfile, strip, segment);
                    output.id = strips[strip].segments[segment].id;
                    settings.seg.push(output);
                }
            }
            console.log("Applying profile \"" + profile + "\" to strip \"" + strips[strip].name + "\"...");
            if (options.stripOverrides) {
                for (field in options.stripOverrides) {
                    settings[field] = options.stripOverrides[field];
                }
            }
            stripList[strip].strip.setState(settings);
        } else {
            console.log("Couldn't apply profile \"" + profile + "\" to strip \"" + strips[strip].name + "\" because it's not connected!");
        }
    }
}

function setPlaylist(playlist) {
    var playlists = Config.getPlaylists()
    if (!Object.keys(playlists).includes(playlist)) throw "Playlist does not exist!";
    var scenes = playlists[playlist];
    var frame = 0;
    function doScene() {
        console.log("doing scene " + (frame + 1));
        setProfile(scenes[frame].profile, {stripOverrides: {
            tt: scenes[frame].transition
        }});
        setTimeout(function() {
            frame++;
            if (frame >= scenes.length) {
                console.log("Playlist has finished!");
            } else {
                doScene();
            }
        }, scenes[frame].duration * 10);
    }
    doScene();
}

function isConnectedToStrip(strip) {
    return Object.keys(stripList).includes(strip) && stripList[strip].strip;
}

function reloadStrips(strips) {
    console.log("Disconnecting from all light strips...");
    for (let strip in stripList) {
        let socket = stripList[strip].strip.getConnection();
        socket.close();
        delete stripList[strip];
    }
    for (let strip in strips) {
        let timestamp = (new Date()).getTime();
        stripList[strip] = {
            strip: false,
            timestamp: timestamp,
            events: Neopixel.createNewLightstrip({
                ip: strips[strip].ip
            })
        }
        stripList[strip].events.on("ready", function(connection) {
            stripList[strip].strip = connection;
            console.log("Connected to light strip \"" + strips[strip].name + "\"!");
        });
        stripList[strip].events.on("disconnect", function() {
            if (stripList[strip].timestamp != timestamp) return;
            console.log("Disconnected from light strip \"" + strips[strip].name + "\"!");
            delete stripList[strip];
        })
    }
}

Config.subscribeToConfigEvents().on("reload", function(config) {
    reloadStrips(Config.getStrips());
})

module.exports = {setProfile, isConnectedToStrip, reloadStrips, setPlaylist};