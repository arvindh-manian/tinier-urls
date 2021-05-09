// Imports and the like

require("dotenv").config();

const express = require("express");
const cors = require("cors"),
    app = express();
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const dns = require("dns");

mongoose.connect(
    process.env.MONGO_URI,
    {"useNewUrlParser": true,
        "useUnifiedTopology": true}
);
app.use(bodyParser.urlencoded({"extended": false}));

const WEBSITE_URL = 'https://tinier-link.herokuapp.com/api/shorturl/'
// Setting up schemas

const {Schema} = mongoose,

    urlSchema = new Schema({
        "url": String,
        "short_url": String
    }),

    SMALLURL = mongoose.model(
        "SMALLURL",
        urlSchema
    ),


    // Basic Config

    port = process.env.PORT || 3000;

app.use(cors());

app.use(
    "/public",
    express.static(`${process.cwd()}/public`)
);

app.get(
    "/",
    (req, res) => {

        res.sendFile(`${process.cwd()}/views/index.html`);

    }
);


// Assorted helper functions

const cyrb53 = function (str, seed = 0) { // Quick hashing algorithm from from bryc on StackOverflow

    let h1 = 0xdeadbeef ^ seed,
        h2 = 0x41c6ce57 ^ seed;

    for (let ch, i = 0; i < str.length; i++) {

        ch = str.charCodeAt(i);
        h1 = Math.imul(
            h1 ^ ch,
            2654435761
        );
        h2 = Math.imul(
            h2 ^ ch,
            1597334677
        );

    }
    h1 = Math.imul(
        h1 ^ h1 >>> 16,
        2246822507
    ) ^ Math.imul(
        h2 ^ h2 >>> 13,
        3266489909
    );
    h2 = Math.imul(
        h2 ^ h2 >>> 16,
        2246822507
    ) ^ Math.imul(
        h1 ^ h1 >>> 13,
        3266489909
    );

    return 4294967296 * (2097151 & h2) + (h1 >>> 0);

};


// Handling gets

app.get(
    "/api/shorturl/:shorturl",
    (req, res) => {

        SMALLURL.findOne(
            {"short_url": req.params.shorturl},
            (err, data) => {

                if (err) {

                    throw err;

                }
                if (data) {

                    res.redirect(data.url);

                } else {

                    res.json({"error": "invalid url"});

                }

            }
        );

    }
);

// Handling posts
app.post(
    "/api/shorturl",
    (req, res) => {

        const URL_LENGTH = 6;

        SMALLURL.countDocuments((err, cnt) => {

            try {

                const req_url = new URL(req.body.url);

                // Checking if the URL is already in the database

                SMALLURL.findOne(
                    {"url": req.body.url},
                    (err, data) => {

                        if (data) {

                            res.json({
                                "original_url": data.url,
                                "short_url": WEBSITE_URL + data.short_url
                            });

                        }

                        // Actual shortening
                        else {

                            if (req_url.protocol != "https:" && req_url.protocol != "http") { // Checking URL isn't FTP or another protocol

                                throw TypeError;

                            }
                            dns.lookup(
                                req_url.hostname,
                                (err) => {

                                    if (err) {

                                        res.json({"error": "invalid url"});

                                    } else {

                                        const new_url = new SMALLURL({
                                            "url": req_url.toString(),
                                            "short_url": cyrb53(req_url.toString()).toString(16).
                                                substring(
                                                    0,
                                                    URL_LENGTH
                                                ) + cnt
                                        });

                                        new_url.save(genericHandler);

                                        res.json({
                                            "original_url": new_url.url,
                                            "short_url": WEBSITE_URL + new_url.short_url
                                        });

                                    }

                                }
                            );

                        }

                    }
                );


            } catch (TypeError) {

                res.json({"error": "invalid url"});
                console.log(req.body.url);

            }

        });

    }
);

const genericHandler = (err) => {

    if (err) {

        throw err;

    }

};

app.listen(
    port,
    () => {

        console.log(`Listening on port ${port}`);

    }
);