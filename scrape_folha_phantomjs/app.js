//Adding the modules
var request = require('request'),
	connect = require('connect'),
		 fs = require('fs'),
	   util = require('util'),
		 io = require('socket.io').listen(9001), // WS port
	   port = 9000,								 // HTTP port
	   	  $ = require('jquery'),				 //jQuery	   
	   phantom = require('phantom');			 //Phantom JS

/*----- create web server using connect -----*/
connect.createServer(
	connect.static(__dirname + '/public') // two underscores
).listen(port);
util.log('the server is running on port: ' + port);

// init socket.io
io.set('log level', 1);

//This part listens to the data coming from the browser and send it to the Arduino
io.sockets.on('connection', function(socket) {

	//util.log is the same as console.log, but it prints the date and time along with the msg
	// util.log('Ooooooh, someone just poked me :)');
	socket.on('load', function(isLoaded){
		console.log("Request call: " + isLoaded);
		if(isLoaded){
			// loadData();
		}
	});
});

// phantom.create(function(ph) {
//   return ph.createPage(function(page) {
	
// 	console.log('Called search.');
// 	var searchUrl = 'http://veja.abril.com.br/busca/resultado.shtml?qu=protesto%20brasil&ord=asc&pg='
// 					+ currentPage + '&origembusca=bsc';

//     return page.open(searchUrl, function(status) {
//       console.log("Opened page? ", status);
//       return page.evaluate((function() {
//         return document.title;
//       }), function(result) {
//         console.log('Page title is ' + result);
//         setTimeout(function(){
//         	var results = $('#bsc_resultado').html();
//         	test(results);
//         }, 5000);
//         return ph.exit();
//       });
//     });
//   });
// });

/*----- VARIABLES -----*/
var today = new Date();
var yesterday = new Date(today);
yesterday.setDate(today.getDate() - 1);
// console.log(today.getDate());
// console.log(yesterday.getDate());

var completeSearch = '';
var nResults = 1;
var resultsPerPage = 25;
var nPages = 4;
var currentPage = 1;

phantom.create(function(ph) {
  return ph.createPage(function(page) {

	console.log('Creating Phantom.JS page...');
	// var searchUrl = 'http://veja.abril.com.br/busca/resultado.shtml?qu=protesto%20brasil&ord=asc&pg='
	// 				+ currentPage + '&origembusca=bsc';

	var searchUrl = 'http://search.folha.com.br/search?q=protestos&site=jornal&'
	/* start date */	+ 'sd=' + yesterday.getDate() + '%2F' + (yesterday.getMonth() + 1) + '%2F' + yesterday.getFullYear()
	/* end date */		+ '&ed=' + today.getDate() + '%2F' + (today.getMonth() + 1) + '%2F' + today.getFullYear() 
	/* results start */	+ '&sr=' + nResults;
	console.log(searchUrl); 


    return page.open(searchUrl, function(status) {
      console.log("opened site? ", status);         
 
            page.injectJs('http://ajax.googleapis.com/ajax/libs/jquery/1.7.2/jquery.min.js', function() {
                //jQuery Loaded.
                //Wait for a bit for AJAX content to load on the page. Here, we are waiting 10 seconds.
                setTimeout(function() {
                    return page.evaluate(function() {
 
                        var myResults = $('body').html();
                        return myResults

                    }, function(data) {
                        test(data);
                        ph.exit();
                    });
                }, 10000);
 
            });
    });
    });
});


function test(data){
	console.log(data);
	io.sockets.emit('write', data);	
}

function loadData(){
	console.log('Called search.');
	var searchUrl = 'http://veja.abril.com.br/busca/resultado.shtml?qu=protesto%20brasil&ord=asc&pg='
					+ currentPage + '&origembusca=bsc'	


	request({
	    url: searchUrl,
	    encoding: 'utf8'
		},
		function (error, response, body) {
		    if (!error && response.statusCode == 200) {
		    	console.log(body);
		    	io.sockets.emit('write', body);
		    }
	});

	// request(url: searchUrl, encoding: 'utf-8', function(){
	// 	    if (!error && response.statusCode == 200) {
	// 	    	console.log(body);
	// 	    	io.sockets.emit('write', body);
	// 	    }		
	// });
	// request({
	// 	url: searchUrl,
	// 	encoding: 'utf-8',
	// 	function(error, response, body) {
	// 	    if (!error && response.statusCode == 200) {
	// 	    	console.log(body);
	// 	    	io.sockets.emit('write', body);
	// 	    }
	// 	}
	// });	
}

