/*
    openai

    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

    gpt-3.5-turbo



    [
    {"role": "system", "content": "You are a helpful assistant that translates English to French."},
    {"role": "user", "content": 'Translate the following English text to French: "{text}"'}
    ]

    {
    "model": "gpt-3.5-turbo",
    "messages": [{"role": "user", "content": "Hello!"}]
    }

    url https://api.openai.com/v1/chat/completions \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $OPENAI_API_KEY" \
    -d '{
    "model": "gpt-3.5-turbo",
    "messages": [{"role": "user", "content": "Hello!"}]
    }'

    {
    "id": "chatcmpl-123",
    "object": "chat.completion",
    "created": 1677652288,
    "choices": [{
    "index": 0,
    "message": {
    "role": "assistant",
    "content": "\n\nHello there, how may I assist you today?",
    },
    "finish_reason": "stop"
    }],
    "usage": {
    "prompt_tokens": 9,
    "completion_tokens": 12,
    "total_tokens": 21
    }
    }
*/

var UTIL = require("../../../client/UTIL.js");
var CORE = require("../../server_api.js");

var API = {};

var module_https = require("https");

var counter = 0;

API.complete = function complete(user, json, callback) {
    var url = "https://api.openai.com/v1/chat/completions";

    console.log("chatGtp: complete: json=" + JSON.stringify(json, null, 2));

    var reqData = {
        "model": "gpt-3.5-turbo",
        "messages":[
            {"role": "system", "content": json.system || "You are a program code autocompleter. You generate code in the JavaScript programming language. You prefer classic vanilla ES5 JavaScript, commonjs modules, and callback convention"},
            {"role": "user", "content": json.msg || '// hello world in JavaScript'}
        ],
        "stream": "true",
        "user": user.name
    };

    var postData = JSON.stringify(reqData);

    var httpOptions = {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Content-Length": postData.length
        }
    }

    console.log("chatGtp: Making request to url=" + url);

    var req = module_https.request(url, httpOptions, gotResp);

    req.on("error", function(err) {
        console.log("chatGtp: request error: " + err.message);
    
        callback(err);
        callback = null;
    });

    console.log("chatGtp: Sending reqData=" + JSON.stringify(reqData, null, 2));
    req.end();

    function gotResp(resp) {
        resp.on('data', respData);
        resp.on('end', respEnd);
    }

    function respData(data) {
        console.log("chatGtp: respData: data=" + data);

        user.send({chatgpt: {data: data}});
    }

    function respEnd() {
        console.log("chatGtp: respEnd");

        callback(null);
        callback = null;
    }

}

module.exports = API;


