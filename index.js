const request = require("request");
const Config = require("./src/configtranslator");
const API = require("./src/api");
require("./src/rest");
require("./src/ping");
//const readline = require('readline');

API.reloadStrips(Config.getStrips());