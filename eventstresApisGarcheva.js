var request = require("request")
request('http://192.168.100.5:2113/streams/$streams?format=json&embed=body', function (error, response, body) {
  if (!error && response.statusCode == 200) {
    console.log(body) // Print the google web page.
  }else{
  	console.log(response.statusCode,response.headers);
  }
}).auth('admin', 'changeit', false);