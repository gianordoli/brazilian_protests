/*----- MODULES -----*/
//To create the client-server connection
var	connect = require('connect'),
		 fs = require('fs'),
	   util = require('util'),
		 io = require('socket.io').listen(9001), // WS port 
	   port = 9000, 							 // HTTP port
	   http = require('http'),
	   	  $ = require('jquery'),				 //jQuery
	phantom = require('phantom');				 //Phantom JS


/*----- MONGODB -----*/
var databaseUrl = 'news_v1'; // database name, or "username:password@example.com/mydb"
var collections = ['events'];  //collection name
var db = require('mongojs').connect(databaseUrl, collections);


/*----- create web server using connect -----*/
var isLoaded = false;

connect.createServer(connect.static(__dirname + '/public')).listen(port);
util.log('The server is running on port: ' + port);

var clients = [];
var allDocs;
var docIndex = 0;

// init socket.io
io.set('log level', 1);
io.sockets.on('connection', function(socket) {
	
	clients.push(socket.id);
	console.log(clients.length);

	socket.on('load', function(isLoaded){
		console.log("Request call: " + isLoaded);
		if(isLoaded){
			loadDB();			
		}
	});
});

//1: Load database
function loadDB(){
	console.log('Loading database...');
	// db.events.find({'company' : 'Folha de S.Paulo'}, function(err, data) {
	db.events.find({'company' : 'O Globo'}, function(err, data) {
		if( err || !data){
			console.log("Nothing found");
		}else{
			console.log('Database loaded.');
			allDocs = data;
			// console.log(allDocs);
			createPhantom();		
		}
	});	
}


//2: Create Phantom
function createPhantom(){
	console.log('Creating Phantom...');
	phantom.create(function(ph) {
		loadPage(ph);
	});
}

//3: Load Page
function loadPage(ph){

	console.log('Loading page...');

	var pageUrl = allDocs[docIndex].url;
	console.log(pageUrl);

		ph.createPage(function(page) {
			
			console.log('Creating Phantom.JS page...');

	    	return page.open(pageUrl, function(status) {

				console.log("opened site? ", status);
		            
		        if(status){
		            setTimeout(function() {
		                return page.evaluate(function() {

		                    var htmlPage = $('body').html();
		                    return htmlPage

		                }, function(data) {
		               		page.release();
		                    //scrapePage(data, pageUrl, ph);
		                    scrapeGlobo(data, pageUrl, ph);
		                });
		            }, 2000);
		        }else{
		        	console.log('Error evaluating page.');
		        }
		    });
	    });
}

//4: Scrape page
function scrapePage(pageHtml, pageUrl, ph){

	var article = $('#news', pageHtml);
	var content = $('.content', article);

	//Another template template (colunistas, ilustrada...)
	if(article.length <= 0){
		console.log('Different template');
		content = $('#articleNew', pageHtml);
	}

	/*---------- Checking page on browser ----------*/
	var test;
	$(content).each(function() {
  		test += $(this).html();
	});
	// console.log(test);
	for(var i = 0; i <= clients.length - 2; i++){
		io.sockets.socket(clients[0]).emit('write', test);
	}
	/*----------------------------------------------*/

	//Text
	var paragraphs = $('p', content).text();
	// console.log(paragraphs);

	//Image
	var imageSource;
	var thumbs = $('.thumbnails', content);

		//Thumbs?
		if(thumbs.length > 0){
			console.log('Thumbs found');
			var imageDiv = $('.image', content);
			var image = $('img', imageDiv);
			imageSource = $(image).attr('src');

		}else{
			console.log('No thumbs found');
			var pageImages = $('img', content);
			// console.log(pageImages.length);

			// Checking the fyle type — prevents from storing thumbs
			for(var i = 0; i < pageImages.length; i++){
				imageSource = $(pageImages[i], content).attr('src');
				var imageType = imageSource.substr(imageSource.lastIndexOf('.') + 1, imageSource.length);
				// console.log(imageType);

				if(imageType != 'jpeg' || imageSource.indexOf('colunistas') != -1){
					imageSource = '';
				}else{
					break;
				}
			}
			// console.log(imageSource);
		}

		if(imageSource == null){
			console.log('No article image');
			imageSource = '';
		}
		updateDoc(pageUrl, paragraphs, imageSource, ph);
}

function scrapeGlobo(pageHtml, pageUrl, ph){

	console.log('Begin scraping...');

	var content = $('.content', pageHtml);
	// console.log(content);

	/*---------- Checking page on browser ----------*/
	var test;
	$(content).each(function() {
  		test += $(this).html();
	});
	// console.log(test);
	for(var i = 0; i < clients.length; i++){
		io.sockets.socket(clients[i]).emit('write', test);
	}
	/*----------------------------------------------*/

	// //Text
	// var paragraphs = $('p', content).text();
	// // console.log(paragraphs);

	//Image
	var figure = $('figure', content);
	// console.log(figure);
	var image = $('img', figure[0]);
	// console.log(image);
	var imageSource = $(image[0]).attr('src');
	console.log(imageSource);
	// var test = '<img src=\'' + imageSource + '\'>'
	// io.sockets.socket(clients[clients.length - 1]).emit('write', test);	
	

	// 	//Thumbs?
	// 	if(thumbs.length > 0){
	// 		console.log('Thumbs found');
	// 		var imageDiv = $('.image', content);
	// 		var image = $('img', imageDiv);
	// 		imageSource = $(image).attr('src');

	// 	}else{
	// 		console.log('No thumbs found');
	// 		var pageImages = $('img', content);
	// 		// console.log(pageImages.length);

	// 		// Checking the fyle type — prevents from storing thumbs
	// 		for(var i = 0; i < pageImages.length; i++){
	// 			imageSource = $(pageImages[i], content).attr('src');
	// 			var imageType = imageSource.substr(imageSource.lastIndexOf('.') + 1, imageSource.length);
	// 			// console.log(imageType);

	// 			if(imageType != 'jpeg' || imageSource.indexOf('colunistas') != -1){
	// 				imageSource = '';
	// 			}else{
	// 				break;
	// 			}
	// 		}
	// 		// console.log(imageSource);
	// 	}

	// 	if(imageSource == null){
	// 		console.log('No article image');
	// 		imageSource = '';
	// 	}
	// 	updateDoc(pageUrl, paragraphs, imageSource, ph);
}

//5: Update doc
function updateDoc(pageUrl, paragraphs, imageSource, ph){
	console.log('Updating doc...');
	db.events.findAndModify({
	    	query: { url: pageUrl },
	    	update: { $set: {
	    					text: paragraphs,
	    					image: imageSource
	    					}
	    			},
	    	new: true
		},
		function(err, doc, lastErrorObject) {
			if(err){
				console.log('Error');
			}else{
				console.log('Doc succesfully updated.');
		    	// console.log(doc);
		    	console.log('------------------------------');

				/*---------- Checking scrape on browser ----------*/
				var test = '<img src=\'' + doc.image + '\'>'
				test += '<p>' + doc.text + '</p>';
				io.sockets.socket(clients[clients.length - 1]).emit('write', test);
				/*------------------------------------------------*/

				console.log('---------- New page ----------');
				if(docIndex < 10){
					docIndex ++;	
					console.log(docIndex);
					loadPage(ph);
				}else{
					ph.exit();
				}
			}
	});
}




