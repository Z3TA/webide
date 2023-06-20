/*
    openai

    export OPENAI_API_KEY=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

    gpt-3.5-turbo



    [
    {"role": "system", "content": "You are a helpful assistant that translates English to French."},
    {"role": "user", "content": 'Translate the following English text to French: "{text}"'}
    ]

    {
    "model": "gpt-3.5-turbo",
    "messages": [{"role": "user", "content": "Hello!"}]
    }

    curl https://api.openai.com/v1/chat/completions \
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

var OPENAI_API_KEY = "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";


var UTIL = require("../../../client/UTIL.js");
var CORE = require("../../server_api.js");

var API = {};

var module_https = require("https");

var counter = 0;

var defaultPrompt = `You are a program code autocompleter. 
You generate code in the JavaScript programming language. 
You prefer classic vanilla ES5 JavaScript.
When using Node.js use commonjs modules (require instead of import)
When working with async functions use the callback convention instead of promises or async/await
If the user provides code, use the style of that code.
Use normal functions instead of arrow functions.
Use var to declare variables instead of let and const
Wrap explanations in comments. But try to avoid explaining the code.
Do NOT wrap code in string literals.
Do NOT use code snippets
Do NOT explain the code
Give the user only the code
`

var PROMPT = {js: defaultPrompt}; // filetype: prompt

API.init = function init(user, json, callback) {
    if(json.OPENAI_API_KEY == undefined) return callback(new Error("No OPENAI_API_KEY key provided!"));
    else OPENAI_API_KEY = json.OPENAI_API_KEY;

    if(json.PROMPT != undefined) {
        if(typeof json.PROMPT != "object") return callback(new Error("There should be an object named PROMPT that has the prompts for all file extensions!"));
        if(Object.keys(json.PROMPT).length == 0) return callback(new Error("The PROMPT object should have at least one key (file extension)"));

        for(var fileExt in json.PROMPT) {
            PROMPT[fileExt] = json.PROMPT[fileExt];
        }
    }

    callback(null);
}

API.complete = function complete(user, json, callback) {
    var url = "https://api.openai.com/v1/chat/completions";

    console.log("chatGtp: complete: json=" + JSON.stringify(json, null, 2));

    var reqData = {
        "model": "gpt-3.5-turbo",
        "messages":[
            {"role": "system", "content": json.system || PROMPT[json.ext] || defaultPrompt},
            {"role": "user", "content": json.msg || '// hello world in JavaScript'}
        ],
        "stream": true,
        "user": user.name
    };

    var postData = JSON.stringify(reqData);

    var httpOptions = {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Content-Length": postData.length,
            "Authorization": "Bearer " + OPENAI_API_KEY
        }
    };

    console.log("chatGtp: Making request to url=" + url);

    var req = module_https.request(url, httpOptions, gotResp);

    req.on("error", function(err) {
        console.log("chatGtp: request error: " + err.message);
    
        callback(err);
        callback = null;
    });

    console.log("chatGtp: Sending postData=" + JSON.stringify(postData, null, 2));
    req.end(postData);

    function gotResp(resp) {
        resp.on('data', respData);
        resp.on('end', respEnd);
    }

    function respData(data) {
        console.log("chatGtp: respData: data=" + data);

        if(callback == null) return;

        var str = data.toString();

        if(str[0] == "{") {
            // Did we get a JSON object!?
            // Is it an error message maybe ?
            var parseError = false;
            try {
                var json = JSON.parse(str);
            }
            catch(err) {
                // nope, it's not an error message
                parseError = true;
            }

            if(!parseError) {
                /*
                    "error": {
                    "message": "",
                    "type": "invalid_request_error",
                    "param": null,
                    "code": "invalid_api_key"
                    }
                */
                var error = new Error("Got an error from openIA: message=" + json.error.message + " type=" + json.error.type + " code=" + json.error.code);

                if(json.error.code == "invalid_api_key") error.message = error.message + " OPENAI_API_KEY=" + OPENAI_API_KEY;

                callback(error);
                callback = null;
                return;
            }
        }

        var lines = str.split("\n");

        lines.forEach(function(line) {
            if(line.slice(0, 6) == "data: ") {
                var jsonStr = line.slice(6);
                
                if(jsonStr=="[DONE]") {
                    console.log("chatGtp: Done!");
                    return;
                }

                var parseError = false;
                try {
                    var json = JSON.parse(jsonStr);
                }
                catch(err) {
                    parseError = true;
                    console.error("chatGtp: Unable to parse (" + err.message + "): " + jsonStr);
                }
            
                if(parseError) return;

                var choices = json.choices;

                if(choices.length >  1) {
                    console.error("chatGtp: Unexpected multiple choices: " + JSON.stringify(choices, null, 2));
                }

                /*

                */

                var content = choices[0].delta && choices[0].delta.content;

                console.log("chatGtp: content=" + content);

                user.send({chatgpt: content});
                
            }
            else {
                console.log("chatGtp: Unexpected: (line with " + line.length + " characters does not begin with data: " + line);
            }
        });
    }

    function respEnd() {
        console.log("chatGtp: respEnd");

        if(callback) callback(null);
        callback = null;
    }

}

module.exports = API;


