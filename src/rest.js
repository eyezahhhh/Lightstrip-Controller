const Express = require("express");
const BodyParser = require("body-parser");
const CORS = require("cors");
const API = require("./api");
const Config = require("./configtranslator");
const serverConfig = require("../config/rest.json");

const router = Express.Router();
const server = Express();

server.use(BodyParser.urlencoded({extended: false}));
server.use(BodyParser.json());
server.use(CORS());

server.use("/", router);

server.use("/", (req, res) => {
    res.status(404).send("No endpoint");
});

router.get("/profile/:profile", (req, res) => { // basic GET profile set
    console.log("REST API detected profile request!");
    var profile = req.params.profile;
    try {
        API.setProfile(profile, {stripOverrides: {tt: 0}});
        res.status(200).send("Success!");
    } catch (e) {
        console.log(e);
        res.status(400).send(e);
    }
});

router.get("/playlist/:playlist", (req, res) => { // basic GET playlist set
    var playlist = req.params.playlist;
    try {
        API.setPlaylist(playlist);
        res.status(200).send("Success!");
    } catch (e) {
        console.log(e);
        res.status(400).send(e);
    }
});

router.post("/profile", (req, res) => {
    var data = req.body;
    if (!data.profile || !data.strips) {
        res.status(400).send({error: "Invalid request"});
        return;
    }
    try {
        API.setProfile(data.profile, {segments: data.strips});
        res.status(200).send("Success!");
    } catch (e) {
        console.log(e);
        res.status(400).send(e);
    }
});

router.get("/config", (req, res) => {
    res.status(200).send(Config.getConfig());
});

server.listen(serverConfig.port, function() {
    console.log("The REST API has started!");
});