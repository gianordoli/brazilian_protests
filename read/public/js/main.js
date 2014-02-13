var socket = io.connect('http://localhost:9001');

$(document).ready(function(){		//When the document is ready...
	console.log('Called server.');
	socket.emit('load', true);		//...call data from mongoDB via node web sockets			
});

//When data comes in through the port
socket.on('write', function(data) {
	console.log(data);
	data.sort(sortDate);	//Sort the array by date
	displayEvents(data);	//Call function to display the data
});

function displayEvents(data){
	
	var myHtml = '';
	var currentDate;
	var lastDate = new Date();

	data.forEach( function(obj) {
		currentDate = new Date(obj.date);

		//Checking for line break if the date is different
		if(		currentDate.getDate() != lastDate.getDate()){
			console.log('line break');
			myHtml += '<br><hr>';			
		}

		var companyClass;
		if(obj.company == 'O Globo'){
			companyClass = 'globo';
		}else{
			companyClass = 'folha';
		}
		// console.log(obj.image);
		// if(typeof obj.image === 'undefined'){
		// 	console.log('oi');
		// }
		myHtml += '<div class="news">';
		if(obj.image != '' && typeof obj.image !== 'undefined'){
			myHtml += '<img class="articleImage" src=\"'+ obj.image +'\"news"><br>';
		}
		myHtml += '<span class=' + companyClass + '>'+ obj.company + '</span><br>';
		myHtml += currentDate.getDate() + '/' + (currentDate.getMonth() + 1) + '/' + currentDate.getFullYear();
		myHtml += ' - ' + obj.section + '<br>';
    	myHtml += '<a href=' + obj.url + '><b>' + obj.headline + '</b></a>';
    	myHtml += '</div>';

		lastDate = new Date(currentDate);
	} );
	
	$('#visualization').html(myHtml);
	// console.log('done');
}

/*---------- AUXILIAR FUNCTIONS ----------*/
//Sort JSON array by date
function sortDate(a, b) {
	//getTime provides an equal value for h,min,s: the current time
    return new Date(a.date).getTime() - new Date(b.date).getTime();
}
