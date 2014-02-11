/*----- MODULES -----*/
//To create the client-server connection
var	connect = require('connect'),
		 fs = require('fs'),
	   util = require('util'),
		 io = require('socket.io').listen(9001), // WS port
	   port = 9000, 							 // HTTP port

	   	  $ = require('jquery'),				 //jQuery

//To convert the encoding
	  Iconv = require('iconv').Iconv,	  		 //Encoding conversor (here we'll use ISO-8859-1 to UTF-8)
	 Buffer = require('buffer').Buffer,			 /*Buffer object, to store binary data; otherwise, incoming responses
												   are converted to String and we can't re-encode them*/
//To create the stream object
	   http = require('http'),
  streamify = require('streamify');


/*----- MONGODB -----*/
var databaseUrl = 'protestos'; // database name, or "username:password@example.com/mydb"
var collections = ['eventos'];  //collection name
var db = require('mongojs').connect(databaseUrl, collections);




/*----- create web server using connect -----*/
connect.createServer(
	connect.static(__dirname + '/public') // two underscores
).listen(port);
util.log('the server is running on port: ' + port);

// init socket.io
io.set('log level', 1);

//This part listens to the data coming from the browser
// io.sockets.on('connection', function(socket) {

// 	//util.log is the same as console.log, but it prints the date and time along with the msg
// 	// util.log('Ooooooh, someone just poked me :)');
// 	socket.on('load', function(isLoaded){
// 		console.log("Request call: " + isLoaded);
// 		if(isLoaded){
// 			loadData();
// 		}
// 	});
// });

/*----- VARIABLES -----*/
var today = new Date();
var yesterday = new Date(today);
yesterday.setDate(today.getDate() - 1);

loadData();

var completeSearch = '';
var nResults = 1;
var resultsPerPage = 25;
var nPages = 4;
var currentPage = 1;


//Loading requested data through stream
function loadData(){
	console.log('--------------------------');	
	console.log('Called search.');

	var searchUrl = 'http://search.folha.com.br/search?q=protesto%20OR%20protestos%20OR%20manifesta%E7%E3o%20OR%20manifesta%E7%F5es&site=jornal&'
	/* start date */	+ 'sd=' + yesterday.getDate() + '%2F' + (yesterday.getMonth() + 1) + '%2F' + yesterday.getFullYear()
	/* end date */		+ '&ed=' + today.getDate() + '%2F' + (today.getMonth() + 1) + '%2F' + today.getFullYear() 
	/* results start */	+ '&sr=' + nResults;																  


	var stream = streamify();
	http.get(searchUrl, function onResponse(data) {
		//Storing all incoming data in a stream object
	  	stream.resolve(data);
	  	// console.log(response);

		var iconv = new Iconv('ISO-8859-1', 'UTF8');	//Iconv is an encoding conversor object;
		var chunks = [];								//Each chunk is a "piece" of (raw) incoming data
		var totallength = 0;

		//For each incoming data...
		stream.on('data', function(chunk) {
		  chunks.push(chunk);							//Adding each chunk to the total array
		  totallength += chunk.length;					//Calculating the whole size (pieces size + pieces size)
		});

		//When the call ends
		stream.on('end', function() {
		  var results = new Buffer(totallength);		//Buffer stores binary data.
		  												//Its size it's gonna be the same as the whole data
		  var pos = 0;
		  for (var i = 0; i < chunks.length; i++) {
		    chunks[i].copy(results, pos);				//Copying the chunks to the final Buffer (results)
		    pos += chunks[i].length;					//Calculating the current position to store the next chunk
		  }
		  var converted = iconv.convert(results);			//Converting binary ISO-8859-1 to binary UTF-8
		  var thisPageSearch = converted.toString('utf8');		//Converting to String
		  // console.log(thisPageSearch);
		  
		  completeSearch += thisPageSearch;			//Storing the results
		  nResults += resultsPerPage;				//Number of results per page

		  parseData(completeSearch);

		  // console.log('Scraped results until ' + (nResults - 1));
		  // console.log('Current month is ' + (timeRange.getMonth() + 1) + '/' + timeRange.getFullYear());
		  // console.log('Total pages so far: ' + currentPage + '/' + nPages);
		  // currentPage ++;


		  //Keep scraping!
		 //  if(nResults < (resultsPerPage * nPages) + 1){
			// getTotalPages(completeSearch); //Check once again the number of available pages
		 //  	parseData(completeSearch);
		 //  	completeSearch = '';			
		 //  //Next month!
		 //  }else{
  	// 		resetMonthSearch();
		 //  }

		});	  
	});
}

//Getting the total number of pages for eah search (at the bottom links)
function getTotalPages(data){
	var resultHtml = $.parseHTML(data);
	var p = $('p', resultHtml);	
	// console.log('length: '+ $(p).length);
	var pagesParagraph = $(p).get($(p).length - 7);	//at Folha, the number of pages is at the 7th index from the last <p>
	// console.log('last p: ' + $(pagesParagraph).html());
	var a = $('a', pagesParagraph); //get all <a> from the last p
	var lastA = $(a).get(a.length - 2); //get the last <a>
	// console.log('a\'s: ' + $(lastA).text());
	nPages = parseInt($(lastA).text()); //Update the number of pages to scrape

	loadData(); //Load the function once again
}

function parseData(data){
	console.log('--------------------------');	
	console.log('Called parsing.');	
	// console.log(data);
	var resultHtml = $.parseHTML(data);
	var resultsList = $('.search-results-list', resultHtml);
	var rawNews = $('li', resultsList);
	// console.log($(rawNews).text());
	var news = new Array();

	$(rawNews).each(function(index){
		console.log(index + '--------------------');	
		var myNews = new Object;
			var tempHtml = $('h3', this);
			var tempLink = $('a', tempHtml);
			var tempText = $(tempLink).text();

			var tempCompany = 'Folha de São Paulo';											//Company
			var tempSection = tempText.substr(tempText.indexOf('-') + 2);					//Section
				tempSection = tempSection.substr(0, tempSection.indexOf('-') - 1);
			var tempDate = yesterday;				
			var tempHeadline = tempText.substr(tempText.indexOf('-') + 1);					//Headline
				tempHeadline = tempHeadline.substr(tempHeadline.indexOf('-') + 2);
				tempHeadline = tempHeadline.substr(0, tempHeadline.lastIndexOf('-') - 1);
			var tempUrl = $(tempLink).attr('href');											//Url			

			myNews.company = tempCompany;
			myNews.section = tempSection;
			myNews.date = new Date(tempDate);
			myNews.headline = tempHeadline;			
			myNews.url = tempUrl;
			console.log(myNews);

			//Filtering
			// if(    myNews.section != 'Mundo'
			// 	&& myNews.section != 'Esporte'
			// 	&& myNews.section != 'Folha na Copa'
			// 	&& myNews.section != 'Painel do Leitor'
			// 	&& myNews.section != 'Turismo'
			//   ){

			// 	//Checking for repeated headlines
			// 	db.events.find({headline : myNews.headline}, function(err, data) {
			// 		if( err || !data){
			// 			console.log('Nothing found');
			// 		}else{
			// 			if(data.length == 0){
			// 				db.events.save(myNews);		//Saving to mongoDB
			// 				console.log('SAVED TO DATABASE: ' + myNews.headline);
			// 				console.log(myNews.date);
			// 			}else{
			// 				console.log('Repeated entry.');	
			// 			}
			// 		}
			// 	});
			// }
			
			// console.log('Index: ' + index + myNews);
			// console.log(myNews);

	});

	sendDataToBrowser(news);
}



//Store data
function sendDataToBrowser(data){

	//Sending to browser
	io.sockets.emit('write', data);
}

/*---------- AUXILIAR FUNCTIONS ----------*/
//Convert from string (dd/mm/yyyy) to date 
function parseDate(dateString){

	//It HAS to be this order!
	
	//1. Year
	var tempYear = parseInt(dateString.substr(dateString.lastIndexOf('/') + 1));
	// console.log('year string: ' + tempYear);
	tempYear = parseInt(tempYear);
	// myDate.setFullYear(parseInt(tempYear));
	// console.log('parsed year: ' + myDate.getFullYear());
	
	//2. Month
	var tempMonth = dateString.substr(dateString.indexOf('/') + 1);
	tempMonth = tempMonth.substr(0, tempMonth.indexOf('/'));
	// console.log('month string: ' + tempMonth);
	tempMonth = parseInt(tempMonth) - 1;
	// console.log('parsed month: ' + myDate.getMonth());

	//3. Date
	var tempDate = dateString.substr(0, dateString.indexOf('/'));
	// console.log('day string: ' + tempDate);
	tempDate = parseInt(tempDate);
	// console.log('parsed date: ' + myDate.getDate());

	//Folha has a problem: some dates retun the year as 201. Assigning everything to 2013, then. :S
	myDate = new Date(2013, tempMonth, tempDate);

	if(myDate.toString() != 'Invalid Date'){
		return myDate;
	}
}